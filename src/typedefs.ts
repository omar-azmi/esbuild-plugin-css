import { esbuild } from "./deps.ts"

export const pluginName = "oazmi-css-plugin" as const
export const pluginNamespace = "oazmi-css" as const
export const pluginFilter = /\.css$/

/** recognized namespaces.
 * - `local`: "C://absolute/path/to/file.txt"
 * - `relative`: "./path/to/file.txt" or "../path/to/file.txt"
 * - `file`: "file://C://absolute/path/to/file.txt"
 * - `http`: "http://example.com/path/to/file.txt"
 * - `https`: "https://example.com/path/to/file.txt"
 * - `data`: "data:text/plain;base64,SGVsbG9Xb3JsZA==" or "data:text/plain,HelloWorld"
 * - `jsr` (not supported yet): "jsr:@scope/package-name"
 * - `npm` (not supported yet): "npm:@scope/package-name" or "npm:package-name"
*/
export type Namespace =
	| undefined
	| "local"
	| "relative"
	| "file"
	| "http"
	| "https"
	| "data"
	| "jsr"
	| "npm"

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

export interface PluginData {
	kind: esbuild.OnResolveArgs["kind"]
}

