# SurrealDB wire specification data

Language-neutral data that every SurrealDB SDK should agree with. Everything
here is a plain data file, so an SDK can read it from its own test suite in any
language without depending on code from this repository.

| File | What it is |
|---|---|
| [`cbor-tags.yaml`](cbor-tags.yaml) | The authoritative table of CBOR tags used on the WebSocket and HTTP `/rpc` wire |

## The CBOR tag table

[`cbor-tags.yaml`](cbor-tags.yaml) lists every tag the server knows, with:

- `status`: `active` (the server encodes and decodes it), `decode-only` (the
  server accepts it but never sends it, so SDKs must decode it and should not
  encode it), or `reserved` (never encode it).
- `content`: the shape of the tagged item.
- `notes`: the edge cases that have broken SDKs before: pre-1970 datetimes,
  empty and unsigned durations, record id key types, range bounds, NONE versus
  NULL.

It also covers the untagged types (integers are i64, floats use the shortest
exact width, map keys must be strings) and the values that have no CBOR
encoding at all, such as regex.

The table was written from the server's codec,
`surrealdb/core/src/rpc/format/cbor/convert.rs`, on surrealdb main at
`6a9bc46152` (3.4.0-nightly, 2026-10-14). When the server's codec changes,
update this file in the same release.
