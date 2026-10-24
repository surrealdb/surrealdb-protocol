/**
 * Starts and stops `surreal start memory` for the conformance tooling.
 *
 * The binary is `$SURREAL_BIN`, else `surreal` on the PATH. Set `$SURREAL_URL`
 * to use a server that is already running instead; it must have been started
 * with the same flags (root/root, --allow-all, --allow-experimental files),
 * and scenarios that need their own server flags are then skipped.
 */

import { type Subprocess, spawn } from "bun";

export interface ServerOptions {
	/** Extra `surreal start` flags, placed after the `memory` path. */
	args?: string[];
	/** Extra environment variables. */
	env?: Record<string, string>;
}

export interface Server {
	/** Base URL, e.g. http://127.0.0.1:41234. */
	http: string;
	/** WebSocket RPC URL, e.g. ws://127.0.0.1:41234/rpc. */
	ws: string;
	version: string;
	external: boolean;
	stop(): Promise<void>;
}

export const ROOT = { user: "root", pass: "root" } as const;

async function freePort(): Promise<number> {
	const s = Bun.listen({
		hostname: "127.0.0.1",
		port: 0,
		socket: { data() {} },
	});
	const port = s.port;
	s.stop(true);
	return port;
}

async function waitHealthy(
	base: string,
	proc: Subprocess | undefined,
	timeoutMs = 20_000,
) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (proc && proc.exitCode !== null)
			throw new Error(`surreal exited with code ${proc.exitCode}`);
		try {
			const r = await fetch(`${base}/health`);
			if (r.ok) return;
		} catch {}
		await Bun.sleep(100);
	}
	throw new Error(
		`surreal at ${base} did not become healthy within ${timeoutMs}ms`,
	);
}

async function versionOf(base: string): Promise<string> {
	const r = await fetch(`${base}/version`);
	return (await r.text()).trim();
}

export async function startServer(opts: ServerOptions = {}): Promise<Server> {
	const external = process.env.SURREAL_URL;
	if (external) {
		const http = external.replace(/\/+$/, "").replace(/^ws/, "http");
		await waitHealthy(http, undefined);
		return {
			http,
			ws: `${http.replace(/^http/, "ws")}/rpc`,
			version: await versionOf(http),
			external: true,
			async stop() {},
		};
	}
	const bin = process.env.SURREAL_BIN ?? "surreal";
	const port = await freePort();
	const http = `http://127.0.0.1:${port}`;
	// List-valued flags such as --deny-rpc swallow a following positional
	// argument, so `memory` comes first and the extra flags last.
	const proc = spawn(
		[
			bin,
			"start",
			"memory",
			"--bind",
			`127.0.0.1:${port}`,
			"--user",
			ROOT.user,
			"--pass",
			ROOT.pass,
			...(opts.args ?? []),
		],
		{
			env: {
				...process.env,
				SURREAL_CAPS_ALLOW_ALL: "true",
				SURREAL_CAPS_ALLOW_EXPERIMENTAL: "files",
				SURREAL_LOG: process.env.SURREAL_LOG ?? "warn",
				...opts.env,
			},
			stdout: "ignore",
			stderr: process.env.CONFORMANCE_SERVER_LOGS ? "inherit" : "pipe",
		},
	);
	// Keep reading stderr for the server's whole life, so a chatty log level
	// cannot fill the pipe and stall it, but remember only the last lines.
	const tail: string[] = [];
	const drained =
		proc.stderr instanceof ReadableStream
			? (async () => {
					const decoder = new TextDecoder();
					for await (const chunk of proc.stderr as ReadableStream<Uint8Array>) {
						tail.push(
							...decoder
								.decode(chunk, { stream: true })
								.split("\n")
								.filter(Boolean),
						);
						tail.splice(0, Math.max(0, tail.length - 3));
					}
				})()
			: Promise.resolve();
	try {
		await waitHealthy(http, proc);
	} catch (e) {
		proc.kill();
		await drained;
		throw new Error(
			`${(e as Error).message}${tail.length ? `: ${tail.join(" | ")}` : ""}`,
		);
	}
	return {
		http,
		ws: `ws://127.0.0.1:${port}/rpc`,
		version: await versionOf(http),
		external: false,
		async stop() {
			proc.kill();
			await proc.exited;
		},
	};
}
