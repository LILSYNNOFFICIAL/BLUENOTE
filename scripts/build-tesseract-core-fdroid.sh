#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/third_party/tesseract.js-core"
VAR_FILE="$CORE_DIR/build-scripts/var.sh"
TOOLCHAIN_FILE="/usr/share/emscripten/cmake/Modules/Platform/Emscripten.cmake"
EXPECTED_CORE_COMMIT="acffef2b66eb44a31df297e11d905f4b39001068"

for command in emcc emconfigure emmake cmake make autoconf automake libtool pkg-config; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required source-build tool: $command" >&2
    exit 1
  }
done

test -f "$CORE_DIR/build.sh"
test -f "$TOOLCHAIN_FILE"
test -f "$VAR_FILE"

actual_core_commit="$(git -C "$CORE_DIR" rev-parse HEAD)"
if [ "$actual_core_commit" != "$EXPECTED_CORE_COMMIT" ]; then
  echo "Unexpected Tesseract.js-core source revision: $actual_core_commit" >&2
  exit 1
fi

# Debian's packaged Emscripten is used instead of downloading a toolchain.
# Disable only the optional Relaxed-SIMD/AVX variants (introduced for emsdk
# 4.0.15); the standard, SIMD, LSTM and legacy variants are compiled from source.
sed -i 's/^BUILD_WASM_RELAXED_SIMD=1$/BUILD_WASM_RELAXED_SIMD=0/' "$VAR_FILE"
sed -i 's|TOOLCHAIN_FILE=\$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake|TOOLCHAIN_FILE=/usr/share/emscripten/cmake/Modules/Platform/Emscripten.cmake|' "$VAR_FILE"
sed -i '/closure 1/d' "$VAR_FILE"
sed -i 's|^PROC=.*|PROC=1|' "$VAR_FILE"

# Never let prebuilt artifacts from the source repository masquerade as build
# outputs. The upstream build must regenerate every runtime core file.
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
  test -s "$CORE_DIR/$filename" || {
    echo "Source build did not produce required runtime asset: $filename" >&2
    exit 1
  }
done

for wasm_file in "$CORE_DIR"/tesseract-core*.wasm; do
  magic="$(od -An -tx1 -N4 "$wasm_file" | tr -d ' \n')"
  test "$magic" = "0061736d" || {
    echo "Invalid WebAssembly output: $wasm_file" >&2
    exit 1
  }
done

# Copy only the freshly built runtime outputs outside the submodule. F-Droid
# can then remove all generated build products and the submodule's upstream
# prebuilt WASM files from the source tree before scanning.
CACHE_DIR="$ROOT_DIR/node_modules/.cache/bluenote-tesseract-core"
mkdir -p "$CACHE_DIR"
cp "${required_files[@]/#/$CORE_DIR/}" "$CACHE_DIR/"
for filename in "${required_files[@]}"; do
  cmp -s "$CORE_DIR/$filename" "$CACHE_DIR/$filename"
done

# Restore every submodule to its pinned source state and remove generated
# intermediates. The copied, locally compiled files remain in node_modules
# until the web bundle has been assembled.
git -C "$CORE_DIR" submodule foreach --recursive 'git clean -fdx && git checkout -- .'
git -C "$CORE_DIR" clean -fdx
git -C "$CORE_DIR" checkout -- .
if [ -n "$(git -C "$CORE_DIR" status --porcelain)" ]; then
  echo "Tesseract.js-core source tree was not restored cleanly after compilation." >&2
  git -C "$CORE_DIR" status --short >&2
  exit 1
fi

echo "Tesseract.js-core source build passed; locally compiled OCR outputs were staged outside the source tree."
