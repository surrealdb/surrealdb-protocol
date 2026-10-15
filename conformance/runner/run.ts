/**
 * Loads the scenarios and runs them against an adapter, once per transport.
 *
 * Scenario files are conformance/scenarios/*.yaml. The format is documented in
 * conformance/README.md; in short:
 *
 *   scenarios:
 *     - name: query-per-statement-errors
 *       description: ...
 *       source: where the scenario was taken from
 *       transports: [ws, http]      # default: both
 *       since: "3.0.0"              # oldest server it applies to
 *       server: { args: [...] }     # extra `surreal start` flags; gets its own server
 *       setup: default              # default | connect | none
 *       steps:
 *         - query: { sql: "RETURN 1; THROW 'boom'" }
 *           expect:
 *             result: [{ ok: true, result: 1 }, { ok: false, error: { kind: Thrown } }]
 *
 * A step is one op (see protocol.ts) plus optional `expect`, `capture`,
 * `transports` and `note`. `expect` is `{result: pattern}`, `{error: pattern}`,
 * or per transport `{ws: ..., http: ...}`; with no `expect` the step only has
 * to succeed. Patterns are described in match.ts. `capture: name` remembers
 * the step's result; `{$ref: name}` anywhere in a later step's arguments or
 * patterns stands for it. The runner pre-captures `namespace` and `database`
 * (a fresh pair per run), `database_b` (a second fresh database name), `url`
 * and `transport`.
 *
 * Runner-only steps: `sleep: <ms>`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { ROOT, type Server, startServer } from "../lib/server";
import { fromJson, type Json } from "../lib/value";
import { type Captures, match, resolve } from "./match";
import {
	AdapterError,
	type AdapterFactory,
	type Hello,
	OP_ARGS,
	OPS,
	type Transport,
} from "./protocol";

export interface Expectation {
	result?: Json;
	error?: Json;
}

export interface Step {
	op: string;
	args: Record<string, Json>;
	expect?: Expectation | { ws?: Expectation; http?: Expectation };
	capture?: string;
	transports?: Transport[];
	note?: string;
}

export interface Scenario {
	file: string;
	name: string;
	description?: string;
	source?: string;
	transports: Transport[];
	since?: string;
	server?: { args?: string[]; env?: Record<string, string> };
	setup: "default" | "connect" | "none";
	steps: Step[];
}

export type Outcome =
	| { status: "pass" }
	| { status: "fail"; step: number; op: string; message: string }
	| { status: "skip"; reason: string };

export interface RunResult {
	scenario: string;
	file: string;
	transport: Transport;
	outcome: Outcome;
	ms: number;
}

const RUNNER_OPS = new Set(["sleep"]);
const STEP_KEYS = new Set(["expect", "capture", "transports", "note"]);
const SCENARIO_KEYS = new Set([
	"name",
	"description",
	"source",
	"transports",
	"since",
	"server",
	"setup",
	"steps",
]);
const SETUPS = new Set(["default", "connect", "none"]);

export const SCENARIO_DIR = new URL("../scenarios/", import.meta.url).pathname;

/** Loads and validates every scenario file in `dir`. */
export function loadScenarios(dir = SCENARIO_DIR): Scenario[] {
	const out: Scenario[] = [];
	const names = new Set<string>();
	for (const file of readdirSync(dir)
		.filter((f) => f.endsWith(".yaml"))
		.sort()) {
		const doc = parse(readFileSync(join(dir, file), "utf8"), {
			intAsBigInt: true,
		}) as unknown;
		// A misspelt root such as `scenario:` would otherwise drop the whole file.
		if (
			typeof doc !== "object" ||
			doc === null ||
			!Array.isArray((doc as { scenarios?: unknown }).scenarios) ||
			Object.keys(doc).some((k) => k !== "scenarios")
		)
			throw new Error(
				`${file}: the root must be { scenarios: [...] } and nothing else`,
			);
		for (const raw of (doc as { scenarios: Record<string, unknown>[] })
			.scenarios) {
			const name = raw.name as string;
			const where = `${file}: ${name}`;
			if (!name) throw new Error(`${file}: a scenario has no name`);
			if (names.has(name)) throw new Error(`${where}: duplicate scenario name`);
			names.add(name);
			// A misspelt key such as `stpes` would otherwise leave a scenario that
			// runs only its setup and passes.
			const unknown = Object.keys(raw).filter((k) => !SCENARIO_KEYS.has(k));
			if (unknown.length)
				throw new Error(`${where}: unknown field ${unknown.join(", ")}`);
			if (!Array.isArray(raw.steps) || raw.steps.length === 0)
				throw new Error(`${where}: steps must be a non-empty list`);
			if (raw.setup !== undefined && !SETUPS.has(raw.setup as string))
				throw new Error(
					`${where}: setup must be default, connect or none, got ${JSON.stringify(raw.setup)}`,
				);
			const steps = ((raw.steps as Record<string, unknown>[]) ?? []).map(
				(s, i) => {
					const ops = Object.keys(s).filter((k) => !STEP_KEYS.has(k));
					if (ops.length !== 1)
						throw new Error(
							`${where}: step ${i + 1} must have exactly one op, has ${ops.join(", ") || "none"}`,
						);
					const op = ops[0] as string;
					if (!(OPS as readonly string[]).includes(op) && !RUNNER_OPS.has(op))
						throw new Error(`${where}: step ${i + 1}: unknown op ${op}`);
					const args = s[op];
					if (
						op !== "sleep" &&
						args !== null &&
						args !== undefined &&
						(typeof args !== "object" || Array.isArray(args))
					)
						throw new Error(
							`${where}: step ${i + 1}: ${op} takes named arguments, got ${JSON.stringify(args, big)}`,
						);
					const allowed = OP_ARGS[op as keyof typeof OP_ARGS];
					const unknown =
						allowed && args && typeof args === "object"
							? Object.keys(args).filter((k) => !allowed.includes(k))
							: [];
					if (unknown.length)
						throw new Error(
							`${where}: step ${i + 1}: ${op} has no argument ${unknown.join(", ")}`,
						);
					return {
						op,
						args: (args === null || args === undefined
							? {}
							: typeof args === "object"
								? args
								: { value: args }) as Record<string, Json>,
						expect: expectation(s.expect, `${where}: step ${i + 1}`),
						capture: s.capture as string | undefined,
						transports: transportList(s.transports, `${where}: step ${i + 1}`),
						note: s.note as string | undefined,
					};
				},
			);
			out.push({
				file,
				name,
				description: raw.description as string | undefined,
				source: raw.source as string | undefined,
				transports: transportList(raw.transports, where) ?? ["ws", "http"],
				since: raw.since as string | undefined,
				server: serverConfig(raw.server, where),
				setup: (raw.setup as Scenario["setup"] | undefined) ?? "default",
				steps,
			});
		}
	}
	return out;
}

/**
 * A step's `expect`, refusing anything that would assert nothing: a misspelt
 * key such as `reslt` would otherwise let any successful call pass.
 */
function expectation(raw: unknown, where: string): Step["expect"] {
	if (raw === undefined) return undefined;
	const obj = (x: unknown): x is Record<string, unknown> =>
		typeof x === "object" && x !== null && !Array.isArray(x);
	const one = (x: unknown, at: string): Expectation => {
		const keys = obj(x) ? Object.keys(x) : [];
		if (keys.length !== 1 || (keys[0] !== "result" && keys[0] !== "error"))
			throw new Error(
				`${at}: expect must be {result: ...} or {error: ...}, got ${JSON.stringify(x, big)}`,
			);
		return x as Expectation;
	};
	if (obj(raw) && ("ws" in raw || "http" in raw)) {
		const extra = Object.keys(raw).filter((k) => k !== "ws" && k !== "http");
		if (extra.length)
			throw new Error(
				`${where}: a per-transport expect has only ws and http, not ${extra.join(", ")}`,
			);
		return {
			ws: raw.ws === undefined ? undefined : one(raw.ws, `${where} (ws)`),
			http:
				raw.http === undefined ? undefined : one(raw.http, `${where} (http)`),
		};
	}
	return one(raw, where);
}

/** A scenario's `server`: only `args` (strings) and `env` (string values). */
function serverConfig(raw: unknown, where: string): Scenario["server"] {
	if (raw === undefined) return undefined;
	const bad = (why: string) => new Error(`${where}: server ${why}`);
	if (typeof raw !== "object" || raw === null || Array.isArray(raw))
		throw bad("must be an object with args and/or env");
	const r = raw as Record<string, unknown>;
	const extra = Object.keys(r).filter((k) => k !== "args" && k !== "env");
	if (extra.length) throw bad(`has unknown field ${extra.join(", ")}`);
	if (
		r.args !== undefined &&
		(!Array.isArray(r.args) || r.args.some((a) => typeof a !== "string"))
	)
		throw bad("args must be a list of strings");
	if (
		r.env !== undefined &&
		(typeof r.env !== "object" ||
			r.env === null ||
			Array.isArray(r.env) ||
			Object.values(r.env).some((v) => typeof v !== "string"))
	)
		throw bad("env must map names to strings");
	return r as Scenario["server"];
}

/** A scenario's or step's `transports`, refusing anything but ws and http. */
function transportList(raw: unknown, where: string): Transport[] | undefined {
	if (raw === undefined) return undefined;
	if (
		!Array.isArray(raw) ||
		raw.length === 0 ||
		raw.some((t) => t !== "ws" && t !== "http")
	)
		throw new Error(
			`${where}: transports must be a non-empty list of ws and http, got ${JSON.stringify(raw)}`,
		);
	return raw as Transport[];
}

function semver(v: string): number[] {
	const m = /(\d+)\.(\d+)\.(\d+)/.exec(v);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

function atLeast(version: string, since: string): boolean {
	const a = semver(version);
	const b = semver(since);
	for (let i = 0; i < 3; i++)
		if ((a[i] as number) !== (b[i] as number))
			return (a[i] as number) > (b[i] as number);
	return true;
}

const SETUP_SQL =
	"DEFINE NAMESPACE IF NOT EXISTS $ns; USE NS $ns; DEFINE DATABASE IF NOT EXISTS $db;";

export interface RunOptions {
	adapter: AdapterFactory;
	transports: Transport[];
	filter?: RegExp;
	onResult?: (r: RunResult) => void;
}

export class ServerPool {
	private readonly servers = new Map<string, Promise<Server>>();
	async get(config: Scenario["server"]): Promise<Server> {
		const key = JSON.stringify(config ?? {});
		let s = this.servers.get(key);
		if (!s) {
			s = startServer(config ?? {});
			this.servers.set(key, s);
		}
		return s;
	}
	async stopAll() {
		for (const s of this.servers.values())
			await s.then((server) => server.stop()).catch(() => {});
	}
}

export async function runScenarios(
	scenarios: Scenario[],
	opts: RunOptions,
): Promise<{ hello: Hello; results: RunResult[] }> {
	const pool = new ServerPool();
	const results: RunResult[] = [];
	const probe = await opts.adapter();
	let hello: Hello;
	try {
		hello = await probe.hello();
	} catch (e) {
		// Stop the driver even when its handshake fails, so it cannot linger.
		await probe.dispose().catch(() => {});
		throw e;
	}
	await probe.dispose();
	try {
		for (const scenario of scenarios) {
			if (opts.filter && !opts.filter.test(scenario.name)) continue;
			for (const transport of opts.transports) {
				const started = Date.now();
				const outcome = await runOne(scenario, transport, opts.adapter, pool);
				const r = {
					scenario: scenario.name,
					file: scenario.file,
					transport,
					outcome,
					ms: Date.now() - started,
				};
				results.push(r);
				opts.onResult?.(r);
			}
		}
	} finally {
		await pool.stopAll();
	}
	return { hello, results };
}

let counter = 0;

async function runOne(
	scenario: Scenario,
	transport: Transport,
	factory: AdapterFactory,
	pool: ServerPool,
): Promise<Outcome> {
	if (!scenario.transports.includes(transport))
		return { status: "skip", reason: `not applicable over ${transport}` };
	if (scenario.server && process.env.SURREAL_URL)
		return {
			status: "skip",
			reason: "needs its own server flags; SURREAL_URL is set",
		};
	let server: Server;
	try {
		server = await pool.get(scenario.server);
	} catch (e) {
		return {
			status: "fail",
			step: 0,
			op: "server",
			message: (e as Error).message,
		};
	}
	if (scenario.since && !atLeast(server.version, scenario.since)) {
		return {
			status: "skip",
			reason: `needs server ${scenario.since}, have ${server.version}`,
		};
	}
	const captures: Captures = new Map();
	const url = transport === "ws" ? server.ws : `${server.http}/rpc`;
	const id = `${Date.now().toString(36)}${(counter++).toString(36)}`;
	captures.set("namespace", "conformance");
	captures.set(
		"database",
		`${scenario.name.replace(/[^a-z0-9]/gi, "_")}_${transport}_${id}`,
	);
	captures.set("database_b", `${captures.get("database")}_b`);
	captures.set("url", url);
	captures.set("transport", transport);

	const steps: Step[] = [];
	if (scenario.setup !== "none")
		steps.push({ op: "connect", args: { url, transport } });
	if (scenario.setup === "default") {
		steps.push(
			{
				op: "signin",
				args: { credentials: { user: ROOT.user, pass: ROOT.pass } },
			},
			{
				op: "query",
				args: {
					sql: SETUP_SQL,
					vars: { ns: { $ref: "namespace" }, db: { $ref: "database" } },
				},
				expect: {
					result: [
						{ ok: true, result: { $any: null } },
						{ ok: true, result: { $any: null } },
						{ ok: true, result: { $any: null } },
					],
				},
			},
			{
				op: "use",
				args: {
					namespace: { $ref: "namespace" },
					database: { $ref: "database" },
				},
			},
		);
	}
	const setupCount = steps.length;
	steps.push(...scenario.steps);

	const adapter = await factory();
	// Whether any of the scenario's own steps (not the setup) ran here.
	let ranOwnStep = false;
	let outcome: Outcome;
	try {
		outcome = await (async (): Promise<Outcome> => {
			for (let i = 0; i < steps.length; i++) {
				const step = steps[i] as Step;
				const label =
					i < setupCount ? `setup ${i + 1}` : `${i - setupCount + 1}`;
				if (step.transports && !step.transports.includes(transport)) continue;
				if (i >= setupCount && step.op !== "sleep") ranOwnStep = true;
				if (step.op === "sleep") {
					await Bun.sleep(Number(step.args.value ?? 0));
					continue;
				}
				const raw = step.expect as Record<string, Expectation> | undefined;
				const expect: Expectation | undefined =
					raw && ("ws" in raw || "http" in raw)
						? raw[transport]
						: (raw as Expectation | undefined);
				let args: Record<string, Json>;
				try {
					args = resolve(step.args as Json, captures) as Record<string, Json>;
					if (step.op === "connect" && !args.url)
						args = { ...args, url, transport };
				} catch (e) {
					return {
						status: "fail",
						step: i + 1,
						op: step.op,
						message: `step ${label}: ${(e as Error).message}`,
					};
				}
				let result: Json | undefined;
				let error: AdapterError | undefined;
				try {
					result = await adapter.call(step.op, args);
				} catch (e) {
					if (!(e instanceof AdapterError))
						return {
							status: "fail",
							step: i + 1,
							op: step.op,
							message: `step ${label}: adapter threw ${String(e)}`,
						};
					error = e;
				}
				if (error?.info.kind === "Unsupported" && !expect?.error) {
					return {
						status: "skip",
						reason: `adapter does not support ${step.op}${error.info.message && error.info.message !== step.op ? ` (${error.info.message})` : ""}`,
					};
				}
				const fail = (message: string): Outcome => ({
					status: "fail",
					step: i + 1,
					op: step.op,
					message: `step ${label} (${step.op}): ${message}`,
				});
				if (expect?.error !== undefined) {
					if (!error)
						return fail(
							`expected an error, got ${JSON.stringify(result, big)}`,
						);
					const r = match(
						expect.error,
						fromJson(clean(error.info as unknown as Json)),
						captures,
						"error",
						true,
					);
					if (r) return fail(r);
				} else {
					if (error)
						return fail(`unexpected error ${JSON.stringify(error.info, big)}`);
					if (expect?.result !== undefined) {
						const r = match(
							expect.result,
							fromJson(clean(result as Json)),
							captures,
							"result",
						);
						if (r) return fail(r);
					}
				}
				if (step.capture) captures.set(step.capture, (result ?? null) as Json);
			}
			// Only the setup ran: nothing in the scenario applies to this transport.
			if (!ranOwnStep)
				return {
					status: "skip",
					reason: `no steps apply over ${transport}`,
				};
			return { status: "pass" };
		})();
	} catch (e) {
		await adapter.dispose().catch(() => {});
		throw e;
	}
	// A driver that broke the protocol after its last answer, or exited badly,
	// fails here, whether its steps passed or were skipped.
	try {
		await adapter.dispose();
	} catch (e) {
		if (outcome.status !== "fail")
			return {
				status: "fail",
				step: scenario.steps.length,
				op: "dispose",
				message: `driver: ${(e as Error).message}`,
			};
	}
	return outcome;
}

/** Drops undefined fields, which typed JSON has no spelling for. */
function clean(j: Json): Json {
	if (Array.isArray(j)) return j.map(clean);
	if (j === null || typeof j !== "object") return j;
	return Object.fromEntries(
		Object.entries(j)
			.filter(([, v]) => v !== undefined)
			.map(([k, v]) => [k, clean(v)]),
	);
}

function big(_: string, x: unknown) {
	return typeof x === "bigint" ? x.toString() : x;
}
