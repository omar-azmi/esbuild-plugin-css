import { DEBUG } from "./deps.js";
/** guesses the namespace of a url string. see {@link Namespace | `Namespace`} for more details. */
export const getUriNamespace = (path) => {
    if (!path || path === "") {
        return undefined;
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
/** convert a url string to an actual `URL` object. */
export const resolveAsUrl = (path, base) => {
    let base_url = base;
    if (typeof base === "string") {
        const base_namespace = getUriNamespace(base);
        switch (base_namespace) {
            case "relative":
            case "data": {
                throw new Error(DEBUG.ERROR ? ("the following base namespace (protocol) is not supported: " + base_namespace) : "");
            }
            default: {
                base_url = resolveAsUrl(base);
                break;
            }
        }
    }
    const path_namespace = getUriNamespace(path), path_url = path_namespace === "local"
        ? new URL("file://" + path)
        : path_namespace === "relative"
            ? new URL(path, base_url)
            : new URL(path);
    return path_url;
};