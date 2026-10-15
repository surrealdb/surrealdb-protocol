/**
 * The conformance runner's command line.
 *
 *   bun conformance/runner/cli.ts                      the reference adapter
 *   bun conformance/runner/cli.ts --driver "<cmd>"     an SDK's driver process
 *
 * Options:
 *   --driver <cmd>        run `cmd` (through sh) once per scenario as the adapter
 *   --transport ws,http   transports to run (default: both)
 *   --filter <regex>      only scenarios whose name matches
 *   --report <file.json>  write every result, with the adapter's hello, as JSON
 *   --scenarios <dir>     read scenarios from `dir` (default: ../scenarios)
 *   --list                list the scenarios and exit
 *
 * Exits non-zero if any scenario failed. Skips are reported, not failed: a
 * skip means the adapter does not implement an op, the scenario does not
 * apply to the transport, or the server is too old.
 *
 * Environment: SURREAL_BIN (the surreal binary), SURREAL_URL (an already
 * running server; scenarios needing their own flags are then skipped),
 * CONFORMANCE_SERVER_LOGS=1 (pass the server's logs through),
 * CONFORMANCE_OP_TIMEOUT_MS (how long a driver may take per op; default 30000).
 */

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { processAdapter } from "./process";
import type { Transport } from "./protocol";
import { rawAdapter } from "./raw";
import { loadScenarios, type RunResult, runScenarios } from "./run";

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		driver: { type: "string" },
		transport: { type: "string", default: "ws,http" },
		filter: { type: "string" },
		report: { type: "string" },
		scenarios: { type: "string" },
		list: { type: "boolean", default: false },
	},
});

const scenarios = loadScenarios(values.scenarios);
if (values.list) {
	for (const s of scenarios)
		console.log(
			`${s.name.padEnd(48)} ${s.transports.join(",").padEnd(8)} ${s.file}`,
		);
	process.exit(0);
}

const transports = (values.transport as string)
	.split(",")
	.map((t) => t.trim()) as Transport[];
if (
	transports.length === 0 ||
	transports.some((t) => t !== "ws" && t !== "http")
) {
	console.error(
		`--transport takes ws, http or both, got "${values.transport}"`,
	);
	process.exit(2);
}
const adapter = values.driver ? processAdapter(values.driver) : rawAdapter;
const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number, s: string) =>
	colour ? `\x1b[${code}m${s}\x1b[0m` : s;
const mark = {
	pass: paint(32, "pass"),
	fail: paint(31, "FAIL"),
	skip: paint(33, "skip"),
};

const { hello, results } = await runScenarios(scenarios, {
	adapter,
	transports,
	filter: values.filter ? new RegExp(values.filter) : undefined,
	onResult(r: RunResult) {
		const o = r.outcome;
		const detail =
			o.status === "fail"
				? `  ${o.message}`
				: o.status === "skip"
					? `  (${o.reason})`
					: "";
		console.log(
			`${mark[o.status]} ${r.transport.padEnd(4)} ${r.scenario}${detail}`,
		);
	},
}).catch((e: Error) => {
	console.error(`conformance run aborted: ${e.message}`);
	process.exit(1);
});

const count = (s: string) =>
	results.filter((r) => r.outcome.status === s).length;
console.log(
	`\n${hello.name} ${hello.version}: ${count("pass")} passed, ${count("fail")} failed, ${count("skip")} skipped`,
);
if (values.report) {
	writeFileSync(
		values.report,
		JSON.stringify({ adapter: hello, results }, null, 2),
	);
	console.log(`report written to ${values.report}`);
}
// Running nothing is not a pass: a mistyped --filter would otherwise go green.
if (results.length === 0) {
	console.error(
		values.filter
			? `no scenario matches --filter ${values.filter}`
			: "no scenarios ran",
	);
	process.exit(1);
}
process.exit(count("fail") > 0 ? 1 : 0);
