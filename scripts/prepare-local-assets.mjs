import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const publicTesseract = path.join(root, 'public', 'tesseract');
const coreOut = path.join(publicTesseract, 'core');
const langOut = path.join(publicTesseract, 'lang');

fs.rmSync(publicTesseract, { recursive: true, force: true });
fs.mkdirSync(coreOut, { recursive: true });
fs.mkdirSync(langOut, { recursive: true });

const tesseractRoot = path.dirname(require.resolve('tesseract.js/package.json'));
const coreRoot = process.env.BLUENOTE_TESSERACT_SOURCE_BUILD === 'true'
  ? path.join(root, 'node_modules', '.cache', 'bluenote-tesseract-core')
  : path.dirname(require.resolve('tesseract.js-core/package.json'));
if (process.env.BLUENOTE_TESSERACT_SOURCE_BUILD === 'true') {
  const sourceBuiltCore = path.join(coreRoot, 'tesseract-core.wasm');
  if (!fs.existsSync(sourceBuiltCore)) {
    throw new Error('F-Droid OCR assets must be built from the pinned Tesseract.js-core source first.');
  }
}
const engRoot = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'));

const workerPath = path.join(publicTesseract, 'worker.min.js');
fs.copyFileSync(path.join(tesseractRoot, 'dist', 'worker.min.js'), workerPath);

// The F-Droid build supplies every Tesseract runtime asset locally. Remove the
// unused CDN fallback literal from the packaged worker so static network review
// cannot mistake it for a runtime dependency.
const worker = fs.readFileSync(workerPath, 'utf8');
fs.writeFileSync(workerPath, worker.replaceAll('https://cdn.jsdelivr.net', ''));

for (const filename of [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm',
]) {
  fs.copyFileSync(path.join(coreRoot, filename), path.join(coreOut, filename));
}

fs.copyFileSync(
  path.join(engRoot, '4.0.0_best_int', 'eng.traineddata.gz'),
  path.join(langOut, 'eng.traineddata.gz')
);

console.log('Prepared local Tesseract.js worker, core files, and English traineddata.');
