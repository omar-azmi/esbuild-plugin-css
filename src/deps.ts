export type * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
export { dirname as pathDirname, join as pathJoin, toFileUrl } from "jsr:@std/path@0.218.2"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 1,
	ASSERT = 0,
	ERROR = 0,
	PRODUCTION = 1,
	MINIFY = 1,
}

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
type Namespace =
	| undefined
	| "local"
	| "relative"
	| "file"
	| "http"
	| "https"
	| "data"
	| "jsr"
	| "npm"

export const getUriNamespace = (path: string): Namespace => {
	if (!path || path === "") { return undefined }
	if (path.startsWith("npm:")) { return "npm" }
	if (path.startsWith("jsr:")) { return "jsr" }
	if (path.startsWith("data:")) { return "data" }
	if (path.startsWith("http://")) { return "http" }
	if (path.startsWith("https://")) { return "https" }
	if (path.startsWith("file://")) { return "file" }
	if (path.startsWith("./") || path.startsWith("../")) { return "relative" }
	return "local"
}
