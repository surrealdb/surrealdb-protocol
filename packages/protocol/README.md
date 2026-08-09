# @surrealdb/protocol

The generated TypeScript bindings for the SurrealDB Client Protocol, plus the
small amount of hand-written code that the generator cannot produce.

Part of [surrealdb/surrealdb-protocol](https://github.com/surrealdb/surrealdb-protocol),
which holds the `.proto` and `.fbs` schemas this package is generated from, and
the equivalent bindings for every other language.

## Install

```sh
bun add @surrealdb/protocol
```

## What is in here

| | source | |
|---|---|---|
| message and service types | generated from `surrealdb/protocol/**/*.proto` | `gen/ts` at the repo root |
| method-name constants | hand-written | `methodNames.ts` |

The method-name constants exist so that code comparing against
`ServerCapabilities.denied_methods` does not hardcode the strings. They are held
against the generated client by `methodNames.test.ts`, so an RPC cannot be
renamed, added or removed without the constants failing. The Rust crate has the
same constants and the same test, each checked against the schema rather than
against each other.

## Related packages

| package | what it owns |
|---|---|
| `@surrealdb/protocol` | wire messages and services |
| [`@surrealdb/sqon`](../sqon) | the SurrealQL value model and its codecs |
| [`@surrealdb/cbor`](../cbor) | the CBOR primitives the binary codec is built on |

## Licence

Apache-2.0. See [LICENSE](LICENSE).
