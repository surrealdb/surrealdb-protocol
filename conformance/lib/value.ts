/**
 * SurrealDB values for the conformance tooling, and the typed-JSON notation
 * the vectors, the scenarios and the driver protocol all share.
 *
 * Typed JSON, in short (spec/README.md has the full definition):
 *
 *   null, true/false, "text", [..], {..}   NULL, bool, string, array, object
 *   42                                     int (a JSON integer within +/-2^53)
 *   {"$int": "9223372036854775807"}        int, any i64
 *   {"$float": 1.5} / {"$float": "NaN"}    float ("NaN", "Infinity", "-Infinity", "-0")
 *   {"$u8": 5} / {"$u64": "18446744073709551615"}   sized int: $i8 $u8 $i16 $u16 $i32 $u32 $u64
 *   {"$f32": 1.5} / {"$f16": "NaN"}        sized float: $f16 $f32, spelled as $float
 *   {"$none": null}                        NONE
 *   {"$decimal": "1.5"}                    decimal
 *   {"$bytes": "00ff"}                     bytes, as hex
 *   {"$uuid": "..."}                       uuid, hyphenated lower case
 *   {"$datetime": "1970-01-01T00:00:00.000000001Z"}   RFC 3339, UTC
 *   {"$duration": [5400, 0]}               [seconds, nanoseconds]
 *   {"$table": "person"}                   table
 *   {"$record": {"table": "person", "key": <value>}}
 *   {"$range": {"start": {"included": 1}, "end": {"excluded": 5}}}  null = unbounded
 *   {"$set": [..]}                         set
 *   {"$file": {"bucket": "b", "key": "/k"}}
 *   {"$geometry": <GeoJSON geometry>}      Point, LineString, Polygon, Multi*, GeometryCollection
 *   {"$date": "2024-02-29"}                date, or "infinity" / "-infinity"
 *   {"$time": "12:34:56.789"}              time of day, up to "24:00:00"
 *   {"$timestamp": "2024-02-29T12:34:56"}  timestamp without a zone, or "infinity" / "-infinity"
 *   {"$interval": [14, 3, 14706500000]}    [months, days, microseconds]
 *   {"$bigdecimal": "1.50"}                bigdecimal, its scale as written
 *   {"$regex": "a.*"}                      regex (cbor.2 and protobuf; plain cbor has no form)
 *   {"$object": {..}} / {"$array": [..]} / {"$string": ".."}   explicit forms
 *
 * A JSON object is a typed value only when it has exactly one key and that key
 * is one of the names above; anything else is a plain object. An object that
 * would be mistaken for one is written with `$object`.
 *
 * In YAML, where the parser keeps integers and floats apart, a bare `1` is an
 * int and a bare `1.0` is a float. JSON parsers do not keep that distinction,
 * so drivers emit floats as `{"$float": ...}`.
 *
 * The sized kinds are SurrealDB 4.0's. `cbor.2` carries them (tags 180 to 188),
 * as do value.proto and value.fbs (their `i8` to `f32` arms); plain `cbor`
 * widens them to int, float or (a u64 past i64) decimal, so over it they never
 * come back.
 *
 * So are date, time, timestamp, interval and bigdecimal, which `cbor.2` carries
 * as tags 100 and 189 to 192 (and value.proto and value.fbs as their `date` to
 * `bigdecimal` arms), and regex, tag 193. Plain `cbor` widens the
 * first five (a date or timestamp to a datetime, a time to a duration, an
 * interval or a bigdecimal to text) and has no form for a regex. A bigdecimal
 * that fits a decimal is sent as one in both dialects.
 */

import {
	array,
	type CborItem,
	FALSE,
	f16Bits,
	fromHex,
	int,
	NULL,
	TRUE,
	tag,
	text,
	toHex,
} from "./cbor";

export const TAG = {
	// Refused from 4.0 on: send DATETIME, UUID and DURATION instead.
	DATETIME_STRING: 0n,
	NONE: 6n,
	TABLE: 7n,
	RECORD_ID: 8n,
	UUID_STRING: 9n,
	DECIMAL: 10n,
	DATETIME: 12n,
	DURATION_STRING: 13n,
	DURATION: 14n,
	UUID: 37n,
	RANGE: 49n,
	BOUND_INCLUDED: 50n,
	BOUND_EXCLUDED: 51n,
	FILE: 55n,
	SET: 56n,
	// A shaped block: rows in a request, or the shaped format's result lists.
	SHAPED_BLOCK: 57n,
	POINT: 88n,
	LINE: 89n,
	POLYGON: 90n,
	MULTIPOINT: 91n,
	MULTILINE: 92n,
	MULTIPOLYGON: 93n,
	COLLECTION: 94n,
	// Sized numbers, cbor.2 only: i8, u8, i16, u16, i32, u32, u64, f16, f32.
	SIZED_FIRST: 180n,
	SIZED_LAST: 188n,
	// The other cbor.2 kinds.
	DATE: 100n,
	TIME: 189n,
	TIMESTAMP: 190n,
	INTERVAL: 191n,
	BIGDECIMAL: 192n,
	REGEX: 193n,
} as const;

/** The tags only cbor.2 reads, beside the sized numbers. */
const CBOR2_ONLY = new Set<bigint>([
	TAG.DATE,
	TAG.TIME,
	TAG.TIMESTAMP,
	TAG.INTERVAL,
	TAG.BIGDECIMAL,
	TAG.REGEX,
]);

/** The CBOR dialects: plain `cbor` (application/cbor) and `cbor.2` (application/cbor; v=2). */
export type Format = "cbor" | "cbor.2";

/** SurrealDB 4.0's fixed-width integer kinds, with their cbor.2 tags. */
export const SIZED_INTS = {
	i8: {
		tag: 180n,
		min: -(2n ** 7n),
		max: 2n ** 7n - 1n,
		range: "8-bit signed",
	},
	u8: { tag: 181n, min: 0n, max: 2n ** 8n - 1n, range: "8-bit unsigned" },
	i16: {
		tag: 182n,
		min: -(2n ** 15n),
		max: 2n ** 15n - 1n,
		range: "16-bit signed",
	},
	u16: { tag: 183n, min: 0n, max: 2n ** 16n - 1n, range: "16-bit unsigned" },
	i32: {
		tag: 184n,
		min: -(2n ** 31n),
		max: 2n ** 31n - 1n,
		range: "32-bit signed",
	},
	u32: { tag: 185n, min: 0n, max: 2n ** 32n - 1n, range: "32-bit unsigned" },
	u64: { tag: 186n, min: 0n, max: 2n ** 64n - 1n, range: "64-bit unsigned" },
} as const;

/** SurrealDB 4.0's narrow float kinds, with their cbor.2 tags. */
export const SIZED_FLOATS = {
	f16: { tag: 187n },
	f32: { tag: 188n },
} as const;

export type SizedInt = keyof typeof SIZED_INTS;
export type SizedFloat = keyof typeof SIZED_FLOATS;

const SIZED_BY_TAG = new Map<bigint, SizedInt | SizedFloat>([
	...Object.entries(SIZED_INTS).map(
		([k, d]) => [d.tag, k as SizedInt] as const,
	),
	...Object.entries(SIZED_FLOATS).map(
		([k, d]) => [d.tag, k as SizedFloat] as const,
	),
]);

const isSizedInt = (k: string): k is SizedInt => Object.hasOwn(SIZED_INTS, k);

/** What the server says to send in place of a refused text-form tag. */
const REFUSED: Record<string, string> = {
	"0": "CBOR tag 0 (a datetime as text) is not accepted: send tag 12 [seconds, nanos]",
	"9": "CBOR tag 9 (a uuid as text) is not accepted: send tag 37 (16 bytes)",
	"13": "CBOR tag 13 (a duration as text) is not accepted: send tag 14 [seconds, nanos]",
};

export type Bound = { kind: "included" | "excluded"; v: Value } | null;
export type Position = [number, number];

export type Geometry =
	| { type: "Point"; coordinates: Position }
	| { type: "LineString"; coordinates: Position[] }
	| { type: "Polygon"; coordinates: Position[][] }
	| { type: "MultiPoint"; coordinates: Position[] }
	| { type: "MultiLineString"; coordinates: Position[][] }
	| { type: "MultiPolygon"; coordinates: Position[][][] }
	| { type: "GeometryCollection"; geometries: Geometry[] };

export type Value =
	| { k: "none" }
	| { k: "null" }
	| { k: "bool"; v: boolean }
	| { k: "int"; v: bigint }
	| { k: "float"; v: number }
	| { k: SizedInt; v: bigint }
	| { k: SizedFloat; v: number }
	| { k: "decimal"; v: string }
	| { k: "string"; v: string }
	| { k: "bytes"; v: Uint8Array }
	| { k: "uuid"; v: string }
	| { k: "datetime"; secs: bigint; nanos: number }
	| { k: "duration"; secs: bigint; nanos: number }
	| { k: "date"; days: number }
	| { k: "time"; nanos: bigint }
	| { k: "timestamp"; secs: bigint; nanos: number }
	| { k: "interval"; months: number; days: number; micros: bigint }
	| { k: "bigdecimal"; v: string }
	| { k: "array"; v: Value[] }
	| { k: "object"; v: [string, Value][] }
	| { k: "set"; v: Value[] }
	| { k: "table"; v: string }
	| { k: "record"; table: string; key: Value }
	| { k: "range"; start: Bound; end: Bound }
	| { k: "file"; bucket: string; key: string }
	| { k: "geometry"; g: Geometry }
	| { k: "regex"; v: string };

export class ValueError extends Error {}

const I64_MIN = -(2n ** 63n);
const I64_MAX = 2n ** 63n - 1n;
const I32_MIN = -(2n ** 31n);
const I32_MAX = 2n ** 31n - 1n;
const NS = 1_000_000_000;
const NANOS_PER_DAY = 86_400n * 1_000_000_000n;

// ---------------------------------------------------------------------------
// Typed JSON
// ---------------------------------------------------------------------------

export type Json =
	| null
	| boolean
	| number
	| bigint
	| string
	| Json[]
	| { [k: string]: Json };

const TYPED_KEYS = new Set([
	"$none",
	"$int",
	"$float",
	...Object.keys(SIZED_INTS).map((k) => `$${k}`),
	...Object.keys(SIZED_FLOATS).map((k) => `$${k}`),
	"$decimal",
	"$bytes",
	"$uuid",
	"$datetime",
	"$duration",
	"$date",
	"$time",
	"$timestamp",
	"$interval",
	"$bigdecimal",
	"$table",
	"$record",
	"$range",
	"$set",
	"$file",
	"$geometry",
	"$regex",
	"$object",
	"$array",
	"$string",
]);

/** The typed key of `j`, when `j` is a typed value. */
export function typedKey(j: Json): string | undefined {
	if (j === null || typeof j !== "object" || Array.isArray(j)) return undefined;
	const keys = Object.keys(j);
	return keys.length === 1 && TYPED_KEYS.has(keys[0] as string)
		? keys[0]
		: undefined;
}

export function fromJson(j: Json): Value {
	if (j === null) return { k: "null" };
	if (typeof j === "boolean") return { k: "bool", v: j };
	if (typeof j === "bigint") return { k: "int", v: checkI64(j) };
	if (typeof j === "number") {
		return Number.isInteger(j) && !Object.is(j, -0)
			? { k: "int", v: checkI64(BigInt(j)) }
			: { k: "float", v: j };
	}
	if (typeof j === "string") return { k: "string", v: j };
	if (Array.isArray(j)) return { k: "array", v: j.map(fromJson) };
	const key = typedKey(j);
	if (!key)
		return {
			k: "object",
			v: Object.entries(j).map(([k, v]) => [k, fromJson(v)]),
		};
	const a = j[key] as Json;
	switch (key) {
		case "$none":
			return { k: "none" };
		case "$int":
			return { k: "int", v: checkI64(BigInt(a as string | number | bigint)) };
		case "$float":
			return { k: "float", v: parseFloatJson(a) };
		case "$i8":
		case "$u8":
		case "$i16":
		case "$u16":
		case "$i32":
		case "$u32":
		case "$u64": {
			const k = key.slice(1) as SizedInt;
			const { min, max } = SIZED_INTS[k];
			return { k, v: jsonInt(a, key, min, max) };
		}
		case "$f16":
		case "$f32": {
			const k = key.slice(1) as SizedFloat;
			return { k, v: sizedFloat(k, parseFloatJson(a)) };
		}
		case "$decimal":
			return { k: "decimal", v: normaliseDecimal(String(a)) };
		case "$bytes":
			return { k: "bytes", v: fromHex(a as string) };
		case "$uuid":
			return { k: "uuid", v: normaliseUuid(a as string) };
		case "$datetime":
			if (Array.isArray(a) && a.length !== 2)
				throw new ValueError("$datetime: expected [seconds, nanoseconds]");
			return Array.isArray(a)
				? {
						k: "datetime",
						secs: checkDatetimeSecs(
							jsonInt(a[0], "datetime seconds", -(2n ** 63n), 2n ** 63n - 1n),
						),
						nanos: Number(
							jsonInt(a[1] ?? 0, "datetime nanoseconds", 0n, 999_999_999n),
						),
					}
				: { k: "datetime", ...parseDatetime(a as string) };
		case "$duration":
			if (Array.isArray(a) && a.length > 2)
				throw new ValueError("$duration: at most [seconds, nanoseconds]");
			return Array.isArray(a)
				? {
						k: "duration",
						// Signed, as value.proto carries it; CBOR's tag 14 cannot, and
						// toCbor refuses a negative one.
						secs: jsonInt(
							a[0] ?? 0,
							"duration seconds",
							-(2n ** 63n),
							2n ** 64n - 1n,
						),
						nanos: Number(
							jsonInt(a[1] ?? 0, "duration nanoseconds", 0n, 999_999_999n),
						),
					}
				: { k: "duration", ...parseDuration(a as string) };
		case "$date":
			return { k: "date", days: parseDate(a as string) };
		case "$time":
			return { k: "time", nanos: parseTime(a as string) };
		case "$timestamp":
			return { k: "timestamp", ...parseTimestamp(a as string) };
		case "$interval": {
			if (!Array.isArray(a) || a.length !== 3)
				throw new ValueError(
					"$interval: expected [months, days, microseconds]",
				);
			return {
				k: "interval",
				months: Number(jsonInt(a[0], "interval months", I32_MIN, I32_MAX)),
				days: Number(jsonInt(a[1], "interval days", I32_MIN, I32_MAX)),
				micros: jsonInt(a[2], "interval microseconds", I64_MIN, I64_MAX),
			};
		}
		case "$bigdecimal":
			return { k: "bigdecimal", v: normaliseBigDecimal(String(a)) };
		case "$table":
			return { k: "table", v: a as string };
		case "$record": {
			const r = a as { table: string; key: Json };
			return { k: "record", table: r.table, key: fromJson(r.key) };
		}
		case "$range": {
			const r = a as { start: Json; end: Json };
			return {
				k: "range",
				start: boundFromJson(r.start),
				end: boundFromJson(r.end),
			};
		}
		case "$set":
			return { k: "set", v: distinct((a as Json[]).map(fromJson)) };
		case "$file": {
			const f = a as { bucket: string; key: string };
			return { k: "file", bucket: f.bucket, key: f.key };
		}
		case "$geometry":
			return { k: "geometry", g: plainNumbers(a) as unknown as Geometry };
		case "$regex":
			return { k: "regex", v: a as string };
		case "$object":
			return {
				k: "object",
				v: Object.entries(a as { [k: string]: Json }).map(([k, v]) => [
					k,
					fromJson(v),
				]),
			};
		case "$array":
			return { k: "array", v: (a as Json[]).map(fromJson) };
		case "$string":
			return { k: "string", v: a as string };
	}
	throw new ValueError(`unknown typed key ${key}`);
}

/** Geometry coordinates are always floats, whatever the YAML parser made of them. */
/** Geometry coordinates as JS numbers: bigints, and `$float` for NaN, ±Infinity and -0. */
function plainNumbers(j: Json): Json {
	if (typeof j === "bigint") return Number(j);
	if (Array.isArray(j)) return j.map(plainNumbers);
	if (j !== null && typeof j === "object" && typedKey(j) === "$float")
		return parseFloatJson((j as { $float: Json }).$float);
	if (j !== null && typeof j === "object")
		return Object.fromEntries(
			Object.entries(j).map(([k, v]) => [k, plainNumbers(v)]),
		);
	return j;
}

/** The reverse of plainNumbers: JSON has no NaN, ±Infinity or -0, so those go as `$float`. */
function jsonCoordinates(j: Json): Json {
	if (typeof j === "number")
		return Number.isFinite(j) && !Object.is(j, -0)
			? j
			: (toJson({ k: "float", v: j }) as Json);
	if (Array.isArray(j)) return j.map(jsonCoordinates);
	if (j !== null && typeof j === "object")
		return Object.fromEntries(
			Object.entries(j).map(([k, v]) => [k, jsonCoordinates(v)]),
		);
	return j;
}

function boundFromJson(j: Json): Bound {
	if (j === null || j === undefined) return null;
	const o = j as { [k: string]: Json };
	if ("included" in o)
		return { kind: "included", v: fromJson(o.included as Json) };
	if ("excluded" in o)
		return { kind: "excluded", v: fromJson(o.excluded as Json) };
	throw new ValueError(`bad range bound ${JSON.stringify(j)}`);
}

function parseFloatJson(a: Json): number {
	if (typeof a === "number") return a;
	if (typeof a === "bigint") return Number(a);
	switch (a) {
		case "NaN":
			return Number.NaN;
		case "Infinity":
			return Number.POSITIVE_INFINITY;
		case "-Infinity":
			return Number.NEGATIVE_INFINITY;
		case "-0":
			return -0;
	}
	throw new ValueError(
		`$float: expected a number or "NaN", "Infinity", "-Infinity", "-0", got ${JSON.stringify(a)}`,
	);
}

/** `f` as an f16 or f32, which must hold it exactly (any NaN will do), as the server requires. */
export function sizedFloat(k: SizedFloat, f: number): number {
	const exact =
		k === "f16" ? f16Bits(f) !== undefined : Object.is(Math.fround(f), f);
	if (!exact && !Number.isNaN(f))
		throw new ValueError(`float ${f} cannot be losslessly represented as ${k}`);
	return f;
}

/** The `$float` spelling of `f`: a number, or a string for what JSON cannot hold. */
function floatJson(f: number): Json {
	return Number.isNaN(f)
		? "NaN"
		: f === Number.POSITIVE_INFINITY
			? "Infinity"
			: f === Number.NEGATIVE_INFINITY
				? "-Infinity"
				: Object.is(f, -0)
					? "-0"
					: f;
}

/** The canonical typed JSON for `v`: what a driver prints and what the vectors hold. */
export function toJson(v: Value): Json {
	switch (v.k) {
		case "none":
			return { $none: null };
		case "null":
			return null;
		case "bool":
			return v.v;
		case "int":
			return v.v >= -(2n ** 53n) && v.v <= 2n ** 53n
				? Number(v.v)
				: { $int: v.v.toString() };
		case "float":
			return { $float: floatJson(v.v) };
		case "i8":
		case "u8":
		case "i16":
		case "u16":
		case "i32":
		case "u32":
		case "u64":
			return { [`$${v.k}`]: safeNum(v.v) };
		case "f16":
		case "f32":
			return { [`$${v.k}`]: floatJson(v.v) };
		case "decimal":
			return { $decimal: v.v };
		case "string": {
			return v.v;
		}
		case "bytes":
			return { $bytes: toHex(v.v) };
		case "uuid":
			return { $uuid: v.v };
		case "datetime":
			return { $datetime: formatDatetime(v.secs, v.nanos) };
		case "duration":
			return { $duration: [safeNum(v.secs), v.nanos] };
		case "date":
			return { $date: formatDate(v.days) };
		case "time":
			return { $time: formatTime(v.nanos) };
		case "timestamp":
			return { $timestamp: formatTimestamp(v.secs, v.nanos) };
		case "interval":
			return { $interval: [v.months, v.days, safeNum(v.micros)] };
		case "bigdecimal":
			return { $bigdecimal: v.v };
		case "array":
			return v.v.map(toJson);
		case "object": {
			// fromEntries defines own properties, so a "__proto__" key stays a key
			// instead of setting the prototype.
			const o: { [k: string]: Json } = Object.fromEntries(
				v.v.map(([k, x]) => [k, toJson(x)]),
			);
			return typedKey(o) ? { $object: o } : o;
		}
		case "set":
			return { $set: v.v.map(toJson) };
		case "table":
			return { $table: v.v };
		case "record":
			return { $record: { table: v.table, key: toJson(v.key) } };
		case "range":
			return {
				$range: { start: boundToJson(v.start), end: boundToJson(v.end) },
			};
		case "file":
			return { $file: { bucket: v.bucket, key: v.key } };
		case "geometry":
			return { $geometry: jsonCoordinates(v.g as unknown as Json) };
		case "regex":
			return { $regex: v.v };
	}
}

function boundToJson(b: Bound): Json {
	return b === null ? null : { [b.kind]: toJson(b.v) };
}

function safeNum(n: bigint): Json {
	return n >= -(2n ** 53n) && n <= 2n ** 53n ? Number(n) : n.toString();
}

// ---------------------------------------------------------------------------
// CBOR
// ---------------------------------------------------------------------------

/**
 * Encodes `v` exactly as the server does in `format`. Plain `cbor` widens the
 * sized numbers and the other cbor.2 kinds, as the server does for a client
 * that did not negotiate cbor.2, and has no form for a regex.
 */
export function toCbor(v: Value, format: Format = "cbor"): CborItem {
	const sub = (x: Value) => toCbor(x, format);
	switch (v.k) {
		case "none":
			return tag(TAG.NONE, NULL);
		case "null":
			return NULL;
		case "bool":
			return v.v ? TRUE : FALSE;
		case "int":
			return int(v.v);
		case "float":
			return { t: "float", v: v.v };
		case "i8":
		case "u8":
		case "i16":
		case "u16":
		case "i32":
		case "u32":
		case "u64":
			if (format === "cbor.2") return tag(SIZED_INTS[v.k].tag, int(v.v));
			// Widened: a u64 past i64 goes as a decimal.
			return v.v > I64_MAX ? tag(TAG.DECIMAL, text(v.v.toString())) : int(v.v);
		case "f16":
		case "f32":
			return format === "cbor.2"
				? tag(SIZED_FLOATS[v.k].tag, { t: "float", v: v.v })
				: { t: "float", v: v.v };
		case "decimal":
			return tag(TAG.DECIMAL, text(v.v));
		case "string":
			return text(v.v);
		case "bytes":
			return { t: "bytes", v: v.v };
		case "uuid":
			return tag(TAG.UUID, { t: "bytes", v: uuidBytes(v.v) });
		case "datetime":
			return datetimeTag(v.secs, v.nanos);
		case "duration":
			if (v.secs < 0n)
				throw new ValueError(
					`duration: tag 14 is unsigned, so ${v.secs} seconds has no CBOR form`,
				);
			return durationTag(v.secs, v.nanos);
		case "date":
			return format === "cbor.2"
				? tag(TAG.DATE, int(v.days))
				: datetimeTag(BigInt(v.days) * 86_400n, 0);
		case "time":
			return format === "cbor.2"
				? tag(TAG.TIME, int(v.nanos))
				: durationTag(v.nanos / BigInt(NS), Number(v.nanos % BigInt(NS)));
		case "timestamp":
			return format === "cbor.2"
				? tag(TAG.TIMESTAMP, array([int(v.secs), int(v.nanos)]))
				: datetimeTag(v.secs, v.nanos);
		case "interval":
			return format === "cbor.2"
				? tag(TAG.INTERVAL, array([int(v.months), int(v.days), int(v.micros)]))
				: text(formatInterval(v.months, v.days, v.micros));
		case "bigdecimal": {
			// One that fits a decimal is sent as one, in either dialect.
			const d = bigDecimalAsDecimal(v.v);
			if (d !== undefined) return tag(TAG.DECIMAL, text(d));
			return format === "cbor.2" ? tag(TAG.BIGDECIMAL, text(v.v)) : text(v.v);
		}
		case "array":
			return array(v.v.map(sub));
		case "object":
			return {
				t: "map",
				v: [...v.v]
					.sort(([a], [b]) => utf8Compare(a, b))
					.map(([k, x]) => [text(k), sub(x)]),
			};
		case "set":
			// A set built by hand may repeat a member; the server would drop it.
			return tag(TAG.SET, array(distinct(v.v).map(sub)));
		case "table":
			return tag(TAG.TABLE, text(v.v));
		case "record":
			return tag(TAG.RECORD_ID, array([text(v.table), sub(v.key)]));
		case "range":
			return tag(
				TAG.RANGE,
				array([boundToCbor(v.start, format), boundToCbor(v.end, format)]),
			);
		case "file":
			return tag(TAG.FILE, array([text(v.bucket), text(v.key)]));
		case "geometry":
			return geometryToCbor(v.g);
		case "regex":
			if (format === "cbor.2") return tag(TAG.REGEX, text(v.v));
			throw new ValueError("regex has no plain cbor encoding: use cbor.2");
	}
}

const datetimeTag = (secs: bigint, nanos: number): CborItem =>
	tag(TAG.DATETIME, array([int(secs), int(nanos)]));

/** Tag 14 in its shortest form: [] for zero, [s] for whole seconds, else [s, ns]. */
const durationTag = (secs: bigint, nanos: number): CborItem =>
	tag(
		TAG.DURATION,
		array(
			secs === 0n && nanos === 0
				? []
				: nanos === 0
					? [int(secs)]
					: [int(secs), int(nanos)],
		),
	);

function boundToCbor(b: Bound, format: Format): CborItem {
	if (b === null) return NULL;
	return tag(
		b.kind === "included" ? TAG.BOUND_INCLUDED : TAG.BOUND_EXCLUDED,
		toCbor(b.v, format),
	);
}

const pos = (p: Position): CborItem =>
	tag(
		TAG.POINT,
		array([
			{ t: "float", v: p[0] },
			{ t: "float", v: p[1] },
		]),
	);
const line = (l: Position[]): CborItem => tag(TAG.LINE, array(l.map(pos)));
const poly = (p: Position[][]): CborItem =>
	tag(TAG.POLYGON, array(p.map(line)));

function geometryToCbor(g: Geometry): CborItem {
	switch (g.type) {
		case "Point":
			return pos(g.coordinates);
		case "LineString":
			return line(g.coordinates);
		case "Polygon":
			return poly(g.coordinates);
		case "MultiPoint":
			return tag(TAG.MULTIPOINT, array(g.coordinates.map(pos)));
		case "MultiLineString":
			return tag(TAG.MULTILINE, array(g.coordinates.map(line)));
		case "MultiPolygon":
			return tag(TAG.MULTIPOLYGON, array(g.coordinates.map(poly)));
		case "GeometryCollection":
			return tag(TAG.COLLECTION, array(g.geometries.map(geometryToCbor)));
	}
}

/**
 * Decodes `item` with the 4.0 server's rules for `format`, including the
 * string form of tag 8. Throws `ValueError` for input the server rejects: the
 * text-form tags 0, 9 and 13, unknown tags, integers outside i64, duplicate
 * map keys and tag 6 around anything but null; under plain `cbor` the tags 100
 * and 180 to 193, and under `cbor.2` a sized number outside its kind and a
 * date, time, timestamp or interval outside its range.
 */
export function fromCbor(item: CborItem, format: Format = "cbor"): Value {
	const sub = (x: CborItem) => fromCbor(x, format);
	switch (item.t) {
		case "uint":
		case "nint": {
			const n = item.t === "uint" ? item.v : -1n - item.v;
			if (n < I64_MIN || n > I64_MAX)
				throw new ValueError(`integer ${n} is outside i64`);
			return { k: "int", v: n };
		}
		case "float":
			return { k: "float", v: item.v };
		case "bytes":
			return { k: "bytes", v: item.v };
		case "text":
			return { k: "string", v: item.v };
		case "array":
			return { k: "array", v: item.v.map(sub) };
		case "map": {
			const seen = new Set<string>();
			return {
				k: "object",
				v: item.v.map(([key, x]) => {
					if (key.t !== "text")
						throw new ValueError("object keys must be text");
					if (seen.has(key.v))
						throw new ValueError(`duplicate key ${key.v} in a CBOR map`);
					seen.add(key.v);
					return [key.v, sub(x)] as [string, Value];
				}),
			};
		}
		case "simple":
			if (item.v === 20) return { k: "bool", v: false };
			if (item.v === 21) return { k: "bool", v: true };
			if (item.v === 22) return { k: "null" };
			throw new ValueError(`unsupported simple value ${item.v}`);
		case "raw":
			throw new ValueError("raw items cannot be decoded");
		case "tag":
			return fromTag(item.tag, item.v, format);
	}
}

const asText = (i: CborItem, what: string): string => {
	if (i.t !== "text") throw new ValueError(`${what}: expected text`);
	return i.v;
};
const asArray = (i: CborItem, what: string): CborItem[] => {
	if (i.t !== "array") throw new ValueError(`${what}: expected array`);
	return i.v;
};
const asUint = (i: CborItem | undefined, what: string, max: bigint): bigint => {
	if (!i || i.t !== "uint" || i.v > max)
		throw new ValueError(`${what}: expected an unsigned integer <= ${max}`);
	return i.v;
};

function fromTag(t: bigint, c: CborItem, format: Format): Value {
	const sub = (x: CborItem) => fromCbor(x, format);
	switch (t) {
		case TAG.NONE:
			if (c.t !== "simple" || c.v !== 22)
				throw new ValueError("Expected a CBOR null under the NONE tag");
			return { k: "none" };
		case TAG.TABLE:
			return { k: "table", v: asText(c, "table") };
		case TAG.DECIMAL:
			return { k: "decimal", v: normaliseDecimal(asText(c, "decimal"), true) };
		case TAG.DATETIME: {
			const a = asArray(c, "datetime");
			if (a.length !== 2)
				throw new ValueError("datetime: expected [seconds, nanoseconds]");
			const s = a[0] as CborItem;
			if (s.t !== "uint" && s.t !== "nint")
				throw new ValueError("datetime: seconds must be an integer");
			const secs = checkDatetimeSecs(
				checkI64(s.t === "uint" ? s.v : -1n - s.v),
			);
			const nanos = Number(asUint(a[1], "datetime nanoseconds", 999_999_999n));
			return { k: "datetime", secs, nanos };
		}
		case TAG.DURATION: {
			const a = asArray(c, "duration");
			if (a.length > 2)
				throw new ValueError("duration: at most [seconds, nanoseconds]");
			const secs =
				a.length > 0 ? asUint(a[0], "duration seconds", 2n ** 64n - 1n) : 0n;
			let nanos =
				a.length > 1
					? asUint(a[1], "duration nanoseconds", 2n ** 32n - 1n)
					: 0n;
			// std::time::Duration::new carries whole seconds out of the nanoseconds.
			const carry = nanos / BigInt(NS);
			nanos %= BigInt(NS);
			if (secs + carry > 2n ** 64n - 1n)
				throw new ValueError(
					"duration: carrying the nanoseconds overflows u64 seconds",
				);
			return { k: "duration", secs: secs + carry, nanos: Number(nanos) };
		}
		case TAG.UUID:
			if (c.t !== "bytes" || c.v.length !== 16)
				throw new ValueError("uuid: expected 16 bytes");
			return { k: "uuid", v: uuidString(c.v) };
		case TAG.RECORD_ID: {
			if (c.t === "text") return parseRecordIdString(c.v);
			const a = asArray(c, "record id");
			if (a.length !== 2)
				throw new ValueError("record id: expected [table, key]");
			const table = asText(a[0] as CborItem, "record id table");
			return {
				k: "record",
				table,
				key: checkRecordKey(sub(a[1] as CborItem)),
			};
		}
		case TAG.RANGE: {
			const a = asArray(c, "range");
			if (a.length !== 2) throw new ValueError("range: expected [start, end]");
			return {
				k: "range",
				start: boundFromCbor(a[0] as CborItem, format),
				end: boundFromCbor(a[1] as CborItem, format),
			};
		}
		case TAG.FILE: {
			const a = asArray(c, "file");
			if (a.length !== 2) throw new ValueError("file: expected [bucket, key]");
			return {
				k: "file",
				bucket: asText(a[0] as CborItem, "file bucket"),
				key: asText(a[1] as CborItem, "file key"),
			};
		}
		case TAG.SET:
			// Sets are deduplicated on decode. Order is not significant.
			return { k: "set", v: distinct(asArray(c, "set").map(sub)) };
		case TAG.POINT:
		case TAG.LINE:
		case TAG.POLYGON:
		case TAG.MULTIPOINT:
		case TAG.MULTILINE:
		case TAG.MULTIPOLYGON:
		case TAG.COLLECTION:
			return { k: "geometry", g: geometryFromCbor({ t: "tag", tag: t, v: c }) };
	}
	const refused = REFUSED[t.toString()];
	if (refused) throw new ValueError(refused);
	if (t === TAG.SHAPED_BLOCK)
		throw new ValueError("CBOR tag 57 (a shaped block) is not accepted here");
	const sized = SIZED_BY_TAG.get(t);
	if (sized || CBOR2_ONLY.has(t)) {
		if (format !== "cbor.2")
			throw new ValueError(`CBOR tag ${t} is not accepted here: use cbor.2`);
		return sized ? sizedFromCbor(t, sized, c) : cbor2FromTag(t, c);
	}
	throw new ValueError(`unknown tag ${t}`);
}

/** An integer item's value, or `undefined` for any other item. */
const intOf = (i: CborItem | undefined): bigint | undefined =>
	i?.t === "uint" ? i.v : i?.t === "nint" ? -1n - i.v : undefined;

/** A date of `days` since 1970-01-01, which must lie within chrono's range. */
export function dateValue(days: bigint): Value {
	// The first and last days stand for -infinity and infinity.
	if (days < BigInt(DATE_MIN_DAYS) || days > BigInt(DATE_MAX_DAYS))
		throw new ValueError("Expected a valid Date value");
	return { k: "date", days: Number(days) };
}

/** A time of `nanos` since midnight, up to and including 24:00:00. */
export function timeValue(nanos: bigint): Value {
	if (nanos < 0n || nanos > NANOS_PER_DAY)
		throw new ValueError("Expected a valid Time value");
	return { k: "time", nanos };
}

/** A timestamp within chrono's range; a leap second's nanoseconds are refused. */
export function timestampValue(secs: bigint, nanos: bigint): Value {
	if (
		nanos < 0n ||
		nanos > 999_999_999n ||
		secs < DATETIME_MIN_SECS ||
		secs > DATETIME_MAX_SECS
	)
		throw new ValueError("Expected a valid Timestamp value");
	return { k: "timestamp", secs, nanos: Number(nanos) };
}

/** A cbor.2 date, time, timestamp, interval, bigdecimal or regex. */
function cbor2FromTag(t: bigint, c: CborItem): Value {
	switch (t) {
		case TAG.DATE: {
			const n = intOf(c);
			if (n === undefined)
				throw new ValueError(`Expected a CBOR integer under tag ${t}`);
			if (n < I32_MIN || n > I32_MAX)
				throw new ValueError("Expected a CBOR integer that fits a date");
			return dateValue(n);
		}
		case TAG.TIME: {
			const n = intOf(c);
			if (n === undefined)
				throw new ValueError(`Expected a CBOR integer under tag ${t}`);
			if (n < 0n)
				throw new ValueError(
					"Expected a CBOR unsigned integer that fits a time",
				);
			return timeValue(n);
		}
		case TAG.TIMESTAMP: {
			const a = asArray(c, `tag ${t}`);
			const secs = intOf(a[0]);
			const nanos = intOf(a[1]);
			if (a.length !== 2 || secs === undefined || nanos === undefined)
				throw new ValueError(
					`Expected a CBOR array of 2 integers under tag ${t}`,
				);
			if (
				secs < I64_MIN ||
				secs > I64_MAX ||
				nanos < 0n ||
				nanos > 2n ** 32n - 1n
			)
				throw new ValueError("Expected a CBOR integer data type");
			return timestampValue(secs, nanos);
		}
		case TAG.INTERVAL: {
			const a = asArray(c, `tag ${t}`);
			const [months, days, micros] = a.map(intOf);
			if (
				a.length !== 3 ||
				months === undefined ||
				days === undefined ||
				micros === undefined
			)
				throw new ValueError(
					`Expected a CBOR array of 3 integers under tag ${t}`,
				);
			if (months < I32_MIN || months > I32_MAX)
				throw new ValueError("Expected interval months that fit 32 bits");
			if (days < I32_MIN || days > I32_MAX)
				throw new ValueError("Expected interval days that fit 32 bits");
			if (micros < I64_MIN || micros > I64_MAX)
				throw new ValueError("Expected interval microseconds that fit 64 bits");
			return {
				k: "interval",
				months: Number(months),
				days: Number(days),
				micros,
			};
		}
		case TAG.BIGDECIMAL:
			if (c.t !== "text")
				throw new ValueError(`Expected a CBOR text under tag ${t}`);
			return { k: "bigdecimal", v: normaliseBigDecimal(c.v) };
		case TAG.REGEX:
			// The server also compiles the pattern, with the Rust regex crate, and
			// refuses one that does not compile; that is not checked here.
			if (c.t !== "text")
				throw new ValueError(`Expected a CBOR text under tag ${t}`);
			return { k: "regex", v: c.v };
	}
	throw new ValueError(`unknown tag ${t}`);
}

/** A cbor.2 sized number: an integer within its kind, or a float its kind holds exactly. */
function sizedFromCbor(
	t: bigint,
	k: SizedInt | SizedFloat,
	c: CborItem,
): Value {
	if (isSizedInt(k)) {
		if (c.t !== "uint" && c.t !== "nint")
			throw new ValueError(`Expected a CBOR integer under tag ${t}`);
		return sizedInt(k, c.t === "uint" ? c.v : -1n - c.v);
	}
	if (c.t !== "float")
		throw new ValueError(`Expected a CBOR float under tag ${t}`);
	return { k, v: sizedFloat(k, c.v) };
}

/** `n` as the sized integer kind `k`, which must hold it. */
export function sizedInt(k: SizedInt, n: bigint): Value {
	const { min, max, range } = SIZED_INTS[k];
	if (n < min || n > max)
		throw new ValueError(`integer ${n} is outside the ${range} range`);
	return { k, v: n };
}

function boundFromCbor(i: CborItem, format: Format): Bound {
	if (i.t === "simple" && i.v === 22) return null;
	if (i.t === "tag" && i.tag === TAG.BOUND_INCLUDED)
		return { kind: "included", v: fromCbor(i.v, format) };
	if (i.t === "tag" && i.tag === TAG.BOUND_EXCLUDED)
		return { kind: "excluded", v: fromCbor(i.v, format) };
	throw new ValueError("range: expected a bound tag or null");
}

/**
 * A record id key, or a bound of a record id range, which must be one too.
 * Keys hold an i64, so a sized integer key (cbor.2 only) is read as an int.
 */
function checkRecordKey(v: Value): Value {
	if (isSizedInt(v.k)) {
		const n = (v as { v: bigint }).v;
		if (n > I64_MAX)
			throw new ValueError(`integer ${n} is outside the 64-bit signed range`);
		return { k: "int", v: n };
	}
	if (!["int", "string", "array", "object", "uuid", "range"].includes(v.k)) {
		throw new ValueError(`record id key cannot be ${v.k}`);
	}
	if (v.k === "range") {
		const bound = (b: Bound): Bound =>
			b && { kind: b.kind, v: checkRecordKey(b.v) };
		return { k: "range", start: bound(v.start), end: bound(v.end) };
	}
	return v;
}

/**
 * geo::Polygon::new closes every ring, so the server holds an unclosed ring
 * with its first point repeated at the end. Decoders do the same.
 */
export function closeRing(ring: Position[]): Position[] {
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (!first || !last || (first[0] === last[0] && first[1] === last[1]))
		return ring;
	return [...ring, [first[0], first[1]]];
}

function geometryFromCbor(i: CborItem): Geometry {
	if (i.t !== "tag") throw new ValueError("geometry: expected a geometry tag");
	const points = (c: CborItem) => asArray(c, "geometry").map((p) => pointOf(p));
	const lines = (c: CborItem) => asArray(c, "geometry").map((l) => lineOf(l));
	switch (i.tag) {
		case TAG.POINT:
			return { type: "Point", coordinates: pointOf(i) };
		case TAG.LINE:
			return { type: "LineString", coordinates: points(i.v) };
		case TAG.POLYGON: {
			const rings = lines(i.v);
			if (rings.length === 0)
				throw new ValueError("polygon: needs at least one ring");
			return { type: "Polygon", coordinates: rings.map(closeRing) };
		}
		case TAG.MULTIPOINT:
			return { type: "MultiPoint", coordinates: points(i.v) };
		case TAG.MULTILINE:
			return { type: "MultiLineString", coordinates: lines(i.v) };
		case TAG.MULTIPOLYGON:
			return {
				type: "MultiPolygon",
				coordinates: asArray(i.v, "multipolygon").map((p) => {
					const g = geometryFromCbor(p);
					if (g.type !== "Polygon")
						throw new ValueError("multipolygon: expected polygons");
					return g.coordinates;
				}),
			};
		case TAG.COLLECTION:
			return {
				type: "GeometryCollection",
				geometries: asArray(i.v, "collection").map(geometryFromCbor),
			};
	}
	throw new ValueError(`tag ${i.tag} is not a geometry`);

	function pointOf(p: CborItem): Position {
		if (p.t !== "tag" || p.tag !== TAG.POINT)
			throw new ValueError("expected a point");
		const a = asArray(p.v, "point");
		if (a.length !== 2) throw new ValueError("point: expected [x, y]");
		return [numberOf(a[0] as CborItem), numberOf(a[1] as CborItem)];
	}
	function lineOf(l: CborItem): Position[] {
		if (l.t !== "tag" || l.tag !== TAG.LINE)
			throw new ValueError("expected a line");
		return points(l.v);
	}
	function numberOf(n: CborItem): number {
		const v = fromCbor(n);
		if (v.k === "int") return Number(v.v);
		if (v.k === "float") return v.v;
		if (v.k === "decimal") return Number(v.v);
		throw new ValueError("point: coordinates must be numbers");
	}
}

/**
 * The string form of tag 8, parsed as SurrealQL record id syntax: the table
 * is an identifier or escaped with ⟨…⟩ or backticks; the key is an i64, an
 * identifier, an escaped string, a u"…" uuid, or an array or object literal.
 * The server ignores text after a valid prefix ("person:1..5" is person:1);
 * this decoder rejects it, since an encoder that sends it has a bug.
 */
function parseRecordIdString(s: string): Value {
	const p = new SurqlReader(s);
	const table = p.name();
	p.expect(":");
	const key = p.recordKey();
	if (!p.done()) throw new ValueError(`not a record id: ${s}`);
	return { k: "record", table, key };
}

/** Just enough of the SurrealQL literal grammar for record id strings. */
class SurqlReader {
	private pos = 0;
	constructor(private readonly s: string) {}

	done(): boolean {
		return this.pos === this.s.length;
	}

	private fail(): never {
		throw new ValueError(`not a record id: ${this.s}`);
	}

	private rest(): string {
		return this.s.slice(this.pos);
	}

	private ws() {
		while (/\s/.test(this.s[this.pos] ?? "")) this.pos++;
	}

	expect(c: string) {
		if (!this.s.startsWith(c, this.pos)) this.fail();
		this.pos += c.length;
	}

	private eat(c: string): boolean {
		this.ws();
		if (!this.s.startsWith(c, this.pos)) return false;
		this.pos += c.length;
		return true;
	}

	/** An identifier, or text escaped with ⟨…⟩ or backticks. */
	name(): string {
		const open = this.s[this.pos];
		if (open === "⟨" || open === "`") {
			const end = this.s.indexOf(open === "⟨" ? "⟩" : "`", this.pos + 1);
			if (end < 0) this.fail();
			const v = this.s.slice(this.pos + 1, end);
			this.pos = end + 1;
			return v;
		}
		const m = /^[A-Za-z0-9_]+/.exec(this.rest());
		if (!m) this.fail();
		this.pos += m[0].length;
		return m[0];
	}

	recordKey(): Value {
		const rest = this.rest();
		if (/^[[{]/.test(rest) || /^u["']/.test(rest)) return this.value();
		// Digits that fit i64 are an integer key; past i64 they are an
		// identifier, as on the server.
		const m = /^-?\d+(?![A-Za-z0-9_])/.exec(rest);
		if (m) {
			const n = BigInt(m[0]);
			if (n >= I64_MIN && n <= I64_MAX) {
				this.pos += m[0].length;
				return { k: "int", v: n };
			}
			if (m[0].startsWith("-")) this.fail();
		}
		return { k: "string", v: this.name() };
	}

	/** A literal inside an array or object key. */
	private value(): Value {
		this.ws();
		const rest = this.rest();
		if (this.eat("[")) {
			const v: Value[] = [];
			if (!this.eat("]")) {
				do v.push(this.value());
				while (this.eat(","));
				if (!this.eat("]")) this.fail();
			}
			return { k: "array", v };
		}
		if (this.eat("{")) {
			const v: [string, Value][] = [];
			if (!this.eat("}")) {
				do {
					this.ws();
					const q = this.s[this.pos];
					const key = q === '"' || q === "'" ? this.str() : this.name();
					if (!this.eat(":")) this.fail();
					v.push([key, this.value()]);
				} while (this.eat(","));
				if (!this.eat("}")) this.fail();
			}
			if (new Set(v.map(([k]) => k)).size !== v.length) this.fail();
			return { k: "object", v };
		}
		if (/^["']/.test(rest)) return { k: "string", v: this.str() };
		if (/^u["']/.test(rest)) {
			this.pos++;
			return { k: "uuid", v: normaliseUuid(this.str()) };
		}
		const words: [string, Value][] = [
			["true", { k: "bool", v: true }],
			["false", { k: "bool", v: false }],
			["null", { k: "null" }],
			["NULL", { k: "null" }],
			["NONE", { k: "none" }],
		];
		for (const [word, v] of words)
			if (new RegExp(`^${word}(?![A-Za-z0-9_])`).test(rest)) {
				this.pos += word.length;
				return v;
			}
		const n = /^(-?\d+(\.\d+)?(e[+-]?\d+)?)(f|dec)?(?![A-Za-z0-9_])/i.exec(
			rest,
		);
		if (!n) this.fail();
		this.pos += n[0].length;
		const [, text, frac, exp, suffix] = n as unknown as string[];
		if (suffix?.toLowerCase() === "dec")
			return { k: "decimal", v: normaliseDecimal(text as string, true) };
		if (frac || exp || suffix) return { k: "float", v: Number(text) };
		return { k: "int", v: checkI64(BigInt(text as string)) };
	}

	/**
	 * A quoted string with SurrealQL's escapes: \\ \" \' \b \f \n \r \t \0,
	 * \uXXXX and \u{X…}. Anything else, and surrogates, the server refuses.
	 */
	private str(): string {
		const q = this.s[this.pos++];
		const escapes: Record<string, string> = {
			"\\": "\\",
			'"': '"',
			"'": "'",
			b: "\b",
			f: "\f",
			n: "\n",
			r: "\r",
			t: "\t",
			"0": "\0",
		};
		let out = "";
		for (;;) {
			const c = this.s[this.pos++];
			if (c === undefined) this.fail();
			if (c === q) return out;
			if (c !== "\\") {
				out += c;
				continue;
			}
			const e = this.s[this.pos++];
			if (e === undefined) this.fail();
			if (e !== "u") {
				const r = escapes[e];
				if (r === undefined) this.fail();
				out += r;
				continue;
			}
			const m =
				/^\{([0-9A-Fa-f]{1,6})\}/.exec(this.rest()) ??
				/^([0-9A-Fa-f]{4})/.exec(this.rest());
			if (!m) this.fail();
			this.pos += m[0].length;
			const cp = Number.parseInt(m[1] as string, 16);
			if (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) this.fail();
			out += String.fromCodePoint(cp);
		}
	}
}

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

function checkI64(n: bigint): bigint {
	if (n < I64_MIN || n > I64_MAX)
		throw new ValueError(`integer ${n} is outside i64`);
	return n;
}

/**
 * Canonical decimal text: no leading "+", no redundant leading zeros, no
 * trailing fractional zeros, and "0" rather than "-0". `strict` rejects
 * anything that is not plain decimal notation, as the server does.
 */
// chrono's DateTime<Utc> spans -262143-01-01T00:00:00Z to
// +262142-12-31T23:59:59.999999999Z; the server can't hold an instant outside.
const DATETIME_MIN_SECS = -8_334_601_228_800n;
const DATETIME_MAX_SECS = 8_210_266_876_799n;

/**
 * An integer component of a typed JSON array form (a number, a decimal string
 * for values past 2^53, or a bigint as the YAML loader gives), within [min, max]. The array forms are the
 * canonical [seconds, nanoseconds], so nothing is carried or normalised.
 */
function jsonInt(
	v: Json | undefined,
	what: string,
	min: bigint,
	max: bigint,
): bigint {
	let n: bigint;
	if (typeof v === "bigint") n = v;
	else if (typeof v === "number" && Number.isSafeInteger(v)) n = BigInt(v);
	else if (typeof v === "string" && /^-?[0-9]+$/.test(v)) n = BigInt(v);
	else throw new ValueError(`${what}: expected an integer, got ${String(v)}`);
	if (n < min || n > max)
		throw new ValueError(`${what}: ${n} is outside ${min}..=${max}`);
	return n;
}

export function checkDatetimeSecs(secs: bigint): bigint {
	if (secs < DATETIME_MIN_SECS || secs > DATETIME_MAX_SECS)
		throw new ValueError(`datetime: ${secs} seconds is outside chrono's range`);
	return secs;
}

const DECIMAL_MAX = 2n ** 96n - 1n;

export function normaliseDecimal(s: string, strict = false): string {
	// Typed JSON may be loose about whitespace; wire decimals may not, since
	// the server's parser rejects it.
	const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(strict ? s : s.trim());
	if (!m || (m[2] === "" && (m[3] ?? "") === "")) {
		if (strict) throw new ValueError(`not a decimal: ${s}`);
		return s;
	}
	const intPart = (m[2] as string).replace(/^0+(?=\d)/, "") || "0";
	// rust_decimal holds a 96-bit unscaled mantissa and at most 28 fractional
	// digits; the trailing zeros are gone, so neither check counts them.
	const fracDigits = (m[3] ?? "").replace(/0+$/, "");
	if (
		strict &&
		(fracDigits.length > 28 || BigInt(intPart + fracDigits) > DECIMAL_MAX)
	)
		throw new ValueError(`decimal out of range: ${s}`);
	const frac = (m[3] ?? "").replace(/0+$/, "");
	const body = frac ? `${intPart}.${frac}` : intPart;
	return m[1] === "-" && body !== "0" ? `-${body}` : body;
}

export function normaliseUuid(s: string): string {
	const h = s.toLowerCase().replace(/-/g, "");
	if (!/^[0-9a-f]{32}$/.test(h)) throw new ValueError(`not a uuid: ${s}`);
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function uuidBytes(s: string): Uint8Array {
	return fromHex(normaliseUuid(s).replace(/-/g, ""));
}

function uuidString(b: Uint8Array): string {
	return normaliseUuid(toHex(b));
}

/** RFC 3339 in UTC, with nine fractional digits when the nanoseconds are not zero. */
export function formatDatetime(secs: bigint, nanos: number): string {
	const iso = new Date(Number(secs) * 1000).toISOString(); // ...T00:00:00.000Z
	const base = iso.slice(0, iso.indexOf("."));
	return nanos === 0
		? `${base}Z`
		: `${base}.${String(nanos).padStart(9, "0")}Z`;
}

export function parseDatetime(s: string): { secs: bigint; nanos: number } {
	const m =
		/^([+-]?\d{4,6}-\d{2}-\d{2})[Tt ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?([Zz]|[+-]\d{2}:\d{2})$/.exec(
			s,
		);
	if (!m) throw new ValueError(`not an RFC 3339 datetime: ${s}`);
	const ms = Date.parse(
		`${m[1]}T${m[2]}${m[4]?.toUpperCase() === "Z" ? "Z" : m[4]}`,
	);
	if (Number.isNaN(ms)) throw new ValueError(`not an RFC 3339 datetime: ${s}`);
	// Date.parse rolls 2023-02-29 over to March 1, so check the fields survive.
	const [y, mo, d] = (m[1] as string).split(/(?<=\d)-/).map(Number);
	const [h, mi, se] = (m[2] as string).split(":").map(Number);
	const off =
		m[4]?.toUpperCase() === "Z"
			? 0
			: (m[4]?.startsWith("-") ? -1 : 1) *
				(Number(m[4]?.slice(1, 3)) * 60 + Number(m[4]?.slice(4, 6)));
	const local = new Date(ms + off * 60_000);
	if (
		local.getUTCFullYear() !== y ||
		local.getUTCMonth() + 1 !== mo ||
		local.getUTCDate() !== d ||
		local.getUTCHours() !== h ||
		local.getUTCMinutes() !== mi ||
		local.getUTCSeconds() !== se
	)
		throw new ValueError(`not a valid date and time: ${s}`);
	return {
		secs: checkDatetimeSecs(BigInt(ms / 1000)),
		nanos: Number((m[3] ?? "").padEnd(9, "0")),
	};
}

const DURATION_UNITS: [string, bigint][] = [
	["ns", 1n],
	["us", 1_000n],
	["µs", 1_000n],
	["ms", 1_000_000n],
	["s", 1_000_000_000n],
	["m", 60_000_000_000n],
	["h", 3_600_000_000_000n],
	["d", 86_400_000_000_000n],
	["w", 604_800_000_000_000n],
	["y", 31_536_000_000_000_000n],
];

/** SurrealQL duration syntax, e.g. "1h30m" or "1s500ms". */
export function parseDuration(s: string): { secs: bigint; nanos: number } {
	const re = /(\d+)(ns|us|µs|ms|s|m|h|d|w|y)/gy;
	let total = 0n;
	let matched = 0;
	for (let m = re.exec(s); m; m = re.exec(s)) {
		const unit = DURATION_UNITS.find(([u]) => u === m?.[2]);
		total += BigInt(m[1] as string) * (unit?.[1] ?? 0n);
		matched = re.lastIndex;
	}
	if (s.length === 0 || matched !== s.length)
		throw new ValueError(`not a duration: ${s}`);
	// SurrealDB durations hold u64 seconds plus the nanoseconds within one.
	if (total > (2n ** 64n - 1n) * 1_000_000_000n + 999_999_999n)
		throw new ValueError(`duration out of range: ${s}`);
	return {
		secs: total / 1_000_000_000n,
		nanos: Number(total % 1_000_000_000n),
	};
}

// chrono's NaiveDate spans -262143-01-01 to +262142-12-31. The server holds
// those two days as -infinity and infinity.
const DATE_MIN_DAYS = -96_465_292;
const DATE_MAX_DAYS = 95_026_236;

/** Days since 1970-01-01 of a proleptic Gregorian date (Hinnant's days_from_civil). */
function daysFromCivil(y: number, m: number, d: number): number {
	const yy = m <= 2 ? y - 1 : y;
	const era = Math.floor(yy / 400);
	const yoe = yy - era * 400;
	const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
	const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
	return era * 146_097 + doe - 719_468;
}

/** The [year, month, day] of a count of days since 1970-01-01. */
function civilFromDays(days: number): [number, number, number] {
	const z = days + 719_468;
	const era = Math.floor(z / 146_097);
	const doe = z - era * 146_097;
	const yoe = Math.floor(
		(doe -
			Math.floor(doe / 1460) +
			Math.floor(doe / 36_524) -
			Math.floor(doe / 146_096)) /
			365,
	);
	const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
	const mp = Math.floor((5 * doy + 2) / 153);
	const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
	const m = mp < 10 ? mp + 3 : mp - 9;
	return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** The fraction of a second as the server prints it: none, or 3, 6 or 9 digits. */
function fraction(nanos: number): string {
	if (nanos === 0) return "";
	if (nanos % 1_000_000 === 0) return `.${pad(nanos / 1_000_000, 3)}`;
	if (nanos % 1_000 === 0) return `.${pad(nanos / 1_000, 6)}`;
	return `.${pad(nanos, 9)}`;
}

/** A date as chrono prints it: a year outside 0..=9999 takes a sign. */
function formatCivil(days: number): string {
	const [y, m, d] = civilFromDays(days);
	const year =
		y >= 0 && y <= 9999
			? pad(y, 4)
			: `${y < 0 ? "-" : "+"}${pad(Math.abs(y), 4)}`;
	return `${year}-${pad(m, 2)}-${pad(d, 2)}`;
}

/** `$date` text: YYYY-MM-DD, or "infinity" / "-infinity" for the last and first days. */
export function formatDate(days: number): string {
	if (days === DATE_MAX_DAYS) return "infinity";
	if (days === DATE_MIN_DAYS) return "-infinity";
	return formatCivil(days);
}

/** A finite date: its first and last days are spelled "-infinity" and "infinity". */
export function parseDate(s: string): number {
	if (s === "infinity") return DATE_MAX_DAYS;
	if (s === "-infinity") return DATE_MIN_DAYS;
	const days = parseCivil(s);
	if (days === DATE_MIN_DAYS || days === DATE_MAX_DAYS)
		throw new ValueError(`date out of range: ${s}`);
	return days;
}

/** YYYY-MM-DD within chrono's range, as days since 1970-01-01. */
function parseCivil(s: string): number {
	const m = /^([+-]?\d{4,6})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) throw new ValueError(`not a date: ${s}`);
	const days = daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]));
	if (formatCivil(days).replace(/^\+/, "") !== s.replace(/^\+/, ""))
		throw new ValueError(`not a valid date: ${s}`);
	if (days < DATE_MIN_DAYS || days > DATE_MAX_DAYS)
		throw new ValueError(`date out of range: ${s}`);
	return days;
}

/** `$time` text: HH:MM:SS and the fraction, up to 24:00:00. */
export function formatTime(nanos: bigint): string {
	const secs = Number(nanos / BigInt(NS));
	return `${pad(Math.floor(secs / 3600), 2)}:${pad(Math.floor(secs / 60) % 60, 2)}:${pad(secs % 60, 2)}${fraction(Number(nanos % BigInt(NS)))}`;
}

/** H:MM[:SS[.fraction]], as the server reads a time. */
export function parseTime(s: string): bigint {
	const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,9}))?)?$/.exec(s);
	if (!m) throw new ValueError(`not a time: ${s}`);
	const [h, mi, se] = [m[1], m[2], m[3] ?? "0"].map(Number) as number[];
	if ((h as number) > 24 || (mi as number) > 59 || (se as number) > 59)
		throw new ValueError(`not a time: ${s}`);
	const nanos =
		BigInt((h as number) * 3600 + (mi as number) * 60 + (se as number)) *
			BigInt(NS) +
		BigInt((m[4] ?? "").padEnd(9, "0"));
	if (nanos > NANOS_PER_DAY) throw new ValueError(`not a time: ${s}`);
	return nanos;
}

/** `$timestamp` text: a date, T, a time, no zone; or "infinity" / "-infinity". */
export function formatTimestamp(secs: bigint, nanos: number): string {
	if (secs === DATETIME_MAX_SECS && nanos === 999_999_999) return "infinity";
	if (secs === DATETIME_MIN_SECS && nanos === 0) return "-infinity";
	const days = secs / 86_400n - (secs % 86_400n < 0n ? 1n : 0n);
	const ofDay = secs - days * 86_400n;
	return `${formatCivil(Number(days))}T${formatTime(ofDay * BigInt(NS) + BigInt(nanos))}`;
}

export function parseTimestamp(s: string): { secs: bigint; nanos: number } {
	if (s === "infinity") return { secs: DATETIME_MAX_SECS, nanos: 999_999_999 };
	if (s === "-infinity") return { secs: DATETIME_MIN_SECS, nanos: 0 };
	const at = s.indexOf("T");
	if (at < 0) throw new ValueError(`not a timestamp: ${s}`);
	const days = parseCivil(s.slice(0, at));
	const t = parseTime(s.slice(at + 1));
	if (t >= NANOS_PER_DAY) throw new ValueError(`not a timestamp: ${s}`);
	const secs = BigInt(days) * 86_400n + t / BigInt(NS);
	const nanos = Number(t % BigInt(NS));
	// The first and last instants are spelled "-infinity" and "infinity".
	if (/infinity$/.test(formatTimestamp(secs, nanos)))
		throw new ValueError(`timestamp out of range: ${s}`);
	return { secs, nanos };
}

/** An interval as the server prints it, the text plain cbor sends: ISO 8601, e.g. P1Y2M3DT4H5M6.5S. */
export function formatInterval(
	months: number,
	days: number,
	micros: bigint,
): string {
	let out = "P";
	const years = Math.trunc(months / 12);
	const mons = months % 12;
	if (years !== 0) out += `${years}Y`;
	if (mons !== 0) out += `${mons}M`;
	if (days !== 0) out += `${days}D`;
	if (micros !== 0n) {
		out += "T";
		const sign = micros < 0n ? "-" : "";
		const abs = micros < 0n ? -micros : micros;
		const hours = abs / 3_600_000_000n;
		const mins = (abs % 3_600_000_000n) / 60_000_000n;
		const secs = (abs % 60_000_000n) / 1_000_000n;
		const frac = abs % 1_000_000n;
		if (hours !== 0n) out += `${sign}${hours}H`;
		if (mins !== 0n) out += `${sign}${mins}M`;
		if (secs !== 0n || frac !== 0n) {
			out += `${sign}${secs}`;
			if (frac !== 0n)
				out += `.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
			out += "S";
		}
	}
	return out === "P" ? "PT0S" : out;
}

/** The server's limit on a bigdecimal exponent (PostgreSQL numeric's digits). */
const BIGDECIMAL_MAX_EXPONENT = 131_072n + 16_383n;

/**
 * Bigdecimal text as the server prints it: positional, with the scale as
 * written ("1.50" keeps its zero) and an exponent folded in ("1.5e3" is
 * "1500", "1.5e-3" is "0.0015"). Reads what the server's parser reads: an
 * optional sign, digits with an optional point, an optional exponent.
 */
export function normaliseBigDecimal(s: string): string {
	if (/^[+-]?(nan|inf|infinity)$/i.test(s))
		throw new ValueError("decimal values must be finite");
	const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
	if (!m || ((m[2] as string) === "" && (m[3] ?? "") === ""))
		throw new ValueError("text is not a decimal number");
	const frac = m[3] ?? "";
	const exp = BigInt(m[4] ?? "0");
	if (exp > BIGDECIMAL_MAX_EXPONENT || exp < -BIGDECIMAL_MAX_EXPONENT)
		throw new ValueError("decimal exponent is out of range");
	let coef = BigInt(`${m[2]}${frac}` || "0");
	let scale = BigInt(frac.length) - exp;
	if (scale < 0n) {
		coef *= 10n ** -scale;
		scale = 0n;
	}
	const digits = coef.toString();
	const n = Number(scale);
	const body =
		n === 0
			? digits
			: digits.length > n
				? `${digits.slice(0, digits.length - n)}.${digits.slice(digits.length - n)}`
				: `0.${"0".repeat(n - digits.length)}${digits}`;
	return m[1] === "-" && coef !== 0n ? `-${body}` : body;
}

/**
 * The decimal text of a bigdecimal that fits rust_decimal (at most 28
 * fractional digits and a 96-bit mantissa, once the trailing zeros are gone),
 * which the server sends as tag 10; `undefined` for one that does not.
 */
export function bigDecimalAsDecimal(v: string): string | undefined {
	const [whole, frac = ""] = v.replace(/^-/, "").split(".");
	let coef = BigInt(`${whole}${frac}`);
	let exp = -frac.length;
	while (coef !== 0n && coef % 10n === 0n) {
		coef /= 10n;
		exp++;
	}
	if (coef === 0n) return "0";
	if (exp < -28 || exp >= 29) return undefined;
	if (coef * 10n ** BigInt(Math.max(exp, 0)) > DECIMAL_MAX) return undefined;
	return normaliseDecimal(v);
}

// ---------------------------------------------------------------------------
// Equality
// ---------------------------------------------------------------------------

/**
 * Structural equality. Objects compare without regard to key order and sets
 * without regard to element order; floats compare with `Object.is`, so NaN
 * equals NaN and -0 does not equal 0.
 */
/**
 * A set's members without duplicates, as the server holds them. Order is kept:
 * it is not significant to `equal`, and the server sorts on decode.
 */
export function distinct(values: Value[]): Value[] {
	const out: Value[] = [];
	for (const x of values) if (!out.some((y) => equal(x, y))) out.push(x);
	return out;
}

export function equal(a: Value, b: Value): boolean {
	if (a.k !== b.k) return false;
	switch (a.k) {
		case "none":
		case "null":
			return true;
		case "bool":
		case "int":
		case "i8":
		case "u8":
		case "i16":
		case "u16":
		case "i32":
		case "u32":
		case "u64":
		case "decimal":
		case "string":
		case "uuid":
		case "table":
		case "regex":
			return a.v === (b as typeof a).v;
		case "float":
		case "f16":
		case "f32":
			return Object.is(a.v, (b as typeof a).v);
		case "bytes":
			return toHex(a.v) === toHex((b as typeof a).v);
		case "datetime":
		case "duration":
		case "timestamp":
			return (
				a.secs === (b as typeof a).secs && a.nanos === (b as typeof a).nanos
			);
		case "date":
			return a.days === (b as typeof a).days;
		case "time":
			return a.nanos === (b as typeof a).nanos;
		case "interval": {
			// The components as sent, not the server's normalised comparison.
			const y = b as typeof a;
			return (
				a.months === y.months && a.days === y.days && a.micros === y.micros
			);
		}
		case "bigdecimal":
			// The scale as written: 1.5 and 1.50 are different text on the wire.
			return a.v === (b as typeof a).v;
		case "array": {
			const y = (b as typeof a).v;
			return (
				a.v.length === y.length && a.v.every((x, i) => equal(x, y[i] as Value))
			);
		}
		case "set": {
			const y = [...(b as typeof a).v];
			if (a.v.length !== y.length) return false;
			for (const x of a.v) {
				const i = y.findIndex((z) => equal(x, z));
				if (i < 0) return false;
				y.splice(i, 1);
			}
			return true;
		}
		case "object": {
			const y = new Map((b as typeof a).v);
			return (
				a.v.length === y.size &&
				a.v.every(([k, x]) => y.has(k) && equal(x, y.get(k) as Value))
			);
		}
		case "record": {
			const y = b as typeof a;
			return a.table === y.table && equal(a.key, y.key);
		}
		case "range": {
			const y = b as typeof a;
			return boundEqual(a.start, y.start) && boundEqual(a.end, y.end);
		}
		case "file": {
			const y = b as typeof a;
			return a.bucket === y.bucket && a.key === y.key;
		}
		case "geometry":
			return sameShape(a.g, (b as typeof a).g);
	}
}

/** Deep equality that tells -0 from 0 and NaN from null, unlike JSON.stringify. */
function sameShape(a: unknown, b: unknown): boolean {
	if (typeof a === "number" || typeof b === "number") return Object.is(a, b);
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((x, i) => sameShape(x, b[i]))
		);
	}
	if (a && b && typeof a === "object" && typeof b === "object") {
		const ka = Object.keys(a);
		const kb = Object.keys(b);
		return (
			ka.length === kb.length &&
			ka.every(
				(k) =>
					k in b &&
					sameShape(
						(a as Record<string, unknown>)[k],
						(b as Record<string, unknown>)[k],
					),
			)
		);
	}
	return a === b;
}

/**
 * Orders strings by their UTF-8 bytes, as the server orders object keys.
 * JavaScript's `<` compares UTF-16 code units, which differs above U+FFFF.
 */
export function utf8Compare(a: string, b: string): number {
	const x = new TextEncoder().encode(a);
	const y = new TextEncoder().encode(b);
	for (let i = 0; i < Math.min(x.length, y.length); i++) {
		if (x[i] !== y[i]) return (x[i] as number) - (y[i] as number);
	}
	return x.length - y.length;
}

function boundEqual(a: Bound, b: Bound): boolean {
	if (a === null || b === null) return a === b;
	return a.kind === b.kind && equal(a.v, b.v);
}
