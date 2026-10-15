import { afterAll, describe, expect, test } from "bun:test";
import { type CborItem, decode, encode, text } from "../lib/cbor";
import { RawAdapter } from "./raw";

/** A CBOR envelope answering request `id` with a null result. */
function answer(id: CborItem): Uint8Array {
	return encode({
		t: "map",
		v: [
			[text("id"), id],
			[text("result"), { t: "simple", v: 22 }],
		],
	});
}

function requestId(bytes: Uint8Array): CborItem {
	const m = decode(bytes);
	if (m.t !== "map") throw new Error("not a map");
	const e = m.v.find(([k]) => k.t === "text" && k.v === "id");
	if (!e) throw new Error("no id");
	return e[1];
}

// A fake /rpc: over WebSocket it answers each request twice; over HTTP it
// answers with a CBOR envelope under a 500 status.
const server = Bun.serve({
	port: 0,
	fetch(req, srv) {
		if (srv.upgrade(req, { headers: { "Sec-WebSocket-Protocol": "cbor" } }))
			return;
		return req.arrayBuffer().then(
			(b) =>
				new Response(answer(requestId(new Uint8Array(b))), {
					status: 500,
					headers: { "Content-Type": "application/cbor" },
				}),
		);
	},
	websocket: {
		message(ws, msg) {
			const reply = answer(requestId(new Uint8Array(msg as Buffer)));
			ws.send(reply);
			ws.send(reply);
		},
	},
});
afterAll(() => server.stop(true));
const url = `ws://localhost:${server.port}/rpc`;

describe("raw adapter", () => {
	test("a duplicate answer right after the last one fails dispose", async () => {
		const a = new RawAdapter();
		await a.call("connect", { url, transport: "ws" });
		await a.call("ping", {});
		await expect(a.dispose()).rejects.toThrow("no request is waiting");
	});

	test("a CBOR body under a 5xx status is not an RPC answer", async () => {
		const a = new RawAdapter();
		await a.call("connect", { url, transport: "http" });
		const err = await a.call("ping", {}).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.constructor.name).toBe("Error");
		expect(String(err)).toContain("HTTP 500 with a CBOR body");
		await a.dispose();
	});
});
