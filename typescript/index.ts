export * from "../gen/ts/surrealdb/protocol/rpc/v1/common";
export * from "../gen/ts/surrealdb/protocol/rpc/v1/rpc";
export * from "../gen/ts/surrealdb/protocol/v1/error";
export * from "../gen/ts/surrealdb/protocol/v1/value";
// Each generated module declares its own copy of these, so the star exports
// above leave them ambiguous. The helper types are identical in every module;
// protobufPackage is not, and the root exports the one for the value types.
export {
	type DeepPartial,
	type Exact,
	type MessageFns,
	protobufPackage,
} from "../gen/ts/surrealdb/protocol/v1/value";
// Hand-written, unlike the four above. Method-name constants for comparing
// against `ServerCapabilities.denied_methods` without hardcoding the strings.
export * from "./methodNames";
