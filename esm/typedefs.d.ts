import { esbuild } from "./deps.js";
export declare const pluginName: "oazmi-css-plugin";
export declare const pluginNamespace: "oazmi-css";
export declare const pluginFilter: RegExp;
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
export type Namespace = undefined | "local" | "relative" | "file" | "http" | "https" | "data" | "jsr" | "npm";
/** css plugin options supported. checkout each field for documentation. */
export interface PluginOptions {
    /** define how should the css get bundled:
     * - `"bundle"` | `undefined`: css files will be bundled as separate files, inheriting the basename of the importer javascript.
     * - `"inject"`: css files will be bundled into a string literal, which will then get injected into your html `document`'s head as a `<style>` element.
     * - `"inject-link"`: similar to `"bundle"`, but will also inject a `<link>` element into your `document`'s head that link's to the output bundled css file.
     *
     * TODO: implement `"inject-link"`
    */
    mode?: "bundle" | "inject" | "inject-link";
    /** copy over previously cached results. */
    cache?: Map<string, esbuild.OnLoadResult["contents"]>;
    /** css file name filter regex. defaults to `/\.css$/`, so that it captures all files ending with ".css" */
    filter?: RegExp;
}
/** plugin data sent from the resolver to the loader. */
export interface PluginData {
    kind: esbuild.OnResolveArgs["kind"];
}
