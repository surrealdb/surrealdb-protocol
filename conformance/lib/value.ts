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
 *   {"$regex": "a.*"}                      regex (protobuf only; it has no CBOR encoding)
 *   {"$object": {..}} / {"$array": [..]} / {"$string": ".."}   explicit forms
 *
 * A JSON object is a typed value only when it has exactly one key and that key
 * is one of the names above; anything else is a plain object. An object that
 * would be mistaken for one is written with `$object`.
 *
 * In YAML, where the parser keeps integers and floats apart, a bare `1` is an
 * int and a bare `1.0` is a float. JSON parsers do not keep that distinction,
 * so drivers emit floats as `{"$float": ...}`.
 */

import {
	array,
	type CborItem,
	FALSE,
	fromHex,
	int,
	NULL,
	TRUE,
	tag,
	text,
	toHex,
} from "./cbor";

export const TAG = {
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
	POINT: 88n,
	LINE: 89n,
	POLYGON: 90n,
	MULTIPOINT: 91n,
	MULTILINE: 92n,
	MULTIPOLYGON: 93n,
	COLLECTION: 94n,
} as const;

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
	| { k: "decimal"; v: string }
	| { k: "string"; v: string }
	| { k: "bytes"; v: Uint8Array }
	| { k: "uuid"; v: string }
	| { k: "datetime"; secs: bigint; nanos: number }
	| { k: "duration"; secs: bigint; nanos: number }
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
const NS = 1_000_000_000;

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
	"$decimal",
	"$bytes",
	"$uuid",
	"$datetime",
	"$duration",
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
						secs: jsonInt(a[0] ?? 0, "duration seconds", 0n, 2n ** 64n - 1n),
						nanos: Number(
							jsonInt(a[1] ?? 0, "duration nanoseconds", 0n, 999_999_999n),
						),
					}
				: { k: "duration", ...parseDuration(a as string) };
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
			return { k: "set", v: (a as Json[]).map(fromJson) };
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
	return Number(a);
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
			return {
				$float: Number.isNaN(v.v)
					? "NaN"
					: v.v === Number.POSITIVE_INFINITY
						? "Infinity"
						: v.v === Number.NEGATIVE_INFINITY
							? "-Infinity"
							: Object.is(v.v, -0)
								? "-0"
								: v.v,
			};
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

/** Encodes `v` exactly as the server does. */
export function toCbor(v: Value): CborItem {
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
		case "decimal":
			return tag(TAG.DECIMAL, text(v.v));
		case "string":
			return text(v.v);
		case "bytes":
			return { t: "bytes", v: v.v };
		case "uuid":
			return tag(TAG.UUID, { t: "bytes", v: uuidBytes(v.v) });
		case "datetime":
			return tag(TAG.DATETIME, array([int(v.secs), int(v.nanos)]));
		case "duration":
			return tag(
				TAG.DURATION,
				array(
					v.secs === 0n && v.nanos === 0
						? []
						: v.nanos === 0
							? [int(v.secs)]
							: [int(v.secs), int(v.nanos)],
				),
			);
		case "array":
			return array(v.v.map(toCbor));
		case "object":
			return {
				t: "map",
				v: [...v.v]
					.sort(([a], [b]) => utf8Compare(a, b))
					.map(([k, x]) => [text(k), toCbor(x)]),
			};
		case "set":
			return tag(TAG.SET, array(v.v.map(toCbor)));
		case "table":
			return tag(TAG.TABLE, text(v.v));
		case "record":
			return tag(TAG.RECORD_ID, array([text(v.table), toCbor(v.key)]));
		case "range":
			return tag(TAG.RANGE, array([boundToCbor(v.start), boundToCbor(v.end)]));
		case "file":
			return tag(TAG.FILE, array([text(v.bucket), text(v.key)]));
		case "geometry":
			return geometryToCbor(v.g);
		case "regex":
			throw new ValueError("regex has no CBOR encoding");
	}
}

function boundToCbor(b: Bound): CborItem {
	if (b === null) return NULL;
	return tag(
		b.kind === "included" ? TAG.BOUND_INCLUDED : TAG.BOUND_EXCLUDED,
		toCbor(b.v),
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
 * Decodes `item` with the server's rules, including the decode-only forms
 * (tags 0, 9, 13 and the string form of tag 8). Throws `ValueError` for input
 * the server rejects.
 */
export function fromCbor(item: CborItem): Value {
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
			return { k: "array", v: item.v.map(fromCbor) };
		case "map":
			return {
				k: "object",
				v: item.v.map(([key, x]) => {
					if (key.t !== "text")
						throw new ValueError("object keys must be text");
					return [key.v, fromCbor(x)] as [string, Value];
				}),
			};
		case "simple":
			if (item.v === 20) return { k: "bool", v: false };
			if (item.v === 21) return { k: "bool", v: true };
			if (item.v === 22) return { k: "null" };
			throw new ValueError(`unsupported simple value ${item.v}`);
		case "raw":
			throw new ValueError("raw items cannot be decoded");
		case "tag":
			return fromTag(item.tag, item.v);
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

function fromTag(t: bigint, c: CborItem): Value {
	switch (t) {
		case TAG.NONE:
			return { k: "none" };
		case TAG.TABLE:
			return { k: "table", v: asText(c, "table") };
		case TAG.DECIMAL:
			return { k: "decimal", v: normaliseDecimal(asText(c, "decimal"), true) };
		case TAG.DATETIME_STRING:
			return { k: "datetime", ...parseDatetime(asText(c, "datetime")) };
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
		case TAG.DURATION_STRING:
			return { k: "duration", ...parseDuration(asText(c, "duration")) };
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
		case TAG.UUID_STRING:
			return { k: "uuid", v: normaliseUuid(asText(c, "uuid")) };
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
			return { k: "record", table, key: recordKeyFromCbor(a[1] as CborItem) };
		}
		case TAG.RANGE: {
			const a = asArray(c, "range");
			if (a.length !== 2) throw new ValueError("range: expected [start, end]");
			return {
				k: "range",
				start: boundFromCbor(a[0] as CborItem),
				end: boundFromCbor(a[1] as CborItem),
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
		case TAG.SET: {
			// Sets are deduplicated on decode. Order is not significant.
			const out: Value[] = [];
			for (const x of asArray(c, "set").map(fromCbor))
				if (!out.some((y) => equal(x, y))) out.push(x);
			return { k: "set", v: out };
		}
		case TAG.POINT:
		case TAG.LINE:
		case TAG.POLYGON:
		case TAG.MULTIPOINT:
		case TAG.MULTILINE:
		case TAG.MULTIPOLYGON:
		case TAG.COLLECTION:
			return { k: "geometry", g: geometryFromCbor({ t: "tag", tag: t, v: c }) };
	}
	throw new ValueError(`unknown tag ${t}`);
}

function boundFromCbor(i: CborItem): Bound {
	if (i.t === "simple" && i.v === 22) return null;
	if (i.t === "tag" && i.tag === TAG.BOUND_INCLUDED)
		return { kind: "included", v: fromCbor(i.v) };
	if (i.t === "tag" && i.tag === TAG.BOUND_EXCLUDED)
		return { kind: "excluded", v: fromCbor(i.v) };
	throw new ValueError("range: expected a bound tag or null");
}

function recordKeyFromCbor(i: CborItem): Value {
	return checkRecordKey(fromCbor(i));
}

/** A record id key, or a bound of a record id range, which must be one too. */
function checkRecordKey(v: Value): Value {
	if (!["int", "string", "array", "object", "uuid", "range"].includes(v.k)) {
		throw new ValueError(`record id key cannot be ${v.k}`);
	}
	if (v.k === "range") {
		if (v.start) checkRecordKey(v.start.v);
		if (v.end) checkRecordKey(v.end.v);
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

// ---------------------------------------------------------------------------
// Equality
// ---------------------------------------------------------------------------

/**
 * Structural equality. Objects compare without regard to key order and sets
 * without regard to element order; floats compare with `Object.is`, so NaN
 * equals NaN and -0 does not equal 0.
 */
export function equal(a: Value, b: Value): boolean {
	if (a.k !== b.k) return false;
	switch (a.k) {
		case "none":
		case "null":
			return true;
		case "bool":
		case "int":
		case "decimal":
		case "string":
		case "uuid":
		case "table":
		case "regex":
			return a.v === (b as typeof a).v;
		case "float":
			return Object.is(a.v, (b as typeof a).v);
		case "bytes":
			return toHex(a.v) === toHex((b as typeof a).v);
		case "datetime":
		case "duration":
			return (
				a.secs === (b as typeof a).secs && a.nanos === (b as typeof a).nanos
			);
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
