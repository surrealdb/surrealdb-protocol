/**
 * A conformance driver for the JavaScript SDK (`surrealdb` on npm): the worked
 * example in conformance/README.md.
 *
 *   (cd conformance/examples/surrealdb-js && bun install)
 *   bun conformance/runner/cli.ts --driver "bun conformance/examples/surrealdb-js/driver.ts"
 *
 * Run the second line from the repository root.
 *
 * The runner starts this process once per scenario and talks to it in JSON
 * lines: `{"id":1,"op":"query","args":{...}}` in, `{"id":1,"ok":true,"result":...}`
 * or `{"id":1,"ok":false,"error":{"kind":...}}` out. Every op goes through the
 * SDK's public API; nothing here speaks the wire protocol. An op the SDK has no
 * API for answers `Unsupported`, which the runner reports as a skip.
 *
 * Values cross the pipe as typed JSON (spec/README.md): plain JSON for null,
 * booleans, integers, strings, arrays and objects, and single-key `$` objects
 * for everything else.
 */

import { readFileSync } from "node:fs";
import {
	BoundExcluded,
	BoundIncluded,
	DateTime,
	Decimal,
	Duration,
	FileRef,
	Geometry,
	GeometryCollection,
	GeometryLine,
	GeometryMultiLine,
	GeometryMultiPoint,
	GeometryMultiPolygon,
	GeometryPoint,
	GeometryPolygon,
	HttpConnectionError,
	ImportError,
	type LiveMessage,
	type LiveSubscription,
	Range,
	RecordId,
	RecordIdRange,
	ServerError,
	Surreal,
	type SurrealSession,
	type SurrealTransaction,
	Table,
	UnsupportedFeatureError,
	Uuid,
} from "surrealdb";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Args = Record<string, Json | undefined>;

class DriverError extends Error {
	constructor(
		readonly info: {
			kind: string;
			message?: string;
			details?: Json;
			code?: number;
			failures?: Json[];
		},
	) {
		super(info.message ?? info.kind);
	}
}
const unsupported = (op: string) =>
	new DriverError({
		kind: "Unsupported",
		message: `surrealdb.js has no API for ${op}`,
	});

// --- typed JSON <-> SDK values -----------------------------------------------

/** The typed-JSON keys (spec/README.md). Any other `$` key is an ordinary object key. */
const TYPED = new Set([
	"$none",
	"$int",
	"$float",
	"$decimal",
	"$string",
	"$bytes",
	"$uuid",
	"$datetime",
	"$duration",
	"$array",
	"$object",
	"$set",
	"$table",
	"$record",
	"$range",
	"$file",
	"$geometry",
	"$regex",
]);
const typedKey = (keys: string[]) =>
	keys.length === 1 && TYPED.has(keys[0] as string) ? keys[0] : undefined;

function fromJson(j: Json | undefined): unknown {
	if (j === undefined) return undefined;
	if (j === null || typeof j !== "object") return j;
	if (Array.isArray(j)) return j.map(fromJson);
	const keys = Object.keys(j);
	const key = typedKey(keys);
	if (!key)
		return Object.fromEntries(
			Object.entries(j).map(([k, v]) => [k, fromJson(v)]),
		);
	const a = j[key] as Json;
	switch (key) {
		case "$none":
			return undefined;
		case "$int":
			return BigInt(a as string);
		case "$float":
			return typeof a === "number" ? a : Number(a);
		case "$decimal":
			return new Decimal(a as string);
		case "$string":
			return a;
		case "$object":
			return Object.fromEntries(
				Object.entries(a as Record<string, Json>).map(([k, v]) => [
					k,
					fromJson(v),
				]),
			);
		case "$array":
			return (a as Json[]).map(fromJson);
		case "$bytes":
			return Uint8Array.from((a as string).match(/../g) ?? [], (h) =>
				Number.parseInt(h, 16),
			);
		case "$uuid":
			return new Uuid(a as string);
		case "$datetime":
			return new DateTime(a as string);
		case "$duration": {
			const [s, ns] = a as [number, number];
			return Duration.nanoseconds(BigInt(s) * 1_000_000_000n + BigInt(ns ?? 0));
		}
		case "$table":
			return new Table(a as string);
		case "$record": {
			const { table, key: k } = a as { table: string; key: Json };
			const id = fromJson(k);
			return id instanceof Range
				? new RecordIdRange(table, id.begin, id.end)
				: new RecordId(table, id as never);
		}
		case "$range": {
			const { start, end } = a as { start: Json; end: Json };
			return new Range(boundFrom(start), boundFrom(end));
		}
		case "$set":
			return new Set((a as Json[]).map(fromJson));
		case "$file": {
			const { bucket, key: k } = a as { bucket: string; key: string };
			return new FileRef(bucket, k);
		}
		case "$geometry":
			return geometryFrom(
				a as { type: string; coordinates?: Json; geometries?: Json[] },
			);
	}
	throw new DriverError({
		kind: "Unsupported",
		message: `no SDK value for ${key}`,
	});
}

function boundFrom(b: Json) {
	if (b === null) return undefined;
	const o = b as Record<string, Json>;
	return "included" in o
		? new BoundIncluded(fromJson(o.included))
		: new BoundExcluded(fromJson(o.excluded));
}

function geometryFrom(g: {
	type: string;
	coordinates?: Json;
	geometries?: Json[];
}): Geometry {
	const c = g.coordinates as never;
	const point = (p: [number, number]) => new GeometryPoint(p);
	const line = (l: [number, number][]) =>
		new GeometryLine(l.map(point) as never);
	const polygon = (p: [number, number][][]) =>
		new GeometryPolygon(p.map(line) as never);
	switch (g.type) {
		case "Point":
			return point(c);
		case "LineString":
			return line(c);
		case "Polygon":
			return polygon(c);
		case "MultiPoint":
			return new GeometryMultiPoint(
				(c as [number, number][]).map(point) as never,
			);
		case "MultiLineString":
			return new GeometryMultiLine(
				(c as [number, number][][]).map(line) as never,
			);
		case "MultiPolygon":
			return new GeometryMultiPolygon(
				(c as [number, number][][][]).map(polygon) as never,
			);
		default:
			return new GeometryCollection(
				(g.geometries ?? []).map((x) => geometryFrom(x as never)) as never,
			);
	}
}

function toJson(v: unknown): Json {
	if (v === undefined) return { $none: null };
	if (v === null || typeof v === "boolean" || typeof v === "string") return v;
	if (typeof v === "bigint")
		return v >= -(2n ** 53n) && v <= 2n ** 53n
			? Number(v)
			: { $int: v.toString() };
	// The SDK decodes integers and floats alike to number, so an integral
	// float reads back as an integer here (a JavaScript limitation).
	if (typeof v === "number")
		return Number.isInteger(v) && !Object.is(v, -0)
			? v
			: { $float: Number.isFinite(v) ? v : String(v) };
	if (Array.isArray(v)) return v.map(toJson);
	if (v instanceof Uint8Array)
		return {
			$bytes: [...v].map((b) => b.toString(16).padStart(2, "0")).join(""),
		};
	if (v instanceof Set) return { $set: [...v].map(toJson) };
	if (v instanceof Uuid) return { $uuid: v.toString() };
	if (v instanceof Decimal) return { $decimal: v.toString() };
	if (v instanceof DateTime) {
		// RFC 3339 in UTC, with nine fractional digits when there are nanoseconds.
		const ns = v.nanoseconds;
		const frac = ((ns % 1_000_000_000n) + 1_000_000_000n) % 1_000_000_000n;
		const secs = (ns - frac) / 1_000_000_000n;
		const base = new Date(Number(secs) * 1000).toISOString().slice(0, -5);
		return {
			$datetime: `${base}${frac ? `.${frac.toString().padStart(9, "0")}` : ""}Z`,
		};
	}
	if (v instanceof Duration) {
		const ns = v.nanoseconds;
		const secs = ns / 1_000_000_000n;
		return {
			// Seconds past 2^53 stay a string, as typed JSON requires.
			$duration: [
				secs <= 2n ** 53n ? Number(secs) : secs.toString(),
				Number(ns % 1_000_000_000n),
			],
		};
	}
	if (v instanceof Table) return { $table: v.name };
	if (v instanceof RecordId)
		return { $record: { table: v.table.name, key: toJson(v.id) } };
	if (v instanceof RecordIdRange)
		return { $record: { table: v.table.name, key: rangeJson(v.begin, v.end) } };
	if (v instanceof Range) return rangeJson(v.begin, v.end);
	if (v instanceof FileRef) return { $file: { bucket: v.bucket, key: v.key } };
	if (v instanceof Geometry) return { $geometry: v.toJSON() as Json };
	if (v instanceof Date) return toJson(new DateTime(v));
	if (typeof v === "object") {
		const o = Object.fromEntries(
			Object.entries(v).map(([k, x]) => [k, toJson(x)]),
		);
		const keys = Object.keys(o);
		return typedKey(keys) ? { $object: o } : o;
	}
	throw new DriverError({
		kind: "Internal",
		message: `cannot express ${String(v)} as typed JSON`,
	});
}

function rangeJson(begin: unknown, end: unknown): Json {
	const bound = (b: unknown): Json =>
		b instanceof BoundIncluded
			? { included: toJson(b.value) }
			: b instanceof BoundExcluded
				? { excluded: toJson(b.value) }
				: null;
	return { $range: { start: bound(begin), end: bound(end) } };
}

function errorInfo(e: unknown): DriverError["info"] {
	if (e instanceof DriverError) return e.info;
	if (e instanceof UnsupportedFeatureError)
		return { kind: "Unsupported", message: e.message };
	if (e instanceof ImportError) {
		return {
			kind: "Query",
			message: e.message,
			failures: e.failures.map((f) => errorInfo(f) as never),
		};
	}
	if (e instanceof HttpConnectionError) {
		// Plain HTTP endpoints (/import, /export) answer with a status, not a kind.
		const kind =
			e.status === 401 || e.status === 403
				? "NotAllowed"
				: e.status === 404
					? "NotFound"
					: "Validation";
		return { kind, message: e.message };
	}
	if (e instanceof ServerError) {
		return {
			kind: e.kind,
			message: e.message,
			...(e.details !== undefined && { details: toJson(e.details) }),
			...(e.code ? { code: e.code } : {}),
		};
	}
	return {
		kind: "Internal",
		message: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
	};
}

// --- the adapter ---------------------------------------------------------------

/** The wire's signin keys (user, pass, ns, db, ac, record variables) as the SDK's. */
function credentials(c: Record<string, Json>) {
	const { user, pass, ns, db, ac, key, ...variables } = c;
	const auth: Record<string, unknown> = {};
	if (ns !== undefined) auth.namespace = ns;
	if (db !== undefined) auth.database = db;
	if (ac !== undefined) auth.access = ac;
	if (user !== undefined) auth.username = user;
	if (pass !== undefined) auth.password = pass;
	if (key !== undefined) auth.key = key;
	if (ac !== undefined && user === undefined && key === undefined)
		auth.variables = fromJson(variables);
	return auth as never;
}

class Driver {
	private db = new Surreal();
	private readonly sessions = new Map<string, SurrealSession>();
	private readonly txns = new Map<string, SurrealTransaction>();
	// The session handle each transaction was begun in; undefined is the default session.
	private readonly txnSessions = new Map<string, string | undefined>();
	private readonly subs = new Map<
		string,
		{
			sub: LiveSubscription;
			// The session handle it was started in; undefined is the default session.
			session?: string;
			queue: LiveMessage[];
			wake?: () => void;
		}
	>();
	private nextHandle = 1;

	private session(handle?: Json): SurrealSession {
		if (handle === undefined || handle === null) return this.db;
		const s = this.sessions.get(handle as string);
		if (!s)
			throw new DriverError({
				kind: "NotFound",
				message: `no session ${handle}`,
			});
		return s;
	}

	private scope(args: Args) {
		if (args.txn !== undefined) {
			const t = this.txns.get(args.txn as string);
			if (!t)
				throw new DriverError({
					kind: "NotFound",
					message: `no transaction ${args.txn}`,
				});
			// Transactions belong to a session: naming another one is a lookup
			// that fails, as it does on the server, not a licence to use it.
			if (
				args.session !== undefined &&
				args.session !== this.txnSessions.get(args.txn as string)
			)
				throw new DriverError({
					kind: "NotFound",
					message: `no transaction ${args.txn} in session ${args.session}`,
				});
			return t;
		}
		return this.session(args.session);
	}

	/**
	 * The session for an op the SDK only has on a session, not on a
	 * transaction. A `txn` is refused rather than ignored, so the op never
	 * runs outside the transaction the scenario asked for.
	 */
	private sessionOnly(op: string, args: Args) {
		if (args.txn !== undefined) throw unsupported(`${op} in a transaction`);
		return this.session(args.session);
	}

	private subscribe(sub: LiveSubscription, session?: string): string {
		const handle = `live-${this.nextHandle++}`;
		const entry = { sub, session, queue: [] as LiveMessage[] } as {
			sub: LiveSubscription;
			session?: string;
			queue: LiveMessage[];
			wake?: () => void;
		};
		sub.subscribe((m) => {
			entry.queue.push(m);
			entry.wake?.();
		});
		this.subs.set(handle, entry);
		return handle;
	}

	/** Closes the connection, giving the SDK a second to say goodbye. */
	async shutdown() {
		await Promise.race([this.db.close().catch(() => {}), Bun.sleep(1000)]);
	}

	async call(op: string, args: Args): Promise<Json> {
		switch (op) {
			case "connect":
				await this.db.close().catch(() => {});
				this.db = new Surreal();
				// Handles from the old connection must not reach the new one.
				this.sessions.clear();
				this.txns.clear();
				this.txnSessions.clear();
				this.subs.clear();
				await this.db.connect(args.url as string, { reconnect: false });
				return null;
			case "close":
				await this.db.close();
				return null;
			case "version":
				return (await this.db.version()).version;
			case "signin":
			case "signup": {
				const s = this.sessionOnly(op, args);
				const tokens = await (op === "signin"
					? s.signin(credentials(args.credentials as Record<string, Json>))
					: s.signup(credentials(args.credentials as Record<string, Json>)));
				return toJson(tokens);
			}
			case "authenticate":
				await this.sessionOnly(op, args).authenticate(
					fromJson(args.token) as never,
				);
				return null;
			case "invalidate":
				await this.sessionOnly(op, args).invalidate();
				return null;
			case "info":
				return toJson(await this.sessionOnly(op, args).auth());
			case "use":
				return toJson(
					await this.sessionOnly(op, args).use({
						namespace: args.namespace as string | undefined,
						database: args.database as string | undefined,
					}),
				);
			case "set":
				await this.sessionOnly(op, args).set(
					args.name as string,
					fromJson(args.value),
				);
				return null;
			case "unset":
				await this.sessionOnly(op, args).unset(args.name as string);
				return null;
			case "query": {
				const responses = await this.scope(args)
					.query(
						args.sql as string,
						fromJson(args.vars) as Record<string, unknown>,
					)
					.responses();
				return responses.map(
					(r): Json =>
						r.success
							? { ok: true, result: toJson(r.result) }
							: { ok: false, error: errorInfo(r.error) as never },
				) as Json;
			}
			case "query_stream": {
				const results: Json[] = [];
				const rows = new Map<number, unknown[]>();
				for await (const frame of this.scope(args)
					.query(
						args.sql as string,
						fromJson(args.vars) as Record<string, unknown>,
					)
					.stream()) {
					if (frame.isValue()) {
						if (frame.isSingle)
							results[frame.query] = { ok: true, result: toJson(frame.value) };
						else
							rows.set(frame.query, [
								...(rows.get(frame.query) ?? []),
								frame.value,
							]);
					} else if (frame.isError()) {
						rows.delete(frame.query);
						results[frame.query] = {
							ok: false,
							error: errorInfo(frame.error) as never,
						};
					} else if (frame.isDone() && results[frame.query] === undefined) {
						results[frame.query] = {
							ok: true,
							result: toJson(rows.get(frame.query) ?? []),
						};
					}
				}
				return results;
			}
			case "run": {
				const fnArgs = ((args.args as Json[]) ?? []).map(fromJson);
				const q = this.scope(args);
				return toJson(
					// An empty version string is still a version: forward it.
					await (args.version !== undefined && args.version !== null
						? q.run(args.name as string, args.version as string, fnArgs)
						: q.run(args.name as string, fnArgs)),
				);
			}
			case "live": {
				const live = this.sessionOnly(op, args).live(
					new Table(args.table as string),
				);
				return this.subscribe(
					await (args.diff ? live.diff() : live),
					args.session as string | undefined,
				);
			}
			case "live_of":
				return this.subscribe(
					await this.sessionOnly(op, args).liveOf(fromJson(args.id) as Uuid),
					args.session as string | undefined,
				);
			case "live_id":
				return toJson(this.sub(args).sub.id);
			case "next_notification": {
				const entry = this.sub(args);
				if (entry.queue.length === 0) {
					await new Promise<void>((resolve) => {
						const timer = setTimeout(resolve, Number(args.timeout ?? 5000));
						entry.wake = () => {
							clearTimeout(timer);
							resolve();
						};
					});
					entry.wake = undefined;
				}
				const m = entry.queue.shift();
				if (!m) return null;
				return m.action === "KILLED"
					? { action: "KILLED" }
					: {
							action: m.action,
							record: toJson(m.recordId),
							result: toJson(m.value),
						};
			}
			case "kill":
				// The subscription is bound to its session; it has no kill in a transaction.
				// Its kill always runs in that session, so refuse any other context.
				if (args.txn !== undefined) throw unsupported("kill in a transaction");
				if (args.session !== this.sub(args).session)
					throw unsupported(
						"kill from a session other than the subscription's",
					);
				await this.sub(args).sub.kill();
				return null;
			case "new_session":
				return this.keep(await this.db.newSession());
			case "fork_session":
				return this.keep(await this.session(args.from).forkSession());
			case "list_sessions":
				return (await this.db.sessions()).map((u) => u.toString());
			case "close_session": {
				await this.sessionOnly(op, args).closeSession();
				this.sessions.delete(args.session as string);
				return null;
			}
			case "begin": {
				const handle = `txn-${this.nextHandle++}`;
				this.txns.set(
					handle,
					await this.sessionOnly(op, args).beginTransaction(),
				);
				this.txnSessions.set(handle, args.session as string | undefined);
				return handle;
			}
			case "commit":
			case "cancel": {
				const t = this.scope({ txn: args.txn, session: args.session });
				// The handle stays valid: using a finished transaction is a scenario too.
				await (op === "commit"
					? (t as SurrealTransaction).commit()
					: (t as SurrealTransaction).cancel());
				return null;
			}
			// The SDK imports and exports through the connection, outside any
			// session or transaction, so refuse a context rather than ignore it.
			case "import":
				if (args.session !== undefined || args.txn !== undefined)
					throw unsupported("import in a session or transaction");
				await this.db.import(args.surql as string);
				return null;
			case "export":
				if (args.session !== undefined || args.txn !== undefined)
					throw unsupported("export in a session or transaction");
				return await this.db.export((args.options as never) ?? undefined);
		}
		throw unsupported(op);
	}

	private sub(args: Args) {
		const entry = this.subs.get(args.subscription as string);
		if (!entry)
			throw new DriverError({
				kind: "NotFound",
				message: "no such subscription",
			});
		return entry;
	}

	private keep(s: SurrealSession): string {
		const handle = String(s.session);
		this.sessions.set(handle, s);
		return handle;
	}
}

// --- the JSON-lines loop --------------------------------------------------------

const OPS = [
	"connect",
	"close",
	"version",
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
];

/** The installed SDK's version, for the report. */
function sdkVersion(): string {
	const entry = new URL(import.meta.resolve("surrealdb"));
	return JSON.parse(readFileSync(new URL("../package.json", entry), "utf8"))
		.version;
}

const driver = new Driver();
const write = (r: unknown) =>
	process.stdout.write(
		`${JSON.stringify(r, (_, x) => (typeof x === "bigint" ? Number(x) : x))}\n`,
	);

let buffer = "";
for await (const chunk of process.stdin) {
	buffer += chunk;
	let nl = buffer.indexOf("\n");
	while (nl >= 0) {
		const line = buffer.slice(0, nl).trim();
		buffer = buffer.slice(nl + 1);
		nl = buffer.indexOf("\n");
		if (!line) continue;
		const { id, op, args } = JSON.parse(line) as {
			id: number;
			op: string;
			args: Args;
		};
		if (op === "hello") {
			write({
				id,
				ok: true,
				result: { name: "surrealdb.js", version: sdkVersion(), ops: OPS },
			});
			continue;
		}
		try {
			write({
				id,
				ok: true,
				result: (await driver.call(op, args ?? {})) ?? null,
			});
		} catch (e) {
			write({ id, ok: false, error: errorInfo(e) });
		}
	}
}

// stdin closed: the scenario is over. Exit, or the open connection would keep
// the process alive and the runner would have to kill it.
await driver.shutdown();
process.exit(0);
