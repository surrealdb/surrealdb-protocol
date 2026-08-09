<a href="https://surrealdb.com#gh-dark-mode-only" target="_blank">
    <img width="100%" src="/img/white/hero.png" alt="SurrealDB Hero">
</a>
<a href="https://surrealdb.com#gh-light-mode-only" target="_blank">
    <img width="100%" src="/img/black/hero.png" alt="SurrealDB Hero">
</a>

<p align="center">
    <a href="https://github.com/surrealdb/surrealdb"><img src="https://img.shields.io/github/v/release/surrealdb/surrealdb?color=ff00a0&include_prereleases&label=version&sort=semver&style=flat-square"></a>
    &nbsp;
    <a href="https://github.com/surrealdb/surrealdb"><img src="https://img.shields.io/badge/built_with-Rust-dca282.svg?style=flat-square"></a>
    &nbsp;
	<a href="https://github.com/surrealdb/surrealdb/actions"><img src="https://img.shields.io/github/actions/workflow/status/surrealdb/surrealdb/nightly.yml?style=flat-square&branch=main"></a>
    &nbsp;
    <a href="https://github.com/surrealdb/surrealdb-protocol/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-00bfff.svg?style=flat-square"></a>
</p>

<p align="center">
    <a href="https://hub.docker.com/repository/docker/surrealdb/surrealdb"><img src="https://img.shields.io/docker/pulls/surrealdb/surrealdb?label=docker%20pulls&style=flat-square"></a>
    &nbsp;
    <a href="https://crates.io/crates/surrealdb"><img src="https://img.shields.io/crates/d/surrealdb?color=dca282&label=rust&style=flat-square"></a>
	&nbsp;
    <a href="https://www.npmjs.com/package/surrealdb.js"><img src="https://img.shields.io/npm/dt/surrealdb.js?color=f7df1e&label=javascript&style=flat-square"></a>
    &nbsp;
	<a href="https://pypi.org/project/surrealdb/"><img src="https://img.shields.io/pepy/dt/surrealdb?color=426c99&label=python&style=flat-square"></a>
	&nbsp;
	<a href="https://www.nuget.org/packages/SurrealDb.Net"><img src="https://img.shields.io/nuget/dt/surrealdb.net?color=4c2dcc&label=.NET&style=flat-square"></a>
	&nbsp;
	<a href="https://packagist.org/packages/surrealdb/surrealdb.php"><img src="https://img.shields.io/packagist/dt/surrealdb/surrealdb.php?color=4d588b&label=php&style=flat-square"></a>
    &nbsp;
	<a href="https://hub.docker.com/repository/docker/surrealdb/surrealdb"><img src="https://img.shields.io/github/downloads/surrealdb/surrealdb/total?color=8259dd&label=github%20downloads&style=flat-square"></a>
</p>

<p align="center">
	<a href="https://surrealdb.com/discord"><img src="https://img.shields.io/discord/902568124350599239?label=discord&style=flat-square&color=5a66f6" alt="Discord"></a>
	&nbsp;
    <a href="https://x.com/surrealdb"><img src="https://img.shields.io/badge/x-follow_us-222222.svg?style=flat-square" alt="X"></a>
    &nbsp;
    <a href="https://dev.to/surrealdb"><img src="https://img.shields.io/badge/dev-join_us-86f7b7.svg?style=flat-square" alt="Dev"></a>
    &nbsp;
    <a href="https://www.linkedin.com/company/surrealdb/"><img src="https://img.shields.io/badge/linkedin-connect_with_us-0a66c2.svg?style=flat-square" alt="LinkedIn"></a>
	&nbsp;
    <a href="https://www.youtube.com/@surrealdb"><img src="https://img.shields.io/badge/youtube-subscribe-fc1c1c.svg?style=flat-square" alt="YouTube"></a>
</p>

<p align="center">
	<a href="https://surrealdb.com/blog"><img height="25" src="./img/social/blog.svg" alt="Blog"></a>
	&nbsp;
	<a href="https://github.com/surrealdb/surrealdb"><img height="25" src="./img/social/github.svg" alt="Github"></a>
	&nbsp;
    <a href="https://www.linkedin.com/company/surrealdb/"><img height="25" src="./img/social/linkedin.svg" alt="LinkedIn"></a>
    &nbsp;
    <a href="https://x.com/surrealdb"><img height="25" src="./img/social/x.svg" alt="X"></a>
    &nbsp;
    <a href="https://www.youtube.com/@surrealdb"><img height="25" src="./img/social/youtube.svg" alt="YouTube"></a>
    &nbsp;
    <a href="https://dev.to/surrealdb"><img height="25" src="./img/social/dev.svg" alt="Dev"></a>
    &nbsp;
    <a href="https://surrealdb.com/discord"><img height="25" src="./img/social/discord.svg" alt="Discord"></a>
    &nbsp;
    <a href="https://stackoverflow.com/questions/tagged/surrealdb"><img height="25" src="./img/social/stack-overflow.svg" alt="Stack Overflow"></a>
</p>

<br>

<h2><img height="20" src="./img/whatissurreal.svg">&nbsp;&nbsp;SurrealDB Network Protocol</h2>

This repository contains the SurrealDB Network Protocol, which is used to communicate with the SurrealDB server.

**THIS IS A WORK IN PROGRESS**

## What belongs here

Every SDK needs the same wire contract, and for a long time each one carried its own copy of the parts that were not generated. This repository is where those parts live instead, so that a change to the contract is one change rather than one per language.

One test decides whether something belongs here:

> **Would a second language need a semantically identical version of this?**

If yes, it is protocol. If it only makes sense for one language's users, it is SDK.

| | second language needs it? | where it lives |
|---|---|---|
| `.proto` / `.fbs` schemas | yes, they *are* the contract | here |
| generated message and service types | yes, one per language | here, in `gen/` |
| the SQON value model | yes, identical semantics | here |
| codecs: text, CBOR, JSON, flatbuffers | yes, these are the wire encodings | here |
| method-name constants | yes | here |
| the CBOR primitives underneath | no, but the value model depends on them | here, as a dependency |
| connection, retry, reconnect | no | SDK |
| authentication flows | no | SDK |
| query builders, ORMs, typed helpers | no | SDK |
| engines (WASM, NAPI, embedded) | no | the engine repository |

CBOR is the one entry that fails the test and lives here anyway. `@surrealdb/cbor` carries no SurrealDB semantics: it is RFC 8949 and nothing else, and most languages have their own. It sits here because the SQON binary codec is built directly on it and the two are released together, not because every language needs a port of it.

### Layout

```text
surrealdb/protocol/**   .proto and .fbs        the contract
spec/                   SQON_SPECIFICATION.md  language-neutral format spec
gen/{c,rust,ts}         generated bindings     checked in, CI diffs them
rust/                   hand-written Rust      the surrealdb-protocol crate
packages/protocol       @surrealdb/protocol    generated TS + method names
packages/sqon           @surrealdb/sqon        value model and codecs
packages/cbor           @surrealdb/cbor        CBOR primitives
```

### Adding a language

The TypeScript packages are the worked example. A new language follows the same split rather than the same file names:

1. Add a generator to `buf.gen.yaml` and a `gen/<lang>` output. Check the output in, and add it to `GEN_CHECK_PATHS` in the `Makefile` so CI fails when it goes stale.
2. Port the value model and codecs against [`spec/SQON_SPECIFICATION.md`](spec/SQON_SPECIFICATION.md), not against another language's implementation. The spec is what they are all checked against.
3. Leave connection, authentication and query building in that language's SDK repository.

## Language Support

- [x] Rust
- [x] TypeScript
- [ ] Python
- [ ] .NET
- [ ] PHP
- [ ] Java
- [ ] Go
- [ ] C

## Development

Generate the protobuf and flatbuffers code:

```bash
make gen
```

Generated code is checked in, and `make gen-check` asserts it still matches the schemas. CI runs it, so a schema change cannot land without its generated counterpart.

The TypeScript packages are a [bun](https://bun.sh) workspace:

```bash
bun install
bun run build
```

`build` is ordered rather than parallel: sqon's declaration bundling resolves `@surrealdb/cbor` through cbor's built output, so cbor has to be built first.

```bash
bun run test
bun run qc
```

`bun run test`, not a bare `bun test`. sqon's source imports `@surrealdb/cbor` by package name, which resolves through cbor's `exports` to its build output, so on an unbuilt tree every test touching the CBOR codec fails to resolve the module. The script builds cbor first.

`qc` runs biome from the root. The packages disagree on formatting, and each settles it with its own nested `biome.json`, so running biome from inside a package or with a different version will not agree with CI.
