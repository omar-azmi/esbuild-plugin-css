import { DEBUG, esbuild } from "./deps.js"
import { resolveAsUrl } from "./funcdefs.js"
import { PluginData, PluginOptions, copyUrlFileFilter, copyUrlNamespace, pluginFilter, pluginName, pluginNamespace, preserveUrlFilters, preserveUrlNamespace } from "./typedefs.js"

/** TODO: I think this info will be needed for being able to change the name of the output css file.
 * (i.e. needed for a custom `PluginOptions_Bundleable.name` function)
*/
const css_importer_map = new Map<string, string>()

/** esbuild plugin that bundles css files. compatible with deno and browsers. */
export const cssPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
	const {
		cache = new Map() as NonNullable<PluginOptions["cache"]>,
		filter = pluginFilter,
		preserveUrl = preserveUrlFilters,
		copyUrl = copyUrlFileFilter,
	} = options
	const additional_files_to_copy: esbuild.OutputFile[] = []

	return {
		name: pluginName,
		setup: (build: esbuild.PluginBuild) => {
			const pathResolver = (args: esbuild.OnResolveArgs): esbuild.OnResolveResult => {
				if (DEBUG.LOG) { console.log("[css-plugin] resolve args:", args) }
				const
					{ path, importer, kind } = args,
					path_url_str = resolveAsUrl(
						path,
						kind === "entry-point" ? undefined : importer
					).toString()
				if (DEBUG.LOG) { console.log("[css-plugin] css path resolved to:", path_url_str) }
				return {
					path: path_url_str,
					namespace: pluginNamespace,
					pluginData: { kind, importer, originalPath: path }
				}
			}

			preserveUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
				const { path, importer, kind } = args
				if (DEBUG.ASSERT) {
					// we can be here in this namespace only if a css url import was done. if not, then there's something wrong going on.
					console.assert(kind === "import-rule" || kind === "url-token",
						"the importer of the following path is not a css file (not a css import-rule)",
						"\n\tpath:", path,
						"\n\importer:", importer,
						"\n\kind:", kind,
					)
				}
				if (DEBUG.LOG) {
					console.log("[css-plugin-url-preserve] preserve url import:", path)
				}
				// to preserve a path, we simply set `external = true`, and esbuild won't pass it to any loader
				return { path, namespace: preserveUrlNamespace, external: true }
			}))

			copyUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
				const { path, importer, kind } = args
				if (DEBUG.ASSERT) {
					// we can be here in this namespace only if a css url import was done. if not, then there's something wrong going on.
					console.assert(kind === "import-rule" || kind === "url-token",
						"the importer of the following path is not a css file (not a css import-rule)",
						"\n\tpath:", path,
						"\n\importer:", importer,
						"\n\kind:", kind,
					)
				}
				if (DEBUG.LOG) {
					console.log("[css-plugin-url-copy] copy imported file - resolved path:", path, "\n\twith importer:", importer)
				}
				return { path, namespace: copyUrlNamespace, pluginData: { importer } }
			}))
			build.onLoad({ filter: /.*/, namespace: copyUrlNamespace }, async (args) => {
				// specify that the file at the given path will need to be copied.
				const
					resource_path_url = resolveAsUrl(args.path, args.pluginData.importer),
					contents = new Uint8Array(await (await fetch(resource_path_url)).arrayBuffer())
				if (DEBUG.LOG) {
					console.log("[css-plugin-url-copy] copy imported file - loaded path:", resource_path_url.toString(), "\n\twith size:", contents.length)
				}
				return { loader: "copy", contents }
			})

			build.onResolve({ filter }, pathResolver)
			build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
				if (DEBUG.LOG) { console.log("[css-plugin] load args", args) }
				const
					{ kind: importer_kind, importer, originalPath } = args.pluginData as PluginData,
					{ path } = args,
					cached_contents = cache.get(path)
				if (DEBUG.LOG && cached_contents) {
					console.log("[css-plugin] using cached result")
				}
				if (options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
					// if we are to inject the css, then we'll need to bundle the css file of interest,
					// using a new `esbuild.build` process, with this very same plugin applied.
					// we cannot use `esbuild.transform` because it is possible for the css file of interest to import other css files as well.
					// which is something that the transformer will ignore, rather than resolving it.
					let css_content = cached_contents as (string | undefined)
					// console.log("outdir:", pathDirname(path).replace(/file:\/\/+/, ""))
					// console.log(importer)
					if (css_content === undefined) {
						const output_files = (await build.esbuild.build({
							...build.initialOptions,
							entryPoints: [path],
							plugins: [cssPlugin({
								mode: "bundle", filter, cache,
							})],
							// outdir: "./",
							// outdir: pathDirname(path).replace(/file:\/\/+/, ""),
							outbase: "",
							bundle: true,
							splitting: false,
							write: false,
						})).outputFiles!
						// find the one and only output css file. all other files will be stuff that need to get copied (via the copy loader).
						const css_file_index = output_files.findIndex((output_file) => filter.test(output_file.path))
						if (DEBUG.ASSERT) { console.assert(css_file_index >= 0, "failed to discover the separately bundled css file.") }
						css_content = output_files.splice(css_file_index, 1).pop()!.text
						cache.set(path, css_content)
						// `output_files` now only contains files that need to get copied over in the final step
						additional_files_to_copy.push(...output_files)
					}
					// we cannot inline css_content via template literal `${css_content}`, because css makes use of octal unicodes (such as "\22FF"),
					// which is not permitted to be used inside of template literals.
					// thus we must concatenate it, in addition to escaping any existing backticks inside of it.
					const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = String.raw\`` + css_content.replaceAll("`", "\`") + `\`
document.head.append(style_dom)`
					return { loader: "js", contents: js_text }
				}
				const css_content = cached_contents ?? await (await fetch(new URL(path))).text()
				cache.set(path, css_content)
				return { loader: "css", contents: css_content }
			})

			build.onEnd(async (args) => {
				if (additional_files_to_copy.length > 0) {
					if (DEBUG.LOG) {
						console.log("additional files that were supposed to get copied:\n", additional_files_to_copy.map((output_file) => {
							const { path, contents } = output_file
							return { path, size: contents.length }
						}))
					}
					if (build.initialOptions.write !== false) {
						Promise.all(additional_files_to_copy.map((output_file) => {
							if (DEBUG.LOG) { console.log("writing to:", output_file.path) }
							return Deno.writeFile(output_file.path, output_file.contents)
						}))
					} else {
						args.outputFiles ??= []
						args.outputFiles.push(...additional_files_to_copy)
					}
				}
			})

			return
		}
	}
}
