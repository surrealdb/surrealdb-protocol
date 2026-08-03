/**
 * Fully-qualified `SurrealDBService` method names, as they appear in
 * `ServerCapabilities.denied_methods`.
 *
 * These exist so a client honouring an operator's per-method deny list never
 * compares against a hand-written string literal. The names are the generated
 * gRPC method paths, so renaming an RPC -- or the service -- moves what the
 * server emits. A client holding its own copy of the old literal then matches
 * nothing, silently stops honouring the denial, and nothing fails to typecheck.
 * `v1` is unstable and still permits such renames, so this is a live hazard
 * rather than a hypothetical one.
 *
 * Constants alone would only relocate the drift, so `ALL_METHOD_NAMES` is
 * checked against the generated client in `methodNames.test.ts`. Renaming an RPC
 * without updating this file fails `bun test`.
 *
 * ## Form
 *
 * These are the DENY-LIST form, `<package>.<Service>/<Method>`, with no leading
 * slash -- what a server puts in `denied_methods`. The gRPC path on the wire is
 * the same string prefixed with `/`, so comparing one against the other fails on
 * every method. Use {@link grpcPath} when the prefixed form is wanted.
 *
 * The Rust bindings expose the same set from their `method_names` module; the two
 * are checked against the same generated service rather than against each other.
 */

import { SurrealDBServiceServiceName } from "../gen/ts/surrealdb/protocol/rpc/v1/rpc";

/** The fully-qualified service name, re-exported so callers need one import. */
export const SERVICE_NAME = SurrealDBServiceServiceName;

const qualify = <const M extends string>(method: M) =>
	`${SurrealDBServiceServiceName}/${method}` as `${typeof SurrealDBServiceServiceName}/${M}`;

/**
 * Every method name, in the order the service declares them.
 *
 * Checked against the generated client, so this is the whole service and not
 * merely the part someone remembered to add.
 */
export const METHOD_NAMES = {
	// Negotiation.
	GetCapabilities: qualify("GetCapabilities"),
	Health: qualify("Health"),
	// Sessions.
	AttachSession: qualify("AttachSession"),
	DetachSession: qualify("DetachSession"),
	ResetSession: qualify("ResetSession"),
	// Session context.
	Use: qualify("Use"),
	SetVariable: qualify("SetVariable"),
	UnsetVariable: qualify("UnsetVariable"),
	// Authentication.
	Signup: qualify("Signup"),
	Signin: qualify("Signin"),
	Authenticate: qualify("Authenticate"),
	RefreshTokens: qualify("RefreshTokens"),
	RevokeTokens: qualify("RevokeTokens"),
	Invalidate: qualify("Invalidate"),
	// Transactions.
	BeginTransaction: qualify("BeginTransaction"),
	CommitTransaction: qualify("CommitTransaction"),
	CancelTransaction: qualify("CancelTransaction"),
	// Query.
	Query: qualify("Query"),
	Run: qualify("Run"),
	Kill: qualify("Kill"),
	// Live queries.
	Subscribe: qualify("Subscribe"),
	// Import and export.
	ImportSurql: qualify("ImportSurql"),
	ExportSurql: qualify("ExportSurql"),
	ExportDirectory: qualify("ExportDirectory"),
	ExportMlModel: qualify("ExportMlModel"),
	ImportMlModel: qualify("ImportMlModel"),
} as const;

/** A method's bare name, as declared in the service. */
export type MethodName = keyof typeof METHOD_NAMES;

/** A method's fully-qualified deny-list name. */
export type QualifiedMethodName = (typeof METHOD_NAMES)[MethodName];

/** Every qualified method name, for iteration and set membership. */
export const ALL_METHOD_NAMES: readonly QualifiedMethodName[] =
	Object.values(METHOD_NAMES);

/**
 * Returns the wire gRPC path for a method name, i.e. `name` with a leading `/`.
 *
 * `denied_methods` carries the unprefixed form and gRPC uses the prefixed one;
 * this is the one-line conversion between them, provided so callers do not each
 * reinvent it and get the slash wrong in a different direction.
 */
export function grpcPath(name: string): string {
	return `/${name}`;
}

/**
 * A `Version` deny-list entry, which names no RPC.
 *
 * There is no `Version` method: the build version is reported by
 * `ServerCapabilities.server_version`, and an operator who denies `version`
 * makes the server withhold that field and list this here instead. It is
 * therefore absent from {@link METHOD_NAMES} by design, and is why clients must
 * tolerate a `denied_methods` entry matching no method they know.
 */
export const VERSION_PSEUDO_METHOD = "Version";
