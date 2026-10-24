/**
 * Offline checks of spec/cbor-tags.yaml and the vectors in spec/vectors.
 *
 * These run in plain `bun test` with no server: they hold the committed
 * vectors to the reference codec in conformance/lib, and the tag table to the
 * vectors. `bun run vectors:check` is the live counterpart.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
	type CborItem,
	decode,
	diagnostic,
	encode,
	fromHex,
	parseDiagnostic,
	toHex,
} from "./lib/cbor";
import { decodeProto, encodeProto } from "./lib/proto";
import {
	equal,
	type Format,
	fromCbor,
	fromJson,
	type Json,
	toCbor,
	toJson,
} from "./lib/value";

const read = (path: string) =>
	parse(readFileSync(new URL(path, import.meta.url), "utf8"), {
		intAsBigInt: true,
	});

interface Vector {
	name: string;
	kind: "canonical" | "decode" | "reject";
	surql?: string;
	diag?: string;
	raw?: boolean;
	value?: Json;
	cbor: string;
	canonical?: string;
	server_quirk?: string;
	legacy?: { canonical: string };
	formats?: Format[];
	since?: string;
}

interface Tag {
	tag: bigint;
	name: string;
	status: "active" | "refused" | "reserved";
	use?: bigint;
	formats?: ("cbor" | "cbor.2" | "shaped")[];
}

const vectors = read("../spec/vectors/cbor.yaml").vectors as Vector[];
const cbor2Vectors = read("../spec/vectors/cbor2.yaml").vectors as Vector[];
const tags = read("../spec/cbor-tags.yaml").tags as Tag[];

/** Holds `v` to the reference codec in `format`. */
function check(v: Vector, format: Format) {
	expect(v.cbor, "run `bun run vectors:write`").toBeString();
	const bytes = fromHex(v.cbor);
	const decode2 = (b: Uint8Array) => fromCbor(decode(b), format);
	if (v.kind === "reject") {
		expect(() => decode2(bytes)).toThrow();
		// A raw vector's diag is prose: its bytes are below what diag can say.
		if (!v.raw)
			expect(toHex(encode(parseDiagnostic(v.diag as string)))).toBe(v.cbor);
		return;
	}
	const expected = fromJson(v.value as Json);
	const decoded = decode2(bytes);
	expect(
		equal(decoded, expected),
		`decodes to ${JSON.stringify(toJson(decoded), big)}`,
	).toBeTrue();
	if (v.kind === "canonical") {
		expect(toHex(encode(toCbor(expected, format)))).toBe(v.cbor);
		expect(diagnostic(decode(bytes))).toBe(v.diag as string);
	} else {
		if (!v.raw)
			expect(toHex(encode(parseDiagnostic(v.diag as string)))).toBe(v.cbor);
		expect(toHex(encode(toCbor(expected, format)))).toBe(v.canonical as string);
	}
}

describe("cbor vectors", () => {
	for (const v of vectors) {
		test(v.name, () => {
			if (v.legacy) {
				expect(v.kind, "only a reject vector has a legacy entry").toBe(
					"reject",
				);
				expect(
					v.legacy.canonical,
					"run `bun run vectors:write` on 3.x",
				).toBeString();
				// What a server before 4.0 sent back is still valid 4.0 output.
				fromCbor(decode(fromHex(v.legacy.canonical)));
			}
			check(v, "cbor");
		});
	}

	test("names are unique", () => {
		expect(new Set(vectors.map((v) => v.name)).size).toBe(vectors.length);
	});
});

describe("cbor.2 vectors", () => {
	for (const v of cbor2Vectors) test(v.name, () => check(v, "cbor.2"));

	// cbor.2 is plain cbor plus the sized-number tags.
	for (const v of vectors.filter(
		(v) => !v.formats || v.formats.includes("cbor.2"),
	))
		test(`cbor.yaml ${v.name}`, () => check(v, "cbor.2"));

	test("a plain-cbor-only reject vector is a sized number cbor.2 accepts", () => {
		for (const v of vectors.filter(
			(v) => v.kind === "reject" && v.formats && !v.formats.includes("cbor.2"),
		))
			expect(() => fromCbor(decode(fromHex(v.cbor)), "cbor.2")).not.toThrow();
	});

	test("names are unique across both files", () => {
		const names = [...vectors, ...cbor2Vectors].map((v) => v.name);
		expect(new Set(names).size).toBe(names.length);
	});

	test("there are no legacy entries", () => {
		expect(cbor2Vectors.filter((v) => v.legacy)).toEqual([]);
	});
});

interface ProtoVector {
	name: string;
	kind: "canonical" | "proto-only";
	value: Json;
	proto: string | null;
	notes?: string;
}

const protoVectors = read("../spec/vectors/proto.yaml")
	.vectors as ProtoVector[];

describe("protobuf vectors", () => {
	for (const v of protoVectors) {
		test(v.name, () => {
			if (v.proto === null) {
				expect(
					v.notes,
					"a vector with no protobuf encoding says why",
				).toBeString();
				return;
			}
			const expected = fromJson(v.value);
			const decoded = decodeProto(fromHex(v.proto));
			expect(
				equal(decoded, expected),
				`decodes to ${JSON.stringify(toJson(decoded), big)}`,
			).toBeTrue();
			expect(toHex(encodeProto(expected))).toBe(v.proto);
		});
	}

	test("mirrors every canonical cbor vector", () => {
		const canonical = vectors
			.filter((v) => v.kind === "canonical")
			.map((v) => v.name);
		expect(
			protoVectors.filter((v) => v.kind === "canonical").map((v) => v.name),
		).toEqual(canonical);
	});
});

describe("cbor tag table", () => {
	const used = new Set<bigint>();
	const walk = (i: CborItem) => {
		if (i.t === "tag") {
			used.add(i.tag);
			walk(i.v);
		} else if (i.t === "array") i.v.forEach(walk);
		else if (i.t === "map")
			for (const [k, x] of i.v) {
				walk(k);
				walk(x);
			}
	};
	// Raw vectors are malformed CBOR, so there is nothing to walk.
	for (const v of [...vectors, ...cbor2Vectors])
		if (!v.raw && v.cbor) walk(decode(fromHex(v.cbor)));

	test("a refused tag names an active replacement", () => {
		for (const t of tags.filter((t) => t.status === "refused"))
			expect(tags.find((r) => r.tag === t.use)?.status, `tag ${t.tag}`).toBe(
				"active",
			);
	});

	test("tags are unique and sorted", () => {
		const nums = tags.map((t) => t.tag);
		expect(nums).toEqual([...new Set(nums)].sort((a, b) => (a < b ? -1 : 1)));
	});

	for (const t of tags) {
		test(`tag ${t.tag} (${t.name}) has a vector`, () => {
			expect(used.has(t.tag)).toBeTrue();
		});
	}

	test("every tag in a vector is in the table", () => {
		const known = new Set(tags.map((t) => t.tag));
		expect([...used].filter((t) => !known.has(t) && t !== 99n)).toEqual([]);
	});
});

function big(_: string, x: unknown) {
	return typeof x === "bigint" ? x.toString() : x;
}
