import { describe, expect, test } from "bun:test";
import { ProcessAdapter } from "./process";
import { AdapterError } from "./protocol";

/** A driver that answers every request with `reply`, keeping the request's id. */
function driver(reply: string) {
	const js = `for await (const l of console) { const { id } = JSON.parse(l); console.log(JSON.stringify({ id, ...${reply} })); }`;
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
});
