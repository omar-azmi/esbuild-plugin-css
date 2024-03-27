/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export var DEBUG;
(function (DEBUG) {
    DEBUG[DEBUG["LOG"] = 0] = "LOG";
    DEBUG[DEBUG["ASSERT"] = 1] = "ASSERT";
    DEBUG[DEBUG["ERROR"] = 1] = "ERROR";
    DEBUG[DEBUG["PRODUCTION"] = 1] = "PRODUCTION";
    DEBUG[DEBUG["MINIFY"] = 0] = "MINIFY";
})(DEBUG || (DEBUG = {}));
