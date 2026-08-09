/**
 * Asserts that every entry point a package's manifest promises actually
 * exists after a build.
 *
 * `bun publish --dry-run` proves a package can be packed. It does not prove
 * the packed files are the ones the manifest points at: `main`, `types`,
 * `browser` and `exports` are plain strings, and a package naming a
 * declaration file it never emits publishes perfectly happily. Consumers then
 * install it and silently resolve `any`.
 *
 * That is not hypothetical. @surrealdb/protocol named build/ts/index.d.ts and
 * build/ts/index.bundled.mjs while its build emitted neither, and packing
 * succeeded every time.
 *
 * Run after `bun run build`. Paths resolve relative to each package.
 *
 * Run: bun run scripts/check-entry-points.ts
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/** Published packages, in the order the release publishes them. */
const PACKAGES = ["packages/cbor", "packages/sqon", "packages/protocol"];

/** Manifest fields naming a file a consumer resolves. */
const TOP_LEVEL_FIELDS = ["main", "module", "types", "browser"] as const;

interface Problem {
	pkg: string;
	field: string;
	path: string;
}

/**
 * Collects every string leaf under `exports`, which is nested arbitrarily by
 * condition ("import", "require", "types", ...). Each leaf is somewhere a
 * resolver can land, so each one has to exist.
 */
function exportPaths(node: unknown, trail: string): Array<[string, string]> {
	if (typeof node === "string") return [[trail, node]];
	if (node === null || typeof node !== "object") return [];
	return Object.entries(node).flatMap(([key, value]) =>
		exportPaths(value, `${trail}.${key}`),
	);
}

async function main(): Promise<void> {
	const problems: Problem[] = [];
	let checked = 0;

	for (const dir of PACKAGES) {
		const manifest = await Bun.file(join(dir, "package.json")).json();

		const named: Array<[string, string]> = [];
		for (const field of TOP_LEVEL_FIELDS) {
			const value = manifest[field];
			if (typeof value === "string") named.push([field, value]);
		}
		named.push(...exportPaths(manifest.exports, "exports"));

		for (const [field, relative] of named) {
			checked++;
			const path = join(dir, relative);
			if (!existsSync(path)) {
				problems.push({ pkg: manifest.name, field, path });
			}
		}
	}

	if (problems.length > 0) {
		console.error(
			"Entry points named by a manifest but missing after build:\n",
		);
		for (const { pkg, field, path } of problems) {
			console.error(`  ${pkg}  ${field}  ->  ${path}`);
		}
		console.error("\nEither build the file or stop naming it.");
		process.exit(1);
	}

	console.log(
		`${checked} entry points across ${PACKAGES.length} packages all exist`,
	);
}

await main();
