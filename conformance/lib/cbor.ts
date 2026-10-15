/**
 * A minimal, dependency-free CBOR codec (RFC 8949) for the conformance tooling.
 *
 * It works on a generic item tree rather than on SurrealDB values, so it can
 * represent anything on the wire, including the malformed inputs the vectors
 * use to check that decoders reject them. `value.ts` maps items to and from
 * SurrealDB values.
 *
 * Two things a general-purpose library would not give us:
 *  - every decoded item records the byte range it came from, so a tool can
 *    slice the server's exact encoding of one value out of a whole response;
 *  - `raw` items splice pre-encoded bytes into the output unchanged, so a test
 *    can send the server bytes it would never produce itself.
 */

export type CborItem =
	| { t: "uint"; v: bigint }
	| { t: "nint"; v: bigint } // the encoded argument n; the value is -1 - n
	| { t: "bytes"; v: Uint8Array }
	| { t: "text"; v: string }
	| { t: "array"; v: CborItem[]; indefinite?: boolean }
	| { t: "map"; v: [CborItem, CborItem][]; indefinite?: boolean }
	| { t: "tag"; tag: bigint; v: CborItem }
	| { t: "simple"; v: number } // 20 false, 21 true, 22 null, 23 undefined
	| { t: "float"; v: number; width?: 16 | 32 | 64 }
	| { t: "raw"; bytes: Uint8Array };

export interface Span {
	start: number;
	end: number;
}

export type Decoded = CborItem & { span: Span };

export const NULL: CborItem = { t: "simple", v: 22 };
export const TRUE: CborItem = { t: "simple", v: 21 };
export const FALSE: CborItem = { t: "simple", v: 20 };

export const int = (n: bigint | number): CborItem => {
	const b = BigInt(n);
	return b >= 0n ? { t: "uint", v: b } : { t: "nint", v: -1n - b };
};
export const text = (v: string): CborItem => ({ t: "text", v });
export const array = (v: CborItem[]): CborItem => ({ t: "array", v });
export const tag = (t: number | bigint, v: CborItem): CborItem => ({
	t: "tag",
	tag: BigInt(t),
	v,
});

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

class Writer {
	private buf = new Uint8Array(256);
	private len = 0;

	private reserve(n: number) {
		if (this.len + n <= this.buf.length) return;
		let size = this.buf.length * 2;
		while (size < this.len + n) size *= 2;
		const next = new Uint8Array(size);
		next.set(this.buf.subarray(0, this.len));
		this.buf = next;
	}

	byte(b: number) {
		this.reserve(1);
		this.buf[this.len++] = b;
	}

	bytes(b: Uint8Array) {
		this.reserve(b.length);
		this.buf.set(b, this.len);
		this.len += b.length;
	}

	head(major: number, arg: bigint) {
		const m = major << 5;
		if (arg < 24n) this.byte(m | Number(arg));
		else if (arg < 0x100n) {
			this.byte(m | 24);
			this.byte(Number(arg));
		} else if (arg < 0x10000n) {
			this.byte(m | 25);
			this.uint(arg, 2);
		} else if (arg < 0x100000000n) {
			this.byte(m | 26);
			this.uint(arg, 4);
		} else if (arg < 0x10000000000000000n) {
			this.byte(m | 27);
			this.uint(arg, 8);
		} else {
			throw new Error(`CBOR argument out of range: ${arg}`);
		}
	}

	uint(v: bigint, n: number) {
		for (let i = n - 1; i >= 0; i--)
			this.byte(Number((v >> BigInt(i * 8)) & 0xffn));
	}

	finish(): Uint8Array {
		return this.buf.slice(0, this.len);
	}
}

/** The narrowest IEEE 754 width that holds `v` exactly, as the server picks it. */
export function shortestFloatWidth(v: number): 16 | 32 | 64 {
	if (Number.isNaN(v) || !Number.isFinite(v)) return 16;
	if (f16Bits(v) !== undefined) return 16;
	if (Math.fround(v) === v) return 32;
	return 64;
}

/** Half-precision bits for `v`, or undefined when it is not exactly representable. */
function f16Bits(v: number): number | undefined {
	if (Number.isNaN(v)) return 0x7e00;
	if (v === Number.POSITIVE_INFINITY) return 0x7c00;
	if (v === Number.NEGATIVE_INFINITY) return 0xfc00;
	const sign = v < 0 || Object.is(v, -0) ? 0x8000 : 0;
	const a = Math.abs(v);
	if (a === 0) return sign;
	// Subnormal halves: multiples of 2^-24 below 2^-14.
	if (a < 2 ** -14) {
		const m = a / 2 ** -24;
		return Number.isInteger(m) ? sign | m : undefined;
	}
	const e = Math.floor(Math.log2(a));
	if (e > 15) return undefined;
	const mant = a / 2 ** e - 1;
	const m = mant * 1024;
	if (!Number.isInteger(m)) return undefined;
	return sign | ((e + 15) << 10) | m;
}

function halfToNumber(h: number): number {
	const s = h & 0x8000 ? -1 : 1;
	const e = (h >> 10) & 0x1f;
	const m = h & 0x3ff;
	if (e === 0) return s * m * 2 ** -24;
	if (e === 31) return m ? Number.NaN : s * Number.POSITIVE_INFINITY;
	return s * (1 + m / 1024) * 2 ** (e - 15);
}

function writeItem(w: Writer, item: CborItem) {
	switch (item.t) {
		case "uint":
			return w.head(0, item.v);
		case "nint":
			return w.head(1, item.v);
		case "bytes":
			w.head(2, BigInt(item.v.length));
			return w.bytes(item.v);
		case "text": {
			const b = new TextEncoder().encode(item.v);
			w.head(3, BigInt(b.length));
			return w.bytes(b);
		}
		case "array":
			if (item.indefinite) w.byte(0x9f);
			else w.head(4, BigInt(item.v.length));
			for (const x of item.v) writeItem(w, x);
			if (item.indefinite) w.byte(0xff);
			return;
		case "map":
			if (item.indefinite) w.byte(0xbf);
			else w.head(5, BigInt(item.v.length));
			for (const [k, v] of item.v) {
				writeItem(w, k);
				writeItem(w, v);
			}
			if (item.indefinite) w.byte(0xff);
			return;
		case "tag":
			w.head(6, item.tag);
			return writeItem(w, item.v);
		case "simple":
			if (item.v < 24) return w.byte(0xe0 | item.v);
			w.byte(0xf8);
			return w.byte(item.v);
		case "float": {
			const width = item.width ?? shortestFloatWidth(item.v);
			if (width === 16) {
				const bits = f16Bits(item.v);
				if (bits === undefined)
					throw new Error(`${item.v} is not a half float`);
				w.byte(0xf9);
				return w.uint(BigInt(bits), 2);
			}
			const dv = new DataView(new ArrayBuffer(width / 8));
			if (width === 32) {
				dv.setFloat32(0, item.v);
				w.byte(0xfa);
			} else {
				dv.setFloat64(0, item.v);
				w.byte(0xfb);
			}
			return w.bytes(new Uint8Array(dv.buffer));
		}
		case "raw":
			return w.bytes(item.bytes);
	}
}

export function encode(item: CborItem): Uint8Array {
	const w = new Writer();
	writeItem(w, item);
	return w.finish();
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

export class CborDecodeError extends Error {}

class Reader {
	pos = 0;
	constructor(private readonly b: Uint8Array) {}

	private need(n: number) {
		if (this.pos + n > this.b.length)
			throw new CborDecodeError("unexpected end of input");
	}

	u8(): number {
		this.need(1);
		return this.b[this.pos++] as number;
	}

	uint(n: number): bigint {
		this.need(n);
		let v = 0n;
		for (let i = 0; i < n; i++)
			v = (v << 8n) | BigInt(this.b[this.pos++] as number);
		return v;
	}

	slice(n: number): Uint8Array {
		this.need(n);
		const out = this.b.slice(this.pos, this.pos + n);
		this.pos += n;
		return out;
	}

	arg(info: number): bigint | null {
		if (info < 24) return BigInt(info);
		if (info === 24) return this.uint(1);
		if (info === 25) return this.uint(2);
		if (info === 26) return this.uint(4);
		if (info === 27) return this.uint(8);
		if (info === 31) return null; // indefinite length
		throw new CborDecodeError(`reserved additional info ${info}`);
	}

	item(): Decoded {
		const start = this.pos;
		const ib = this.u8();
		const major = ib >> 5;
		const info = ib & 0x1f;
		const done = (it: CborItem): Decoded => ({
			...it,
			span: { start, end: this.pos },
		});

		if (major === 7) {
			if (info < 24) return done({ t: "simple", v: info });
			if (info === 24) return done({ t: "simple", v: this.u8() });
			if (info === 25)
				return done({
					t: "float",
					v: halfToNumber(Number(this.uint(2))),
					width: 16,
				});
			if (info === 26) {
				const dv = new DataView(this.slice(4).buffer);
				return done({ t: "float", v: dv.getFloat32(0), width: 32 });
			}
			if (info === 27) {
				const dv = new DataView(this.slice(8).buffer);
				return done({ t: "float", v: dv.getFloat64(0), width: 64 });
			}
			throw new CborDecodeError(`unsupported simple/float info ${info}`);
		}

		const arg = this.arg(info);
		switch (major) {
			case 0:
				if (arg === null) throw new CborDecodeError("indefinite uint");
				return done({ t: "uint", v: arg });
			case 1:
				if (arg === null) throw new CborDecodeError("indefinite nint");
				return done({ t: "nint", v: arg });
			case 2:
			case 3: {
				let raw: Uint8Array;
				if (arg === null) {
					const chunks: Uint8Array[] = [];
					while (this.b[this.pos] !== 0xff)
						chunks.push(this.slice(Number(this.arg(this.u8() & 0x1f))));
					this.pos++;
					raw = concat(chunks);
				} else raw = this.slice(Number(arg));
				return done(
					major === 2
						? { t: "bytes", v: raw }
						: {
								t: "text",
								v: new TextDecoder("utf-8", { fatal: true }).decode(raw),
							},
				);
			}
			case 4: {
				const v: Decoded[] = [];
				if (arg === null) {
					while (this.b[this.pos] !== 0xff) v.push(this.item());
					this.pos++;
					return done({ t: "array", v, indefinite: true });
				}
				for (let i = 0n; i < arg; i++) v.push(this.item());
				return done({ t: "array", v });
			}
			case 5: {
				const v: [Decoded, Decoded][] = [];
				if (arg === null) {
					while (this.b[this.pos] !== 0xff) v.push([this.item(), this.item()]);
					this.pos++;
					return done({ t: "map", v, indefinite: true });
				}
				for (let i = 0n; i < arg; i++) v.push([this.item(), this.item()]);
				return done({ t: "map", v });
			}
			case 6:
				if (arg === null) throw new CborDecodeError("indefinite tag");
				return done({ t: "tag", tag: arg, v: this.item() });
		}
		throw new CborDecodeError(`unknown major type ${major}`);
	}
}

/** Decodes exactly one item, failing on trailing bytes. */
export function decode(bytes: Uint8Array): Decoded {
	const r = new Reader(bytes);
	const item = r.item();
	if (r.pos !== bytes.length)
		throw new CborDecodeError(`${bytes.length - r.pos} trailing bytes`);
	return item;
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
	let o = 0;
	for (const c of chunks) {
		out.set(c, o);
		o += c.length;
	}
	return out;
}

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

export function toHex(b: Uint8Array): string {
	return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function fromHex(h: string): Uint8Array {
	const s = h.replace(/\s+/g, "");
	if (s.length % 2) throw new Error(`odd-length hex: ${h}`);
	const out = new Uint8Array(s.length / 2);
	for (let i = 0; i < out.length; i++)
		out[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/** CBOR diagnostic notation (RFC 8949 section 8), for readable vector files. */
export function diagnostic(item: CborItem): string {
	switch (item.t) {
		case "uint":
			return item.v.toString();
		case "nint":
			return (-1n - item.v).toString();
		case "bytes":
			return `h'${toHex(item.v)}'`;
		case "text":
			return JSON.stringify(item.v);
		case "array":
			return `[${item.indefinite ? "_ " : ""}${item.v.map(diagnostic).join(", ")}]`;
		case "map":
			return `{${item.indefinite ? "_ " : ""}${item.v.map(([k, v]) => `${diagnostic(k)}: ${diagnostic(v)}`).join(", ")}}`;
		case "tag":
			return `${item.tag}(${diagnostic(item.v)})`;
		case "simple":
			return item.v === 20
				? "false"
				: item.v === 21
					? "true"
					: item.v === 22
						? "null"
						: item.v === 23
							? "undefined"
							: `simple(${item.v})`;
		case "float": {
			const s = Number.isNaN(item.v)
				? "NaN"
				: item.v === Number.POSITIVE_INFINITY
					? "Infinity"
					: item.v === Number.NEGATIVE_INFINITY
						? "-Infinity"
						: Object.is(item.v, -0)
							? "-0.0"
							: Number.isInteger(item.v)
								? `${item.v}.0`
								: String(item.v);
			const width = item.width ?? shortestFloatWidth(item.v);
			return `${s}_${width === 16 ? 1 : width === 32 ? 2 : 3}`;
		}
		case "raw":
			return `<raw ${toHex(item.bytes)}>`;
	}
}

/**
 * Parses the subset of CBOR diagnostic notation that `diagnostic` prints, so
 * hand-written vectors can be reviewed as text and still pin exact bytes.
 *
 * Integers, floats (`1.5`, or `1.5_1` / `_2` / `_3` to force half, single or
 * double width), `NaN`, `Infinity`, `-Infinity`, JSON strings, `h'..'`,
 * `[..]`, `{..}`, `[_ ..]` and `{_ ..}` for indefinite lengths, `N(..)` tags,
 * `null`, `true`, `false` and `undefined`.
 */
export function parseDiagnostic(src: string): CborItem {
	let i = 0;
	const ws = () => {
		while (i < src.length && /\s/.test(src[i] as string)) i++;
	};
	const expect = (c: string) => {
		ws();
		if (src[i] !== c)
			throw new Error(`diagnostic: expected '${c}' at ${i} in ${src}`);
		i++;
	};
	const list = <T>(
		close: string,
		one: () => T,
	): { items: T[]; indefinite: boolean } => {
		ws();
		let indefinite = false;
		if (src[i] === "_") {
			indefinite = true;
			i++;
		}
		const items: T[] = [];
		ws();
		if (src[i] === close) {
			i++;
			return { items, indefinite };
		}
		for (;;) {
			items.push(one());
			ws();
			if (src[i] === ",") {
				i++;
				continue;
			}
			expect(close);
			return { items, indefinite };
		}
	};
	const width = (): 16 | 32 | 64 | undefined => {
		if (src[i] !== "_") return undefined;
		const w = src[i + 1];
		i += 2;
		return w === "1" ? 16 : w === "2" ? 32 : 64;
	};
	const item = (): CborItem => {
		ws();
		const rest = src.slice(i);
		const word = /^(null|true|false|undefined|NaN|-?Infinity)/.exec(rest);
		if (word) {
			i += (word[1] as string).length;
			switch (word[1]) {
				case "null":
					return NULL;
				case "true":
					return TRUE;
				case "false":
					return FALSE;
				case "undefined":
					return { t: "simple", v: 23 };
			}
			const v =
				word[1] === "NaN"
					? Number.NaN
					: word[1] === "Infinity"
						? Number.POSITIVE_INFINITY
						: Number.NEGATIVE_INFINITY;
			return { t: "float", v, width: width() };
		}
		if (src[i] === '"') {
			const m = /^"(?:[^"\\]|\\.)*"/.exec(rest);
			if (!m) throw new Error(`diagnostic: bad string at ${i}`);
			i += m[0].length;
			return text(JSON.parse(m[0]));
		}
		if (rest.startsWith("h'")) {
			const end = src.indexOf("'", i + 2);
			const hex = src.slice(i + 2, end);
			i = end + 1;
			return { t: "bytes", v: fromHex(hex) };
		}
		if (src[i] === "[") {
			i++;
			const { items, indefinite } = list("]", item);
			return { t: "array", v: items, indefinite };
		}
		if (src[i] === "{") {
			i++;
			const { items, indefinite } = list("}", () => {
				const k = item();
				expect(":");
				return [k, item()] as [CborItem, CborItem];
			});
			return { t: "map", v: items, indefinite };
		}
		const num = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(rest);
		if (num) {
			i += num[0].length;
			if (src[i] === "(" && !num[1]) {
				i++;
				const inner = item();
				expect(")");
				return tag(BigInt(num[0]), inner);
			}
			if (num[1] || num[2] || src[i] === "_")
				return { t: "float", v: Number(num[0]), width: width() };
			return int(BigInt(num[0]));
		}
		throw new Error(
			`diagnostic: unexpected input at ${i}: ${rest.slice(0, 20)}`,
		);
	};
	const out = item();
	ws();
	if (i !== src.length)
		throw new Error(`diagnostic: trailing input at ${i}: ${src.slice(i)}`);
	return out;
}
