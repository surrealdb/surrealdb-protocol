/**
 * Maps conformance values to and from the generated protobuf `Value`
 * (surrealdb/protocol/v1/value.proto), for the protobuf vectors.
 */

import * as pb from "../../gen/ts/surrealdb/protocol/v1/value";
import { fromHex, toHex } from "./cbor";
import {
	type Bound,
	checkDatetimeSecs,
	closeRing,
	distinct,
	type Geometry,
	normaliseDecimal,
	normaliseUuid,
	type Position,
	utf8Compare,
	type Value,
	ValueError,
} from "./value";

const uuid = (s: string): pb.Uuid => ({
	bytes: fromHex(normaliseUuid(s).replace(/-/g, "")),
});
const unuuid = (u: pb.Uuid | undefined): string => {
	if (!u || u.bytes.length !== 16)
		throw new ValueError("uuid: expected 16 bytes");
	return normaliseUuid(toHex(u.bytes));
};

export function toProto(v: Value): pb.Value {
	return { value: arm(v) };
}

function arm(v: Value): pb.Value["value"] {
	switch (v.k) {
		case "none":
			return { $case: "none", none: {} };
		case "null":
			return { $case: "null", null: {} };
		case "bool":
			return { $case: "bool", bool: v.v };
		case "int":
			return { $case: "int64", int64: v.v };
		case "float":
			return { $case: "float64", float64: v.v };
		case "decimal":
			return { $case: "decimal", decimal: { value: v.v } };
		case "string":
			return { $case: "string", string: v.v };
		case "bytes":
			return { $case: "bytes", bytes: v.v };
		case "uuid":
			return { $case: "uuid", uuid: uuid(v.v) };
		case "datetime":
			return {
				$case: "datetime",
				datetime: { seconds: v.secs, nanos: v.nanos },
			};
		case "duration":
			if (v.secs > 2n ** 63n - 1n)
				throw new ValueError(
					`duration: ${v.secs} seconds is past value.proto's int64`,
				);
			return {
				$case: "duration",
				duration: { seconds: v.secs, nanos: v.nanos },
			};
		case "array":
			return { $case: "array", array: { values: v.v.map(toProto) } };
		case "object":
			return { $case: "object", object: object(v.v) };
		case "set":
			return { $case: "set", set: { values: distinct(v.v).map(toProto) } };
		case "table":
			return { $case: "table", table: v.v };
		case "record":
			return {
				$case: "recordId",
				recordId: { table: v.table, id: recordKey(v.key) },
			};
		case "range":
			return {
				$case: "range",
				range: { start: bound(v.start), end: bound(v.end) },
			};
		case "file":
			return { $case: "file", file: { bucket: v.bucket, key: v.key } };
		case "geometry":
			return { $case: "geometry", geometry: geometry(v.g) };
		case "regex":
			return { $case: "regex", regex: v.v };
	}
}

/** Objects are sent with their keys in ascending order, as the server does. */
function object(entries: [string, Value][]): pb.Object {
	return {
		items: [...entries]
			.sort(([a], [b]) => utf8Compare(a, b))
			.map(([key, x]) => ({ key, value: toProto(x) })),
	};
}

function bound(b: Bound): pb.ValueBound {
	if (b === null) return { bound: { $case: "unbounded", unbounded: {} } };
	return b.kind === "included"
		? { bound: { $case: "inclusive", inclusive: toProto(b.v) } }
		: { bound: { $case: "exclusive", exclusive: toProto(b.v) } };
}

function recordKey(k: Value): pb.RecordIdKey {
	switch (k.k) {
		case "int":
			return { id: { $case: "int64", int64: k.v } };
		case "string":
			return { id: { $case: "string", string: k.v } };
		case "uuid":
			return { id: { $case: "uuid", uuid: uuid(k.v) } };
		case "array":
			return { id: { $case: "array", array: { values: k.v.map(toProto) } } };
		case "object":
			return { id: { $case: "object", object: object(k.v) } };
		// value.proto has these two (from value.fbs); the server's own record
		// ids do not, and it rejects them over CBOR (see the reject vectors).
		case "float":
			return { id: { $case: "float64", float64: k.v } };
		case "decimal":
			return { id: { $case: "decimal", decimal: { value: k.v } } };
		case "range": {
			const b = (x: Bound): pb.RecordIdKeyBound =>
				x === null
					? { bound: { $case: "unbounded", unbounded: {} } }
					: x.kind === "included"
						? { bound: { $case: "inclusive", inclusive: recordKey(x.v) } }
						: { bound: { $case: "exclusive", exclusive: recordKey(x.v) } };
			return {
				id: { $case: "range", range: { start: b(k.start), end: b(k.end) } },
			};
		}
	}
	throw new ValueError(`record id key cannot be ${k.k}`);
}

const point = (p: Position): pb.Point => ({ x: p[0], y: p[1] });
const line = (l: Position[]): pb.Line => ({ points: l.map(point) });
const polygon = (rings: Position[][]): pb.Polygon => ({
	exterior: line(rings[0] ?? []),
	interiors: rings.slice(1).map(line),
});

function geometry(g: Geometry): pb.Geometry {
	switch (g.type) {
		case "Point":
			return { geometry: { $case: "point", point: point(g.coordinates) } };
		case "LineString":
			return { geometry: { $case: "line", line: line(g.coordinates) } };
		case "Polygon":
			return {
				geometry: { $case: "polygon", polygon: polygon(g.coordinates) },
			};
		case "MultiPoint":
			return {
				geometry: {
					$case: "multiPoint",
					multiPoint: { points: g.coordinates.map(point) },
				},
			};
		case "MultiLineString":
			return {
				geometry: {
					$case: "multiLine",
					multiLine: { lines: g.coordinates.map(line) },
				},
			};
		case "MultiPolygon":
			return {
				geometry: {
					$case: "multiPolygon",
					multiPolygon: { polygons: g.coordinates.map(polygon) },
				},
			};
		case "GeometryCollection":
			return {
				geometry: {
					$case: "collection",
					collection: { geometries: g.geometries.map(geometry) },
				},
			};
	}
}

export function fromProto(p: pb.Value): Value {
	const a = p.value;
	if (!a)
		throw new ValueError("unset Value oneof (an unknown variant, never NONE)");
	switch (a.$case) {
		case "none":
			return { k: "none" };
		case "null":
			return { k: "null" };
		case "bool":
			return { k: "bool", v: a.bool };
		case "int64":
			return { k: "int", v: BigInt(a.int64) };
		case "float64":
			return { k: "float", v: a.float64 };
		case "decimal":
			return { k: "decimal", v: normaliseDecimal(a.decimal.value, true) };
		case "string":
			return { k: "string", v: a.string };
		case "bytes":
			return { k: "bytes", v: a.bytes };
		case "duration":
			return {
				k: "duration",
				secs: BigInt(a.duration.seconds),
				nanos: unnanos(a.duration.nanos, "duration"),
			};
		case "datetime":
			return {
				k: "datetime",
				secs: checkDatetimeSecs(BigInt(a.datetime.seconds)),
				nanos: unnanos(a.datetime.nanos, "datetime"),
			};
		case "uuid":
			return { k: "uuid", v: unuuid(a.uuid) };
		case "geometry":
			return { k: "geometry", g: ungeometry(a.geometry) };
		case "table":
			return { k: "table", v: a.table };
		case "recordId":
			return {
				k: "record",
				table: a.recordId.table,
				key: unrecordKey(a.recordId.id),
			};
		case "stringRecordId":
			throw new ValueError(
				"string_record_id is a request-side convenience; the vectors never decode it",
			);
		case "file":
			return { k: "file", bucket: a.file.bucket, key: a.file.key };
		case "range":
			return {
				k: "range",
				start: unbound(a.range.start),
				end: unbound(a.range.end),
			};
		case "regex":
			return { k: "regex", v: a.regex };
		case "object":
			return unobject(a.object);
		case "array":
			return { k: "array", v: a.array.values.map(fromProto) };
		case "set":
			return { k: "set", v: distinct(a.set.values.map(fromProto)) };
	}
}

// value.proto: nanoseconds are in [0, 999999999].
function unnanos(n: number, what: string): number {
	if (!Number.isInteger(n) || n < 0 || n > 999_999_999)
		throw new ValueError(`${what}: nanoseconds ${n} out of range`);
	return n;
}

// value.proto: keys are unique and in ascending UTF-8 byte order.
function unobject(o: pb.Object): Value {
	const v: [string, Value][] = [];
	for (const kv of o.items) {
		const prev = v[v.length - 1];
		if (prev && utf8Compare(prev[0], kv.key) >= 0)
			throw new ValueError(
				utf8Compare(prev[0], kv.key) === 0
					? `object: duplicate key ${JSON.stringify(kv.key)}`
					: `object: key ${JSON.stringify(kv.key)} is out of order`,
			);
		v.push([kv.key, fromProto(kv.value ?? { value: undefined })]);
	}
	return { k: "object", v };
}

function unbound(b: pb.ValueBound | undefined): Bound {
	const x = b?.bound;
	if (!x) throw new ValueError("range bound is unset");
	if (x.$case === "unbounded") return null;
	return x.$case === "inclusive"
		? { kind: "included", v: fromProto(x.inclusive) }
		: { kind: "excluded", v: fromProto(x.exclusive) };
}

function unrecordKey(k: pb.RecordIdKey | undefined): Value {
	const x = k?.id;
	if (!x) throw new ValueError("record id key is unset");
	switch (x.$case) {
		case "int64":
			return { k: "int", v: BigInt(x.int64) };
		case "string":
			return { k: "string", v: x.string };
		case "uuid":
			return { k: "uuid", v: unuuid(x.uuid) };
		case "array":
			return { k: "array", v: x.array.values.map(fromProto) };
		case "object":
			return unobject(x.object);
		case "range": {
			const b = (y: pb.RecordIdKeyBound | undefined): Bound => {
				const z = y?.bound;
				if (!z) throw new ValueError("record id range bound is unset");
				if (z.$case === "unbounded") return null;
				return z.$case === "inclusive"
					? { kind: "included", v: unrecordKey(z.inclusive) }
					: { kind: "excluded", v: unrecordKey(z.exclusive) };
			};
			return { k: "range", start: b(x.range.start), end: b(x.range.end) };
		}
		case "float64":
			return { k: "float", v: x.float64 };
		case "decimal":
			return { k: "decimal", v: normaliseDecimal(x.decimal.value, true) };
	}
}

function ungeometry(g: pb.Geometry): Geometry {
	const x = g.geometry;
	if (!x) throw new ValueError("geometry is unset");
	const pt = (p: pb.Point): Position => [p.x, p.y];
	const ln = (l: pb.Line | undefined): Position[] => (l?.points ?? []).map(pt);
	// As rust/convert.rs: a polygon needs its exterior, and geo closes rings.
	const pg = (p: pb.Polygon): Position[][] => {
		if (!p.exterior) throw new ValueError("polygon: missing exterior");
		return [ln(p.exterior), ...p.interiors.map(ln)].map(closeRing);
	};
	switch (x.$case) {
		case "point":
			return { type: "Point", coordinates: pt(x.point) };
		case "line":
			return { type: "LineString", coordinates: ln(x.line) };
		case "polygon":
			return { type: "Polygon", coordinates: pg(x.polygon) };
		case "multiPoint":
			return { type: "MultiPoint", coordinates: x.multiPoint.points.map(pt) };
		case "multiLine":
			return {
				type: "MultiLineString",
				coordinates: x.multiLine.lines.map(ln),
			};
		case "multiPolygon":
			return {
				type: "MultiPolygon",
				coordinates: x.multiPolygon.polygons.map(pg),
			};
		case "collection":
			return {
				type: "GeometryCollection",
				geometries: x.collection.geometries.map(ungeometry),
			};
	}
}

export const encodeProto = (v: Value): Uint8Array =>
	pb.Value.encode(toProto(v)).finish();
export const decodeProto = (b: Uint8Array): Value =>
	fromProto(pb.Value.decode(b));
