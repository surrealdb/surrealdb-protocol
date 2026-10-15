# Catalogs

Names and constants every SurrealDB SDK needs to agree on, as plain data.
Generate constants from these files, or check hand-written constants against
them in a test, so that a method, header or error kind cannot drift from the
server unnoticed.

| File | What it lists |
|---|---|
| [`methods.yaml`](methods.yaml) | WebSocket and HTTP `/rpc` method names: params, results, deprecation status, which transport carries each one and the error the other returns, and the gRPC counterpart. Also names that are *not* methods, such as `health`. |
| [`http.yaml`](http.yaml) | The `Surreal-*` headers, MIME types, WebSocket subprotocols, HTTP routes (including how `/import` reports failures and what `/export` accepts) and the `/rpc` envelope. |
| [`errors.yaml`](errors.yaml) | The error kinds and their detail sub-kinds, the legacy JSON-RPC codes each one maps to, the matching `ErrorKind` in `error.proto`, and the HTTP status codes. |

Each file was read from surrealdb main at `6a9bc46152` and says which server
source it came from. Every transport difference in `methods.yaml`, and the
`/import` behaviour in `http.yaml`, was also checked against a running
`3.4.0-nightly+20261014.4f7fa16`.

Points SDKs most often get wrong:

- **The CRUD methods are deprecated.** `select`, `create`, `insert`,
  `insert_relation`, `upsert`, `update`, `merge`, `patch`, `delete` and
  `relate` still work, but the server gives no warning when they are called.
  gRPC has no CRUD calls at all. Compile these operations to SurrealQL and send
  them with `query`.
- **HTTP `/rpc` is not WebSocket.** It has no `live`, `kill`, `sessions`,
  `begin`, `commit`, `cancel`, `query_stream` or `query_cancel`. Without an
  attached session, `use` and `set` last for one request only. An attached
  session does persist over HTTP, but it holds its own auth: the request's
  Basic or Bearer credentials do not carry into it, so sign in or
  authenticate inside the session.
- **There is no `health` method.** Use `GET /health`, or `ping`.
- **There is no capability RPC on WebSocket or HTTP.** Detect features from
  `version` and treat `-32601` as "not supported". Only gRPC has
  `GetCapabilities`.
- **`gql` is not GraphQL.** `gql` is the ISO graph query language; GraphQL is
  `graphql`. Both `gql` (RPC) and `/gql` (HTTP) are on by default from 3.3.
- **Sessions: the client picks the id on WebSocket and HTTP, the server picks
  it on gRPC.** There is no server-side fork.
- **Branch on `kind` and `details`, not `code` or `message`.** A transaction
  conflict is `Query`/`TransactionConflict` (code -32009) and is retryable.
