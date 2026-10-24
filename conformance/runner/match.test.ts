import { describe, expect, test } from "bun:test";
import { fromJson, type Json } from "../lib/value";
import { type Captures, match } from "./match";

const ok = (pattern: Json, actual: Json, captures: Captures = new Map()) =>
	match(pattern, fromJson(actual), captures);

describe("match", () => {
	test("objects match exactly unless partial", () => {
		expect(ok({ a: 1 }, { a: 1 })).toBeNull();
		expect(ok({ a: 1 }, { a: 1, b: 2 })).not.toBeNull();
		expect(ok({ $partial: { a: 1 } }, { a: 1, b: 2 })).toBeNull();
	});

	test("$unordered backtracks past a loose pattern", () => {
		expect(ok({ $unordered: [{ $any: null }, 1] }, [1, 2])).toBeNull();
		expect(ok({ $unordered: [{ $any: null }, 1] }, [2, 3])).not.toBeNull();
		expect(ok({ $unordered: [1, 2] }, [2, 1, 3])).not.toBeNull();
	});

	test("$contains backtracks and needs distinct elements", () => {
		expect(ok({ $contains: [{ $type: "int" }, 1] }, [1, 2, "x"])).toBeNull();
		expect(ok({ $contains: [1, 1] }, [1, 2])).not.toBeNull();
	});

	test("captures from the chosen assignment are kept", () => {
		const captures: Captures = new Map();
		expect(
			ok({ $unordered: [{ $capture: "first" }, 1] }, [1, 2], captures),
		).toBeNull();
		expect(captures.get("first")).toBe(2);
	});

	test("$oneOf, $not, $match, $length", () => {
		expect(ok({ $oneOf: [1, "a"] }, "a")).toBeNull();
		expect(ok({ $not: { $match: "^x" } }, "yes")).toBeNull();
		expect(ok({ $length: 2 }, [0, 0])).toBeNull();
	});
});
