import { esbuild, pathJoin } from "./deps.ts"

// const css_importer_map = new Map<string, string>()

interface PluginOptions {
	mode?: "bundle" | "inject" | "inject-link"
}

export const denoCssPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
	return {
		name: "deno-css-plugin",
		setup: (build) => {
			build.onResolve({ filter: /\.css$/ }, (args) => {
				console.log(args)
				const { resolveDir, path, namespace } = args
				return { path: pathJoin(resolveDir, path), namespace }
			})

			const transform_loaded_css = async (css_content: string): Promise<esbuild.OnLoadResult> => {
				const { minify, minifySyntax, minifyWhitespace } = build.initialOptions
				const apply_minification = async (css_text: string) => {
					if (!minify && !minifySyntax && !minifyWhitespace) {
						// no minification was requested
						return css_text
					}
					return (await build.esbuild.transform(css_text, {
						loader: "css",
						minify,
						minifySyntax,
						minifyWhitespace,
					})).code
				}

				if (options.mode === "inject") {
					css_content = await apply_minification(css_content)
					const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content}\`
document.head.append(style_dom)`
					return { loader: "js", contents: js_text }
				} else if (options.mode === "inject-link") {
					css_content = await apply_minification(css_content)
					const js_text = `
const css_link_dom = document.createElement("link")
css_link_dom.rel = "stylesheet"
css_link_dom.href = "PATH_TO_COMPILED_CSS"
document.head.append(css_link_dom)`
					// TODO: find a way to figure out the path of the compiled css before hand
					// return {
					// 	loader: "js",
					// 	contents: "",
					// 	then: (value: esbuild.OnLoadResult) => {
					// 		value
					// 	}
					// }
				}
				return { loader: "css", contents: css_content }
			}

			build.onLoad({ filter: /\.css$/, namespace: "file" }, async (args: esbuild.OnLoadArgs) => {
				const contents = await Deno.readTextFile(args.path)
				// TODO: apply transformation only if resolver's `args.kind === "import-statement"`.
				// unfortunately, the `kind` member isn't passed onto the loader's `args`. so I cannot check directly
				return transform_loaded_css(contents)
			})

			const http_loader = async (args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> => {
				const contents = await (await fetch(`${args.namespace}:${args.path}`)).text()
				// TODO: apply transformation only if resolver's `args.kind === "import-statement"`.
				// unfortunately, the `kind` member isn't passed onto the loader's `args`. so I cannot check directly
				return transform_loaded_css(contents)
			}

			build.onLoad({ filter: /\.css$/, namespace: "data" }, http_loader)
			build.onLoad({ filter: /\.css$/, namespace: "http" }, http_loader)
			build.onLoad({ filter: /\.css$/, namespace: "https" }, http_loader)
		}
	}
}
