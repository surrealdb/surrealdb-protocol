/**
 * Just enough gRPC over plaintext HTTP/2 to drive SurrealDBService from the
 * conformance tooling, with no dependency beyond node:http2.
 */

import http2 from "node:http2";

export const SERVICE = "surrealdb.protocol.rpc.v1.SurrealDBService";

export class GrpcError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(`gRPC status ${status}: ${message}`);
	}
}

export class GrpcClient {
	private readonly session: http2.ClientHttp2Session;

	constructor(base: string) {
		this.session = http2.connect(base);
	}

	/** Calls `method`, returning every response message (one for a unary call). */
	call(
		method: string,
		request: Uint8Array,
		metadata: Record<string, string> = {},
	): Promise<Uint8Array[]> {
		const frame = new Uint8Array(5 + request.length);
		new DataView(frame.buffer).setUint32(1, request.length);
		frame.set(request, 5);
		return new Promise((resolve, reject) => {
			const req = this.session.request({
				":method": "POST",
				":path": `/${SERVICE}/${method}`,
				"content-type": "application/grpc",
				te: "trailers",
				...metadata,
			});
			const chunks: Buffer[] = [];
			let status: number | undefined;
			let message = "";
			const take = (h: http2.IncomingHttpHeaders) => {
				if (h["grpc-status"] !== undefined) {
					status = Number(h["grpc-status"]);
					message = decodeURIComponent(String(h["grpc-message"] ?? ""));
				}
			};
			req.on("response", take);
			req.on("trailers", take);
			req.on("data", (d: Buffer) => chunks.push(d));
			req.on("error", reject);
			req.on("end", () => {
				if (status !== undefined && status !== 0)
					return reject(new GrpcError(status, message));
				const all = Buffer.concat(chunks);
				const out: Uint8Array[] = [];
				for (let o = 0; o + 5 <= all.length; ) {
					const n = all.readUInt32BE(o + 1);
					out.push(new Uint8Array(all.subarray(o + 5, o + 5 + n)));
					o += 5 + n;
				}
				resolve(out);
			});
			req.end(frame);
		});
	}

	close() {
		this.session.close();
	}
}

/**
 * Length-delimited sub-message bytes for field `field` of a protobuf message,
 * in order. Used to slice the server's exact `Value` bytes out of a response
 * without re-encoding them.
 */
export function fieldBytes(msg: Uint8Array, field: number): Uint8Array[] {
	const out: Uint8Array[] = [];
	let i = 0;
	const varint = () => {
		let v = 0n;
		let shift = 0n;
		for (;;) {
			const b = msg[i++] as number;
			v |= BigInt(b & 0x7f) << shift;
			if (!(b & 0x80)) return v;
			shift += 7n;
		}
	};
	while (i < msg.length) {
		const key = Number(varint());
		const wire = key & 7;
		const num = key >> 3;
		if (wire === 0) varint();
		else if (wire === 1) i += 8;
		else if (wire === 5) i += 4;
		else if (wire === 2) {
			const n = Number(varint());
			if (num === field) out.push(msg.slice(i, i + n));
			i += n;
		} else throw new Error(`unsupported wire type ${wire}`);
	}
	return out;
}
