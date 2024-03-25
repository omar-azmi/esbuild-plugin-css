import { esbuild, getUriNamespace } from "./deps.ts"

const css_importer_map = new Map<string, string>()

export interface PluginOptions {
	mode?: "bundle" | "inject" | "inject-link"
}

interface CssPluginData {
	kind: esbuild.OnResolveArgs["kind"]
}

const plugin_namespace = "css-ns" as const

export const denoCssPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
	return {
		name: "deno-css-plugin",
		setup: (build) => {
			const pathResolver = (args: esbuild.OnResolveArgs): esbuild.OnResolveResult => {
				console.log(args)
				const { path, importer, kind } = args
				const
					importer_namespace = getUriNamespace(importer),
					importer_url = kind === "entry-point"
						? undefined
						: importer_namespace === "absolute-file"
							? new URL("file://" + importer)
							: new URL(importer),
					path_namespace = getUriNamespace(path),
					path_url = path_namespace === "absolute-file"
						? new URL("file://" + path)
						: path_namespace === "relative"
							? new URL(path, importer_url)
							: new URL(path)
				console.log("css path resolved to:", path_url.toString())
				return {
					path: path_url.toString(),
					namespace: plugin_namespace,
					pluginData: { kind }
				}
			}

			build.onResolve({ filter: /\.css$/ }, pathResolver)
			// esbuild labels everything as a "file" in the very beginning. so it is up to us to correct it.
			// build.onResolve({ filter: /\.css$/, namespace: "file" }, pathResolver)
			// build.onResolve({ filter: /\.css$/, namespace: plugin_namespace }, pathResolver)
			build.onLoad({ filter: /.*/, namespace: plugin_namespace }, async (args) => {
				console.log(args)
				const { kind: importer_kind } = args.pluginData as CssPluginData
				if (options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
					// if we are to inject the css, then we'll need to bundle the css file of interest,
					// using a new `esbuild.build` process, with this very same plugin applied.
					// we cannot use `esbuild.transform` because it is possible for the css file of interest to import other css files as well.
					// which is something that the transformer will ignore, rather than resolving it.
					const css_content = (await build.esbuild.build({
						...build.initialOptions,
						entryPoints: [args.path],
						plugins: [denoCssPlugin()],
						bundle: true,
						write: false,
					})).outputFiles.pop()!.text
					const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content}\`
document.head.append(style_dom)`
					return { loader: "js", contents: js_text }
				}
				const css_content = await (await fetch(new URL(args.path))).text()
				return { loader: "css", contents: css_content }
			})
		}
	}
}
