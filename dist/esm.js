var getUriNamespace = (path) => {
  if (!(!path || path === ""))
    return path.startsWith("npm:") ? "npm" : path.startsWith("jsr:") ? "jsr" : path.startsWith("data:") ? "data" : path.startsWith("http://") ? "http" : path.startsWith("https://") ? "https" : path.startsWith("file://") ? "file" : path.startsWith("./") || path.startsWith("../") ? "relative" : "local";
}, resolveAsUrl = (path, base) => {
  let base_url = base;
  if (typeof base == "string") {
    let base_namespace = getUriNamespace(base);
    switch (base_namespace) {
      case "relative":
      case "npm":
      case "jsr":
      case "data":
        throw new Error(1 ? "the following base namespace is not supported: " + base_namespace : "");
      default: {
        base_url = resolveAsUrl(base);
        break;
      }
    }
  }
  let path_namespace = getUriNamespace(path);
  return path_namespace === "local" ? new URL("file://" + path) : path_namespace === "relative" ? new URL(path, base_url) : new URL(path);
};
var pluginName = "oazmi-css-plugin", pluginNamespace = "oazmi-css", pluginFilter = /\.css$/;
var cssPlugin = (options = {}) => {
  let {
    cache = /* @__PURE__ */ new Map(),
    filter = pluginFilter
  } = options;
  return {
    name: pluginName,
    setup: (build) => {
      let pathResolver = (args) => {
        let { path, importer, kind } = args, path_url_str = resolveAsUrl(
          path,
          kind === "entry-point" ? void 0 : importer
        ).toString();
        return 0, {
          path: path_url_str,
          namespace: pluginNamespace,
          pluginData: { kind }
        };
      };
      build.onResolve({ filter }, pathResolver), build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
        let { kind: importer_kind } = args.pluginData, { path } = args, cached_contents = cache.get(path);
        if (0, options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
          let css_content2 = cached_contents ?? (await build.esbuild.build({
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
          return cache.set(path, css_content2), { loader: "js", contents: `
const style_dom = document.createElement("style")
style_dom.textContent = \`${css_content2}\`
document.head.append(style_dom)` };
        }
        let css_content = cached_contents ?? await (await fetch(new URL(path))).text();
        return cache.set(path, css_content), { loader: "css", contents: css_content };
      });
    }
  };
};
export {
  cssPlugin
};
