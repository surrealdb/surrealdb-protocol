/**
 * Fills in and verifies spec/vectors/cbor.yaml and cbor2.yaml (and from them
 * proto.yaml) against a live server.
 *
 *   bun run vectors:write   regenerate `cbor`, `diag`, `canonical` and `server`
 *   bun run vectors:check   fail if the file no longer matches the server
 *
 * Both start `surreal start memory` (see conformance/lib/server.ts for how the
 * binary is found), and check every vector three ways:
 *
 *  - against the hand-written `value`, decoded with conformance/lib/value.ts;
 *  - against the server, by sending the bytes back as a query variable and
 *    reading what it returns (canonical vectors must come back byte for byte,
 *    reject vectors must fail);
 *  - against the reference encoder, which must reproduce the server's bytes.
 *
 * So a vector that disagrees with the server, or a `value` that disagrees with
 * the server's encoding, cannot be committed silently.
 *
 * cbor.2 is plain cbor plus the sized-number tags, so each cbor.yaml vector is
 * also run as cbor.2 and must behave the same, unless its `formats` leaves
 * cbor.2 out. Each cbor2.yaml canonical vector is also run as plain cbor,
 * where the server's widening must match the reference encoder's.
 *
 * The file describes the 4.0 wire. A server that does not speak cbor.2 is
 * taken to be from before 4.0: it is held to each vector's `legacy` entry
 * where there is one (and must accept the input, returning
 * `legacy.canonical`), and to the 4.0 expectation everywhere else, except
 * that vectors marked `since: "4.0"` and the whole of cbor2.yaml are skipped.
 * Against such a server `write` only fills in `legacy.canonical`; every other
 * difference is a failure.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
	Document,
	isCollection,
	parse,
	parseDocument,
	type YAMLMap,
	type YAMLSeq,
} from "yaml";
import {
	type CborItem,
	type Decoded,
	decode,
	diagnostic,
	encode,
	fromHex,
	int,
	parseDiagnostic,
	text,
	toHex,
} from "../conformance/lib/cbor";
import { fieldBytes, GrpcClient, GrpcError } from "../conformance/lib/grpc";
import { decodeProto, encodeProto } from "../conformance/lib/proto";
import { ROOT, type Server, startServer } from "../conformance/lib/server";
import {
	equal,
	type Format,
	fromCbor,
	fromJson,
	type Json,
	toCbor,
	toJson,
	type Value,
} from "../conformance/lib/value";
import {
	AttachSessionRequest,
	AttachSessionResponse,
	QueryRequest,
	ResultEncoding,
	SigninRequest,
	UseRequest,
} from "../gen/ts/surrealdb/protocol/rpc/v1/rpc";
import { SurrealError } from "../gen/ts/surrealdb/protocol/v1/error";

const FILE = new URL("../spec/vectors/cbor.yaml", import.meta.url).pathname;
const CBOR2_FILE = new URL("../spec/vectors/cbor2.yaml", import.meta.url)
	.pathname;
const PROTO_FILE = new URL("../spec/vectors/proto.yaml", import.meta.url)
	.pathname;
const mode = process.argv[2];
if (mode !== "write" && mode !== "check") {
	console.error("usage: bun scripts/vectors.ts write|check");
	process.exit(2);
}

/** Whether `server` speaks the 4.0 wire: it answers `Accept: application/cbor; v=2` in kind. */
async function speaksCbor2(server: Server): Promise<boolean> {
	const res = await fetch(`${server.http}/rpc`, {
		method: "POST",
		body: encode({
			t: "map",
			v: [
				[text("id"), int(1)],
				[text("method"), text("version")],
			],
		}),
		headers: {
			"Content-Type": "application/cbor",
			Accept: "application/cbor; v=2",
		},
	});
	await res.arrayBuffer();
	return (res.headers.get("content-type") ?? "").includes("v=2");
}

type Outcome =
	| { ok: true; bytes: Uint8Array }
	| { ok: false; kind: string; message: string };

const MEDIA: Record<Format, string> = {
	cbor: "application/cbor",
	"cbor.2": "application/cbor; v=2",
};

/** Runs `sql` over HTTP /rpc in `format`, returning the first statement's raw result bytes. */
async function query(
	server: Server,
	sql: string,
	vars?: Uint8Array,
	format: Format = "cbor",
): Promise<Outcome> {
	const params: CborItem[] = [text(sql)];
	if (vars)
		params.push({ t: "map", v: [[text("v"), { t: "raw", bytes: vars }]] });
	const body = encode({
		t: "map",
		v: [
			[text("id"), int(1)],
			[text("method"), text("query")],
			[text("params"), { t: "array", v: params }],
		],
	});
	const res = await fetch(`${server.http}/rpc`, {
		method: "POST",
		body,
		headers: {
			"Content-Type": MEDIA[format],
			Accept: MEDIA[format],
			Authorization: `Basic ${btoa(`${ROOT.user}:${ROOT.pass}`)}`,
			"Surreal-NS": "vectors",
			"Surreal-DB": "vectors",
		},
	});
	const raw = new Uint8Array(await res.arrayBuffer());
	if (!(res.headers.get("content-type") ?? "").includes("cbor")) {
		return {
			ok: false,
			kind: `HTTP ${res.status}`,
			message: new TextDecoder().decode(raw),
		};
	}
	const top = decode(raw);
	const field = (m: Decoded, k: string) =>
		m.t === "map"
			? (m.v.find(([key]) => key.t === "text" && key.v === k)?.[1] as
					| Decoded
					| undefined)
			: undefined;
	const err = field(top, "error");
	if (err)
		return {
			ok: false,
			kind: describe(field(err, "kind")),
			message: describe(field(err, "message")),
		};
	const results = field(top, "result");
	const first = results?.t === "array" ? (results.v[0] as Decoded) : undefined;
	if (!first) throw new Error(`unexpected response ${diagnostic(top)}`);
	const status = describe(field(first, "status"));
	const result = field(first, "result") as Decoded;
	if (status !== "OK")
		return {
			ok: false,
			kind: describe(field(first, "kind")),
			message: describe(result),
		};
	return { ok: true, bytes: raw.slice(result.span.start, result.span.end) };
}

const describe = (d: Decoded | undefined) =>
	d?.t === "text" ? d.v : d ? diagnostic(d) : "";

function tryDecode(bytes: Uint8Array, format: Format = "cbor"): Value | Error {
	try {
		return fromCbor(decode(bytes), format);
	} catch (e) {
		return e as Error;
	}
}

const show = (v: Value | Error) =>
	v instanceof Error
		? `error: ${v.message}`
		: JSON.stringify(toJson(v), (_, x) =>
				typeof x === "bigint" ? x.toString() : x,
			);

/** A root gRPC session using database vectors/vectors. */
async function grpcSession(server: Server) {
	const client = new GrpcClient(server.http);
	// Over gRPC the server mints the session id; the client does not choose it.
	const [attached] = await client.call(
		"AttachSession",
		AttachSessionRequest.encode({ context: undefined }).finish(),
	);
	const context = {
		session: AttachSessionResponse.decode(attached as Uint8Array).session,
		transaction: undefined,
		timeout: undefined,
	};
	await client.call(
		"Signin",
		SigninRequest.encode({
			context,
			accessMethod: {
				method: {
					$case: "user",
					user: {
						namespace: "",
						database: "",
						username: ROOT.user,
						password: ROOT.pass,
						access: "",
					},
				},
			},
		}).finish(),
	);
	await client.call(
		"Use",
		UseRequest.encode({
			context,
			namespace: { value: { $case: "some", some: "vectors" } },
			database: { value: { $case: "some", some: "vectors" } },
		}).finish(),
	);
	return {
		/**
		 * The raw bytes of the value `surql` evaluates to, or the error.
		 *
		 * Wrapped in an object, because gRPC streams a top-level array as rows
		 * rather than as one value: `RETURN [1, 2]` arrives as 1 and 2.
		 */
		async value(
			surql: string,
		): Promise<
			{ ok: true; bytes: Uint8Array } | { ok: false; message: string }
		> {
			let frames: Uint8Array[];
			try {
				frames = await client.call(
					"Query",
					QueryRequest.encode({
						context,
						query: `RETURN { v: ${surql} }`,
						variables: undefined,
						acceptedEncodings: [ResultEncoding.VALUES],
						maxBatchRecords: 0,
					}).finish(),
				);
			} catch (e) {
				return {
					ok: false,
					message: e instanceof GrpcError ? e.message : String(e),
				};
			}
			const error = (b: Uint8Array) => {
				const e = SurrealError.decode(b);
				return { ok: false as const, message: `${e.kind}: ${e.message}` };
			};
			for (const frame of frames) {
				for (const e of fieldBytes(frame, 4)) return error(e);
				for (const batch of fieldBytes(frame, 2)) {
					for (const e of fieldBytes(batch, 6)) return error(e);
					for (const values of fieldBytes(batch, 7)) {
						// ValueBatch.values[0] -> Value.object -> Object.items[0] -> KeyValue.value
						const wrapper = fieldBytes(values, 1)[0];
						const item =
							wrapper &&
							fieldBytes(fieldBytes(wrapper, 19)[0] ?? new Uint8Array(), 1)[0];
						const value = item && fieldBytes(item, 2)[0];
						if (value) return { ok: true, bytes: value };
					}
				}
			}
			return { ok: false, message: "no value in the response" };
		},
		close: () => client.close(),
	};
}

const PROTO_HEADER = ` Protobuf value test vectors: the same values as cbor.yaml, encoded as
 surrealdb.protocol.v1.Value (surrealdb/protocol/v1/value.proto).

 GENERATED by \`bun run vectors:write\` from the canonical vectors in cbor.yaml,
 by running each \`surql\` over gRPC against a live server and slicing the
 server's own Value bytes out of the Query stream. Do not edit by hand, except
 for \`proto-only\` vectors, whose name, surql, value and notes are kept.

 An SDK MUST decode \`proto\` to \`value\`, and SHOULD encode \`value\` to exactly
 \`proto\` (fields in number order, object keys ascending, as the server does).
 A vector with \`proto: null\` has no protobuf encoding; \`notes\` says why.`;

interface ProtoVector {
	name: string;
	kind: "canonical" | "proto-only";
	surql: string;
	value: Json;
	proto: string | null;
	notes?: string;
}

async function protoVectors(
	server: Server,
	strict: boolean,
	cborVectors: {
		name: string;
		kind: string;
		surql?: string;
		value?: Json;
		since?: string;
	}[],
	failures: string[],
) {
	const previous: ProtoVector[] = existsSync(PROTO_FILE)
		? ((parse(readFileSync(PROTO_FILE, "utf8"), { intAsBigInt: true })
				?.vectors ?? []) as ProtoVector[])
		: [];
	const wanted: ProtoVector[] = [
		...cborVectors
			.filter((v) => v.kind === "canonical")
			.map((v) => ({
				name: v.name,
				kind: "canonical" as const,
				surql: v.surql as string,
				value: v.value as Json,
				proto: null,
			})),
		...previous.filter((v) => v.kind === "proto-only"),
	];
	// What a server before 4.0 cannot run is kept as a 4.0 server wrote it.
	const skipped = new Set(
		strict ? [] : cborVectors.filter((v) => v.since).map((v) => v.name),
	);
	const session = await grpcSession(server);
	const out: ProtoVector[] = [];
	try {
		for (const v of wanted) {
			const fail = (msg: string) => failures.push(`proto ${v.name}: ${msg}`);
			if (skipped.has(v.name)) {
				const kept = previous.find((p) => p.name === v.name);
				if (kept) out.push(kept);
				continue;
			}
			const expected = fromJson(v.value);
			const res = await session.value(v.surql);
			const entry: ProtoVector = {
				name: v.name,
				kind: v.kind,
				surql: v.surql,
				value: v.value,
				proto: null,
			};
			if (!res.ok) {
				const note = PROTO_GAPS[v.name];
				if (!note) fail(`server could not encode it over gRPC: ${res.message}`);
				else console.log(`gap ${v.name}: ${res.message}`);
				entry.notes = note;
				out.push(entry);
				continue;
			}
			let got: Value | Error;
			try {
				got = decodeProto(res.bytes);
			} catch (e) {
				got = e as Error;
			}
			if (got instanceof Error || !equal(got, expected))
				fail(
					`value is ${show(expected)} but the server's bytes decode to ${show(got)}`,
				);
			const ours = encodeProto(expected);
			if (toHex(ours) !== toHex(res.bytes))
				fail(
					`reference encoder gives ${toHex(ours)}, server gives ${toHex(res.bytes)}`,
				);
			entry.proto = toHex(res.bytes);
			const note = v.notes ?? PROTO_NOTES[v.name];
			if (note) entry.notes = note;
			out.push(entry);
		}
	} finally {
		session.close();
	}
	return out;
}

/** Vectors the protobuf Value cannot carry, and why. A failure not listed here fails the run. */
const PROTO_GAPS: Record<string, string> = {
	"duration-u64-seconds":
		"No protobuf encoding. Duration.seconds is int64 while SurrealDB durations (and CBOR tag 14) are u64, so a duration above i64::MAX seconds fails the statement over gRPC with an Internal error. Only durations up to 9223372036854775807 seconds cross every transport.",
};

/** Extra notes for protobuf vectors whose encoding differs in an interesting way from CBOR. */
const PROTO_NOTES: Record<string, string> = {};

interface VectorFields {
	name: string;
	kind: string;
	surql?: string;
	diag?: string;
	raw?: boolean;
	cbor?: string;
	value?: Json;
	server_quirk?: string;
	legacy?: { canonical?: string };
	formats?: Format[];
	since?: string;
}

/** Checks, and in write mode fills in, one vector file of `format`. */
async function checkFile(
	file: string,
	format: Format,
	server: Server,
	strict: boolean,
	failures: string[],
	drift: string[],
) {
	const doc: Document = parseDocument(readFileSync(file, "utf8"), {
		intAsBigInt: true,
	});
	const vectors = doc.get("vectors") as YAMLSeq<YAMLMap>;
	const names = new Set<string>();
	let skipped = 0;

	// Only a 4.0 server writes the 4.0 fields; an older one only `legacy`.
	const set = (node: YAMLMap, key: string, value: string | undefined) => {
		const before = node.get(key);
		if (before === value) return;
		const what = `${node.get("name")}: ${key} is ${before ?? "missing"}, server gives ${value}`;
		if (mode === "check") drift.push(what);
		else if (!strict)
			failures.push(
				`${what}; a server before 4.0 differs here, so give it a \`legacy\` entry`,
			);
		else if (value === undefined) node.delete(key);
		else node.set(key, value);
	};
	const setLegacy = (node: YAMLMap, value: string) => {
		const legacy = node.get("legacy") as YAMLMap;
		const before = legacy.get("canonical");
		if (before === value) return;
		if (mode === "check")
			drift.push(
				`${node.get("name")}: legacy.canonical is ${before ?? "missing"}, server gives ${value}`,
			);
		else legacy.set("canonical", value);
	};

	for (const node of vectors.items) {
		const v = node.toJS(doc) as VectorFields;
		const fail = (msg: string) => failures.push(`${v.name}: ${msg}`);
		if (names.has(v.name)) fail("duplicate name");
		names.add(v.name);
		if (v.since && !strict) {
			skipped++;
			continue;
		}
		if (v.formats?.some((f) => f !== "cbor" && f !== "cbor.2"))
			fail(`unknown format in ${v.formats}`);
		// A plain cbor vector also holds for cbor.2, unless it says otherwise.
		const alsoCbor2 = format === "cbor" && strict;
		const holdsForCbor2 = !v.formats || v.formats.includes("cbor.2");
		const cbor2 = (sql: string, vars?: Uint8Array) =>
			query(server, sql, vars, "cbor.2");

		if (v.legacy && v.kind !== "reject")
			fail("only a reject vector has a legacy entry");
		if (v.legacy && format !== "cbor")
			fail("only a plain cbor vector has a legacy entry");
		if (v.legacy && v.kind === "reject" && !strict) {
			// A server before 4.0 accepted this input; hold it to what it returned.
			const input = v.raw
				? fromHex(v.cbor as string)
				: encode(parseDiagnostic(v.diag as string));
			const out = await query(server, "RETURN $v", input);
			if (!out.ok) {
				fail(
					`server before 4.0 now rejects it (${out.kind}); drop the legacy entry`,
				);
				continue;
			}
			if (tryDecode(out.bytes) instanceof Error)
				fail(`the reference decoder cannot read ${toHex(out.bytes)}`);
			setLegacy(node, toHex(out.bytes));
			set(node, "cbor", toHex(input));
			continue;
		}

		if (v.kind === "canonical") {
			const out = await query(server, `RETURN ${v.surql}`, undefined, format);
			if (!out.ok) {
				fail(`server rejected \`${v.surql}\`: ${out.kind}: ${out.message}`);
				continue;
			}
			const expected = fromJson(v.value as Json);
			const got = tryDecode(out.bytes, format);
			if (got instanceof Error || !equal(got, expected))
				fail(
					`value is ${show(expected)} but the server's bytes decode to ${show(got)}`,
				);
			const ours = encode(toCbor(expected, format));
			if (toHex(ours) !== toHex(out.bytes))
				fail(
					`reference encoder gives ${toHex(ours)}, server gives ${toHex(out.bytes)}`,
				);
			const back = await query(server, "RETURN $v", out.bytes, format);
			if (!back.ok || toHex(back.bytes) !== toHex(out.bytes))
				fail(
					`does not round-trip through the server: ${back.ok ? toHex(back.bytes) : back.message}`,
				);
			if (alsoCbor2 && holdsForCbor2) {
				const two = await cbor2(`RETURN ${v.surql}`);
				if (!two.ok || toHex(two.bytes) !== toHex(out.bytes))
					fail(
						`cbor.2 differs from cbor: ${two.ok ? toHex(two.bytes) : two.message}`,
					);
			}
			if (format === "cbor.2") {
				// Plain cbor widens; the reference must widen as the server does.
				const plain = await query(server, `RETURN ${v.surql}`);
				const widened = toHex(encode(toCbor(expected, "cbor")));
				if (!plain.ok || toHex(plain.bytes) !== widened)
					fail(
						`plain cbor gives ${plain.ok ? toHex(plain.bytes) : plain.message}, the reference widens to ${widened}`,
					);
			}
			set(node, "cbor", toHex(out.bytes));
			set(node, "diag", diagnostic(decode(out.bytes)));
		} else if (v.kind === "decode") {
			const input = encode(parseDiagnostic(v.diag as string));
			const expected = fromJson(v.value as Json);
			const got = tryDecode(input, format);
			if (got instanceof Error || !equal(got, expected))
				fail(
					`value is ${show(expected)} but the input decodes to ${show(got)}`,
				);
			const out = await query(server, "RETURN $v", input, format);
			if (!out.ok) {
				fail(`server rejected it: ${out.kind}: ${out.message}`);
				continue;
			}
			const back = tryDecode(out.bytes, format);
			if (back instanceof Error || !equal(back, expected))
				fail(`server hands back ${show(back)}`);
			const ours = encode(toCbor(expected, format));
			if (toHex(ours) !== toHex(out.bytes))
				fail(
					`reference encoder gives ${toHex(ours)}, server gives ${toHex(out.bytes)}`,
				);
			if (alsoCbor2 && holdsForCbor2) {
				const two = await cbor2("RETURN $v", input);
				if (!two.ok || toHex(two.bytes) !== toHex(out.bytes))
					fail(
						`cbor.2 differs from cbor: ${two.ok ? toHex(two.bytes) : two.message}`,
					);
			}
			set(node, "cbor", toHex(input));
			set(node, "canonical", toHex(out.bytes));
		} else if (v.kind === "reject") {
			// `raw` vectors are malformed below the level diagnostic notation
			// can express, so their bytes are given and their diag is prose.
			const input = v.raw
				? fromHex(v.cbor as string)
				: encode(parseDiagnostic(v.diag as string));
			if (!(tryDecode(input, format) instanceof Error))
				fail("the reference decoder accepts it");
			const out = await query(server, "RETURN $v", input, format);
			if (v.server_quirk) {
				if (!out.ok)
					fail(`server now rejects it (${out.kind}); drop server_quirk`);
				set(node, "canonical", out.ok ? toHex(out.bytes) : undefined);
			} else if (out.ok) {
				fail(`server accepts it and returns ${toHex(out.bytes)}`);
			}
			if (alsoCbor2 && !v.server_quirk) {
				const two = await cbor2("RETURN $v", input);
				const ref = tryDecode(input, "cbor.2");
				if (holdsForCbor2 && (two.ok || !(ref instanceof Error)))
					fail("cbor.2 accepts it, so leave cbor.2 out of its formats");
				if (!holdsForCbor2 && (!two.ok || ref instanceof Error))
					fail(
						`cbor.2 rejects it too (${two.ok ? "the reference decoder" : two.message}), so drop formats`,
					);
			}
			set(node, "cbor", toHex(input));
		} else {
			fail(`unknown kind ${v.kind}`);
		}
	}
	const vectorsJs = vectors.items.map((n) => n.toJS(doc) as VectorFields);
	return {
		vectors: vectorsJs,
		summary: `${file.split("/").pop()}: ${vectorsJs.length} vectors${skipped ? `, ${skipped} skipped (since 4.0)` : ""}`,
		write() {
			doc.set(strict ? "server" : "legacy_server", server.version);
			writeFileSync(
				file,
				doc.toString({ lineWidth: 0, flowCollectionPadding: true }),
			);
		},
		generated: doc.get(strict ? "server" : "legacy_server"),
	};
}

async function main() {
	const server = await startServer();
	const strict = await speaksCbor2(server);
	const failures: string[] = [];
	const drift: string[] = [];
	const files: Awaited<ReturnType<typeof checkFile>>[] = [];

	try {
		const cbor = await checkFile(FILE, "cbor", server, strict, failures, drift);
		files.push(cbor);
		// Servers before 4.0 do not speak cbor.2.
		if (strict)
			files.push(
				await checkFile(CBOR2_FILE, "cbor.2", server, strict, failures, drift),
			);
		const proto = await protoVectors(server, strict, cbor.vectors, failures);
		const protoDoc = new Document({
			version: 1,
			server: server.version,
			vectors: proto,
		});
		protoDoc.commentBefore = PROTO_HEADER;
		(protoDoc.get("vectors") as YAMLSeq<YAMLMap>).items.forEach((item, i) => {
			item.spaceBefore = i > 0;
			const value = item.get("value", true);
			if (isCollection(value)) value.flow = true;
		});
		const protoText = protoDoc.toString({
			lineWidth: 0,
			flowCollectionPadding: true,
		});
		const protoDrifted =
			!existsSync(PROTO_FILE) ||
			readFileSync(PROTO_FILE, "utf8").replace(/^server: .*$/m, "") !==
				protoText.replace(/^server: .*$/m, "");
		if (mode === "check" && protoDrifted) {
			drift.push(
				"proto.yaml no longer matches the server; run `bun run vectors:write`",
			);
		} else if (protoDrifted && !strict) {
			failures.push(
				"proto.yaml differs on a server before 4.0; only a 4.0 server writes it",
			);
		}
		if (mode === "write" && strict && failures.length === 0)
			writeFileSync(PROTO_FILE, protoText);
	} finally {
		await server.stop();
	}

	if (mode === "write" && failures.length === 0)
		for (const f of files) f.write();
	for (const f of files)
		if (mode === "check" && f.generated !== server.version)
			console.warn(
				`note: vectors were generated with ${f.generated}, checked against ${server.version}`,
			);
	for (const f of failures) console.error(`FAIL ${f}`);
	for (const d of drift) console.error(`DRIFT ${d}`);
	console.log(
		`${files.map((f) => f.summary).join("; ")}; ${failures.length} failures, ${drift.length} drifted, server ${server.version}${strict ? "" : " (before 4.0: legacy entries apply, cbor2.yaml skipped)"}`,
	);
	if (failures.length || drift.length) process.exit(1);
}

await main();
