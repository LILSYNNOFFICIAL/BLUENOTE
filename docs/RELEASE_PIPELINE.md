# BlueNote release procedure

## One-time GitHub Actions secret setup

The `playstore` APK is a separately signed release artifact. Android updates require a compatible signing identity, so the release workflow intentionally refuses to fall back to the debug certificate.

Add these repository secrets under GitHub Actions:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Store the release keystore outside the repository and keep an offline backup. Losing the signing key can prevent future updates signed with that identity.

## Release

When a version is actually final:

1. Set `versionCode` and `versionName` in `android/app/build.gradle`.
2. Run the normal CI/build checks.
3. Create a semantic Git tag on the verified commit.
4. The release workflow builds:
   - `bluenote-playstore.apk`: Supabase Auth and optional cloud workspace sync, developer-signed.
   - `bluenote-fdroid.apk`: local-first core with optional Supabase Auth and cloud sync, built through the F-Droid source-build path.
   - `SHA256SUMS.txt` for release integrity verification.
5. The GitHub release is published from that exact tag.

Never publish APKs until the release workflow confirms the expected assets were attached to the intended release.

## Updates

The Android release updater checks the latest GitHub release at startup. If a newer compatible release is available, BlueNote can display an in-app update prompt with the signed APK download.

Android still requires user confirmation to install an APK update; the app does not silently install code.

F-Droid builds do not use the developer APK updater. F-Droid remains the update authority for the F-Droid-signed package.

## Important signing rule

Never publish a distributable Android APK signed with a debug key. A later release signed with a different key cannot reliably update an installed APK. Keep the release keystore stable across direct-download releases.
