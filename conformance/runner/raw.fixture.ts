/**
 * A misbehaving /rpc for raw.test.ts. Over WebSocket it answers every request
 * twice; over HTTP it answers with a CBOR envelope under a 500 status.
 *
 * Run as a script (`bun raw.fixture.ts ws-duplicate`), it drives the raw
 * adapter against the WebSocket half itself and prints how dispose ended:
 * inside Bun 1.1.17's test runner (CI's pin), a WebSocket can stay connecting
 * forever once a large YAML file has been parsed, so that case runs out of
 * process.
 */
import { type CborItem, decode, encode, NULL, text } from "../lib/cbor";
import { RawAdapter } from "./raw";

function answer(request: Uint8Array): Uint8Array {
	const m = decode(request);
	if (m.t !== "map") throw new Error("not a map");
	const id = m.v.find(([k]) => k.t === "text" && k.v === "id")?.[1];
	if (!id) throw new Error("no id");
	return encode({
		t: "map",
		v: [
			[text("id"), id as CborItem],
			[text("result"), NULL],
		],
	});
}

export function fakeRpc() {
	return Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch(req, srv) {
			if (srv.upgrade(req, { headers: { "Sec-WebSocket-Protocol": "cbor" } }))
				return;
			return req.arrayBuffer().then(
				(b) =>
					new Response(answer(new Uint8Array(b)), {
						status: 500,
						headers: { "Content-Type": "application/cbor" },
					}),
			);
		},
		websocket: {
			message(ws, msg) {
				const reply = answer(new Uint8Array(msg as Buffer));
				ws.send(reply);
				ws.send(reply);
			},
		},
	});
}

if (import.meta.main && process.argv[2] === "ws-duplicate") {
	const server = fakeRpc();
	const a = new RawAdapter();
	await a.call("connect", {
		url: `ws://127.0.0.1:${server.port}/rpc`,
		transport: "ws",
	});
	await a.call("ping", {});
	const outcome = await a.dispose().then(
		() => "dispose: ok",
		(e) => `dispose: ${e instanceof Error ? e.message : String(e)}`,
	);
	console.log(outcome);
	server.stop(true);
}
