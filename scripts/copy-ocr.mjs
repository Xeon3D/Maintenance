// Copies the OCR engine (tesseract.js worker + WebAssembly core) and the English model into public/ocr, so
// reading serial numbers and MAC addresses from a photo works without a CDN and offline in the installed app.
// Runs before `next dev` / `next build` (package.json pre-scripts); public/ocr is not committed.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const out = "public/ocr";
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // One core per CPU feature level; tesseract.js picks the fastest the browser supports.
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];

mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.error(`[copy-ocr] missing ${from} (run npm install)`);
    process.exit(1);
  }
  const dest = path.join(out, to);
  if (existsSync(dest) && statSync(dest).size === statSync(from).size) continue;
  copyFileSync(from, dest);
}
console.log(`[copy-ocr] OCR files in ${out}`);
