// directory changing must occur before importing esbuild. otherwise it will hang on to the previous directory location.
const current_test_dir = import.meta.dirname
if (current_test_dir) { Deno.chdir(current_test_dir) }
else { throw new Error("could not figure out the test directory's path") }

import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.10.3"
import { emptyDir } from "jsr:@std/fs"
import { cssPlugin } from "../../src/mod.ts"
// a dynamic import is necessary, otherwise deno will move the static import to top level during runtime, bypassing our directory change
const esbuild = await import("https://deno.land/x/esbuild@v0.24.0/mod.js")

await emptyDir("./output/")
const result = await esbuild.build({
	plugins: [cssPlugin({ mode: "inject" }) as any, ...denoPlugins() as any],
	entryPoints: ["./index.ts"],
	outdir: "./output/",
	format: "esm",
	bundle: true,
	splitting: true,
	outbase: "./",
	// write: false,
	// minify: true
})

esbuild.stop()
