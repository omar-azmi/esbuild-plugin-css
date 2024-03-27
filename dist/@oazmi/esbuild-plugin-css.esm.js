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
var preserveUrlNamespace = pluginNamespace + "-url-preserve";
var copyUrlNamespace = pluginNamespace + "-url-copy";
var pluginFilter = /\.css$/;
var preserveUrlFilters = [
  /^data:/
];
var copyUrlFileFilter = [
  /\.gif$/,
  /\.jpeg$/,
  /\.png$/,
  /\.svg$/,
  /\.ttf$/
];

// src/plugin.ts
var cssPlugin = (options = {}) => {
  const {
    cache = /* @__PURE__ */ new Map(),
    filter = pluginFilter,
    preserveUrl = preserveUrlFilters,
    copyUrl = copyUrlFileFilter
  } = options;
  const additional_files_to_copy = [];
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
          pluginData: { kind, importer, originalPath: path }
        };
      };
      preserveUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
        const { path, importer, kind } = args;
        if (1 /* ASSERT */) {
          console.assert(
            kind === "import-rule" || kind === "url-token",
            "the importer of the following path is not a css file (not a css import-rule)",
            "\n	path:",
            path,
            "\nimporter:",
            importer,
            "\nkind:",
            kind
          );
        }
        if (0 /* LOG */) {
          console.log("[css-plugin-url-preserve] preserve url import:", path);
        }
        return { path, namespace: preserveUrlNamespace, external: true };
      }));
      copyUrl.forEach((filter_regex) => build.onResolve({ filter: filter_regex, namespace: pluginNamespace }, async (args) => {
        const { path, importer, kind } = args;
        if (1 /* ASSERT */) {
          console.assert(
            kind === "import-rule" || kind === "url-token",
            "the importer of the following path is not a css file (not a css import-rule)",
            "\n	path:",
            path,
            "\nimporter:",
            importer,
            "\nkind:",
            kind
          );
        }
        if (0 /* LOG */) {
          console.log("[css-plugin-url-copy] copy imported file - resolved path:", path, "\n	with importer:", importer);
        }
        return { path, namespace: copyUrlNamespace, pluginData: { importer } };
      }));
      build.onLoad({ filter: /.*/, namespace: copyUrlNamespace }, async (args) => {
        const resource_path_url = resolveAsUrl(args.path, args.pluginData.importer), contents = new Uint8Array(await (await fetch(resource_path_url)).arrayBuffer());
        if (0 /* LOG */) {
          console.log("[css-plugin-url-copy] copy imported file - loaded path:", resource_path_url.toString(), "\n	with size:", contents.length);
        }
        return { loader: "copy", contents };
      });
      build.onResolve({ filter }, pathResolver);
      build.onLoad({ filter: /.*/, namespace: pluginNamespace }, async (args) => {
        if (0 /* LOG */) {
          console.log("[css-plugin] load args", args);
        }
        const { kind: importer_kind, importer, originalPath } = args.pluginData, { path } = args, cached_contents = cache.get(path);
        if (0 /* LOG */ && cached_contents) {
          console.log("[css-plugin] using cached result");
        }
        if (options.mode === "inject" && importer_kind === "import-statement" || importer_kind === "dynamic-import") {
          let css_content2 = cached_contents;
          if (css_content2 === void 0) {
            const output_files = (await build.esbuild.build({
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
            })).outputFiles;
            const css_file_index = output_files.findIndex((output_file) => filter.test(output_file.path));
            if (1 /* ASSERT */) {
              console.assert(css_file_index >= 0, "failed to discover the separately bundled css file.");
            }
            css_content2 = output_files.splice(css_file_index, 1).pop().text;
            cache.set(path, css_content2);
            additional_files_to_copy.push(...output_files);
          }
          const js_text = `
const style_dom = document.createElement("style")
style_dom.textContent = String.raw\`` + css_content2.replaceAll("`", "`") + `\`
document.head.append(style_dom)`;
          return { loader: "js", contents: js_text };
        }
        const css_content = cached_contents ?? await (await fetch(new URL(path))).text();
        cache.set(path, css_content);
        return { loader: "css", contents: css_content };
      });
      build.onEnd(async (args) => {
        if (additional_files_to_copy.length > 0) {
          if (0 /* LOG */) {
            console.log("additional files that were supposed to get copied:\n", additional_files_to_copy.map((output_file) => {
              const { path, contents } = output_file;
              return { path, size: contents.length };
            }));
          }
          if (build.initialOptions.write !== false) {
            Promise.all(additional_files_to_copy.map((output_file) => {
              if (0 /* LOG */) {
                console.log("writing to:", output_file.path);
              }
              return Deno.writeFile(output_file.path, output_file.contents);
            }));
          } else {
            args.outputFiles ??= [];
            args.outputFiles.push(...additional_files_to_copy);
          }
        }
      });
      return;
    }
  };
};
export {
  cssPlugin
};
