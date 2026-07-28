/**
 * Cross-language regression test for the NONE / NULL / absent distinction.
 *
 * The bug this pins was one-directional. Rust encoded `{"k": NONE}`, and
 * TypeScript decoded it as `{}`: prost omitted a map entry whose value equalled
 * the default (and `NONE` *was* the default, being an unset oneof), then
 * ts-proto's decoder dropped the entry because it guards on
 * `entry.value !== undefined`. Rust-to-Rust round-tripped perfectly, which is
 * exactly why it survived single-language testing.
 *
 * So testing each language against itself is not enough. The byte strings
 * below are produced by the Rust test `none_null_and_absent_are_distinct_across_encoding`
 * in rust/lib.rs and asserted there too; this file decodes those same bytes
 * with the TypeScript codegen. If either side's encoding drifts, one of the two
 * fails.
 *
 * Run: bun test
 */

import { describe, expect, test } from "bun:test";

import { Object as ProtoObject } from "../gen/ts/surrealdb/protocol/v1/value";

/** Bytes produced by Rust. See the matching assertions in rust/lib.rs. */
const RUST_ENCODED = {
	// items { key: "k", value { none {} } }  -- field 21 is present on the wire
	none: "0a080a016b1203aa0100",
	// items { key: "k", value { null {} } }
	null: "0a070a016b12020a00",
	// no items at all
	absent: "",
} as const;

function decode(hex: string): ProtoObject {
	const bytes = new Uint8Array(
		hex.length === 0
			? []
			: (hex.match(/.{2}/g) ?? []).map((byte) => Number.parseInt(byte, 16)),
	);
	return ProtoObject.decode(bytes);
}

describe("NONE / NULL / absent survive Rust -> TypeScript", () => {
	test("a NONE entry keeps its key", () => {
		const object = decode(RUST_ENCODED.none);

		// The regression: this used to be an empty object.
		expect(object.items).toHaveLength(1);
		expect(object.items[0]?.key).toBe("k");

		// And the value is NONE specifically -- not NULL, not missing.
		const value = object.items[0]?.value;
		expect(value).toBeDefined();
		expect(value?.value?.$case).toBe("none");
	});

	test("a NULL entry is distinguishable from a NONE entry", () => {
		const nullObject = decode(RUST_ENCODED.null);

		expect(nullObject.items).toHaveLength(1);
		expect(nullObject.items[0]?.value?.value?.$case).toBe("null");

		const noneObject = decode(RUST_ENCODED.none);
		expect(noneObject.items[0]?.value?.value?.$case).not.toBe(
			nullObject.items[0]?.value?.value?.$case,
		);
	});

	test("an absent key stays absent", () => {
		expect(decode(RUST_ENCODED.absent).items).toHaveLength(0);
	});

	test("the old encoding is now detectably broken rather than silently lossy", () => {
		// What `{"k": NONE}` looked like before: an entry with a key and no
		// value field, because NONE was an unset oneof and therefore equal to
		// the default that prost omits.
		const legacy = decode("0a030a016b");

		// Both halves of the fix show up here. `repeated KeyValue` means the
		// entry survives at all -- the old `map` codegen dropped the whole key
		// when the value field was missing. And because `NoneValue` is now an
		// explicit variant, a genuine NONE always writes its value field, so a
		// missing value can only mean a malformed or truncated message.
		expect(legacy.items).toHaveLength(1);
		expect(legacy.items[0]?.key).toBe("k");
		expect(legacy.items[0]?.value).toBeUndefined();

		// Which is distinguishable from a real NONE. That is the whole point:
		// a consumer can reject this, where before it saw a plausible `{}`.
		expect(decode(RUST_ENCODED.none).items[0]?.value).toBeDefined();
	});

	test("all three encode back to the bytes Rust produced", () => {
		// The reverse direction. TypeScript -> bytes must match Rust -> bytes,
		// or the two languages disagree about the wire even though each is
		// internally consistent.
		for (const [name, hex] of Object.entries(RUST_ENCODED)) {
			const reencoded = Buffer.from(
				ProtoObject.encode(decode(hex)).finish(),
			).toString("hex");
			expect(reencoded, `${name} re-encoded`).toBe(hex);
		}
	});
});
