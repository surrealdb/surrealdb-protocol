# SDK conformance

This directory, together with [`spec/`](../spec), is how a SurrealDB SDK
shows it behaves the way the server and the other SDKs do. Nothing here is
specific to a language: the expectations are data files, and an SDK takes part
by answering a small JSON protocol.

| What | Where | An SDK uses it to |
|---|---|---|
| CBOR tag table | [`spec/cbor-tags.yaml`](../spec/cbor-tags.yaml) | check its codec handles every tag the server sends or accepts |
| Value vectors | [`spec/vectors/cbor.yaml`](../spec/vectors/cbor.yaml), [`proto.yaml`](../spec/vectors/proto.yaml) | unit-test encode and decode without a server |
| Catalogs | [`spec/catalogs/`](../spec/catalogs) | generate method names, headers, MIME types and error kinds instead of hand-copying them |
| Scenarios | [`conformance/scenarios/`](scenarios) | check behaviour end to end against a real server |
| Runner | [`conformance/runner/`](runner) | run the scenarios through the SDK's own driver |

There are three levels of adoption, and each one stands without the others:

1. **Vectors in the SDK's unit tests.** Vendor `spec/vectors/*.yaml` and
   assert that the codec decodes each one to the expected value and encodes it
   back. [`spec/README.md`](../spec/README.md#using-the-vectors-from-an-sdk)
   gives the rules. This needs no server and catches most codec bugs.
2. **Constants from the catalogs.** Method names, which transports a method
   works on, deprecations, header names, MIME types and error kinds with their
   JSON-RPC codes. See [`spec/catalogs/README.md`](../spec/catalogs/README.md).
3. **The scenarios, through a driver.** Write a small program (a *driver*)
   that maps the runner's ops onto the SDK's public API, then run the suite
   against `surreal start memory` in CI. The rest of this document covers this
   level.

## Running the suite

You need [Bun](https://bun.sh) and a `surreal` binary. From a checkout of this
repository:

```bash
bun install
bun run conformance                                   # the reference adapter
bun conformance/runner/cli.ts --driver "python -m mysdk.conformance"
```

Call `cli.ts` directly when passing `--driver`: `bun run conformance -- ...`
splits a quoted command on some Bun versions.

| Option | Meaning |
|---|---|
| `--driver <cmd>` | run `cmd` through `sh` as the adapter, once per scenario and transport |
| `--transport ws,http` | the transports to run (default: both) |
| `--filter <regex>` | only scenarios whose name matches |
| `--report <file.json>` | write every result, with the driver's hello, as JSON |
| `--scenarios <dir>` | read scenarios from another directory |
| `--list` | list the scenarios with their transports and files |

| Environment | Meaning |
|---|---|
| `SURREAL_BIN` | the `surreal` binary (default: `surreal` on the `PATH`) |
| `SURREAL_URL` | use a server that is already running; scenarios that need their own server flags are then skipped |
| `CONFORMANCE_SERVER_LOGS=1` | pass the server's logs through |

The runner starts one in-memory server per distinct set of flags, and gives
every scenario run its own database. Each result is `pass`, `FAIL` or `skip`. A
skip is not a failure: the scenario does not apply to that transport, the
server is older than the scenario's `since`, or the driver answered
`Unsupported` to one of its ops. The command exits non-zero only on failures,
and the `--report` file lists skips with their reasons, so it doubles as the
SDK's parity table.

## Writing a driver

A driver is a process that reads requests from stdin and writes responses to
stdout, one JSON object per line:

```text
→ {"id":1,"op":"hello","args":{}}
← {"id":1,"ok":true,"result":{"name":"mysdk","version":"1.2.0","ops":["connect","query"]}}
→ {"id":2,"op":"connect","args":{"url":"ws://127.0.0.1:41234/rpc","transport":"ws"}}
← {"id":2,"ok":true,"result":null}
→ {"id":3,"op":"query","args":{"sql":"RETURN 1; THROW 'x'"}}
← {"id":3,"ok":true,"result":[{"ok":true,"result":1},{"ok":false,"error":{"kind":"Thrown","message":"An error occurred: x"}}]}
→ {"id":4,"op":"begin","args":{}}
← {"id":4,"ok":false,"error":{"kind":"Unsupported","message":"no interactive transactions"}}
```

- The runner sends `hello` first, then one request at a time and waits for
  each answer. Write anything else (logs) to stderr.
- Values in `args` and `result` are [typed JSON](../spec/README.md#typed-json).
  Integers are plain numbers, or `{"$int": "..."}` beyond ±2^53, and floats are
  always `{"$float": ...}`.
- An error is `{"kind", "message"?, "details"?, "code"?}`. Report the server's
  `kind` and `details` as the SDK exposes them, not the message text. Use
  `Unsupported` only for "the SDK cannot do this", never for a server error.
  Every `"ok": false` answer carries an `error` with a string `kind`; one
  without fails the step as a protocol violation, as does a line that is not
  JSON or an answer that never comes.
- Handles (sessions, transactions, live subscriptions) are strings the driver
  makes up. The runner only passes them back.
- The process lasts for one scenario on one transport. Exit when stdin closes.

### Ops

`Context` is `{session?, txn?}`: run the op in that session, or inside that
transaction. Neither means the connection's default session.

| Op | Args | Result |
|---|---|---|
| `connect` | `url`, `transport` (`ws` or `http`) | `null` |
| `close` | | `null` |
| `version` | | the server version string, `surrealdb-3.4.0` |
| `ping` | Context | `null` |
| `signin`, `signup` | Context, `credentials` with the RPC wire keys `user`, `pass`, `ns`, `db`, `ac`, `key` (the bearer key for a bearer access method, as in rpc.proto's `BearerCredentials`), plus record variables | the token, as the SDK returns it |
| `authenticate` | Context, `token` | `null` |
| `invalidate` | Context | `null` |
| `info` | Context | the authenticated record |
| `use` | Context, `namespace?`, `database?` | `{namespace, database}` |
| `set` | Context, `name`, `value` | `null` |
| `unset` | Context, `name` | `null` |
| `query` | Context, `sql`, `vars?` | one `{ok: true, result}` or `{ok: false, error}` per statement. Fail the op only when the whole call fails, such as on a parse error |
| `query_stream` | as `query` | the stream collected into the same shape as `query` |
| `run` | Context, `name`, `version?`, `args?` | the function's result |
| `live` | Context, `table`, `diff?` | a subscription handle |
| `live_of` | Context, `id` (a `$uuid` from `LIVE SELECT`) | a subscription handle |
| `live_id` | `subscription` | the live query id, as a `$uuid` |
| `next_notification` | `subscription`, `timeout?` (ms, default 5000) | `{action, record, result}`, `{action: "KILLED"}`, or `null` on timeout |
| `kill` | Context, `subscription` | `null` |
| `new_session` | | a session handle |
| `fork_session` | `from?` | a session handle |
| `list_sessions` | | the open session handles, without the default session |
| `close_session` | `session` | `null` |
| `begin` | Context | a transaction handle |
| `commit`, `cancel` | Context with `txn` (and the `session` it was begun in, if any) | `null` |
| `import` | Context, `surql` | `null`. On a partial import, fail with `failures`: one error per failed statement |
| `export` | Context, `options?` (the `/export` body) | the SurrealQL text |
| `raw_rpc`, `raw_http` | | protocol-level escape hatches for the reference adapter. SDK drivers answer `Unsupported` |

[`runner/protocol.ts`](runner/protocol.ts) has the exact types. A driver can
start with `connect`, `signin`, `use` and `query` and answer `Unsupported` to
the rest. Every op it adds turns skips into passes or failures.

## Worked example: the JavaScript SDK

[`examples/surrealdb-js/driver.ts`](examples/surrealdb-js/driver.ts) is a
complete driver for [`surrealdb` on npm](https://www.npmjs.com/package/surrealdb),
about 600 lines, and uses only the SDK's public API. To run it:

```bash
cd conformance/examples/surrealdb-js && bun install && cd ../../..
bun conformance/runner/cli.ts --driver "bun conformance/examples/surrealdb-js/driver.ts"
```

Most of it is plumbing every driver has: the JSON-lines loop, typed JSON to
and from native values, and error mapping. The ops themselves are thin (excerpts, without the
type casts):

```ts
case "query": {
	const responses = await this.scope(args).query(args.sql, fromJson(args.vars)).responses();
	return responses.map((r) =>
		r.success ? { ok: true, result: toJson(r.result) } : { ok: false, error: errorInfo(r.error) },
	);
}
case "live": {
	const live = this.sessionOnly(op, args).live(new Table(args.table));
	// The session goes with the subscription, so kill can check its context.
	return this.subscribe(await (args.diff ? live.diff() : live), args.session);
}
case "fork_session":
	return this.keep(await this.session(args.from).forkSession());
case "begin": {
	const handle = `txn-${this.nextHandle++}`;
	this.txns.set(handle, await this.sessionOnly(op, args).beginTransaction());
	return handle;
}
```

`scope(args)` is the transaction when `txn` is given and the session
otherwise. `sessionOnly(op, args)` is for ops the SDK has only on a session: it
answers `Unsupported` to a `txn` rather than ignoring it, so the op never runs
outside the transaction the scenario asked for.

Error mapping is where a driver says how its SDK reports failures:

```ts
if (e instanceof UnsupportedFeatureError) return { kind: "Unsupported", message: e.message };
if (e instanceof ImportError) return { kind: "Query", message: e.message, failures: e.failures.map(errorInfo) };
if (e instanceof ServerError) return { kind: e.kind, message: e.message, details: toJson(e.details), code: e.code };
```

Results for `surrealdb@2.1.1` against `surreal` 3.4.0-nightly (20261014):

| | runs |
|---|---|
| pass | 91 |
| fail | 4: `query-values-survive-the-full-stack` and `deny-rpc-run-is-not-bypassed`, each on ws and http |
| skip | 51: protocol-level scenarios (`raw_rpc`/`raw_http`), `ping` (no SDK API), sessions over HTTP (the SDK refuses them with `UnsupportedFeatureError`), and scenarios that only apply to the other transport |

Writing the driver turned up these points about the SDK:

- **Integral floats come back as integers.** The SDK decodes CBOR floats and
  integers alike to `number`, so `2.0f` reads back as `2`. This is a real
  limitation of the JavaScript representation, and the failing scenario
  records it. The SDK could expose a float wrapper or document it.
- **`run()` is a query.** The SDK compiles `run` into a query that calls
  the function instead of sending the `run` method, so `--deny-rpc run` does
  not stop it. rpc.proto rules this out (`rpc Run`: a synthesised query
  bypasses the deny list, binds arguments by text, and moves name resolution
  into the SDK), and `deny-rpc-run-is-not-bypassed` fails on it.
- **No sessions over HTTP.** The SDK refuses `newSession` over HTTP, though
  the server does keep attached sessions there (each holds its own auth, so
  the SDK would sign in inside it). The reference adapter instead keeps HTTP
  sessions in the client. The scenarios pass either way: refusing shows up as
  a skip.
- **`health()` calls an RPC that does not exist.** `Surreal.health()` sends
  the `health` method, which the server answers as an unknown method
  (`protocol.yaml` pins this). Health is `GET /health`. The runner has no
  `health` op, so this one surfaced from reading the SDK, not from the run.

## In an SDK's CI

Check out this repository at a release tag next to the SDK, and run the
SDK's driver against a matrix of server versions:

```yaml
jobs:
  conformance:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        surrealdb: ["v3.3.4", "nightly"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: surrealdb/surrealdb-protocol
          ref: <release tag>
          path: surrealdb-protocol
      - uses: oven-sh/setup-bun@v2
      - name: Install surreal
        run: |
          curl -fsSL "https://download.surrealdb.com/${{ matrix.surrealdb }}/surreal-${{ matrix.surrealdb }}.linux-amd64.tgz" \
            | tar -xz -C "$RUNNER_TEMP"
          echo "SURREAL_BIN=$RUNNER_TEMP/surreal" >>"$GITHUB_ENV"
      # build the SDK and its driver here
      - working-directory: surrealdb-protocol
        run: |
          bun install
          bun conformance/runner/cli.ts --driver "$GITHUB_WORKSPACE/conformance/driver" --report "$RUNNER_TEMP/conformance.json"
```

The SDK's repository holds only its driver. The scenarios, the runner and the
vectors stay here as data and tooling that the SDK runs, so updating to a new
release of this repository is a tag bump.

## Writing scenarios

A scenario file holds a `scenarios:` list. Each scenario:

```yaml
- name: transaction-cancel-discards-writes     # unique, kebab case
  description: Optional prose.
  source: Where it came from (a server test, an SDK test, an audit).
  transports: [ws]           # default [ws, http]
  since: "3.0.0"             # skipped on older servers
  server: { args: ["--deny-rpc", "run"] }   # its own server, with these flags
  setup: default             # default | connect | none
  steps:
    - query: { sql: "DEFINE TABLE account SCHEMALESS" }
    - begin:
      capture: t             # keep the result as $ref t
    - query: { sql: "CREATE account:two", txn: { $ref: t } }
    - cancel: { txn: { $ref: t } }
    - query: { sql: "SELECT * FROM account" }
      expect:
        result: [{ ok: true, result: [] }]
```

A step is one op with its args. It can also have `expect`, `capture`,
`transports` (to limit just that step) and `note`. `sleep: { value: ms }` is
handled by the runner. `setup: default` connects, signs in as root, and selects
a fresh database. `connect` only connects. `none` leaves even that to the
steps.

`expect` is `{result: <pattern>}` or `{error: <pattern>}`. Either one can be
split per transport as `{ws: {...}, http: {...}}`. A step without `expect` must
simply not fail. Patterns are typed JSON and match exactly, except that error
patterns match partially all the way down. These matchers are available:

| Matcher | Matches |
|---|---|
| `{$any: null}` | anything |
| `{$type: uuid}` | a value of that type (`int`, `float`, `string`, `object`, `record`, …) |
| `{$match: "regex"}` | a string the regex finds a match in |
| `{$partial: {...}}` | an object with at least these keys, recursively |
| `{$unordered: [...]}` | an array with these elements in any order |
| `{$contains: [...]}` | an array containing elements that match these |
| `{$length: n}` | an array, set or string of that length |
| `{$oneOf: [...]}` | any of the patterns |
| `{$not: pattern}` | anything the pattern does not match |
| `{$capture: name}` | anything, kept as `name` |
| `{$ref: name}` | the value captured as `name`. The runner pre-captures `namespace`, `database`, `database_b`, `url` and `transport` |

Name the behaviour, not the mechanism, and keep scenarios to what any SDK can
be held to. Protocol facts that only the wire shows go in `protocol.yaml` and
use `raw_rpc` or `raw_http`. Run new scenarios with the reference adapter on
both transports and against the oldest server in CI before opening a PR.
