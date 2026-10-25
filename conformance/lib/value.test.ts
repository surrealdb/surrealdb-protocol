import { describe, expect, test } from "bun:test";
import { decode, encode, fromHex, toHex } from "./cbor";
import { decodeProto, encodeProto, fromProto } from "./proto";
import {
	equal,
	fromCbor,
	fromJson,
	type Json,
	normaliseDecimal,
	toCbor,
	toJson,
	utf8Compare,
} from "./value";

describe("value", () => {
	test("object keys are ordered by UTF-8 bytes, not UTF-16 code units", () => {
		// U+E000 is EE 80 80 in UTF-8; U+10000 is F0 90 80 80, so it sorts last.
		expect(utf8Compare("\u{E000}", "\u{10000}")).toBeLessThan(0);
		const v = fromJson({ "\u{10000}": 1, "\u{E000}": 2 });
		const map = toCbor(v);
		expect(
			map.t === "map" && map.v.map(([k]) => (k.t === "text" ? k.v : "")),
		).toEqual(["\u{E000}", "\u{10000}"]);
		expect(equal(fromCbor(map), v)).toBe(true);
	});

	test("geometry equality tells -0 from 0", () => {
		const a = fromJson({
			$geometry: { type: "Point", coordinates: [{ $float: "-0" }, 1] },
		});
		const b = fromJson({ $geometry: { type: "Point", coordinates: [0, 1] } });
		expect(equal(a, a)).toBe(true);
		expect(equal(a, b)).toBe(false);
	});

	test("protobuf carries float and decimal record id keys", () => {
		const keys: Json[] = [{ $float: 1.5 }, { $decimal: "1.5" }];
		for (const key of keys) {
			const v = fromJson({ $record: { table: "person", key } });
			expect(equal(decodeProto(encodeProto(v)), v)).toBe(true);
		}
	});

	test("protobuf rejects nanoseconds outside 0..999999999", () => {
		for (const nanos of [-1, 1_000_000_000]) {
			expect(() =>
				fromProto({
					value: { $case: "datetime", datetime: { seconds: 0n, nanos } },
				}),
			).toThrow("out of range");
			expect(() =>
				fromProto({
					value: { $case: "duration", duration: { seconds: 0n, nanos } },
				}),
			).toThrow("out of range");
		}
	});

	test("protobuf objects need unique keys in UTF-8 order", () => {
		const obj = (...keys: string[]) =>
			fromProto({
				value: {
					$case: "object",
					object: {
						items: keys.map((key) => ({
							key,
							value: { value: { $case: "bool", bool: true } },
						})),
					},
				},
			});
		expect(() => obj("a", "\u{E000}", "\u{10000}")).not.toThrow();
		expect(() => obj("a", "a")).toThrow("duplicate key");
		expect(() => obj("b", "a")).toThrow("out of order");
		expect(() => obj("\u{10000}", "\u{E000}")).toThrow("out of order");
	});

	test("datetimes must name a real date", () => {
		expect(() =>
			fromCbor({
				t: "tag",
				tag: 0n,
				v: { t: "text", v: "2023-02-29T00:00:00Z" },
			}),
		).toThrow();
	});

	test("protobuf datetimes stay within chrono's range", () => {
		const at = (seconds: bigint) =>
			fromProto({
				value: { $case: "datetime", datetime: { seconds, nanos: 0 } },
			});
		expect(() => at(8_210_266_876_799n)).not.toThrow();
		expect(() => at(-8_334_601_228_800n)).not.toThrow();
		expect(() => at(8_210_266_876_800n)).toThrow("outside chrono's range");
		expect(() => at(9_223_372_036_854_775_807n)).toThrow(
			"outside chrono's range",
		);
	});

	test("durations whose nanoseconds carry past u64 seconds are refused", () => {
		const dur = (secs: bigint, nanos: bigint) =>
			fromCbor({
				t: "tag",
				tag: 14n,
				v: {
					t: "array",
					v: [
						{ t: "uint", v: secs },
						{ t: "uint", v: nanos },
					],
				},
			});
		const max = 2n ** 64n - 1n;
		expect(() => dur(max - 1n, 1_000_000_000n)).not.toThrow();
		expect(() => dur(max, 1_000_000_000n)).toThrow("overflows u64");
	});

	test("strict decimals fit rust_decimal's mantissa and scale", () => {
		expect(normaliseDecimal("7922816251426433759354395033.5", true)).toBe(
			"7922816251426433759354395033.5",
		);
		expect(() =>
			normaliseDecimal("7922816251426433759354395033.6", true),
		).toThrow();
		expect(normaliseDecimal(`0.${"0".repeat(27)}1`, true)).toBe(
			`0.${"0".repeat(27)}1`,
		);
		expect(() => normaliseDecimal(`0.${"0".repeat(28)}1`, true)).toThrow();
		expect(normaliseDecimal(`1.${"0".repeat(40)}`, true)).toBe("1");
	});

	test("string record ids refuse text after the key", () => {
		const rid = (v: string) =>
			fromCbor({ t: "tag", tag: 8n, v: { t: "text", v } });
		for (const bad of [
			"person:1..5",
			"person:alice bob",
			"person:",
			":x",
			"person:{a: 1, a: 2}",
		])
			expect(() => rid(bad)).toThrow("not a record id");
	});

	test("protobuf polygons need an exterior and have closed rings", () => {
		const pt = (x: number, y: number) => ({ x, y });
		const poly = (exterior?: { points: { x: number; y: number }[] }) =>
			fromProto({
				value: {
					$case: "geometry",
					geometry: {
						geometry: {
							$case: "polygon",
							polygon: { exterior, interiors: [] },
						},
					},
				},
			} as never);
		expect(() => poly(undefined)).toThrow("missing exterior");
		const v = poly({ points: [pt(0, 0), pt(4, 0), pt(4, 4)] });
		expect(
			v.k === "geometry" && v.g.type === "Polygon" && v.g.coordinates[0],
		).toEqual([
			[0, 0],
			[4, 0],
			[4, 4],
			[0, 0],
		]);
	});

	test("an object key named __proto__ round-trips", () => {
		const v = { k: "object", v: [["__proto__", { k: "int", v: 1n }]] } as const;
		const j = toJson(v as never);
		expect(Object.hasOwn(j as object, "__proto__")).toBe(true);
		expect(
			JSON.stringify(j, (_, x) => (typeof x === "bigint" ? Number(x) : x)),
		).toBe('{"__proto__":1}');
		expect(equal(fromJson(JSON.parse('{"__proto__":1}')), v as never)).toBe(
			true,
		);
	});

	test("geometry coordinates carry special floats through typed JSON", () => {
		const j: Json = {
			$geometry: {
				type: "LineString",
				coordinates: [
					[{ $float: "-0" }, { $float: "NaN" }],
					[{ $float: "Infinity" }, 1.5],
				],
			},
		};
		const v = fromJson(j);
		expect(() => toCbor(v)).not.toThrow();
		expect(equal(fromCbor(toCbor(v)), v)).toBe(true);
		expect(toJson(v)).toEqual(j);
	});

	test("typed datetime and duration arrays are canonical", () => {
		for (const j of [
			{ $duration: [0, 1_000_000_000] },
			{ $duration: ["18446744073709551616", 0] },
			{ $duration: [1.5, 0] },
			{ $datetime: [0, -1] },
			{ $datetime: [0, 1_000_000_000] },
			{ $datetime: [1] },
		] as Json[])
			expect(() => fromJson(j)).toThrow();
		const d = fromJson({ $duration: ["18446744073709551615", 999_999_999] });
		expect(equal(fromCbor(toCbor(d)), d)).toBe(true);
	});

	test("negative durations are typed JSON and protobuf, never CBOR", () => {
		const neg = fromJson({ $duration: [-1, 500_000_000] });
		expect(toJson(neg)).toEqual({ $duration: [-1, 500_000_000] });
		expect(equal(decodeProto(encodeProto(neg)), neg)).toBe(true);
		expect(() => toCbor(neg)).toThrow("unsigned");
		const big = fromJson({ $duration: ["18446744073709551615", 0] });
		expect(() => encodeProto(big)).toThrow("int64");
	});

	test("sets drop duplicates however they are built", () => {
		const s = fromJson({ $set: [3, 1, 2, 1] });
		expect(toJson(s)).toEqual({ $set: [3, 1, 2] });
		expect(equal(fromCbor(toCbor(s)), s)).toBe(true);
		// A set built by hand, not through fromJson, is deduplicated on the wire.
		const raw = { k: "set" as const, v: [1, 1].map((n) => fromJson(n)) };
		const wire = toCbor(raw);
		expect(wire.t === "tag" && wire.v.t === "array" && wire.v.v.length).toBe(1);
		expect(encodeProto(raw)).toEqual(encodeProto(fromJson({ $set: [1] })));
	});

	test("the 4.0 decoder refuses what the server refuses", () => {
		const text = (v: string) => ({ t: "text" as const, v });
		for (const [tag, msg] of [
			[0n, "send tag 12"],
			[9n, "send tag 37"],
			[13n, "send tag 14"],
			[57n, "shaped block"],
			[181n, "use cbor.2"],
		] as const)
			expect(() => fromCbor({ t: "tag", tag, v: text("x") })).toThrow(msg);
		expect(() =>
			fromCbor({ t: "tag", tag: 6n, v: { t: "uint", v: 1n } }),
		).toThrow("NONE");
		expect(() =>
			fromCbor({
				t: "map",
				v: [
					[text("a"), { t: "uint", v: 1n }],
					[text("a"), { t: "uint", v: 2n }],
				],
			}),
		).toThrow("duplicate key a");
	});

	test("typed floats are numbers or the four special spellings", () => {
		for (const f of ["Infinty", "1.5", "", true, null] as Json[])
			expect(() => fromJson({ $float: f })).toThrow("$float");
		expect(toJson(fromJson({ $float: "-0" }))).toEqual({ $float: "-0" });
	});

	test("typed bytes must be hex", () => {
		expect(() => fromJson({ $bytes: "gg" })).toThrow("not hex");
		expect(() => fromJson({ $bytes: "0g" })).toThrow("not hex");
		expect(toJson(fromJson({ $bytes: "0aFF" }))).toEqual({ $bytes: "0aff" });
	});

	test("sized numbers are tagged under cbor.2 and widened under cbor", () => {
		const hex = (j: Json, format: "cbor" | "cbor.2") =>
			toHex(encode(toCbor(fromJson(j), format)));
		expect(hex({ $u8: 5 }, "cbor.2")).toBe("d8b505");
		expect(hex({ $u8: 5 }, "cbor")).toBe("05");
		expect(hex({ $i16: -3 }, "cbor.2")).toBe("d8b622");
		expect(hex({ $u64: "18446744073709551615" }, "cbor.2")).toBe(
			"d8ba1bffffffffffffffff",
		);
		// Past i64, plain cbor has only the decimal.
		expect(hex({ $u64: "18446744073709551615" }, "cbor")).toBe(
			"ca743138343436373434303733373039353531363135",
		);
		expect(hex({ $f32: 1.5 }, "cbor.2")).toBe("d8bcf93e00");
		expect(hex({ $f32: 0.10000000149011612 }, "cbor.2")).toBe("d8bcfa3dcccccd");
		expect(hex([{ $f16: "NaN" }], "cbor")).toBe("81f97e00");
		// Nested values carry the format down.
		expect(hex({ a: [{ $i8: -1 }] }, "cbor.2")).toBe("a1616181d8b420");
	});

	test("the cbor.2 decoder reads sized numbers within their kind", () => {
		const v = (hex: string) => toJson(fromCbor(decode(fromHex(hex)), "cbor.2"));
		expect(v("d8b505")).toEqual({ $u8: 5 });
		expect(v("d8ba1bffffffffffffffff")).toEqual({
			$u64: "18446744073709551615",
		});
		expect(v("d8bbf93e00")).toEqual({ $f16: 1.5 });
		for (const [hex, msg] of [
			["d8b41880", "integer 128 is outside the 8-bit signed range"],
			["d8b520", "integer -1 is outside the 8-bit unsigned range"],
			["d8bbfb3fb999999999999a", "cannot be losslessly represented as f16"],
			["d8bc05", "Expected a CBOR float under tag 188"],
			["d8b5f93c00", "Expected a CBOR integer under tag 181"],
		] as const)
			expect(() => fromCbor(decode(fromHex(hex)), "cbor.2")).toThrow(msg);
		// Plain cbor still refuses the tags.
		expect(() => fromCbor(decode(fromHex("d8b505")))).toThrow("use cbor.2");
		// A sized record id key is an int key; one past i64 is refused.
		expect(v("d80882617ad8b505")).toEqual({
			$record: { table: "z", key: 5 },
		});
		expect(() =>
			fromCbor(decode(fromHex("d80882617ad8ba1bffffffffffffffff")), "cbor.2"),
		).toThrow("64-bit signed range");
	});

	test("typed sized numbers are range-checked", () => {
		expect(() => fromJson({ $u8: 256 })).toThrow("$u8");
		expect(() => fromJson({ $i8: "1.5" })).toThrow("$i8");
		expect(() => fromJson({ $f16: 0.1 })).toThrow("f16");
		expect(toJson(fromJson({ $f32: "-Infinity" }))).toEqual({
			$f32: "-Infinity",
		});
		expect(equal(fromJson({ $u8: 5 }), fromJson(5))).toBe(false);
	});

	test("sized numbers have their own protobuf arms", () => {
		const hex = (j: Json) => toHex(encodeProto(fromJson(j)));
		// Field 23, sint32: zigzag(-1) is 1.
		expect(hex({ $i8: -1 })).toBe("b80101");
		// Field 24, uint32.
		expect(hex({ $u8: 255 })).toBe("c001ff01");
		// Field 29, uint64.
		expect(hex({ $u64: "18446744073709551615" })).toBe(
			"e801ffffffffffffffffff01",
		);
		// Field 30, float (fixed32, little-endian).
		expect(hex({ $f16: 1.5 })).toBe("f5010000c03f");
		for (const j of [
			{ $i16: -32768 },
			{ $u32: 4294967295 },
			{ $f16: "NaN" },
			{ $f32: 0.10000000149011612 },
		] as Json[])
			expect(toJson(decodeProto(encodeProto(fromJson(j))))).toEqual(j);
		// sint32 holds more than an i8 (zigzag 400 is 200), and float more than an f16.
		expect(() => decodeProto(fromHex("b8019003"))).toThrow(
			"outside the 8-bit signed range",
		);
		expect(() => decodeProto(fromHex("f501cdcccc3d"))).toThrow(
			"cannot be losslessly represented as f16",
		);
	});
});
