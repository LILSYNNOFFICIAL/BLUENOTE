# F-Droid submission checklist

BlueNote is prepared for an official F-Droid submission using package ID `io.github.lilsynnofficial.bluenote`.

## Upstream preparation

- Apache-2.0 `LICENSE` is present.
- F-Droid build recipe is present at `.fdroid.yml`.
- A copy of the build metadata is kept under `fdroid/io.github.lilsynnofficial.bluenote.yml` for review.
- Fastlane Android metadata is present under `fastlane/metadata/android/en-US/`.
- The F-Droid flavor does not use Firebase or require Google Play services.
- The current proposed build includes optional Supabase email/password authentication and cross-device workspace synchronization; core organizer workflows remain local-first and usable without an account.
- F-Droid metadata and review materials must disclose the hosted Supabase network dependency and apply any Anti-Feature classification required by F-Droid maintainers.
- F-Droid CI builds the local-first web bundle and `assembleFdroidRelease`.
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

The repository contains optional integrations that may contact online services. The F-Droid build does not initialize Firebase, but the proposed account feature contacts the hosted BlueNote Supabase project for sign-in, account recovery, and workspace sync when the user opts in. Core organizer workflows remain local-first. F-Droid reviewers should assess the optional hosted service and determine the appropriate Anti-Feature metadata before official inclusion.
