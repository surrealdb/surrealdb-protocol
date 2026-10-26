

import { copyFileSync, rmSync } from "node:fs";
import * as esbuild from "esbuild";
import tscPlugin from "esbuild-plugin-tsc";

export async function compileDist(): Promise<void> {
	const entryPoint = "typescript/index.ts";
	const mjsOutput = "build/ts/index.mjs";
	const cjsOutput = "build/ts/index.cjs";

	rmSync("build/ts", { recursive: true, force: true });

	await Promise.all([
		esbuild.build({
			entryPoints: [entryPoint],
			bundle: true,
			outfile: mjsOutput,
			plugins: [tscPlugin({ force: true })],
			format: "esm",
			minifyWhitespace: true,
			minifySyntax: true,
			sourcemap: true,
		}),
		esbuild.build({
			entryPoints: [entryPoint],
			bundle: true,
			outfile: cjsOutput,
			plugins: [tscPlugin({ force: true })],
			format: "cjs",
			minifyWhitespace: true,
			minifySyntax: true,
			sourcemap: true,
		}),
	]);

	// esbuild writes no declarations. Bundle them into one file, which needs no
	// relative imports, so both the import and require conditions can use it.
	const dts = Bun.spawnSync(
		[
			"bun",
			"x",
			"dts-bundle-generator",
			"--project",
			"tsconfig.json",
			"--no-check",
			"-o",
			"build/ts/index.d.ts",
			entryPoint,
		],
		{ stdout: "inherit", stderr: "inherit" },
	);
	if (dts.exitCode !== 0) throw new Error("dts-bundle-generator failed");
	copyFileSync("build/ts/index.d.ts", "build/ts/index.d.cts");
}

compileDist()
