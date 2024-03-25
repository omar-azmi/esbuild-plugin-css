import { DEBUG, esbuild } from "./deps.ts"
import { resolveAsUrl } from "./funcdefs.ts"
import { PluginData, PluginOptions, pluginFilter, pluginName, pluginNamespace } from "./typedefs.ts"

/** TODO: I think this info will be needed for being able to change the name of the output css file.
 * (i.e. needed for a custom `PluginOptions_Bundleable.name` function)
*/
const css_importer_map = new Map<string, string>()


export const cssPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
	const {
		cache = new Map() as NonNullable<PluginOptions["cache"]>,
		filter = pluginFilter
	} = options

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
					pluginData: { kind }
				}
			}

			build.onResolve({ filter }, pathResolver)

			build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
				if (DEBUG.LOG) { console.log("[css-plugin] load args", args) }
				const
					{ kind: importer_kind } = args.pluginData as PluginData,
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
					const css_content = cached_contents ?? (await build.esbuild.build({
						...build.initialOptions,
						entryPoints: [path],
						plugins: [cssPlugin({
							mode: "bundle", filter, cache,
						})],
						bundle: true,
						splitting: false,
						write: false,
					})).outputFiles.pop()!.text
					cache.set(path, css_content)
					const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content}\`
document.head.append(style_dom)`
					return { loader: "js", contents: js_text }
				}
				const css_content = cached_contents ?? await (await fetch(new URL(path))).text()
				cache.set(path, css_content)
				return { loader: "css", contents: css_content }
			})

			return
		}
	}
}
