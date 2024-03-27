/** the plugin's registration name. */
export const pluginName = "oazmi-css-plugin";
/** the namespace used by this plugin. */
export const pluginNamespace = "oazmi-css";
/** the namespace used by {@link PluginOptions.preserveUrl | `PluginOptions.preserveUrl`}. */
export const preserveUrlNamespace = pluginNamespace + "-url-preserve";
/** the namespace used by {@link PluginOptions.copyUrl | `PluginOptions.copyUrl`}. */
export const copyUrlNamespace = pluginNamespace + "-url-copy";
/** the default css file filter. */
export const pluginFilter = /\.css$/;
/** the default css url import capture filters that preserve the url, rather than letting some other plugin to resolve it (i'm looking at you, deno). */
export const preserveUrlFilters = [
    /^data:/,
];
/** the default css url import capture filters that will copy as files. */
export const copyUrlFileFilter = [
    /\.gif$/,
    /\.jpeg$/,
    /\.png$/,
    /\.svg$/,
    /\.ttf$/,
];
