import { esbuild } from "./deps.js";
import { PluginOptions } from "./typedefs.js";
/** esbuild plugin that bundles css files. compatible with deno and browsers. */
export declare const cssPlugin: (options?: PluginOptions) => esbuild.Plugin;
