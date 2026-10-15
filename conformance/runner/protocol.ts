/**
 * The adapter contract between the conformance runner and an SDK.
 *
 * An adapter exposes a handful of operations ("ops") that the scenarios drive.
 * Arguments and results are typed JSON (spec/README.md), so the same contract
 * works in-process (an object implementing `Adapter`) and out of process (a
 * driver executable speaking the line protocol in `process.ts`), which is how
 * an SDK in any language plugs in.
 *
 * Every op is optional. An adapter that does not implement one answers with an
 * `Unsupported` error and the runner reports the scenario as skipped for that
 * reason, which is what turns a run into a parity report.
 *
 * Handles (sessions, transactions, live subscriptions) are opaque strings the
 * adapter chooses; the runner only passes them back.
 */

import type { Json } from "../lib/value";

export type Transport = "ws" | "http";

/** What the adapter reports about itself when the runner says hello. */
export interface Hello {
	/** e.g. "surrealdb.js". */
	name: string;
	/** The SDK's version. */
	version: string;
	/** Ops this adapter implements, for the report. Optional: ops not listed may still work. */
	ops?: string[];
}

/** Common to every op: which session and transaction to run in. Absent means the default session and no transaction. */
export interface Context {
	session?: string;
	txn?: string;
}

/**
 * The ops, with their arguments and results. See conformance/README.md for the
 * full semantics; this is the type-level summary.
 */
export interface Ops {
	/** Opens a connection. `url` is ws://host/rpc or http://host/rpc. */
	connect: { args: { url: string; transport: Transport }; result: null };
	/** Closes the connection. */
	close: { args: Record<string, never>; result: null };
	/** The server version string, e.g. "surrealdb-3.4.0". */
	version: { args: Record<string, never>; result: string };
	ping: { args: Context; result: null };
	/** `credentials` uses the RPC wire keys: user, pass, ns, db, ac, plus record variables. */
	signin: { args: Context & { credentials: Json }; result: Json };
	signup: { args: Context & { credentials: Json }; result: Json };
	authenticate: { args: Context & { token: Json }; result: null };
	invalidate: { args: Context; result: null };
	info: { args: Context; result: Json };
	use: {
		args: Context & { namespace?: string | null; database?: string | null };
		result: Json;
	};
	set: { args: Context & { name: string; value: Json }; result: null };
	unset: { args: Context & { name: string }; result: null };
	/** Per-statement results. Fails only when the whole call fails (e.g. a parse error). */
	query: {
		args: Context & { sql: string; vars?: Json };
		result: StatementResult[];
	};
	/** Streams the query and collects it into the same per-statement shape as `query`. */
	query_stream: {
		args: Context & { sql: string; vars?: Json };
		result: StatementResult[];
	};
	run: {
		args: Context & { name: string; version?: string | null; args?: Json[] };
		result: Json;
	};
	/** Starts a managed live query on `table`; returns a subscription handle. */
	live: { args: Context & { table: string; diff?: boolean }; result: string };
	/** Subscribes to an existing live query by id (e.g. from LIVE SELECT); returns a subscription handle. */
	live_of: { args: Context & { id: Json }; result: string };
	/** The live query id behind a subscription handle, as typed JSON (a $uuid). */
	live_id: { args: { subscription: string }; result: Json };
	/** The next notification, or null if none arrives within `timeout` ms. */
	next_notification: {
		args: { subscription: string; timeout?: number };
		result: Notification | null;
	};
	kill: { args: Context & { subscription: string }; result: null };
	/** Creates an empty session; returns its handle. */
	new_session: { args: Record<string, never>; result: string };
	/** Creates a session that copies `from`'s namespace, database, variables and auth. */
	fork_session: { args: { from?: string }; result: string };
	/** Handles of the sessions the SDK has open, not counting the default one. */
	list_sessions: { args: Record<string, never>; result: string[] };
	close_session: { args: { session: string }; result: null };
	/** Starts an interactive transaction; returns its handle. */
	begin: { args: Context; result: string };
	/** `session` names the session the transaction belongs to, as begin was given it. */
	commit: { args: Context & { txn: string }; result: null };
	cancel: { args: Context & { txn: string }; result: null };
	/** Imports a SurrealQL script. Fails, with `failures`, if any statement failed. */
	import: { args: Context & { surql: string }; result: null };
	/** Exports the current database as SurrealQL. `options` is the /export body. */
	export: { args: Context & { options?: Json }; result: string };
	/**
	 * Escape hatch for protocol-level scenarios: sends one raw RPC request and
	 * returns every response envelope it produced (one, or the frames of a
	 * stream). SDK adapters need not implement it.
	 */
	raw_rpc: {
		args: Context & { method: string; params?: Json[] };
		result: Json[];
	};
	/** A raw HTTP request to the server, for protocol-level scenarios. */
	raw_http: {
		args: {
			method: string;
			path: string;
			headers?: Record<string, string>;
			body?: string;
		};
		result: { status: number; body: string };
	};
}

export type Op = keyof Ops;

const CONTEXT = ["session", "txn"] as const;

/** Each op's argument names, for checking scenarios: a typo would be ignored by the adapter. */
export const OP_ARGS: { [K in Op]: readonly string[] } = {
	connect: ["url", "transport"],
	close: [],
	version: [],
	ping: CONTEXT,
	signin: [...CONTEXT, "credentials"],
	signup: [...CONTEXT, "credentials"],
	authenticate: [...CONTEXT, "token"],
	invalidate: CONTEXT,
	info: CONTEXT,
	use: [...CONTEXT, "namespace", "database"],
	set: [...CONTEXT, "name", "value"],
	unset: [...CONTEXT, "name"],
	query: [...CONTEXT, "sql", "vars"],
	query_stream: [...CONTEXT, "sql", "vars"],
	run: [...CONTEXT, "name", "version", "args"],
	live: [...CONTEXT, "table", "diff"],
	live_of: [...CONTEXT, "id"],
	live_id: ["subscription"],
	next_notification: ["subscription", "timeout"],
	kill: [...CONTEXT, "subscription"],
	new_session: [],
	fork_session: ["from"],
	list_sessions: [],
	close_session: ["session"],
	begin: CONTEXT,
	commit: [...CONTEXT, "txn"],
	cancel: [...CONTEXT, "txn"],
	import: [...CONTEXT, "surql"],
	export: [...CONTEXT, "options"],
	raw_rpc: [...CONTEXT, "method", "params"],
	raw_http: ["method", "path", "headers", "body"],
};
export const OPS = [
	"connect",
	"close",
	"version",
	"ping",
	"signin",
	"signup",
	"authenticate",
	"invalidate",
	"info",
	"use",
	"set",
	"unset",
	"query",
	"query_stream",
	"run",
	"live",
	"live_of",
	"live_id",
	"next_notification",
	"kill",
	"new_session",
	"fork_session",
	"list_sessions",
	"close_session",
	"begin",
	"commit",
	"cancel",
	"import",
	"export",
	"raw_rpc",
	"raw_http",
] as const satisfies readonly Op[];

export type StatementResult =
	| { ok: true; result: Json }
	| { ok: false; error: ErrorInfo };

export interface Notification {
	action: "CREATE" | "UPDATE" | "DELETE" | "KILLED" | string;
	record?: Json;
	result?: Json;
}

/**
 * An error as the adapter reports it. `kind`, `details` and `message` are the
 * server's; `Unsupported` is reserved for "this adapter does not do that".
 */
export interface ErrorInfo {
	kind: string;
	message?: string;
	details?: Json;
	code?: number;
	/** For a failed import: the statements that failed. */
	failures?: ErrorInfo[];
}

export class AdapterError extends Error {
	constructor(readonly info: ErrorInfo) {
		super(`${info.kind}: ${info.message ?? ""}`);
	}
}

export const unsupported = (what: string) =>
	new AdapterError({ kind: "Unsupported", message: what });

/** An SDK under test. */
export interface Adapter {
	hello(): Promise<Hello>;
	call(op: string, args: Record<string, Json | undefined>): Promise<Json>;
	/** Releases everything; the runner calls it once per scenario run. */
	dispose(): Promise<void>;
}

/** Creates a fresh adapter instance for each scenario run. */
export type AdapterFactory = () => Promise<Adapter>;
