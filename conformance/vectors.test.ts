/**
 * Offline checks of spec/cbor-tags.yaml and spec/vectors/cbor.yaml.
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
}

interface Tag {
	tag: bigint;
	name: string;
	status: "active" | "decode-only" | "reserved";
}

const vectors = read("../spec/vectors/cbor.yaml").vectors as Vector[];
const tags = read("../spec/cbor-tags.yaml").tags as Tag[];

describe("cbor vectors", () => {
	for (const v of vectors) {
		test(v.name, () => {
			expect(v.cbor, "run `bun run vectors:write`").toBeString();
			const bytes = fromHex(v.cbor);
			if (v.kind === "reject") {
				expect(() => fromCbor(decode(bytes))).toThrow();
				// A raw vector's diag is prose: its bytes are below what diag can say.
				if (!v.raw)
					expect(toHex(encode(parseDiagnostic(v.diag as string)))).toBe(v.cbor);
				return;
			}
			const expected = fromJson(v.value as Json);
			const decoded = fromCbor(decode(bytes));
			expect(
				equal(decoded, expected),
				`decodes to ${JSON.stringify(toJson(decoded), big)}`,
			).toBeTrue();
			if (v.kind === "canonical") {
				expect(toHex(encode(toCbor(expected)))).toBe(v.cbor);
				expect(diagnostic(decode(bytes))).toBe(v.diag as string);
			} else {
				// A raw vector's diag is prose: its bytes are below what diag can say.
				if (!v.raw)
					expect(toHex(encode(parseDiagnostic(v.diag as string)))).toBe(v.cbor);
				expect(toHex(encode(toCbor(expected)))).toBe(v.canonical as string);
			}
		});
	}

	test("names are unique", () => {
		expect(new Set(vectors.map((v) => v.name)).size).toBe(vectors.length);
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
	for (const v of vectors) if (!v.raw) walk(decode(fromHex(v.cbor)));

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
