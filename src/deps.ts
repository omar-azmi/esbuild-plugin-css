export type * as esbuild from "esbuild"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 0,
	ASSERT = 1,
	ERROR = 1,
	PRODUCTION = 1,
	MINIFY = 0,
}
