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
		for (const reply of [
			`{ ok: false }`,
			`{ ok: false, error: {} }`,
			`{ ok: false, error: { kind: "Validation" }, result: 1 }`,
		]) {
			const a = driver(reply);
			const e = await a.call("info", {}).catch((x) => x);
			expect(e).toBeInstanceOf(Error);
			expect(e).not.toBeInstanceOf(AdapterError);
			expect(String(e)).toContain("ok: false but");
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

	test("output left without a newline at exit breaks the adapter", async () => {
		// Answers one request, writes a stray fragment and exits.
		const js = `for await (const l of console) { if (!l.trim()) continue; const { id } = JSON.parse(l); process.stdout.write(JSON.stringify({ id, ok: true, result: null }) + "\\n" + "{\\"id\\": 9"); process.exit(0); }`;
		const a = ProcessAdapter.start(`bun -e '${js}'`);
		expect(await a.call("ping", {})).toBeNull();
		expect(String(await a.dispose().catch((x) => x))).toContain(
			"no closing newline",
		);
	});

	test("a malformed hello is refused", async () => {
		for (const reply of [
			`{ ok: true, result: {} }`,
			`{ ok: true, result: { name: 123, version: null } }`,
			`{ ok: true, result: { name: "x", version: "1", ops: [1] } }`,
		]) {
			const a = driver(reply);
			expect(String(await a.hello().catch((x) => x))).toContain(
				"hello must be",
			);
			await a.dispose();
		}
	});

	test("a driver that exits nonzero fails dispose", async () => {
		const js = `for await (const l of console) { if (!l.trim()) continue; const { id } = JSON.parse(l); console.log(JSON.stringify({ id, ok: true, result: null })); } process.exit(3);`;
		const a = ProcessAdapter.start(`bun -e '${js}'`);
		expect(await a.call("ping", {})).toBeNull();
		expect(String(await a.dispose().catch((x) => x))).toContain("status 3");
	});

	test("a driver that ignores SIGTERM is killed and fails dispose", async () => {
		const js = `process.on("SIGTERM", () => {}); for await (const l of console) { if (!l.trim()) continue; const { id } = JSON.parse(l); console.log(JSON.stringify({ id, ok: true, result: null })); } setInterval(() => {}, 1000);`;
		const a = ProcessAdapter.start(`exec bun -e '${js}'`);
		expect(await a.call("ping", {})).toBeNull();
		expect(String(await a.dispose().catch((x) => x))).toContain(
			"did not exit when stdin closed",
		);
	}, 30_000);
});
