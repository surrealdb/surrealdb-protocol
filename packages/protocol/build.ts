import * as esbuild from "esbuild";
import tscPlugin from "esbuild-plugin-tsc";

const ENTRY_POINT = "index.ts";

/**
 * Emits the three JavaScript entry points named in package.json.
 */
export async function compileDist(): Promise<void> {
	const shared = {
		entryPoints: [ENTRY_POINT],
		bundle: true,
		plugins: [tscPlugin({ force: true })],
		minifyWhitespace: true,
		minifySyntax: true,
		sourcemap: true,
	} satisfies Partial<esbuild.BuildOptions>;

	await Promise.all([
		esbuild.build({ ...shared, outfile: "build/ts/index.mjs", format: "esm" }),
		esbuild.build({ ...shared, outfile: "build/ts/index.cjs", format: "cjs" }),
		// The `browser` entry point. Resolves browser export conditions and
		// refuses node builtins rather than quietly shimming them, so a
		// bundler targeting the web gets a build that was checked against
		// that target rather than a relabelled node one.
		esbuild.build({
			...shared,
			outfile: "build/ts/index.bundled.mjs",
			format: "esm",
			platform: "browser",
		}),
	]);
}

/**
 * Emits the `types` entry point.
 *
 * Bundled into a single file rather than emitted per-module by tsc, because
 * this package re-exports gen/ts from outside its own directory: a plain
 * declaration build would either write declarations up into gen/ or need the
 * generated sources copied in first. cbor and sqon generate theirs the same
 * way.
 */
async function compileTypes(): Promise<void> {
	const task = Bun.spawn(
		[
			"bunx",
			"dts-bundle-generator",
			"-o",
			"./build/ts/index.d.ts",
			ENTRY_POINT,
			"--no-check",
			"--export-referenced-types",
			"false",
		],
		{
			stdout: "inherit",
			stderr: "inherit",
			async onExit(_, exitCode) {
				if (exitCode !== 0) process.exit(exitCode ?? 1);
			},
		},
	);

	await task.exited;
}

await compileDist();
await compileTypes();
