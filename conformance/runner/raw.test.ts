import { afterAll, describe, expect, test } from "bun:test";
import { AdapterError } from "./protocol";
import { RawAdapter } from "./raw";
import { fakeRpc } from "./raw.fixture";

describe("raw adapter", () => {
	const server = fakeRpc();
	afterAll(() => server.stop(true));

	test("a duplicate answer right after the last one fails dispose", async () => {
		const child = Bun.spawn(
			[
				"bun",
				new URL("raw.fixture.ts", import.meta.url).pathname,
				"ws-duplicate",
			],
			{ stdout: "pipe", stderr: "inherit" },
		);
		const out = await new Response(child.stdout).text();
		expect(await child.exited).toBe(0);
		expect(out).toContain("dispose: ");
		expect(out).toContain("no request is waiting");
	});

	test("a CBOR body under a 5xx status is not an RPC answer", async () => {
		const a = new RawAdapter();
		await a.call("connect", {
			url: `ws://127.0.0.1:${server.port}/rpc`,
			transport: "http",
		});
		const err = await a.call("ping", {}).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.constructor.name).toBe("Error");
		expect(String(err)).toContain("HTTP 500 with a CBOR body");
		await a.dispose();
	});

	test("a plain-text 403 is NotAllowed, as a 401 is", async () => {
		const a = new RawAdapter();
		await a.call("connect", {
			url: `ws://127.0.0.1:${server.port}/forbidden/rpc`,
			transport: "http",
		});
		const err = await a.call("ping", {}).catch((e) => e);
		expect(err).toBeInstanceOf(AdapterError);
		expect((err as AdapterError).info.kind).toBe("NotAllowed");
		await a.dispose();
	});
});
