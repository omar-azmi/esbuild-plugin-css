import { esbuild } from "./deps.js"

/** the plugin's registration name. */
export const pluginName = "oazmi-css-plugin" as const

/** the namespace used by this plugin. */
export const pluginNamespace = "oazmi-css" as const

/** the namespace used by {@link PluginOptions.preserveUrl | `PluginOptions.preserveUrl`}. */
export const preserveUrlNamespace = pluginNamespace + "-url-preserve"

/** the namespace used by {@link PluginOptions.copyUrl | `PluginOptions.copyUrl`}. */
export const copyUrlNamespace = pluginNamespace + "-url-copy"

/** the default css file filter. */
export const pluginFilter = /\.css$/

/** the default css url import capture filters that preserve the url, rather than letting some other plugin to resolve it (i'm looking at you, deno). */
export const preserveUrlFilters: RegExp[] = [
	/^data:/,
]

/** the default css url import capture filters that will copy as files. */
export const copyUrlFileFilter = [
	/\.gif$/,
	/\.jpeg$/,
	/\.png$/,
	/\.svg$/,
	/\.ttf$/,
]

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

/** css plugin options supported. checkout each field for documentation. */
export interface PluginOptions {
	/** define how should the css get bundled:
	 * - `"bundle"` | `undefined`: css files will be bundled as separate files, inheriting the basename of the importer javascript.
	 * - `"inject"`: css files will be bundled into a string literal, which will then get injected into your html `document`'s head as a `<style>` element.
	 * - `"inject-link"`: similar to `"bundle"`, but will also inject a `<link>` element into your `document`'s head that link's to the output bundled css file.
	 * 
	 * TODO: implement `"inject-link"`
	*/
	mode?: "bundle" | "inject" | "inject-link"

	/** copy over previously cached results. */
	cache?: Map<string, esbuild.OnLoadResult["contents"]>

	/** css file name filter regex. defaults to `/\.css$/`, so that it captures all files ending with ".css" */
	filter?: RegExp

	/** preserve the given set of css `url(...)` imports. defaults to {@link preserveUrlFilters | `cssUrlPreserveFilters`}.*/
	preserveUrl?: RegExp[]

	/** copies matching files specified in css `url(...)` imports in the output. defaults to {@link copyUrlFileFilter | `cssUrlCopyFileFilter`}.*/
	copyUrl?: RegExp[]

	/** TODO: loads matching files css `url(...)` imports as base64 encoded data. defaults to .
	 * 
	 * example:
	 * - input: `url("my_icon.svg")` and `base64Url = [[/.svg$/, "text/svg"], ...]`
	 * - output: `url("data:text/svg;base64,ZGF0YTppbWFnZS...")`
	*/
	base64Url?: Array<[filter: RegExp, mime: string]>
}

interface PluginOptions_Injectable extends PluginOptions {
	mode: "inject"
}

interface PluginOptions_Bundleable extends PluginOptions {
	mode?: "bundle" | undefined
	/** set the name of the output css file. by default, it is named as its javascript importer's `basename` + `".css"`
	 * TODO: implement
	*/
	name?: (importer_name: string) => string
}

/** plugin data sent from the resolver to the loader. */
export interface PluginData {
	kind: esbuild.OnResolveArgs["kind"]
	importer: esbuild.OnResolveArgs["importer"]
	originalPath: esbuild.OnResolveArgs["path"]
}

