/**
 * Expectation matching for scenarios.
 *
 * A pattern is typed JSON in which some single-key objects are matchers:
 *
 *   {$any: null}            anything, including NONE
 *   {$type: "uuid"}         a value of that kind: none, null, bool, int, float,
 *                           number (int, float or decimal), decimal, string,
 *                           bytes, uuid, datetime, duration, array, object,
 *                           set, table, record, range, file, geometry
 *   {$match: "^surrealdb-"} a string matching the regular expression
 *   {$partial: {...}}       an object with at least these keys, and likewise
 *                           for the objects nested inside it
 *   {$unordered: [...]}     an array with these elements in any order
 *   {$contains: [...]}      an array or set containing at least these elements
 *   {$length: 3}            an array, set or string of this length
 *   {$oneOf: [...]}         any one of these patterns
 *   {$not: pattern}         anything that does not match
 *   {$capture: "name"}      anything; remembers it as `name`
 *   {$ref: "name"}          the value remembered as `name`
 *
 * Everything else is compared as a value: objects key for key (no extra keys),
 * arrays element by element. The one exception is an object under a key named
 * `error`, which matches partially all the way down, because adapters may add
 * fields such as `code` or `message`, and the server leaf payloads under
 * `details`, that a scenario does not care about.
 */

import {
	equal,
	fromJson,
	type Json,
	toJson,
	typedKey,
	type Value,
} from "../lib/value";

export type Captures = Map<string, Json>;

const MATCHERS = new Set([
	"$any",
	"$type",
	"$match",
	"$partial",
	"$unordered",
	"$contains",
	"$length",
	"$oneOf",
	"$not",
	"$capture",
	"$ref",
]);

function matcherKey(p: Json): string | undefined {
	if (p === null || typeof p !== "object" || Array.isArray(p)) return undefined;
	const keys = Object.keys(p);
	return keys.length === 1 && MATCHERS.has(keys[0] as string)
		? keys[0]
		: undefined;
}

/** Replaces every {$ref: name} in `j` with the captured value. */
export function resolve(j: Json, captures: Captures): Json {
	if (Array.isArray(j)) return j.map((x) => resolve(x, captures));
	if (j === null || typeof j !== "object") return j;
	if (matcherKey(j) === "$ref") {
		const name = (j as { $ref: string }).$ref;
		if (!captures.has(name)) throw new Error(`nothing captured as "${name}"`);
		return captures.get(name) as Json;
	}
	return Object.fromEntries(
		Object.entries(j).map(([k, v]) => [k, resolve(v, captures)]),
	);
}

const show = (v: Value) =>
	JSON.stringify(toJson(v), (_, x) =>
		typeof x === "bigint" ? x.toString() : x,
	);

function kindMatches(v: Value, want: string): boolean {
	if (want === "number")
		return v.k === "int" || v.k === "float" || v.k === "decimal";
	return v.k === want;
}

/**
 * Matches `actual` against `pattern`. Returns null on success, or a message
 * naming the path of the first mismatch.
 */
const pat = (j: Json) =>
	JSON.stringify(j, (_, x) => (typeof x === "bigint" ? x.toString() : x));

export function match(
	pattern: Json,
	actual: Value,
	captures: Captures,
	path = "$",
	partial = false,
): string | null {
	const m = matcherKey(pattern);
	if (m) {
		const arg = (pattern as Record<string, Json>)[m] as Json;
		switch (m) {
			case "$any":
				return null;
			case "$type":
				return kindMatches(actual, arg as string)
					? null
					: `${path}: expected a ${arg}, got ${show(actual)}`;
			case "$match":
				return actual.k === "string" && new RegExp(arg as string).test(actual.v)
					? null
					: `${path}: expected a string matching /${arg}/, got ${show(actual)}`;
			case "$partial":
				return match(arg, actual, captures, path, true);
			case "$length": {
				const n =
					actual.k === "array" || actual.k === "set"
						? actual.v.length
						: actual.k === "string"
							? actual.v.length
							: -1;
				return n === Number(arg)
					? null
					: `${path}: expected length ${arg}, got ${show(actual)}`;
			}
			case "$unordered":
			case "$contains": {
				if (actual.k !== "array" && actual.k !== "set")
					return `${path}: expected an array, got ${show(actual)}`;
				const want = arg as Json[];
				if (m === "$unordered" && want.length !== actual.v.length) {
					return `${path}: expected ${want.length} elements in any order, got ${show(actual)}`;
				}
				const left = [...actual.v];
				for (const w of want) {
					const i = left.findIndex(
						(x) => match(w, x, new Map(captures)) === null,
					);
					if (i < 0)
						return `${path}: no element matches ${pat(w)} in ${show(actual)}`;
					match(w, left[i] as Value, captures);
					left.splice(i, 1);
				}
				return null;
			}
			case "$oneOf": {
				for (const alt of arg as Json[])
					if (match(alt, actual, new Map(captures)) === null)
						return match(alt, actual, captures);
				return `${path}: ${show(actual)} matches none of ${pat(arg)}`;
			}
			case "$not":
				return match(arg, actual, new Map(captures)) === null
					? `${path}: expected not ${pat(arg)}, got ${show(actual)}`
					: null;
			case "$capture":
				captures.set(arg as string, toJson(actual));
				return null;
			case "$ref": {
				if (!captures.has(arg as string))
					return `${path}: nothing captured as "${arg}"`;
				const want = fromJson(captures.get(arg as string) as Json);
				return equal(want, actual)
					? null
					: `${path}: expected ${show(want)} (captured as ${arg}), got ${show(actual)}`;
			}
		}
	}

	if (Array.isArray(pattern)) {
		if (actual.k !== "array")
			return `${path}: expected an array, got ${show(actual)}`;
		if (actual.v.length !== pattern.length)
			return `${path}: expected ${pattern.length} elements, got ${actual.v.length}: ${show(actual)}`;
		for (let i = 0; i < pattern.length; i++) {
			const r = match(
				pattern[i] as Json,
				actual.v[i] as Value,
				captures,
				`${path}[${i}]`,
				partial,
			);
			if (r) return r;
		}
		return null;
	}

	if (pattern !== null && typeof pattern === "object" && !typedKey(pattern)) {
		if (actual.k !== "object")
			return `${path}: expected an object, got ${show(actual)}`;
		const fields = new Map(actual.v);
		for (const [k, p] of Object.entries(pattern)) {
			if (!fields.has(k))
				return `${path}: missing field "${k}" in ${show(actual)}`;
			const r = match(
				p,
				fields.get(k) as Value,
				captures,
				`${path}.${k}`,
				partial || k === "error",
			);
			if (r) return r;
		}
		if (!partial) {
			const extra = [...fields.keys()].filter((k) => !(k in pattern));
			if (extra.length)
				return `${path}: unexpected fields ${extra.join(", ")} in ${show(actual)}`;
		}
		return null;
	}

	const want = fromJson(resolve(pattern, captures));
	return equal(want, actual)
		? null
		: `${path}: expected ${show(want)}, got ${show(actual)}`;
}
