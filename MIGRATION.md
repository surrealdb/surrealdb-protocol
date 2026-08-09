# Consolidating the JavaScript protocol packages

`@surrealdb/cbor` and `@surrealdb/sqon` now live here. This is what has to happen in the other repositories, and in what order.

Nothing here can land until this repository publishes, so the consumer changes are written down rather than made.

## What moved

| package | from | to |
|---|---|---|
| `@surrealdb/cbor` | `surrealdb/cbor.js` (whole repository) | `packages/cbor` |
| `@surrealdb/sqon` | `surrealdb.js` `packages/sqon` | `packages/sqon` |
| SQON specification | `surrealdb.js` `packages/sqon/res/` | `spec/` |
| sqon unit tests | `surrealdb.js` `packages/tests/surrealdb/unit/sqon/` | `packages/sqon/test/` |
| cbor unit tests | `surrealdb.js` `packages/tests/surrealdb/unit/cbor.test.ts` | `packages/cbor/test/` |

All four moved with `git subtree`, so their commits came with them.

## Resolve before publishing

Two things are wrong today and would be baked in by a release.

**`@surrealdb/cbor`'s `latest` tag points at the oldest version.** `dist-tags` are `latest: 2.0.0-alpha.1`, `alpha: 2.0.0-alpha.4`. Anyone running `bun add @surrealdb/cbor` gets alpha.1. This predates the move.

**`@surrealdb/cbor`'s manifest says `2.0.0`, which has never been published.** The highest on npm is `2.0.0-alpha.4`. Decide whether the first release from here is `2.0.0` or another alpha, because `@surrealdb/sqon` declares `workspace:*` and bun rewrites that to whatever this version says at publish time. Publish cbor first either way.

`@surrealdb/protocol` shipping without type declarations is fixed. It now emits `build/ts/index.d.ts` and `build/ts/index.bundled.mjs`, and `scripts/check-entry-points.ts` runs in CI so a manifest cannot name a file the build does not produce again.

## Publishing order

```
1. this repository        cbor  ->  sqon  ->  protocol
                          (release.yml already does this in order)
2. surrealdb.js           drop packages/sqon, depend on the published one
3. surrealdb              repoint the two native packages off the alpha pin
```

## surrealdb.js

Delete `packages/sqon` and the tests that moved with it.

| file | change |
|---|---|
| `packages/sqon/` | delete |
| `packages/tests/surrealdb/unit/sqon/` | delete, moved here |
| `packages/tests/surrealdb/unit/cbor.test.ts` | delete, moved here |
| `packages/tests/surrealdb/unit/__snapshots__/cbor.test.ts.snap` | delete, the only file in that directory |
| `packages/sdk/package.json` | `"@surrealdb/sqon": "workspace:*"` becomes a published version range |
| `packages/tests/package.json` | drop `@surrealdb/cbor`, only the moved tests used it |
| `package.json` | drop the `build:sqon`, `bench:sqon` and `deploy:sqon` scripts |
| `tsconfig.json` | drop the `"@surrealdb/sqon": ["./packages/sqon/src"]` path mapping |

`packages/sdk/src` imports `@surrealdb/sqon` in 33 places, including `export * from "@surrealdb/sqon"` in `src/index.ts`. None of those change: the package name is the same, only where it is built from.

`packages/tests/surrealdb/integration/codec/cbor.test.ts` stays. It needs a running server and it tests the SDK's use of the codec, not the codec.

## surrealdb

`surrealdb/node` and `surrealdb/wasm` both devDepend on `@surrealdb/cbor` at `2.0.0-alpha.4`, used only by their `engine.test.ts` to encode requests. Repoint both at whatever cbor publishes from here.

Nothing else in that repository refers to these packages.

## Licence

This repository moved from BUSL-1.1 to Apache-2.0, matching the packages it absorbed. The Rust crate has 24 published versions under BUSL; everything from here forward is Apache-2.0. The npm side has no published versions to reconcile.
