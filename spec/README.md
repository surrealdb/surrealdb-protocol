# SurrealDB wire specification data

Language-neutral data that every SurrealDB SDK should agree with. Everything
here is a plain data file, so an SDK can read it from its own test suite in any
language without depending on code from this repository.

| File | What it is |
|---|---|
| [`cbor-tags.yaml`](cbor-tags.yaml) | The authoritative table of CBOR tags used on the WebSocket and HTTP `/rpc` wire |

## The CBOR tag table

[`cbor-tags.yaml`](cbor-tags.yaml) lists every tag the server knows, with:

- `status`: `active` (the server encodes and decodes it), `refused` (the
  server used to accept it and now refuses it; `use` names the tag to send
  instead), or `reserved` (never encode it; the server refuses it).
- `formats`: the CBOR dialects the tag is valid in, when it is not all of
  them. The sized-number tags 180 to 188 are `cbor.2` only.
- `content`: the shape of the tagged item.
- `notes`: the edge cases that have broken SDKs before: pre-1970 datetimes,
  empty and unsigned durations, record id key types, range bounds, NONE versus
  NULL.

It also covers the three CBOR dialects (`cbor`, `cbor.2` and `shaped`), what
the server's strict decoder refuses (the text-form tags 0, 9 and 13, unknown
tags, integers outside i64, duplicate map keys, tag 6 around anything but
null), the untagged types (integers are i64, floats use the shortest exact
width, map keys must be unique strings) and the values that have no CBOR
encoding at all, such as regex.

The table describes the SurrealDB 4.0 wire. Where a server before 4.0 behaved
differently, the row says so. Every server since 1.5.0 reads tags 12, 37 and
14, so an SDK that sends those in place of 0, 9 and 13 needs no version check.

The table was written from the server's codec,
`surrealdb/core/src/rpc/format/cbor/convert.rs`, on surrealdb main at
`c63ff8cfa1` (2026-10-24). When the server's codec changes,
update this file in the same release.
