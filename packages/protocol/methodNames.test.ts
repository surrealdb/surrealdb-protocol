/**
 * Holds `methodNames.ts` against the generated client.
 *
 * Hand-written method-name constants are only worth having if they cannot go
 * stale, and constants on their own just move the stale literal somewhere
 * tidier. So rather than trusting the list, this reads the generated
 * `SurrealDBServiceClientImpl` and extracts the method names it actually
 * dispatches on, then compares the two sets. Renaming, adding or removing an RPC
 * without updating `methodNames.ts` fails here.
 *
 * The Rust side has the equivalent test in `rust/method_names.rs`, checked
 * against its own generated client. Neither is checked against the other: both
 * are checked against the schema, which is the thing that decides.
 *
 * Run: bun test
 */

import { describe, expect, test } from "bun:test";

import {
	ALL_METHOD_NAMES,
	grpcPath,
	METHOD_NAMES,
	SERVICE_NAME,
	VERSION_PSEUDO_METHOD,
} from "./methodNames";

/**
 * The generated client, read as text.
 *
 * `import.meta.dir` keeps this relative to the file rather than to the working
 * directory the tests happen to be run from.
 */
const generatedSource = await Bun.file(
	`${import.meta.dir}/../../gen/ts/surrealdb/protocol/rpc/v1/rpc.ts`,
).text();

/**
 * Every method the generated client dispatches.
 *
 * ts-proto emits one `this.rpc.request(this.service, "Method", data)` (or
 * `.serverStreamingRequest` / `.clientStreamingRequest`) call per RPC, so the
 * second argument is the authoritative list of method names.
 */
function generatedMethodNames(): Set<string> {
	const pattern =
		/this\.rpc\.(?:request|serverStreamingRequest|clientStreamingRequest|bidirectionalStreamingRequest)\(\s*this\.service,\s*"([A-Za-z0-9_]+)"/g;
	return new Set(
		Array.from(
			generatedSource.matchAll(pattern),
			(match) => match[1] as string,
		),
	);
}

describe("method names", () => {
	test("the extraction still matches what ts-proto emits", () => {
		// Guards the guard: if ts-proto changes how it dispatches, the regex above
		// silently matches nothing and every comparison below trivially passes.
		expect(generatedMethodNames().size).toBeGreaterThan(0);
	});

	test("METHOD_NAMES matches the generated service exactly", () => {
		const generated = generatedMethodNames();
		const declared = new Set(Object.keys(METHOD_NAMES));

		const missing = [...generated].filter((name) => !declared.has(name)).sort();
		const extra = [...declared].filter((name) => !generated.has(name)).sort();

		expect({ missing, extra }).toEqual({ missing: [], extra: [] });
	});

	test("qualified names are built from the generated service name", () => {
		expect(SERVICE_NAME).toBe("surrealdb.protocol.rpc.v1.SurrealDBService");
		expect(METHOD_NAMES.ExportSurql).toBe(
			"surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql",
		);
	});

	test("the deny-list form carries no leading slash and the gRPC path does", () => {
		// Getting this backwards is the exact bug the constants exist to prevent.
		for (const name of ALL_METHOD_NAMES) {
			expect(name.startsWith("/")).toBe(false);
		}
		expect(grpcPath(METHOD_NAMES.ExportSurql)).toBe(
			"/surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql",
		);
	});

	test("there are no duplicate names", () => {
		expect(new Set(ALL_METHOD_NAMES).size).toBe(ALL_METHOD_NAMES.length);
	});

	test("Version is reported through server_version, not as an RPC", () => {
		expect(ALL_METHOD_NAMES.some((name) => name.endsWith("/Version"))).toBe(
			false,
		);
		expect(VERSION_PSEUDO_METHOD).toBe("Version");
	});
});
