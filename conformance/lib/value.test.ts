import { describe, expect, test } from "bun:test";
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
});
