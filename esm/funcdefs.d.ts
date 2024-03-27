import { Namespace } from "./typedefs.js";
/** guesses the namespace of a url string. see {@link Namespace | `Namespace`} for more details. */
export declare const getUriNamespace: (path: string) => Namespace;
/** convert a url string to an actual `URL` object. */
export declare const resolveAsUrl: (path: string, base?: string | URL | undefined) => URL;
//# sourceMappingURL=funcdefs.d.ts.map