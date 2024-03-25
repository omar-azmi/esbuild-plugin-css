import { DEBUG, esbuild, getUriNamespace } from "./deps.ts"

/** TODO: I think this info will be needed for being able to change the name of the output css file.
 * (i.e. needed for a custom `PluginOptions_Bundleable.name` function)
*/
const css_importer_map = new Map<string, string>()

export interface PluginOptions {
	mode?: "bundle" | "inject" | "inject-link"
	/** copy over previously cached results. */
	cache?: Map<string, esbuild.OnLoadResult["contents"]>
	/** css file name filter regex. defaults to `/\.css$/`, so that it captures all files ending with ".css" */
	filter?: RegExp
}

export interface PluginOptions_Injectable extends PluginOptions {
	mode: "inject"
}

export interface PluginOptions_Bundleable extends PluginOptions {
	mode?: "bundle" | undefined
	/** set the name of the output css file. by default, it is named as its javascript importer's `basename` + `".css"`
	 * TODO: implement
	*/
	name?: (importer_name: string) => string
}

interface CssPluginData {
	kind: esbuild.OnResolveArgs["kind"]
}

const plugin_namespace = "oazmi-css" as const

export const cssPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
	const
		cached_css_text: NonNullable<PluginOptions["cache"]> = options.cache ?? new Map(),
		filter = options.filter ?? /\.css$/

	return {
		name: "oazmi-css-plugin",
		setup: (build: esbuild.PluginBuild) => {
			const pathResolver = (args: esbuild.OnResolveArgs): esbuild.OnResolveResult => {
				if (DEBUG.LOG) { console.log("[css-plugin] resolve args:", args) }
				const { path, importer, kind } = args
				const
					importer_namespace = getUriNamespace(importer),
					importer_url = kind === "entry-point"
						? undefined
						: importer_namespace === "local"
							? new URL("file://" + importer)
							: new URL(importer),
					path_namespace = getUriNamespace(path),
					path_url = path_namespace === "local"
						? new URL("file://" + path)
						: path_namespace === "relative"
							? new URL(path, importer_url)
							: new URL(path),
					path_url_str = path_url.toString()
				if (DEBUG.LOG) { console.log("[css-plugin] css path resolved to:", path_url_str) }
				return {
					path: path_url_str,
					namespace: plugin_namespace,
					pluginData: { kind }
				}
			}

			build.onResolve({ filter }, pathResolver)

			build.onLoad({ filter: /.*/, namespace: plugin_namespace }, async (args) => {
				if (DEBUG.LOG) { console.log("[css-plugin] load args", args) }
				const
					{ kind: importer_kind } = args.pluginData as CssPluginData,
					{ path } = args,
					cached_contents = cached_css_text.get(path)
				if (DEBUG.LOG && cached_contents) {
					console.log("[css-plugin] using cached result")
				}
				if (options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
					// if we are to inject the css, then we'll need to bundle the css file of interest,
					// using a new `esbuild.build` process, with this very same plugin applied.
					// we cannot use `esbuild.transform` because it is possible for the css file of interest to import other css files as well.
					// which is something that the transformer will ignore, rather than resolving it.
					const css_content = cached_contents ?? (await build.esbuild.build({
						...build.initialOptions,
						entryPoints: [path],
						plugins: [cssPlugin({
							filter,
							cache: cached_css_text,
						})],
						bundle: true,
						splitting: false,
						write: false,
					})).outputFiles.pop()!.text
					cached_css_text.set(path, css_content)
					const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content}\`
document.head.append(style_dom)`
					return { loader: "js", contents: js_text }
				}
				const css_content = cached_contents ?? await (await fetch(new URL(path))).text()
				cached_css_text.set(path, css_content)
				return { loader: "css", contents: css_content }
			})

			return
		}
	}
}
