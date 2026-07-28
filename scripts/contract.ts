/**
 * Generates and checks bridge/contract.yaml — the machine-readable list of
 * what every SDK must expose.
 *
 * The Rust `SurrealBridge` trait and the TypeScript `SurrealProtocol` interface
 * are hand-written mirrors of this service. Hand-written mirrors drift: the JS
 * SDK grew attach, detach, refresh, revoke, begin, commit and cancel that the
 * proto never got, and nobody noticed for months because nothing compared them.
 *
 * The manifest is wholly generated and diff-checked in CI, so it cannot go
 * stale. What the schema cannot supply -- which capability gates a method, and
 * what each language calls it -- lives in the ANNOTATIONS table below, which is
 * where those decisions get reviewed. Adding an RPC without an entry there is a
 * hard error rather than a silently defaulted name.
 *
 *   bun run scripts/contract.ts          check the manifest is current
 *   bun run scripts/contract.ts --write  update it after changing the service
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DESCRIPTOR = "build/descriptor.json";
const MANIFEST = "bridge/contract.yaml";
const SERVICE = "SurrealDBService";
const PACKAGE = "surrealdb.protocol.rpc.v1";

interface MethodDescriptor {
	name: string;
	inputType: string;
	outputType: string;
	clientStreaming?: boolean;
	serverStreaming?: boolean;
}
interface DescriptorSet {
	file?: Array<{
		package?: string;
		service?: Array<{ name: string; method?: MethodDescriptor[] }>;
	}>;
}

interface Method {
	rpc: string;
	request: string;
	response: string;
	streaming: "unary" | "client" | "server" | "bidi";
}

function streamingKind(method: MethodDescriptor): Method["streaming"] {
	if (method.clientStreaming && method.serverStreaming) return "bidi";
	if (method.clientStreaming) return "client";
	if (method.serverStreaming) return "server";
	return "unary";
}

/** The half of the manifest that is derived, never hand-edited. */
function derive(): Method[] {
	execFileSync("buf", ["build", "-o", DESCRIPTOR], { stdio: "inherit" });
	const descriptor: DescriptorSet = JSON.parse(
		readFileSync(DESCRIPTOR, "utf8"),
	);

	for (const file of descriptor.file ?? []) {
		if (file.package !== PACKAGE) continue;
		for (const service of file.service ?? []) {
			if (service.name !== SERVICE) continue;
			return (service.method ?? []).map((method) => ({
				rpc: method.name,
				// Descriptor type names are fully qualified with a leading dot.
				request: method.inputType.replace(/^\./, ""),
				response: method.outputType.replace(/^\./, ""),
				streaming: streamingKind(method),
			}));
		}
	}
	throw new Error(`${PACKAGE}.${SERVICE} not found in ${DESCRIPTOR}`);
}

/**
 * The decisions the schema cannot supply: which capability gates a method, and
 * what each language calls it.
 *
 * Kept here rather than hand-edited into the YAML so the manifest is wholly
 * derived -- a half-generated file invites someone to edit the generated half
 * and lose it on the next run. This table is the reviewed artefact; the YAML is
 * its output.
 *
 * `capability: null` means always available. TypeScript names follow the
 * existing SurrealProtocol interface, which is why several are shorter than
 * the RPC (`attach`, not `attachSession`) -- the manifest records what the SDK
 * actually calls them, not what we wish it did.
 */
const ANNOTATIONS: Record<
	string,
	{ capability: string | null; rust?: string; typescript: string }
> = {
	GetCapabilities: { capability: null, typescript: "getCapabilities" },
	Health: { capability: null, typescript: "health" },
	Version: { capability: null, typescript: "version" },

	AttachSession: { capability: "SESSIONS", typescript: "attach" },
	DetachSession: { capability: "SESSIONS", typescript: "detach" },
	ListSessions: { capability: "SESSIONS", typescript: "sessions" },
	ResetSession: { capability: null, rust: "reset", typescript: "reset" },

	Use: { capability: null, typescript: "use" },
	SetVariable: { capability: null, rust: "set_variable", typescript: "set" },
	UnsetVariable: {
		capability: null,
		rust: "unset_variable",
		typescript: "unset",
	},

	Signup: { capability: null, typescript: "signup" },
	Signin: { capability: null, typescript: "signin" },
	Authenticate: { capability: null, typescript: "authenticate" },
	RefreshTokens: {
		capability: "REFRESH_TOKENS",
		rust: "refresh",
		typescript: "refresh",
	},
	RevokeTokens: { capability: null, rust: "revoke", typescript: "revoke" },
	Invalidate: { capability: null, typescript: "invalidate" },

	BeginTransaction: {
		capability: "TRANSACTIONS",
		rust: "begin_transaction",
		typescript: "begin",
	},
	CommitTransaction: {
		capability: "TRANSACTIONS",
		rust: "commit_transaction",
		typescript: "commit",
	},
	CancelTransaction: {
		capability: "TRANSACTIONS",
		rust: "cancel_transaction",
		typescript: "cancel",
	},
	ListTransactions: { capability: "TRANSACTIONS", typescript: "transactions" },

	Query: { capability: null, typescript: "query" },
	CancelQuery: { capability: "QUERY_CONTROL", typescript: "cancelQuery" },
	ListQueries: { capability: "QUERY_CONTROL", typescript: "queries" },

	Subscribe: { capability: "LIVE_QUERIES", typescript: "subscribe" },
	Kill: { capability: "LIVE_QUERIES", typescript: "kill" },

	ImportSql: { capability: null, typescript: "importSql" },
	ExportSql: { capability: null, typescript: "exportSql" },
	ExportDirectory: {
		capability: "EXPORT_DIRECTORY",
		typescript: "exportDirectory",
	},
	ExportMlModel: { capability: "ML_MODELS", typescript: "exportMlModel" },
};

function render(methods: Method[]): string {
	const lines: string[] = [
		"# What every SurrealDB SDK must expose.",
		"#",
		"# GENERATED -- do not edit. Run `bun run scripts/contract.ts --write`.",
		"# The schema half comes from the service definition; the capability and",
		"# binding names come from the ANNOTATIONS table in that script, which is",
		"# where those decisions are reviewed.",
		"#",
		"# Adding an RPC: change rpc.proto, add an ANNOTATIONS entry, regenerate.",
		"# Downstream SDKs then fail their own parity check on the PR that bumps",
		"# this dependency, naming the method they are missing.",
		"",
		"version: 1",
		`proto_package: ${PACKAGE}`,
		`service: ${SERVICE}`,
		"methods:",
	];

	const missing = methods.filter((m) => !ANNOTATIONS[m.rpc]).map((m) => m.rpc);
	if (missing.length > 0) {
		throw new Error(
			`No ANNOTATIONS entry for: ${missing.join(", ")}.\n` +
				"Every RPC needs a capability and a name in each binding; add them to scripts/contract.ts.",
		);
	}

	for (const method of methods) {
		const annotation = ANNOTATIONS[method.rpc];
		if (!annotation) continue;
		lines.push(`  - rpc: ${method.rpc}`);
		lines.push(`    request: ${method.request}`);
		lines.push(`    response: ${method.response}`);
		lines.push(`    streaming: ${method.streaming}`);
		lines.push(`    capability: ${annotation.capability ?? "~"}`);
		lines.push(
			`    bindings: { rust: ${annotation.rust ?? snake(method.rpc)}, typescript: ${annotation.typescript} }`,
		);
	}

	lines.push("");
	lines.push(
		"# Methods an SDK exposes that deliberately have no RPC of their own.",
	);
	lines.push(
		"# Anything not listed here and not above fails the downstream check --",
	);
	lines.push(
		"# which is what catches an SDK growing a method the protocol never got.",
	);
	lines.push("client_only:");
	lines.push("  - name: liveQuery");
	lines.push("    typescript: liveQuery");
	lines.push(
		"    rationale: client-side demultiplexing over Subscribe; carries no wire method",
	);
	lines.push("");
	return lines.join("\n");
}

/** AttachSession -> attach_session */
function snake(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function main(): void {
	const rendered = render(derive());
	const write = process.argv.includes("--write");

	if (write) {
		writeFileSync(MANIFEST, rendered);
		console.log(`wrote ${MANIFEST}`);
		return;
	}

	let existing: string;
	try {
		existing = readFileSync(MANIFEST, "utf8");
	} catch {
		console.error(
			`${MANIFEST} is missing. Run: bun run scripts/contract.ts --write`,
		);
		process.exit(1);
	}

	if (existing !== rendered) {
		console.error(
			`${MANIFEST} is out of date with the service definition.\n` +
				"Run: bun run scripts/contract.ts --write",
		);
		process.exit(1);
	}
	console.log(`${MANIFEST} is current`);
}

main();
