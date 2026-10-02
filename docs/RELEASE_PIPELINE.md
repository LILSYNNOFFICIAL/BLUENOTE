# BlueNote release procedure

## One-time GitHub Actions secret setup

The Firebase-login `playstore` APK is a separately signed release artifact. Android updates require compatible signing identity, so the release workflow intentionally refuses to fall back to the debug certificate.

Add these repository secrets under GitHub Actions:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Store the release keystore outside the repository and keep an offline backup. Android's documentation recommends keeping the private signing key secure; losing the signing key can prevent future updates. See the Android signing documentation.

## Release

When a version is actually final:

1. Set `versionCode` and `versionName` in `android/app/build.gradle`.
2. Run the normal CI/build checks.
3. Create a semantic Git tag such as `v1.0.2` on the verified commit.
4. The release workflow builds:
   - `bluenote-playstore.apk` — Firebase login enabled, developer-signed.
   - `bluenote-fdroid.apk` — Firebase-free/local-only flavor.
   - `SHA256SUMS.txt`.
5. The GitHub release is published from that exact tag.

## Updates

The Firebase-login build checks the latest GitHub release at startup. If a newer release exists, BlueNote displays an in-app update dialog with the signed APK download.

Android still requires user confirmation to install an APK update; the app does not silently install code.

F-Droid builds do not use the developer APK updater. F-Droid remains the update authority for the F-Droid-signed package.

## Important signing rule

Never publish a Firebase APK signed with a debug key. A later release signed with a different key cannot reliably update an installed APK. Keep the release keystore stable across all Firebase/direct-download releases.
