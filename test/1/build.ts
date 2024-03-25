// directory changing must occur before importing esbuild. otherwise it will hang on to the previous directory location.
const current_test_dir = import.meta.dirname
if (current_test_dir) { Deno.chdir(current_test_dir) }
else { throw new Error("could not figure out the test directory's path") }

import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { emptyDir } from "jsr:@std/fs"
import { cssPlugin } from "../../src/mod.ts"
// a dynamic import is necessary, otherwise deno will move the static import to top level during runtime, bypassing our directory change
const esbuild = await import("https://deno.land/x/esbuild@v0.20.1/mod.js")

await emptyDir("./output/")
const result = await esbuild.build({
	plugins: [cssPlugin({ mode: "inject" }), ...denoPlugins()],
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
