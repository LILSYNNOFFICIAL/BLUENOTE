# BlueNote — AI Life & Work Operating System

BlueNote is a local-first **AI Life & Work Operating System** for organizing projects, notes, tasks, documents, contacts, calendars, OCR captures, and creative work in one Android/Web application.

It combines:

- **PROJECTS OS** — project containers, document/version organization, lyric/topic organization, and interactive HTML photo albums
- **Notes & Wiki**
- **Tasks & Kanban**
- **Calendar & planning**
- **Contacts and linked files**
- **Brain Dump & OCR**
- **Predictive Lists**
- **Second Brain Graph**
- ****AI Image Generator** for optional image-generation workflows
- **Offline/local-first core workflows** that do not require a user API key

---

## 🌐 Web App & Android

- **GitHub Pages Web App:** https://lilsynnofficial.github.io/BLUENOTE/
- **Source Repository:** https://github.com/LILSYNNOFFICIAL/BLUENOTE
- **Android Release Workflow:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml
- **Releases:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases

### Android distribution channels

BlueNote supports separate Android distribution flavors:

| Flavor | Purpose | Firebase web services | Channel |
|---|---|---|---|
| `fdroid` | Free/open-source, local-first Android build | Excluded from the F-Droid web bundle | F-Droid |
| `playstore` | Google Play distribution | Supported where configured | Google Play |

The F-Droid build uses package ID:

`io.github.lilsynnofficial.bluenote`

The current F-Droid release configuration is:

- **Version:** `1.0.1-fdroid`
- **Version code:** `2`
- **Gradle flavor:** `fdroid`
- **Release tag:** pending next immutable GitHub release
- **Release commit:** will be the immutable commit used for the F-Droid submission

The previous `1.0.0-fdroid` immutable release is superseded by this release because the AI video-generation and AI music/song-generation features have been removed from the project. The retained AI capability is image generation/editing.

---

## 🛡️ F-Droid / Free Software Build

BlueNote includes an explicit F-Droid build path designed to keep the Android distribution independent of Firebase web authentication and cloud synchronization.

### Build flow

The F-Droid build performs the following sequence:

1. Install Node.js/npm build dependencies.
2. Install JavaScript dependencies.
3. Build the web application with `F_DROID_BUILD=true`.
4. Copy the generated `dist/` bundle into the Android WebView assets.
5. Build the `fdroid` Android product flavor with Gradle.
6. Produce the F-Droid release APK.

Local F-Droid recipe:

`/.fdroid.yml`

Review copy:

`/fdroid/io.github.lilsynnofficial.bluenote.yml`

Submission checklist:

`/fdroid/SUBMISSION.md`

The official F-Droid build metadata uses the immutable release commit rather than a moving branch or `HEAD`.

### Local build

```bash
npm install --legacy-peer-deps --no-fund --no-audit
F_DROID_BUILD=true npm run build

mkdir -p android/app/src/main/assets/public
cp -r dist/* android/app/src/main/assets/public/

cd android
./gradlew assembleFdroidRelease
```

Expected APK path:

`android/app/build/outputs/apk/fdroid/release/app-fdroid-release-unsigned.apk`

---

## 🔐 Security & Privacy Architecture

BlueNote separates the normal web/Play distribution from the F-Droid/local-first distribution.

### Web / Play distribution

The normal application can use Firebase Authentication for:

- Google Sign-In
- Email/password authentication
- Password reset
- Cloud workspace synchronization where configured

Confidential backend credentials such as API keys and OAuth secrets are intended to remain server-side. They are not intentionally exposed through `VITE_*` client variables or Vite build-time secret injection.

### F-Droid distribution

The F-Droid flavor is designed around the local-first application path:

- Firebase web authentication/synchronization is excluded from the F-Droid web bundle.
- Core organizer workflows remain available locally.
- User API keys are not required for the core organizer.
- Keyless browser OCR fallback is available through Tesseract.js.
- Optional online AI/image integrations are not required for the core notes, tasks, organizer, habits, OCR, and offline workflows.

F-Droid maintainers still perform the final source, dependency, network-service, licensing, and Anti-Feature review.

---

## ✨ Core Features

### PROJECTS OS

Organize large creative and work projects with:

- Multi-document project organization
- Lyric extraction and organization
- Topic-focused document merging
- Document versioning
- Photo organization
- Perceptual-hash duplicate detection
- Interactive HTML photo album export

### Notes, Tasks & Planning

- Rich notes and wiki-style organization
- Task lists and Kanban workflows
- Calendar and planning tools
- Focus/Pomodoro workflows
- Predictive lists
- Contacts and linked files
- Second Brain graph visualization

### Brain Dump & OCR

Capture ideas quickly and convert images into searchable text.

OCR supports a keyless browser fallback, while richer extraction can use an optional configured provider.

### Optional AI Image Generator

The normal distribution includes an optional AI image-generation tool for creative workflows. Image generation is retained; the video-generation and music-maker features are intentionally excluded from this release.

These integrations are intentionally separated from the core local-first organizer and are not required for the F-Droid build's core functionality.

---

## 🧰 Local Development

### Requirements

- Node.js / npm
- Android SDK
- Java 17
- Gradle wrapper included in the Android project

### Web development

```bash
npm install
npm run dev
```

### Production web build

```bash
npm run build
```

### Android synchronization

```bash
npm run android:sync
```

### Android F-Droid release

```bash
cd android
./gradlew assembleFdroidRelease
```

### Android Play Store release

```bash
cd android
./gradlew assemblePlaystoreRelease
```

---

## 📦 Android Configuration

Application ID:

`io.github.lilsynnofficial.bluenote`

The Android project uses product flavors:

- `fdroid`
- `playstore`

The F-Droid flavor appends `-fdroid` to the base version name.

Release builds use production signing credentials when the expected Android keystore environment variables are supplied. The project also retains a debug-signing fallback for development/CI installation workflows; a stable production keystore is required when publishing an upgrade that must install over an existing production-signed application.

---

## 📋 F-Droid Submission Status

The upstream repository contains the F-Droid build recipe, Android flavor, Fastlane text metadata, license, and submission documentation.

The official F-Droid process remains a separate review process. F-Droid's maintainers determine final inclusion, dependency compliance, licensing status, Anti-Features, and reproducible-build results.

For packaging work, see:

- `/.fdroid.yml`
- `/fdroid/io.github.lilsynnofficial.bluenote.yml`
- `/fdroid/SUBMISSION.md`
- `/fastlane/metadata/android/en-US/`

---

## 📄 License

BlueNote is released under the **Apache License 2.0**.

See [LICENSE](LICENSE).

---

## 🔗 Project Links

- **Website / Web App:** https://lilsynnofficial.github.io/BLUENOTE/
- **GitHub:** https://github.com/LILSYNNOFFICIAL/BLUENOTE
- **Issues:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues
- **Releases:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases
- **F-Droid build recipe:** [.fdroid.yml](.fdroid.yml)
- **F-Droid submission checklist:** [fdroid/SUBMISSION.md](fdroid/SUBMISSION.md)

---

## ⚠️ Current Release Notes

BlueNote is actively developed. Version `1.0.1` streamlines the experimental AI Studio by retaining image generation/editing while removing AI video generation and AI music/song generation. The F-Droid flavor is intended to provide a free-software Android distribution of the local-first core.

The F-Droid repository performs its own independent review and build process. Presence of F-Droid configuration in this upstream repository does not by itself mean that the application has been accepted into the official F-Droid repository.
