import { describe, expect, test } from "bun:test";
import { decodeProto, encodeProto, fromProto } from "./proto";
import {
	equal,
	fromCbor,
	fromJson,
	type Json,
	toCbor,
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
});
