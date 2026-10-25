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

	test("rejects misspelt scenario fields and empty scenarios", () => {
		const write = (yaml: string) => {
			const dir = mkdtempSync(join(tmpdir(), "scenarios-"));
			writeFileSync(join(dir, "x.yaml"), yaml);
			return () => loadScenarios(dir);
		};
		expect(
			write("scenarios:\n  - name: x\n    stpes:\n      - version: {}\n"),
		).toThrow("unknown field stpes");
		expect(write("scenarios:\n  - name: x\n    steps: []\n")).toThrow(
			"non-empty list",
		);
		expect(
			write(
				"scenarios:\n  - name: x\n    setup: defualt\n    steps:\n      - version: {}\n",
			),
		).toThrow("setup must be");
	});

	test("checks the server block", () => {
		const write = (server: string) => {
			const dir = mkdtempSync(join(tmpdir(), "scenarios-"));
			writeFileSync(
				join(dir, "x.yaml"),
				`scenarios:\n  - name: x\n    server: ${server}\n    steps:\n      - version: {}\n`,
			);
			return () => loadScenarios(dir);
		};
		expect(
			write('{ args: ["--deny-rpc", "run"], env: { A: "1" } }'),
		).not.toThrow();
		expect(write('{ arg: ["--deny-rpc"] }')).toThrow("unknown field arg");
		expect(write("{ args: [1] }")).toThrow("list of strings");
		expect(write("{ env: { A: 1 } }")).toThrow("names to strings");
		expect(write("[]")).toThrow("must be an object");
	});

	test("checks the format", () => {
		const write = (format: string) => {
			const dir = mkdtempSync(join(tmpdir(), "scenarios-"));
			writeFileSync(
				join(dir, "x.yaml"),
				`scenarios:\n  - name: x\n    format: ${format}\n    steps:\n      - version: {}\n`,
			);
			return () => loadScenarios(dir);
		};
		expect(write("cbor")()[0]?.format).toBe("cbor");
		expect(write("cbor.2")()[0]?.format).toBe("cbor.2");
		expect(write("json")).toThrow("format must be cbor or cbor.2");
	});

	test("rejects a file whose root is not a scenarios list", () => {
		for (const yaml of [
			"scenario:\n  - name: x\n",
			"[]\n",
			"scenarios: {}\n",
			"scenarios: []\nextra: 1\n",
		]) {
			const dir = mkdtempSync(join(tmpdir(), "scenarios-"));
			writeFileSync(join(dir, "x.yaml"), yaml);
			expect(() => loadScenarios(dir)).toThrow("the root must be");
		}
	});
});
