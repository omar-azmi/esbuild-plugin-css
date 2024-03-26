export type * as esbuild from "esbuild";
/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export declare const enum DEBUG {
    LOG = 0,
    ASSERT = 0,
    ERROR = 1,
    PRODUCTION = 1,
    MINIFY = 1
}
