import { describe, expect, test } from "bun:test";
import { ProcessAdapter } from "./process";
import { AdapterError } from "./protocol";

/** A driver that answers every request with `reply`, keeping the request's id. */
function driver(reply: string) {
	const js = `for await (const l of console) { if (!l.trim()) continue; const { id } = JSON.parse(l); console.log(JSON.stringify({ id, ...${reply} })); }`;
	return ProcessAdapter.start(`bun -e '${js}'`);
}

describe("ProcessAdapter", () => {
	test("passes a driver's error through", async () => {
		const a = driver(`{ ok: false, error: { kind: "NotFound" } }`);
		const e = await a.call("info", {}).catch((x) => x);
		expect(e).toBeInstanceOf(AdapterError);
		expect((e as AdapterError).info.kind).toBe("NotFound");
		await a.dispose();
	});

	test("fails ok: false without an error kind as a protocol violation", async () => {
		for (const reply of [`{ ok: false }`, `{ ok: false, error: {} }`]) {
			const a = driver(reply);
			const e = await a.call("info", {}).catch((x) => x);
			expect(e).toBeInstanceOf(Error);
			expect(e).not.toBeInstanceOf(AdapterError);
			expect(String(e)).toContain("no error {kind}");
			await a.dispose();
		}
	});

	test("a stray answer while nothing waits breaks the adapter for good", async () => {
		// Answers each request, then answers an id nobody asked for.
		const js = `for await (const l of console) { if (!l.trim()) continue; const { id } = JSON.parse(l); console.log(JSON.stringify({ id, ok: true, result: null })); console.log(JSON.stringify({ id: 999, ok: true, result: null })); }`;
		const a = ProcessAdapter.start(`bun -e '${js}'`);
		expect(await a.call("ping", {})).toBeNull();
		await Bun.sleep(300);
		expect(String(await a.call("ping", {}).catch((x) => x))).toContain(
			"broke the protocol earlier",
		);
		expect(String(await a.dispose().catch((x) => x))).toContain(
			"an id it was not asked",
		);
	});

	test("fails ok: true without a result, or with an error", async () => {
		for (const reply of [
			`{ ok: true }`,
			`{ ok: true, result: null, error: { kind: "NotFound" } }`,
		]) {
			const a = driver(reply);
			const e = await a.call("ping", {}).catch((x) => x);
			expect(e).toBeInstanceOf(Error);
			expect(e).not.toBeInstanceOf(AdapterError);
			expect(String(e)).toContain("ok: true but");
			await a.dispose();
		}
		const ok = driver(`{ ok: true, result: null }`);
		expect(await ok.call("ping", {})).toBeNull();
		await ok.dispose();
	});
});
