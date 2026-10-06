# F-Droid submission checklist

BlueNote is prepared for an official F-Droid submission using package ID `io.github.lilsynnofficial.bluenote`.

## Upstream preparation

- Apache-2.0 `LICENSE` is present.
- F-Droid build recipe is present at `.fdroid.yml`.
- A copy of the build metadata is kept under `fdroid/io.github.lilsynnofficial.bluenote.yml` for review.
- Fastlane Android metadata is present under `fastlane/metadata/android/en-US/`.
- The F-Droid flavor excludes Firebase web authentication/synchronization from the APK.
- F-Droid CI builds the local-only web bundle and `assembleFdroidRelease`.
- The Android package ID is `io.github.lilsynnofficial.bluenote`.
- F-Droid flavor version name is `1.0.3`, version code `4`.

## Build

The embedded recipe is pinned to the full source commit for the `1.0.3` release. The official fdroiddata submission should use that same immutable source commit.

The build sequence is:

1. Install Node.js/npm build dependencies.
2. Build with `F_DROID_BUILD=true`.
3. Copy `dist/` into the Android WebView assets.
4. Run `gradle assembleFdroidRelease`.

## Before opening the official merge request

1. Publish the release commit with a matching immutable Git tag, e.g. `v1.0.1-fdroid-immutable`.
2. Run `fdroid lint io.github.lilsynnofficial.bluenote` against the fdroiddata metadata.
3. Run `fdroid build io.github.lilsynnofficial.bluenote` in the F-Droid build environment.
4. Confirm the APK version name/code are `1.0.1-fdroid` / `2`.
5. Add the app icon PNG and real device screenshots to the Fastlane metadata if not already present.
6. Create the official `fdroiddata` merge request using `metadata/io.github.lilsynnofficial.bluenote.yml`.
7. Let F-Droid perform its source/license/dependency and Anti-Feature review.

## Important review boundary

The repository still contains optional non-F-Droid integrations for other distribution channels, including the retained AI image-generation service. The F-Droid build flavor is the intended free-software Android variant and removes Firebase from the generated web bundle. F-Droid reviewers may still inspect optional integrations and network services during manual review, so their final classification remains a reviewer decision.
