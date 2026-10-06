import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public', 'ocr');
const copy = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

const tesseractRoot = path.join(root, 'node_modules', 'tesseract.js');
const coreRoot = path.join(root, 'node_modules', 'tesseract.js-core');
const langRoot = path.join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0');

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

copy(path.join(tesseractRoot, 'dist', 'worker.min.js'), path.join(publicDir, 'worker.min.js'));
for (const name of [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
]) {
  copy(path.join(coreRoot, name), path.join(publicDir, name));
}
for (const name of [
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm',
]) {
  copy(path.join(coreRoot, name), path.join(publicDir, name));
}
copy(path.join(langRoot, 'eng.traineddata.gz'), path.join(publicDir, 'eng.traineddata.gz'));

console.log('Prepared local OCR assets in public/ocr');
