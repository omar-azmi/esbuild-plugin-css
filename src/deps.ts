export type * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 0,
	ASSERT = 0,
	ERROR = 1,
	PRODUCTION = 1,
	MINIFY = 1,
}
