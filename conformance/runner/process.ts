/**
 * Runs an SDK's conformance driver as a child process.
 *
 * The driver protocol is one JSON object per line. The runner writes requests
 * to the driver's stdin and reads responses from its stdout; anything the
 * driver writes to stderr is passed through for debugging.
 *
 *   -> {"id": 1, "op": "hello", "args": {}}
 *   <- {"id": 1, "ok": true, "result": {"name": "surrealdb.py", "version": "2.0.0"}}
 *   -> {"id": 2, "op": "query", "args": {"sql": "RETURN 1"}}
 *   <- {"id": 2, "ok": true, "result": [{"ok": true, "result": 1}]}
 *   -> {"id": 3, "op": "live", "args": {"table": "person"}}
 *   <- {"id": 3, "ok": false, "error": {"kind": "Unsupported", "message": "live"}}
 *
 * Values are typed JSON (spec/README.md). The runner starts one driver process
 * per scenario run and closes its stdin when the run is over; the driver
 * should then exit. Requests are sent one at a time.
 */

import { type Subprocess, spawn } from "bun";
import type { Json } from "../lib/value";
import {
	type Adapter,
	AdapterError,
	type AdapterFactory,
	type ErrorInfo,
	type Hello,
} from "./protocol";

interface Response {
	id: number;
	ok: boolean;
	result?: Json;
	error?: ErrorInfo;
}

export class ProcessAdapter implements Adapter {
	private nextId = 1;
	private buffer = "";
	// An Error settles a request the driver broke the protocol on. It fails the
	// step outright, where an AdapterError could satisfy an expected error.
	private readonly waiting = new Map<number, (r: Response | Error) => void>();
	private exited = false;

	private constructor(
		private readonly proc: Subprocess<"pipe", "pipe", "inherit">,
	) {
		void this.read();
		void proc.exited.then(() => {
			this.exited = true;
			for (const w of this.waiting.values()) w(new Error("driver exited"));
			this.waiting.clear();
		});
	}

	static start(command: string): ProcessAdapter {
		const proc = spawn(["sh", "-c", command], {
			stdin: "pipe",
			stdout: "pipe",
			stderr: "inherit",
		});
		return new ProcessAdapter(proc);
	}

	private async read() {
		const decoder = new TextDecoder();
		for await (const chunk of this.proc.stdout) {
			this.buffer += decoder.decode(chunk, { stream: true });
			let nl = this.buffer.indexOf("\n");
			while (nl >= 0) {
				const line = this.buffer.slice(0, nl).trim();
				this.buffer = this.buffer.slice(nl + 1);
				if (line) {
					let r: Response;
					try {
						r = JSON.parse(line) as Response;
					} catch {
						// A driver that breaks the protocol fails what it was asked, rather
						// than leaving the runner waiting for an answer that never comes.
						this.failAll(
							`driver wrote a line that is not JSON: ${line.slice(0, 200)}`,
						);
						nl = this.buffer.indexOf("\n");
						continue;
					}
					if (typeof r?.ok !== "boolean") {
						this.failAll(
							`driver answered without a boolean ok: ${line.slice(0, 200)}`,
						);
						nl = this.buffer.indexOf("\n");
						continue;
					}
					if (typeof r?.id !== "number" || !this.waiting.has(r.id)) {
						this.failAll(
							`driver answered an id it was not asked: ${line.slice(0, 200)}`,
						);
						nl = this.buffer.indexOf("\n");
						continue;
					}
					this.waiting.get(r.id)?.(r);
					this.waiting.delete(r.id);
				}
				nl = this.buffer.indexOf("\n");
			}
		}
	}

	private failAll(message: string) {
		for (const [id, settle] of this.waiting) {
			this.waiting.delete(id);
			settle(new Error(message));
		}
	}

	private request(
		op: string,
		args: Record<string, Json | undefined>,
	): Promise<Json> {
		if (this.exited)
			return Promise.reject(
				new AdapterError({ kind: "Connection", message: "driver exited" }),
			);
		const id = this.nextId++;
		// A driver that never answers (a deadlocked SDK, say) fails the step
		// and is killed, rather than hanging the whole run.
		const ms = Number(process.env.CONFORMANCE_OP_TIMEOUT_MS ?? 30_000);
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (!this.waiting.delete(id)) return;
				this.proc.kill();
				reject(new Error(`driver did not answer ${op} within ${ms}ms`));
			}, ms);
			this.waiting.set(id, (r) => {
				clearTimeout(timer);
				if (r instanceof Error) return reject(r);
				if (r.ok) return resolve(r.result ?? null);
				// A failure must say what kind it is, or a loose expected error
				// would pass on a driver that only said "no".
				if (typeof r.error?.kind !== "string")
					return reject(
						new Error(
							`driver answered ${op} with ok: false but no error {kind}: ${JSON.stringify(r, bigints)}`,
						),
					);
				reject(new AdapterError(r.error));
			});
			this.proc.stdin.write(`${JSON.stringify({ id, op, args }, bigints)}\n`);
			this.proc.stdin.flush();
		});
	}

	async hello(): Promise<Hello> {
		return (await this.request("hello", {})) as unknown as Hello;
	}

	call(op: string, args: Record<string, Json | undefined>): Promise<Json> {
		return this.request(op, args);
	}

	async dispose() {
		this.proc.stdin.end();
		const timer = setTimeout(() => this.proc.kill(), 2000);
		await this.proc.exited;
		clearTimeout(timer);
	}
}

export const processAdapter =
	(command: string): AdapterFactory =>
	async () =>
		ProcessAdapter.start(command);

/** JSON.stringify replacer: integers as plain numbers, or `$int` past 2^53. */
const bigints = (_: string, x: unknown) =>
	typeof x === "bigint"
		? x >= -(2n ** 53n) && x <= 2n ** 53n
			? Number(x)
			: { $int: x.toString() }
		: x;

/**
 * Serves `adapter` as a driver on this process's stdin and stdout, the other
 * half of the protocol. A TypeScript or JavaScript SDK can use it directly; it
 * is also the model for drivers in other languages.
 */
export async function serveDriver(adapter: Adapter) {
	const decoder = new TextDecoder();
	let buffer = "";
	const write = (r: Response) =>
		process.stdout.write(`${JSON.stringify(r, bigints)}\n`);
	for await (const chunk of Bun.stdin.stream()) {
		buffer += decoder.decode(chunk, { stream: true });
		let nl = buffer.indexOf("\n");
		while (nl >= 0) {
			const line = buffer.slice(0, nl).trim();
			buffer = buffer.slice(nl + 1);
			nl = buffer.indexOf("\n");
			if (!line) continue;
			const req = JSON.parse(line) as {
				id: number;
				op: string;
				args: Record<string, Json>;
			};
			try {
				const result =
					req.op === "hello"
						? ((await adapter.hello()) as unknown as Json)
						: await adapter.call(req.op, req.args ?? {});
				write({ id: req.id, ok: true, result });
			} catch (e) {
				const error: ErrorInfo =
					e instanceof AdapterError
						? e.info
						: { kind: "Internal", message: String(e) };
				write({ id: req.id, ok: false, error });
			}
		}
	}
	await adapter.dispose();
}
