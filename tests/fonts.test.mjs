import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("active fonts use complete local WOFF2 assets without restrictive character subsets",async()=>{
 const css=await readFile(new URL("../src/fonts.css",import.meta.url),"utf8");
 assert.doesNotMatch(css,/unicode-range/);
 const files=[...css.matchAll(/url\("(\/fonts\/[^" ]+)"\)/g)].map(m=>m[1]);
 assert.equal(files.length,4);
 for(const file of files){
  assert.match(file,/-full\.woff2$/);
  const bytes=await readFile(new URL("../public"+file,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),"wOF2");
  assert.equal(bytes.readUInt32BE(8),bytes.length);
 }
 const styles=await readFile(new URL("../src/styles.css",import.meta.url),"utf8");
 assert.match(styles,/textarea, select, option \{ font: inherit; \}/);
});
