export type * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
export { dirname as pathDirname, join as pathJoin } from "jsr:@std/path@0.218.2"


/** concatenate a bunch of `Uint8Array` and `Array<number>` into a single `Uint8Array` array */
export const concatBytes = (...arrs: (Uint8Array | Array<number>)[]): Uint8Array => {
	const offsets: number[] = [0]
	for (const arr of arrs) offsets.push(offsets[offsets.length - 1] + arr.length)
	const outarr = new Uint8Array(offsets.pop()!)
	for (const arr of arrs) outarr.set(arr, offsets.shift())
	return outarr
}
