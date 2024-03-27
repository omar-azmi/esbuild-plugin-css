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
var pluginName = "oazmi-css-plugin", pluginNamespace = "oazmi-css", preserveUrlNamespace = pluginNamespace + "-url-preserve", copyUrlNamespace = pluginNamespace + "-url-copy", pluginFilter = /\.css$/, preserveUrlFilters = [
  /^data:/
], copyUrlFileFilter = [
  /\.gif$/,
  /\.jpeg$/,
  /\.png$/,
  /\.svg$/,
  /\.ttf$/
];
var cssPlugin = (options = {}) => {
  let {
    cache = /* @__PURE__ */ new Map(),
    filter = pluginFilter,
    preserveUrl = preserveUrlFilters,
    copyUrl = copyUrlFileFilter
  } = options, additional_files_to_copy = [];
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
          pluginData: { kind, importer, originalPath: path }
        };
      };
      preserveUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
        let { path, importer, kind } = args;
        return console.assert(
          kind === "import-rule" || kind === "url-token",
          "the importer of the following path is not a css file (not a css import-rule)",
          `
	path:`,
          path,
          `
importer:`,
          importer,
          `
kind:`,
          kind
        ), 0, { path, namespace: preserveUrlNamespace, external: true };
      })), copyUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
        let { path, importer, kind } = args;
        return console.assert(
          kind === "import-rule" || kind === "url-token",
          "the importer of the following path is not a css file (not a css import-rule)",
          `
	path:`,
          path,
          `
importer:`,
          importer,
          `
kind:`,
          kind
        ), 0, { path, namespace: copyUrlNamespace, pluginData: { importer } };
      })), build.onLoad({ filter: /.*/, namespace: copyUrlNamespace }, async (args) => {
        let resource_path_url = resolveAsUrl(args.path, args.pluginData.importer), contents = new Uint8Array(await (await fetch(resource_path_url)).arrayBuffer());
        return 0, { loader: "copy", contents };
      }), build.onResolve({ filter }, pathResolver), build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
        let { kind: importer_kind, importer, originalPath } = args.pluginData, { path } = args, cached_contents = cache.get(path);
        if (0, options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
          let css_content2 = cached_contents;
          if (css_content2 === void 0) {
            let output_files = (await build.esbuild.build({
              ...build.initialOptions,
              entryPoints: [path],
              plugins: [cssPlugin({
                mode: "bundle",
                filter,
                cache
              })],
              // outdir: "./",
              // outdir: pathDirname(path).replace(/file:\/\/+/, ""),
              outbase: "",
              bundle: true,
              splitting: false,
              write: false
            })).outputFiles, css_file_index = output_files.findIndex((output_file) => filter.test(output_file.path));
            console.assert(css_file_index >= 0, "failed to discover the separately bundled css file."), css_content2 = output_files.splice(css_file_index, 1).pop().text, cache.set(path, css_content2), additional_files_to_copy.push(...output_files);
          }
          return { loader: "js", contents: `
const style_dom = document.createElement("style")
style_dom.textContent = String.raw\`` + css_content2.replaceAll("`", "`") + "`\ndocument.head.append(style_dom)" };
        }
        let css_content = cached_contents ?? await (await fetch(new URL(path))).text();
        return cache.set(path, css_content), { loader: "css", contents: css_content };
      }), build.onEnd(async (args) => {
        additional_files_to_copy.length > 0 && (0, build.initialOptions.write !== false ? Promise.all(additional_files_to_copy.map((output_file) => (0, Deno.writeFile(output_file.path, output_file.contents)))) : (args.outputFiles ??= [], args.outputFiles.push(...additional_files_to_copy)));
      });
    }
  };
};
export {
  cssPlugin
};
