"use strict";
(() => {
  // src/funcdefs.ts
  var getUriNamespace = (path) => {
    if (!path || path === "") {
      return void 0;
    }
    if (path.startsWith("npm:")) {
      return "npm";
    }
    if (path.startsWith("jsr:")) {
      return "jsr";
    }
    if (path.startsWith("data:")) {
      return "data";
    }
    if (path.startsWith("http://")) {
      return "http";
    }
    if (path.startsWith("https://")) {
      return "https";
    }
    if (path.startsWith("file://")) {
      return "file";
    }
    if (path.startsWith("./") || path.startsWith("../")) {
      return "relative";
    }
    return "local";
  };
  var resolveAsUrl = (path, base) => {
    let base_url = base;
    if (typeof base === "string") {
      const base_namespace = getUriNamespace(base);
      switch (base_namespace) {
        case "relative":
        case "npm":
        case "jsr":
        case "data": {
          throw new Error(1 /* ERROR */ ? "the following base namespace is not supported: " + base_namespace : "");
        }
        default: {
          base_url = resolveAsUrl(base);
          break;
        }
      }
    }
    const path_namespace = getUriNamespace(path), path_url = path_namespace === "local" ? new URL("file://" + path) : path_namespace === "relative" ? new URL(path, base_url) : new URL(path);
    return path_url;
  };

  // src/typedefs.ts
  var pluginName = "oazmi-css-plugin";
  var pluginNamespace = "oazmi-css";
  var pluginFilter = /\.css$/;

  // src/plugin.ts
  var cssPlugin = (options = {}) => {
    const {
      cache = /* @__PURE__ */ new Map(),
      filter = pluginFilter
    } = options;
    return {
      name: pluginName,
      setup: (build) => {
        const pathResolver = (args) => {
          if (0 /* LOG */) {
            console.log("[css-plugin] resolve args:", args);
          }
          const { path, importer, kind } = args, path_url_str = resolveAsUrl(
            path,
            kind === "entry-point" ? void 0 : importer
          ).toString();
          if (0 /* LOG */) {
            console.log("[css-plugin] css path resolved to:", path_url_str);
          }
          return {
            path: path_url_str,
            namespace: pluginNamespace,
            pluginData: { kind }
          };
        };
        build.onResolve({ filter }, pathResolver);
        build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
          if (0 /* LOG */) {
            console.log("[css-plugin] load args", args);
          }
          const { kind: importer_kind } = args.pluginData, { path } = args, cached_contents = cache.get(path);
          if (0 /* LOG */ && cached_contents) {
            console.log("[css-plugin] using cached result");
          }
          if (options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
            const css_content2 = cached_contents ?? (await build.esbuild.build({
              ...build.initialOptions,
              entryPoints: [path],
              plugins: [cssPlugin({
                mode: "bundle",
                filter,
                cache
              })],
              bundle: true,
              splitting: false,
              write: false
            })).outputFiles.pop().text;
            cache.set(path, css_content2);
            const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content2}\`
document.head.append(style_dom)`;
            return { loader: "js", contents: js_text };
          }
          const css_content = cached_contents ?? await (await fetch(new URL(path))).text();
          cache.set(path, css_content);
          return { loader: "css", contents: css_content };
        });
        return;
      }
    };
  };
})();
