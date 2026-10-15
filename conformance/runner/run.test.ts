import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadScenarios } from "./run";

/** Loads one scenario whose single `version` step has the given `expect`. */
function load(expectYaml: string) {
	const dir = mkdtempSync(join(tmpdir(), "scenarios-"));
	writeFileSync(
		join(dir, "x.yaml"),
		`scenarios:\n  - name: x\n    steps:\n      - version: {}\n        expect: ${expectYaml}\n`,
	);
	return loadScenarios(dir);
}

describe("loadScenarios", () => {
	test("accepts result, error and per-transport expectations", () => {
		expect(() => load("{ result: 1 }")).not.toThrow();
		expect(() => load("{ error: { kind: NotFound } }")).not.toThrow();
		expect(() =>
			load("{ ws: { result: 1 }, http: { error: {} } }"),
		).not.toThrow();
		expect(() => load("{ http: { result: 1 } }")).not.toThrow();
	});

	test("rejects expectations that would assert nothing", () => {
		expect(() => load("{ reslt: 1 }")).toThrow("expect must be");
		expect(() => load("{}")).toThrow("expect must be");
		expect(() => load("{ result: 1, error: {} }")).toThrow("expect must be");
		expect(() => load("{ ws: { reslt: 1 } }")).toThrow("(ws)");
		expect(() => load("{ ws: { result: 1 }, htp: { result: 1 } }")).toThrow(
			"only ws and http",
		);
	});
});
