import { Application as typedocApp } from "npm:typedoc@0.25.9"
import {
	TemporaryFiles, copyDir, createNPMFiles, doubleCompileFiles,
	ensureFile, getDenoJson, pathDirname, pathJoin, walkDir,
} from "./build_tools.ts"


/** use:
 * - `"/"` for localhost (default if unspecified in `Deno.args`)
 * - `"/esbuild-plugin-css/"` for github pages
*/
const site_root = Deno.args[0] ?? "/"
const docs_output_dir = "./docs/"
const docs_src_output_dir = "./docs/src/"
const docs_dist_output_dir = "./docs/dist/"
const example_files_dir = "./examples/"
const extra_directories_to_copy: string[] = [
	// "./examples/assets/",
]


interface CustomCSS_Artifacts extends TemporaryFiles {
	files: ["custom.css"]
}

const createCustomCssFiles = async (base_dir: string = "./", content: string): Promise<CustomCSS_Artifacts> => {
	const file_path = pathJoin(base_dir, "custom.css")
	await ensureFile(file_path)
	await Deno.writeTextFileSync(file_path, content)
	return {
		dir: base_dir,
		files: ["custom.css"],
		cleanup: async () => {
			await Deno.remove(file_path, { recursive: true })
		}
	}
}

const npm_file_artifacts = await createNPMFiles("./")
const { repository, exports } = await getDenoJson()
const { ".": mainEntrypoint, ...subEntrypoints } = exports
const custom_css_artifacts = await createCustomCssFiles("./temp/", `
table { border-collapse: collapse; }
th { background-color: rgba(128, 128, 128, 0.50); }
th, td { border: 0.1em solid rgba(0, 0, 0, 0.75); padding: 0.1em; }
`)
const custom_css_file_path = pathJoin(custom_css_artifacts.dir, custom_css_artifacts.files[0])
const typedoc_app = await typedocApp.bootstrapWithPlugins({
	// even though the intermediate `package.json` created by `createNPMFiles` contains the `exports` field, `typedoc` can't figure out the entrypoints on its own.
	entryPoints: [mainEntrypoint, ...Object.values(subEntrypoints) as never[]],
	out: docs_output_dir,
	readme: "./readme.md",
	navigationLinks: {
		"github": repository.url.replace("git+", "").replace(".git", ""),
		"readme": site_root,
		"source": site_root + "src/mod.ts",
		"examples": site_root + "examples/index.html",
		"distribution": site_root + "dist/esm.js",
	},
	skipErrorChecking: true,
	githubPages: true,
	includeVersion: true,
	sort: ["source-order", "required-first", "kind"],
	visibilityFilters: {
		"protected": true,
		"private": true,
		"inherited": true,
		"external": true,
	},
	customCss: custom_css_file_path
})

const typedoc_project = await typedoc_app.convert()
if (typedoc_project) {
	await typedoc_app.generateDocs(typedoc_project, docs_output_dir)
}

// copy the source code to the docs' "src" subdirectory, so that it can be hosted on github pages similar to a cdn
// assuming `site_root` is the root url of the hosted site, `${site_root}/src/*.ts` will contain all of the source typescript files
await copyDir("./src/", docs_src_output_dir, { overwrite: true })

// copy the compiled distribution files in the docs' "dist" sub directory, so that it can be hosted on github pages similar to a cdn
// assuming `site_root` is the root url of the hosted site, `${site_root}/dist/*.js` will contain various bundled javascript distributions
const
	js_dist = (await doubleCompileFiles("./src/mod.ts", docs_dist_output_dir, {}, { minify: false }, false))[0],
	js_dist_minified = (await doubleCompileFiles("./src/mod.ts", docs_dist_output_dir, {}, { minify: true }))[0]
js_dist.path = pathJoin(pathDirname(js_dist.path), "./esm.js")
js_dist_minified.path = pathJoin(pathDirname(js_dist_minified.path), "./esm.min.js")
const output_dist_files = [js_dist, js_dist_minified]
await Promise.all(output_dist_files.map(
	async ({ text, path }, file_number) => {
		await ensureFile(path)
		await Deno.writeTextFile(path, text)
	}
))

// compile example files, and copy them over
const example_ts_files = []
const example_html_files = []
const example_misc_files = []
for await (const { path } of walkDir(example_files_dir, { exts: ["index.ts", "index.tsx", ".html", ".css"], includeDirs: false })) {
	if (path.endsWith(".ts") || path.endsWith(".tsx")) { example_ts_files.push(path) }
	else if (path.endsWith(".html")) { example_html_files.push(path) }
	else { example_misc_files.push(path) }
}
const example_ts_files_compiled = await doubleCompileFiles("", pathJoin(docs_output_dir, example_files_dir),
	{
		entryPoints: example_ts_files,
		outbase: example_files_dir,
		bundle: true,
		splitting: true,
		platform: "browser",
	},
	{ minify: true },
)
console.log("writing the following transpiled files:", example_ts_files_compiled.map((out_file) => out_file.path))
await Promise.all(example_ts_files_compiled.map(
	async ({ text, path }, file_number) => {
		await ensureFile(path)
		await Deno.writeTextFile(path, text)
	}
))
await Promise.all(example_html_files.map(
	async (path) => {
		const text = await Deno.readTextFile(path)
		const output_path = pathJoin(docs_output_dir, path)
		await ensureFile(output_path)
		await Deno.writeTextFile(output_path, text.replaceAll(/\.tsx?\"/gm, ".js\""))
	}
))
await Promise.all(extra_directories_to_copy.map(
	async (path) => {
		await copyDir(path, pathJoin(docs_output_dir, path), { overwrite: true })
	}
))
await Promise.all(example_misc_files.map(
	async (path) => {
		await copyDir(path, pathJoin(docs_output_dir, path), { overwrite: true })
	}
))

await npm_file_artifacts.cleanup()
await custom_css_artifacts.cleanup()
