import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { emptyDir } from "jsr:@std/fs"
import { cssPlugin } from "./src/mod.ts"

const [deno_resolver, deno_loader] = denoPlugins()

await emptyDir("./dist/")

const result = await esbuild.build({
	plugins: [cssPlugin({ mode: "inject" }), deno_resolver, deno_loader],
	entryPoints: ["./test/1/index.ts", "./test/1/file1.ts"],
	outdir: "./dist/",
	format: "esm",
	bundle: true,
	splitting: true,
	outbase: "./test/1/",
	// write: false,
	// minify: true
})


esbuild.stop()
