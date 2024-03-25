import { concatBytes, esbuild, pathDirname, pathJoin } from "./deps.ts"

const css_importer_map = new Map<string, string>()

export const denoCssPlugin = (): esbuild.Plugin => {
	return {
		name: "deno-css-plugin",
		setup: (build) => {
			build.onResolve({ filter: /\.css$/ }, (args) => {
				console.log(args)
				const { resolveDir, path, namespace } = args
				return { path: pathJoin(resolveDir, path), namespace }
			})

			build.onLoad({ filter: /\.css$/, namespace: "file" }, async (args: esbuild.OnLoadArgs) => {
				const contents = await Deno.readTextFile(args.path)
				return { loader: "css", contents }
			})

			const http_loader = async (args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> => {
				const contents = await (await fetch(`${args.namespace}:${args.path}`)).text()
				return { loader: "css", contents }
			}

			build.onLoad({ filter: /\.css$/, namespace: "data" }, http_loader)
			build.onLoad({ filter: /\.css$/, namespace: "http" }, http_loader)
			build.onLoad({ filter: /\.css$/, namespace: "https" }, http_loader)
		}
	}
}

export const injectCssinJs = (
	build_results: esbuild.BuildResult<{ bundle: true, write: false }>,
	bundle: boolean = true,
) => {
	const outputFiles = build_results.outputFiles
		?.filter((output_file) => { return !output_file.path.endsWith(".css") })
		?? []
	const cssJsOutputFiles = build_results.outputFiles
		?.filter((output_file) => { return output_file.path.endsWith(".css") })
		.map((css_output_file) => {
			const
				{ path, text, hash } = css_output_file,
				js_path = path.replace(/\.css$/, ".js"),
				js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${text}\`
document.head.append(style_dom)`,
				js_content = new TextEncoder().encode(js_text)
			return {
				path: js_path,
				text: js_text,
				contents: js_content,
				hash,
			} as esbuild.OutputFile
		}) ?? []
	if (bundle && cssJsOutputFiles.length > 0) {
		const
			bundled_js_file = outputFiles.pop()!,
			bundled_content = concatBytes(bundled_js_file.contents, ...cssJsOutputFiles!.map((css_js_injector_file) => css_js_injector_file.contents))
		outputFiles.push({
			path: bundled_js_file.path,
			hash: bundled_js_file.hash,
			contents: bundled_content,
			text: new TextDecoder().decode(bundled_content)
		})
	}
	build_results.outputFiles.splice(0)
	build_results.outputFiles.push(...outputFiles)
	return build_results
}


// export const denoCssToJsPlugin = (options: PluginOptions = {}): esbuild.Plugin => {
// 	return {
// 		name: "deno-css-to-js-plugin",
// 		setup: (build) => {
// 			if (options.name !== undefined && options.name.length > 0) {
// 				build.onEnd(async (result: esbuild.BuildResult<esbuild.BuildOptions>): Promise<esbuild.OnEndResult> => {
// 					console.log("name options", result.outputFiles)
// 					return {}

// 					for (const output_file of result.outputFiles ?? []) {
// 						if (output_file.path.endsWith(".css")) {
// 							const dirname = pathDirname(output_file.path)
// 							output_file.path = pathJoin(dirname, options.name!)
// 						}
// 					}
// 					return result
// 				})
// 			}

// 			if (options.inject) {
// 				build.onEnd(async (result: esbuild.BuildResult<esbuild.BuildOptions>): Promise<esbuild.OnEndResult> => {
// 					console.log("inject options", result.outputFiles)
// 					return {}

// 					const outputFiles = result.outputFiles
// 						?.filter((output_file) => { return !output_file.path.endsWith(".css") })
// 						?? []
// 					const cssJsOutputFiles = result.outputFiles
// 						?.filter((output_file) => { return output_file.path.endsWith(".css") })
// 						.map((css_output_file) => {
// 							const
// 								{ path, text, hash } = css_output_file,
// 								js_path = path.replace(/\.css$/, ".js"),
// 								js_text = `
// const style_dom = document.createElement("style")
// style_dom.textContent = \`${text}\`
// document.head.append(style_dom)`,
// 								js_content = new TextEncoder().encode(js_text)
// 							return {
// 								path: js_path,
// 								text: js_text,
// 								contents: js_content,
// 								hash,
// 							} as esbuild.OutputFile
// 						}) ?? []
// 					if (build.initialOptions.bundle && cssJsOutputFiles.length > 0) {
// 						console.log(outputFiles)
// 						const
// 							bundled_js_file = outputFiles.pop()!,
// 							bundled_content = concatBytes(bundled_js_file.contents, ...cssJsOutputFiles!.map((css_js_injector_file) => css_js_injector_file.contents))
// 						outputFiles.push({
// 							path: bundled_js_file.path,
// 							hash: bundled_js_file.hash,
// 							contents: bundled_content,
// 							text: new TextDecoder().decode(bundled_content)
// 						})
// 					}
// 					return result
// 				})
// 			}
// 		}
// 	}
// }
