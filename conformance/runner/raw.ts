/**
 * The reference adapter: a minimal SDK written straight against the wire, over
 * WebSocket or HTTP POST /rpc with CBOR, using only conformance/lib.
 *
 * It exists so the scenarios themselves are tested. Every scenario must pass
 * against it on a current server before it can be asked of an SDK, and it is
 * a worked example of each op for anyone writing an adapter. It implements
 * the same client-side behaviour the parity plan asks of SDKs: session fork
 * by replay, attach-by-id as a notification filter, query_stream with
 * retraction and a fallback to query, import failures from HTTP 422.
 */

import { type CborItem, decode, encode, text } from "../lib/cbor";
import {
	fromCbor,
	fromJson,
	type Json,
	normaliseUuid,
	toCbor,
	toJson,
	type Value,
} from "../lib/value";
import {
	type Adapter,
	AdapterError,
	type ErrorInfo,
	type Hello,
	type Notification,
	OPS,
	type StatementResult,
	type Transport,
	unsupported,
} from "./protocol";

type Envelope = Map<string, Value>;

const NAME = "reference (raw wire)";

/** The client-side picture of a session, kept so it can be replayed (fork, HTTP). */
interface SessionState {
	namespace?: string | null;
	database?: string | null;
	vars: Map<string, Json>;
	token?: string;
}

function envelope(v: Value): Envelope {
	if (v.k !== "object")
		throw new Error(`expected a response object, got ${v.k}`);
	return new Map(v.v);
}

function errorInfo(v: Value | undefined): ErrorInfo {
	if (!v || v.k !== "object")
		return { kind: "Internal", message: "malformed error" };
	const e = new Map(v.v);
	const str = (x: Value | undefined) => (x?.k === "string" ? x.v : undefined);
	const code = e.get("code");
	const details = e.get("details");
	return {
		kind: str(e.get("kind")) ?? "Internal",
		message: str(e.get("message")),
		code: code?.k === "int" ? Number(code.v) : undefined,
		details:
			details && details.k !== "none" && details.k !== "null"
				? toJson(details)
				: undefined,
	};
}

function uuidItem(s: string): CborItem {
	return toCbor({ k: "uuid", v: normaliseUuid(s) });
}

const randomUuid = () => crypto.randomUUID();

/** One RPC connection, WebSocket or HTTP. */
abstract class Rpc {
	abstract request(
		method: string,
		params: CborItem[],
		opts: {
			session?: string;
			txn?: string;
			stream?: boolean;
			headers?: Record<string, string>;
		},
	): Promise<Envelope[]>;
	abstract close(): Promise<void>;
	onNotification?: (n: Map<string, Value>) => void;
}

function encodeRequest(
	id: number,
	method: string,
	params: CborItem[],
	session?: string,
	txn?: string,
): Uint8Array {
	const fields: [CborItem, CborItem][] = [
		[text("id"), { t: "uint", v: BigInt(id) }],
		[text("method"), text(method)],
		[text("params"), { t: "array", v: params }],
	];
	if (session) fields.push([text("session"), uuidItem(session)]);
	if (txn) fields.push([text("txn"), uuidItem(txn)]);
	return encode({ t: "map", v: fields });
}

class WsRpc extends Rpc {
	private nextId = 1;
	private readonly pending = new Map<
		number,
		{
			frames: Envelope[];
			stream: boolean;
			resolve: (e: Envelope[]) => void;
			reject: (e: Error) => void;
		}
	>();

	private constructor(private readonly ws: WebSocket) {
		super();
		ws.binaryType = "arraybuffer";
		ws.onmessage = (ev) => this.receive(new Uint8Array(ev.data as ArrayBuffer));
		ws.onclose = () => {
			for (const p of this.pending.values())
				p.reject(new Error("connection closed"));
			this.pending.clear();
		};
	}

	static open(url: string): Promise<WsRpc> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(url, ["cbor"]);
			ws.onopen = () => resolve(new WsRpc(ws));
			ws.onerror = () => reject(new Error(`cannot connect to ${url}`));
		});
	}

	private receive(bytes: Uint8Array) {
		const msg = envelope(fromCbor(decode(bytes)));
		const id = msg.get("id");
		if (!id || id.k === "none" || id.k === "null") {
			const result = msg.get("result");
			if (result?.k === "object") this.onNotification?.(new Map(result.v));
			return;
		}
		const key = id.k === "int" ? Number(id.v) : Number.NaN;
		const p = this.pending.get(key);
		if (!p) return;
		p.frames.push(msg);
		const result = msg.get("result");
		const tag =
			result?.k === "object" ? new Map(result.v).get("stream") : undefined;
		const done =
			!p.stream || msg.has("error") || (tag?.k === "string" && tag.v === "end");
		if (done) {
			this.pending.delete(key);
			p.resolve(p.frames);
		}
	}

	request(
		method: string,
		params: CborItem[],
		opts: { session?: string; txn?: string; stream?: boolean },
	) {
		const id = this.nextId++;
		return new Promise<Envelope[]>((resolve, reject) => {
			this.pending.set(id, {
				frames: [],
				stream: !!opts.stream,
				resolve,
				reject,
			});
			this.ws.send(encodeRequest(id, method, params, opts.session, opts.txn));
		});
	}

	async close() {
		this.ws.close();
	}
}

class HttpRpc extends Rpc {
	private nextId = 1;
	constructor(private readonly url: string) {
		super();
	}

	async request(
		method: string,
		params: CborItem[],
		opts: { session?: string; txn?: string; headers?: Record<string, string> },
	) {
		const res = await fetch(this.url, {
			method: "POST",
			body: encodeRequest(
				this.nextId++,
				method,
				params,
				opts.session,
				opts.txn,
			),
			headers: {
				"Content-Type": "application/cbor",
				Accept: "application/cbor",
				...opts.headers,
			},
		});
		const bytes = new Uint8Array(await res.arrayBuffer());
		if (!(res.headers.get("content-type") ?? "").includes("cbor")) {
			const body = new TextDecoder().decode(bytes);
			throw new AdapterError({
				kind: res.status === 401 ? "NotAllowed" : "Validation",
				message: `HTTP ${res.status}: ${body}`,
			});
		}
		return [envelope(fromCbor(decode(bytes)))];
	}

	async close() {}
}

export class RawAdapter implements Adapter {
	private rpc?: Rpc;
	private transport: Transport = "ws";
	private base = "";
	/** Client-side session state, keyed by handle; "" is the default session. */
	private readonly sessions = new Map<string, SessionState>([
		["", { vars: new Map() }],
	]);
	/** Notifications by live query id, buffered until someone asks. */
	private readonly queues = new Map<string, Notification[]>();
	private readonly waiters = new Map<string, () => void>();
	/** Subscription handle -> live query id. */
	private readonly subscriptions = new Map<string, string>();

	async hello(): Promise<Hello> {
		return { name: NAME, version: "1", ops: [...OPS] };
	}

	async dispose() {
		await this.rpc?.close();
		this.rpc = undefined;
	}

	private state(session?: string): SessionState {
		const s = this.sessions.get(session ?? "");
		if (!s)
			throw new AdapterError({
				kind: "NotFound",
				message: `no session ${session}`,
			});
		return s;
	}

	private headers(session?: string): Record<string, string> {
		if (this.transport !== "http") return {};
		const s = this.state(session);
		const h: Record<string, string> = {};
		if (s.namespace) h["Surreal-NS"] = s.namespace;
		if (s.database) h["Surreal-DB"] = s.database;
		if (s.token) h.Authorization = `Bearer ${s.token}`;
		return h;
	}

	/** Sends one RPC and returns its result, throwing the server's error. */
	private async rpcCall(
		method: string,
		params: Value[],
		ctx: { session?: string; txn?: string } = {},
	): Promise<Value> {
		const frames = await this.send(method, params, ctx);
		const msg = frames[0] as Envelope;
		if (msg.has("error")) throw new AdapterError(errorInfo(msg.get("error")));
		return msg.get("result") ?? { k: "none" };
	}

	private send(
		method: string,
		params: Value[],
		ctx: { session?: string; txn?: string; stream?: boolean; raw?: boolean },
	) {
		if (!this.rpc)
			throw new AdapterError({ kind: "Connection", message: "not connected" });
		// Over HTTP this adapter keeps every session in the client and sends it
		// as headers; only raw_rpc puts a session id on the wire there.
		const session = ctx.session;
		return this.rpc.request(method, params.map(toCbor), {
			session: this.transport === "ws" || ctx.raw ? session : undefined,
			txn: ctx.txn,
			stream: ctx.stream,
			headers:
				this.transport === "http" &&
				ctx.raw &&
				session &&
				!this.sessions.has(session)
					? {}
					: this.headers(session),
		});
	}

	private onNotification(n: Map<string, Value>) {
		const id = n.get("id");
		const action = n.get("action");
		if (id?.k !== "uuid" || action?.k !== "string") return;
		const q = this.queues.get(id.v) ?? [];
		const record = n.get("record");
		const result = n.get("result");
		q.push({
			action: action.v,
			...(record && record.k !== "none" ? { record: toJson(record) } : {}),
			...(result && result.k !== "none" ? { result: toJson(result) } : {}),
		});
		this.queues.set(id.v, q);
		this.waiters.get(id.v)?.();
	}

	private statementResults(v: Value): StatementResult[] {
		if (v.k !== "array")
			throw new AdapterError({
				kind: "Internal",
				message: "query result is not an array",
			});
		return v.v.map((s) => {
			const m = new Map(s.k === "object" ? s.v : []);
			const status = m.get("status");
			if (status?.k === "string" && status.v === "OK")
				return { ok: true, result: toJson(m.get("result") ?? { k: "none" }) };
			const result = m.get("result");
			const details = m.get("details");
			const kind = m.get("kind");
			return {
				ok: false,
				error: {
					kind: kind?.k === "string" ? kind.v : "Internal",
					message: result?.k === "string" ? result.v : undefined,
					...(details && details.k !== "none" && details.k !== "null"
						? { details: toJson(details) }
						: {}),
				},
			};
		});
	}

	/** Collects query_stream frames into per-statement results, applying retraction. */
	private collectStream(frames: Envelope[]): StatementResult[] {
		const rows = new Map<number, Json[]>();
		const single = new Map<number, Json>();
		const done = new Map<number, StatementResult>();
		let statements = 0;
		for (const msg of frames) {
			if (msg.has("error")) throw new AdapterError(errorInfo(msg.get("error")));
			const r = msg.get("result");
			if (r?.k !== "object") continue;
			const f = new Map(r.v);
			const tag = f.get("stream");
			const index = Number(
				(f.get("index") as { v?: bigint } | undefined)?.v ?? -1,
			);
			switch (tag?.k === "string" ? tag.v : "") {
				case "begin":
					statements = Number((f.get("statements") as { v: bigint }).v);
					break;
				case "rows": {
					const vals = f.get("values");
					rows.set(index, [
						...(rows.get(index) ?? []),
						...(vals?.k === "array" ? vals.v.map(toJson) : []),
					]);
					break;
				}
				case "value":
					single.set(index, toJson(f.get("value") ?? { k: "none" }));
					break;
				case "finished": {
					const err = f.get("error");
					if (err && err.k !== "none" && err.k !== "null") {
						// Retraction: an errored statement's rows are discarded.
						rows.delete(index);
						done.set(index, { ok: false, error: errorInfo(err) });
					} else {
						const isSingle = f.get("single");
						done.set(index, {
							ok: true,
							result:
								isSingle?.k === "bool" && isSingle.v
									? (single.get(index) ?? { $none: null })
									: (rows.get(index) ?? []),
						});
					}
					break;
				}
				case "end": {
					const err = f.get("error");
					if (err && err.k !== "none" && err.k !== "null") {
						// Retraction: every statement that had not finished fails with the end error.
						const info = errorInfo(err);
						for (let i = 0; i < statements; i++)
							if (!done.has(i)) done.set(i, { ok: false, error: info });
					}
					break;
				}
			}
		}
		return [...done.entries()].sort(([a], [b]) => a - b).map(([, r]) => r);
	}

	private base64(s: string) {
		return btoa(s);
	}

	async call(
		op: string,
		args: Record<string, Json | undefined>,
	): Promise<Json> {
		const ctx = {
			session: args.session as string | undefined,
			txn: args.txn as string | undefined,
		};
		switch (op) {
			case "connect": {
				this.transport = args.transport as Transport;
				// A new connection starts from nothing, as it does on the server.
				this.sessions.clear();
				this.sessions.set("", { vars: new Map() });
				const url = args.url as string;
				this.base = url.replace(/^ws/, "http").replace(/\/rpc$/, "");
				if (this.transport === "ws") {
					const ws = await WsRpc.open(url);
					ws.onNotification = (n) => this.onNotification(n);
					this.rpc = ws;
				} else {
					this.rpc = new HttpRpc(url.replace(/^ws/, "http"));
				}
				return null;
			}
			case "close":
				await this.dispose();
				return null;
			case "version":
				return toJson(await this.rpcCall("version", []));
			case "ping":
				await this.rpcCall("ping", [], ctx);
				return null;
			case "info":
				return toJson(await this.rpcCall("info", [], ctx));
			case "signin":
			case "signup": {
				const token = await this.rpcCall(
					op,
					[fromJson(args.credentials as Json)],
					ctx,
				);
				const s = this.state(ctx.session);
				const access =
					token.k === "string"
						? token.v
						: token.k === "object"
							? new Map(token.v).get("access")
							: undefined;
				s.token =
					typeof access === "string"
						? access
						: access?.k === "string"
							? access.v
							: undefined;
				return toJson(token);
			}
			case "authenticate": {
				// signin may have returned {access, refresh}; authenticate takes the access token.
				const t = args.token as Json;
				const token =
					t !== null && typeof t === "object" && !Array.isArray(t)
						? (t as Record<string, Json>).access
						: t;
				if (typeof token !== "string")
					throw new AdapterError({
						kind: "Validation",
						message: "authenticate needs a token string or {access}",
					});
				await this.rpcCall("authenticate", [{ k: "string", v: token }], ctx);
				this.state(ctx.session).token = token;
				return null;
			}
			case "invalidate":
				await this.rpcCall("invalidate", [], ctx);
				this.state(ctx.session).token = undefined;
				return null;
			case "use": {
				const s = this.state(ctx.session);
				const side = (x: Json | undefined): Value =>
					x === undefined
						? { k: "none" }
						: x === null
							? { k: "null" }
							: { k: "string", v: x as string };
				if (this.transport === "http") {
					// HTTP has no connection to hold this; send it as headers from now on.
					if (args.namespace !== undefined)
						s.namespace = args.namespace as string | null;
					if (args.database !== undefined)
						s.database = args.database as string | null;
					return {
						namespace: s.namespace ?? null,
						database: s.database ?? null,
					};
				}
				const result = await this.rpcCall(
					"use",
					[side(args.namespace), side(args.database)],
					ctx,
				);
				const m = new Map(result.k === "object" ? result.v : []);
				const str = (v: Value | undefined) => (v?.k === "string" ? v.v : null);
				s.namespace = str(m.get("namespace"));
				s.database = str(m.get("database"));
				return toJson(result);
			}
			case "set": {
				const s = this.state(ctx.session);
				if (this.transport === "ws") {
					await this.rpcCall(
						"set",
						[
							{ k: "string", v: args.name as string },
							fromJson(args.value as Json),
						],
						ctx,
					);
				}
				s.vars.set(args.name as string, args.value as Json);
				return null;
			}
			case "unset": {
				if (this.transport === "ws")
					await this.rpcCall(
						"unset",
						[{ k: "string", v: args.name as string }],
						ctx,
					);
				this.state(ctx.session).vars.delete(args.name as string);
				return null;
			}
			case "query":
				return this.statementResults(
					await this.rpcCall("query", this.queryParams(args, ctx.session), ctx),
				) as Json;
			case "query_stream": {
				const params = this.queryParams(args, ctx.session);
				if (this.transport === "http") {
					// HTTP cannot stream; buffer, as an SDK should.
					return this.statementResults(
						await this.rpcCall("query", params, ctx),
					) as Json;
				}
				const frames = await this.send("query_stream", params, {
					...ctx,
					stream: true,
				});
				const first = frames[0];
				if (frames.length === 1 && first?.has("error")) {
					const err = errorInfo(first.get("error"));
					// Not served (-32601) or denied (-32602): fall back to a buffered query.
					if (err.code === -32601 || err.code === -32602) {
						return this.statementResults(
							await this.rpcCall("query", params, ctx),
						) as Json;
					}
					throw new AdapterError(err);
				}
				return this.collectStream(frames) as Json;
			}
			case "run": {
				const fnArgs = (args.args as Json[] | undefined) ?? [];
				const version = args.version as string | null | undefined;
				return toJson(
					await this.rpcCall(
						"run",
						[
							{ k: "string", v: args.name as string },
							version ? { k: "string", v: version } : { k: "none" },
							fromJson(fnArgs),
						],
						ctx,
					),
				);
			}
			case "live": {
				if (this.transport !== "ws")
					throw unsupported("live queries need a WebSocket");
				const params: Value[] = [{ k: "table", v: args.table as string }];
				if (args.diff) params.push({ k: "bool", v: true });
				const id = await this.rpcCall("live", params, ctx);
				if (id.k !== "uuid")
					throw new AdapterError({
						kind: "Internal",
						message: "live did not return a uuid",
					});
				const handle = randomUuid();
				this.subscriptions.set(handle, id.v);
				return handle;
			}
			case "live_of": {
				if (this.transport !== "ws")
					throw unsupported("live queries need a WebSocket");
				// There is no RPC for this: notifications for every live query on the
				// connection already arrive, so subscribing by id is a filter.
				const id = fromJson(args.id as Json);
				const key =
					id.k === "uuid"
						? id.v
						: id.k === "string"
							? normaliseUuid(id.v)
							: undefined;
				if (!key)
					throw new AdapterError({
						kind: "Validation",
						message: "live_of needs a uuid",
					});
				const handle = randomUuid();
				this.subscriptions.set(handle, key);
				return handle;
			}
			case "live_id": {
				const id = this.subscriptions.get(args.subscription as string);
				if (!id)
					throw new AdapterError({
						kind: "NotFound",
						message: "no such subscription",
					});
				return { $uuid: id };
			}
			case "next_notification": {
				const id = this.subscriptions.get(args.subscription as string);
				if (!id)
					throw new AdapterError({
						kind: "NotFound",
						message: "no such subscription",
					});
				const deadline = Date.now() + Number(args.timeout ?? 5000);
				for (;;) {
					const q = this.queues.get(id);
					if (q?.length) return q.shift() as unknown as Json;
					const left = deadline - Date.now();
					if (left <= 0) return null;
					await new Promise<void>((resolve) => {
						const t = setTimeout(resolve, left);
						this.waiters.set(id, () => {
							clearTimeout(t);
							resolve();
						});
					});
					this.waiters.delete(id);
				}
			}
			case "kill": {
				const id = this.subscriptions.get(args.subscription as string);
				if (!id)
					throw new AdapterError({
						kind: "NotFound",
						message: "no such subscription",
					});
				await this.rpcCall("kill", [{ k: "uuid", v: id }], ctx);
				return null;
			}
			case "new_session": {
				const id = randomUuid();
				// Over HTTP this adapter keeps sessions in the client (see sessions.yaml).
				if (this.transport === "ws")
					await this.rpcCall("attach", [], { session: id });
				this.sessions.set(id, { vars: new Map() });
				return id;
			}
			case "fork_session": {
				const from = this.state(args.from as string | undefined);
				const id = randomUuid();
				if (this.transport === "ws")
					await this.rpcCall("attach", [], { session: id });
				this.sessions.set(id, { vars: new Map() });
				// There is no server-side fork: replay the source session's state.
				if (from.token)
					await this.call("authenticate", { session: id, token: from.token });
				if (from.namespace || from.database) {
					await this.call("use", {
						session: id,
						namespace: from.namespace ?? undefined,
						database: from.database ?? undefined,
					});
				}
				for (const [name, value] of from.vars)
					await this.call("set", { session: id, name, value });
				return id;
			}
			case "list_sessions": {
				if (this.transport === "ws") {
					const ids = await this.rpcCall("sessions", []);
					return ids.k === "array"
						? ids.v.map((v) => (v.k === "uuid" ? v.v : ""))
						: [];
				}
				return [...this.sessions.keys()].filter((k) => k !== "");
			}
			case "close_session": {
				const id = args.session as string;
				if (this.transport === "ws")
					await this.rpcCall("detach", [], { session: id });
				this.sessions.delete(id);
				return null;
			}
			case "begin": {
				const id = await this.rpcCall("begin", [], ctx);
				if (id.k !== "uuid")
					throw new AdapterError({
						kind: "Internal",
						message: "begin did not return a uuid",
					});
				return id.v;
			}
			case "commit":
			case "cancel":
				await this.rpcCall(op, [{ k: "uuid", v: args.txn as string }], {
					session: ctx.session,
				});
				return null;
			case "import": {
				const res = await fetch(`${this.base}/import`, {
					method: "POST",
					body: args.surql as string,
					headers: {
						...this.httpAuth(ctx.session),
						Accept: "application/json",
					},
				});
				const body = await res.text();
				if (res.ok) return null;
				if (res.status === 422) {
					const failures = (
						JSON.parse(body) as {
							kind: string;
							result: string;
							details?: Json;
						}[]
					).map((f) => ({
						kind: f.kind,
						message: f.result,
						...(f.details ? { details: f.details } : {}),
					}));
					throw new AdapterError({
						kind: "ImportFailed",
						message: `${failures.length} statements failed`,
						failures,
					});
				}
				throw httpError(res.status, body);
			}
			case "export": {
				const res = await fetch(`${this.base}/export`, {
					method: "POST",
					body: JSON.stringify(args.options ?? {}),
					headers: {
						...this.httpAuth(ctx.session),
						"Content-Type": "application/json",
						Accept: "text/plain",
					},
				});
				const body = await res.text();
				if (!res.ok) throw httpError(res.status, body);
				return body;
			}
			case "raw_rpc": {
				const frames = await this.send(
					args.method as string,
					((args.params as Json[] | undefined) ?? []).map(fromJson),
					{ ...ctx, stream: args.method === "query_stream", raw: true },
				);
				// The request id is the adapter's choice, so it is left out.
				return frames.map((f) =>
					toJson({
						k: "object",
						v: [...f.entries()].filter(([k]) => k !== "id"),
					}),
				);
			}
			case "raw_http": {
				const res = await fetch(`${this.base}${args.path as string}`, {
					method: args.method as string,
					headers: args.headers as Record<string, string> | undefined,
					body: args.body as string | undefined,
				});
				return { status: res.status, body: await res.text() };
			}
		}
		throw unsupported(op);
	}

	private queryParams(
		args: Record<string, Json | undefined>,
		session?: string,
	): Value[] {
		const vars = new Map<string, Json>();
		// HTTP has no session to hold variables, so the client merges them in.
		if (this.transport === "http")
			for (const [k, v] of this.state(session).vars) vars.set(k, v);
		for (const [k, v] of Object.entries(
			(args.vars as Record<string, Json> | undefined) ?? {},
		))
			vars.set(k, v);
		return [
			{ k: "string", v: args.sql as string },
			fromJson({ $object: Object.fromEntries(vars) }),
		];
	}

	/** Headers for the plain HTTP endpoints (/import, /export). */
	private httpAuth(session?: string): Record<string, string> {
		const s = this.state(session);
		const h: Record<string, string> = {};
		if (s.namespace) h["Surreal-NS"] = s.namespace;
		if (s.database) h["Surreal-DB"] = s.database;
		if (s.token) h.Authorization = `Bearer ${s.token}`;
		return h;
	}
}

function httpError(status: number, body: string): AdapterError {
	let message = body;
	try {
		const j = JSON.parse(body) as {
			information?: string;
			description?: string;
		};
		message = j.information ?? j.description ?? body;
	} catch {}
	const kind =
		status === 401 || status === 403
			? "NotAllowed"
			: status === 404
				? "NotFound"
				: "Validation";
	return new AdapterError({ kind, message: `HTTP ${status}: ${message}` });
}

export const rawAdapter = async (): Promise<Adapter> => new RawAdapter();
