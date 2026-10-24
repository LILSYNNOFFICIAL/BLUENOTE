#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/third_party/tesseract.js-core"
VAR_FILE="$CORE_DIR/build-scripts/var.sh"
LIBTIFF_SCRIPT="$CORE_DIR/build-scripts/build-libtiff.sh"
GIFLIB_SCRIPT="$CORE_DIR/build-scripts/build-giflib.sh"
TOOLCHAIN_FILE="/usr/share/emscripten/cmake/Modules/Platform/Emscripten.cmake"
EXPECTED_CORE_COMMIT="acffef2b66eb44a31df297e11d905f4b39001068"

command -v emcc >/dev/null 2>&1 || { echo "Missing required source-build tool: emcc" >&2; exit 1; }
EMSCRIPTEN_LLVM_BIN="$(emcc -v 2>&1 | sed -n 's/^InstalledDir: //p' | tail -n 1)"
if [ -n "$EMSCRIPTEN_LLVM_BIN" ] && [ -d "$EMSCRIPTEN_LLVM_BIN" ]; then export PATH="$EMSCRIPTEN_LLVM_BIN:$PATH"; fi
for command in emconfigure emmake cmake make autoconf automake libtool pkg-config clang llvm-ar; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required source-build tool: $command" >&2; exit 1; }
done

test -f "$CORE_DIR/build.sh"
test -f "$TOOLCHAIN_FILE"
test -f "$VAR_FILE"
test -f "$LIBTIFF_SCRIPT"
test -f "$GIFLIB_SCRIPT"

if [ -n "$(git -C "$CORE_DIR" status --porcelain)" ]; then
  echo "Tesseract.js-core worktree is not clean; refusing to overwrite local changes." >&2
  git -C "$CORE_DIR" status --short >&2
  exit 1
fi
actual_core_commit="$(git -C "$CORE_DIR" rev-parse HEAD)"
if [ "$actual_core_commit" != "$EXPECTED_CORE_COMMIT" ]; then
  echo "Unexpected Tesseract.js-core source revision: $actual_core_commit" >&2
  exit 1
fi

# Use the distro Emscripten toolchain and disable unsupported optional variants.
sed -i 's/^BUILD_WASM_RELAXED_SIMD=1$/BUILD_WASM_RELAXED_SIMD=0/' "$VAR_FILE"
sed -i 's|TOOLCHAIN_FILE=\$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake|TOOLCHAIN_FILE=/usr/share/emscripten/cmake/Modules/Platform/Emscripten.cmake|' "$VAR_FILE"
sed -i '/closure 1/d' "$VAR_FILE"
sed -i 's|^PROC=.*|PROC=1|' "$VAR_FILE"

# Both Autoconf libraries compile to WebAssembly. Mark each configure invocation
# as cross-compiling, otherwise its native executable probe fails under emcc.
for script in "$LIBTIFF_SCRIPT" "$GIFLIB_SCRIPT"; do
  if ! grep -q -- '--host=wasm32-unknown-emscripten' "$script"; then
    sed -i '/--prefix=/a\  --host=wasm32-unknown-emscripten' "$script"
  fi
  grep -q -- '--host=wasm32-unknown-emscripten' "$script" || {
    echo "Failed to configure $(basename "$script") for the Emscripten target." >&2
    exit 1
  }
done

rm -f "$CORE_DIR"/tesseract-core*.wasm "$CORE_DIR"/tesseract-core*.wasm.js "$CORE_DIR"/tesseract-core*.js
(
  cd "$CORE_DIR"
  EMSDK=/usr/share/emscripten bash ./build.sh
)

required_files=(
  tesseract-core.wasm.js
  tesseract-core-simd.wasm.js
  tesseract-core-lstm.wasm.js
  tesseract-core-simd-lstm.wasm.js
  tesseract-core.wasm
  tesseract-core-simd.wasm
  tesseract-core-lstm.wasm
  tesseract-core-simd-lstm.wasm
)
for filename in "${required_files[@]}"; do
  test -s "$CORE_DIR/$filename" || { echo "Source build did not produce required runtime asset: $filename" >&2; exit 1; }
done
for wasm_file in "$CORE_DIR"/tesseract-core*.wasm; do
  magic="$(od -An -tx1 -N4 "$wasm_file" | tr -d ' \\n')"
  test "$magic" = "0061736d" || { echo "Invalid WebAssembly output: $wasm_file" >&2; exit 1; }
done

CACHE_DIR="$ROOT_DIR/node_modules/.cache/bluenote-tesseract-core"
mkdir -p "$CACHE_DIR"
cp "${required_files[@]/#/$CORE_DIR/}" "$CACHE_DIR/"
for filename in "${required_files[@]}"; do cmp -s "$CORE_DIR/$filename" "$CACHE_DIR/$filename"; done

git -C "$CORE_DIR" submodule foreach --recursive 'git clean -fdx && git checkout -- .'
git -C "$CORE_DIR" clean -fdx
git -C "$CORE_DIR" checkout -- .
if [ -n "$(git -C "$CORE_DIR" status --porcelain)" ]; then
  echo "Tesseract.js-core source tree was not restored cleanly after compilation." >&2
  git -C "$CORE_DIR" status --short >&2
  exit 1
fi
echo "Tesseract.js-core source build passed; locally compiled OCR outputs were staged outside the source tree."
