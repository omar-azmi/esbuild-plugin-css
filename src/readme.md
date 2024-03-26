# @oazmi/esbuild-plugin-css

Import CSS files in your javascript, and have them bundled by esbuild, either as css files or as a javascript style injection code. <br>
Works in `Browser` and `Deno` environments, and does not have any dependencies.

## Example

suppose you've got the following two files in your current working directory:
```css
/* FILE: ./my_styles.css */
@import url("https://unpkg.com/some-library@0.1.0/some-library.css");

#mydiv {
	width: 100vw;
	background-color: red;
}
```

```ts
// FILE: ./my_module.ts
import "./my_styles.css"
import "https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css"

const my_div = document.createElement("div")
my_div.id = "mydiv"
document.body.append(my_div)
```

### Bundle imported css files with Deno as a separate file

```ts
// FILE: ./build.ts
import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css"

const result = await esbuild.build({
	plugins: [cssPlugin({}), ...denoPlugins()],
	entryPoints: ["./my_module.ts"],
	outdir: "./dist/",
	bundle: true,
	// minify: true // this will also minify the css
})

esbuild.stop()
```

now, in your terminal, run:
```shell
deno run -A "./build.ts"
```
which will output:
<details>
<summary>./dist/my_module.js</summary>

```js
// index.ts
var my_div = document.createElement("div");
my_div.id = "mydiv";
document.body.append(my_div);
```
</details>

<details>
<summary>./dist/my_module.css</summary>

```css
/* oazmi-css:https://unpkg.com/some-library@0.1.0/some-library.css */
/*
  BUNDLED CONTENTS OF https://unpkg.com/some-library@0.1.0/some-library.css
*/

/* oazmi-css:file:///D:/projects/2024/esbuild-plugin-css/test/1/styles.css */
#mydiv {
  width: 100vw;
  background-color: red;
}

/* oazmi-css:https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css */
/*
  BUNDLED CONTENTS OF https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css
*/
```
</details>

### Bundle imported css files with Deno as javascript injection code

Use the `{ mode: "inject" }` plugin option to to have the bundled css become an injection code that'll inject the style tags into your document.

```ts
// FILE: ./build.ts
import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css"

const result = await esbuild.build({
	plugins: [cssPlugin({ mode: "inject" }), ...denoPlugins()],
	entryPoints: ["./my_module.ts"],
	outdir: "./dist/",
	bundle: true,
	// minify: true // this will also minify the css
})

esbuild.stop()
```

now, in your terminal, run:
```shell
deno run -A "./build.ts"
```
which will output:
<details>
<summary>./dist/my_module.js</summary>

```js
// oazmi-css:file:///D:/projects/2024/esbuild-plugin-css/test/1/styles.css
var style_dom = document.createElement("style");
style_dom.textContent = `/* oazmi-css:https://unpkg.com/some-library@0.1.0/some-library.css */
/*
  BUNDLED CONTENTS OF https://unpkg.com/some-library@0.1.0/some-library.css
*/

/* oazmi-css:file:///D:/projects/2024/esbuild-plugin-css/test/1/styles.css */
#mydiv {
  width: 100vw;
  background-color: red;
}
`;
document.head.append(style_dom);

// oazmi-css:https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css
var style_dom2 = document.createElement("style");
style_dom2.textContent = `/* oazmi-css:https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css */
/*
  BUNDLED CONTENTS OF https://cdnjs.cloudflare.com/ajax/libs/some-other-library@0.2.0/some-other-library.css
*/
`;
document.head.append(style_dom2);

// my_module.ts
var my_div = document.createElement("div");
my_div.id = "mydiv";
document.body.append(my_div);
```
</details>
