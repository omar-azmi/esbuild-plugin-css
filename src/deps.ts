export type * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
export { dirname as pathDirname, join as pathJoin, toFileUrl } from "jsr:@std/path@0.218.2"
import type * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"

/** concatenate a bunch of `Uint8Array` and `Array<number>` into a single `Uint8Array` array */
export const concatBytes = (...arrs: (Uint8Array | Array<number>)[]): Uint8Array => {
	const offsets: number[] = [0]
	for (const arr of arrs) offsets.push(offsets[offsets.length - 1] + arr.length)
	const outarr = new Uint8Array(offsets.pop()!)
	for (const arr of arrs) outarr.set(arr, offsets.shift())
	return outarr
}

/** recognized namespaces.
 * - `absolute-file`: "C://absolute/path/to/file.txt"
 * - `relative-file`: "./path/to/file.txt"
 * - `file`: "file://C://absolute/path/to/file.txt"
 * - `http`: "http://example.com/path/to/file.txt"
 * - `https`: "https://example.com/path/to/file.txt"
 * - `data`: "data:text/plain;base64,SGVsbG9Xb3JsZA==" or "data:text/plain,HelloWorld"
 * - `jsr`: "jsr:@scope/package-name"
 * - `npm`: "npm:@scope/package-name" or "npm:package-name"
*/
type Namespace =
	| undefined
	| "absolute-file"
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
	return "absolute-file"
}

// type UriArgs = Pick<esbuild.OnResolveArgs, "path" | "importer" | "resolveDir"> & { namespace?: Namespace }

// export const uriToUrl = (args: UriArgs): URL => {
// 	new URL(args.path)
// }
