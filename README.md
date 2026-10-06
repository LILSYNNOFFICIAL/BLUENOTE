# BlueNote — AI Life & Work Operating System

<p align="center">
  <strong>A local-first Android/Web workspace for projects, notes, tasks, documents, contacts, calendars, OCR, and creative work.</strong>
</p>

<p align="center">
  <a href="https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml"><img src="https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml"><img src="https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml/badge.svg" alt="Android Release"></a>
  <a href="https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/tag/v1.0.3"><img src="https://img.shields.io/github/v/release/LILSYNNOFFICIAL/BLUENOTE?display_name=tag" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="Apache 2.0"></a>
</p>

## 🚀 Quick Links

| | Link |
|---|---|
| 🌐 **Web App** | [Open BlueNote](https://lilsynnofficial.github.io/BLUENOTE/) |
| 📱 **Latest Published Android Release** | [v1.0.3](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/tag/v1.0.3) |
| 📦 **Play Store APK** | [Download APK](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.3/bluenote-playstore.apk) |
| 🛡️ **F-Droid APK** | [Download APK](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.2/bluenote-fdroid.apk) |
| 🔐 **SHA-256 Checksums** | [SHA256SUMS.txt](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.2/SHA256SUMS.txt) |
| 💻 **Source Code** | [GitHub Repository](https://github.com/LILSYNNOFFICIAL/BLUENOTE) |
| 🐛 **Bug Reports / Issues** | [GitHub Issues](https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues) |
| ⚙️ **CI / Validation** | [GitHub Actions](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml) |
| 🤖 **Android Release Pipeline** | [Build & Release Workflow](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml) |
| 🌍 **Pages Deployment** | [Deployment Workflow](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/deploy.yml) |

> **Release candidate: v1.0.3.** The F-Droid build is hardened to exclude Firebase, remote AI/image transports, remote OCR runtime downloads, and Google Fonts. The release workflow must publish the audited `v1.0.3` tag after CI/build verification.

## 🧠 What Is BlueNote?

BlueNote is a **local-first AI Life & Work Operating System** built as an Android/Web application.

It brings everyday organization and creative workflows into one place:

- **PROJECTS OS** — project containers, documents, versions, lyrics/topics, and photo albums
- **Notes & Wiki**
- **Tasks & Kanban**
- **Calendar & planning**
- **Contacts and linked files**
- **Brain Dump & OCR**
- **Predictive Lists**
- **Second Brain Graph**
- **AI image generation/editing** for optional creative workflows
- **Offline/local-first core workflows** that do not require a user API key

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

Capture ideas quickly and turn images into searchable text.

OCR includes a keyless browser fallback through Tesseract.js, with optional richer extraction integrations where configured.

### AI Image Tools

The normal distribution includes optional AI image-generation/editing workflows.

**AI video generation and AI music/song generation are not part of the current release.**

## 📱 Android

Application ID:

`io.github.lilsynnofficial.bluenote`

BlueNote uses two Android product flavors:

| Flavor | Purpose | Firebase web services | Distribution |
|---|---|---|---|
| `fdroid` | Local-first / free-software Android build | Excluded from F-Droid web bundle | F-Droid |
| `playstore` | Google Play distribution | Supported where configured | Google Play |

### v1.0.3 source preparation

- **Source version:** `1.0.3`
- **Android version code:** `4`
- **Package ID:** `io.github.lilsynnofficial.bluenote`
- **Release tag:** `v1.0.3` pending publication
- **Security:** Android WebView hardened against untrusted origins and file access; app backup disabled; dependency and CodeQL security auditing enabled.
- **APK status:** the published APK pair remains v1.0.2 until the Android release workflow publishes v1.0.3.

### v1.0.2

- **Version:** `1.0.2`
- **Version code:** `3`
- **Release tag:** `v1.0.2`
- **Package ID:** `io.github.lilsynnofficial.bluenote`
- **Release:** [GitHub v1.0.2](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/tag/v1.0.2)

### Download Android builds

**Play Store variant**

[⬇️ Download BlueNote Play Store APK](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.2/bluenote-playstore.apk)

**F-Droid variant**

[⬇️ Download BlueNote F-Droid APK](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.2/bluenote-fdroid.apk)

**Verify downloads**

[🔐 Download SHA256SUMS.txt](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/download/v1.0.2/SHA256SUMS.txt)

> The F-Droid APK in the GitHub release is the upstream build artifact. Official F-Droid inclusion and signing are handled separately by F-Droid maintainers.

### Google Play

The Play Store flavor produces the signed Android App Bundle used for Google Play distribution.

**The public Google Play listing is not linked here until the app has an official Play Store listing.**

## 🛡️ F-Droid / Free Software Build

BlueNote includes an explicit F-Droid build path designed to keep the Android distribution independent of Firebase web authentication and cloud synchronization.

### Build flow

1. Install Node.js/npm dependencies.
2. Build the web application with `F_DROID_BUILD=true`.
3. Copy the generated `dist/` bundle into Android WebView assets.
4. Build the `fdroid` Android product flavor with Gradle.
5. Produce the F-Droid release APK.

Packaging files:

- [`.fdroid.yml`](.fdroid.yml)
- [F-Droid build recipe](fdroid/io.github.lilsynnofficial.bluenote.yml)
- [F-Droid submission checklist](fdroid/SUBMISSION.md)
- [Fastlane metadata](fastlane/metadata/android/en-US/)

The F-Droid build metadata uses an immutable release commit rather than a moving branch or `HEAD`.

### Local F-Droid build

```bash
npm ci --legacy-peer-deps --no-fund --no-audit
F_DROID_BUILD=true npm run build

mkdir -p android/app/src/main/assets/public
cp -r dist/* android/app/src/main/assets/public/

cd android
./gradlew assembleFdroidRelease
```

Expected APK path:

`android/app/build/outputs/apk/fdroid/release/app-fdroid-release-unsigned.apk`

## 🔐 Security & Privacy Architecture

BlueNote separates the normal web/Play distribution from the F-Droid/local-first distribution.

### Web / Play distribution

The normal application can use Firebase Authentication for:

- Google Sign-In
- Email/password authentication
- Password reset
- Cloud workspace synchronization where configured

Confidential backend credentials such as API keys and OAuth secrets are intended to remain server-side and are not intentionally exposed through `VITE_*` client variables or Vite build-time secret injection.

### F-Droid distribution

The F-Droid flavor is designed around the local-first application path:

- Firebase web authentication/synchronization is excluded from the F-Droid web bundle.
- Core organizer workflows remain available locally.
- User API keys are not required for the core organizer.
- Keyless browser OCR fallback is available through Tesseract.js.
- Optional online AI/image integrations are not required for the core notes, tasks, organizer, habits, OCR, and offline workflows.

F-Droid maintainers perform the final independent source, dependency, network-service, licensing, Anti-Feature, and reproducible-build review.

## 🧰 Local Development

### Requirements

- Node.js / npm
- Android SDK
- Java 17
- Gradle wrapper included in the Android project

### Install dependencies

```bash
npm install
```

### Web development

```bash
npm run dev
```

### Production web build

```bash
npm run build
```

### Type-check

```bash
npm run lint
```

### Android synchronization

```bash
npm run android:sync
```

### Android F-Droid release

```bash
npm run android:sync:fdroid
cd android
./gradlew assembleFdroidRelease
```

### Android Play Store release

```bash
npm run android:sync
cd android
./gradlew bundlePlaystoreRelease
```

## ⚙️ Continuous Integration & Releases

BlueNote uses GitHub Actions for validation and Android release automation.

### CI

[![CI](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml/badge.svg)](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml)

The CI pipeline validates the web application and Android/F-Droid build paths.

### Android release pipeline

[![Android Release](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml/badge.svg)](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml)

The release pipeline:

1. Checks out the exact release source.
2. Sets up Node.js 22, Java 17, Android SDK, and Gradle 8.9.
3. Builds the Play Store web bundle.
4. Validates production signing material.
5. Builds the signed Play Store APK and AAB.
6. Builds the F-Droid APK.
7. Generates SHA-256 checksums.
8. Preserves existing immutable GitHub releases.
9. Publishes release assets for new releases.

### Current verified release run

**v1.0.2 release workflow:** [Run #35](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/runs/37121158449)

Status: **SUCCESS**

Verified stages include:

- Signed Play Store APK build
- Play Store AAB build
- F-Droid APK build
- Release asset preparation
- GitHub release-state check
- Signing material cleanup

## 📦 Release Assets

For each published GitHub release, BlueNote can provide:

- Play Store APK
- F-Droid APK
- SHA-256 checksums

See the [Releases page](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases).

## 📋 F-Droid Submission

The upstream repository contains:

- F-Droid build recipe
- Android product flavor
- Fastlane text metadata
- License information
- Submission documentation

The official F-Droid process remains a separate review. Configuration in this repository does **not** by itself mean BlueNote has been accepted into the official F-Droid repository.

Packaging resources:

- [F-Droid recipe](fdroid/io.github.lilsynnofficial.bluenote.yml)
- [Submission checklist](fdroid/SUBMISSION.md)
- [Fastlane metadata](fastlane/metadata/android/en-US/)
- [F-Droid build configuration](.fdroid.yml)

## 📄 License

BlueNote is released under the **Apache License 2.0**.

See [LICENSE](LICENSE).

## 🔗 Project Links

- 🌐 **Web App:** https://lilsynnofficial.github.io/BLUENOTE/
- 💻 **GitHub:** https://github.com/LILSYNNOFFICIAL/BLUENOTE
- 📱 **Latest Release:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/tag/v1.0.2
- 📦 **All Releases:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases
- 🐛 **Issues:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues
- ⚙️ **CI:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/ci.yml
- 🤖 **Android Release Workflow:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml
- 🌍 **Pages Deployment:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/deploy.yml
- 🛡️ **F-Droid Recipe:** [.fdroid.yml](.fdroid.yml)
- 📋 **F-Droid Submission:** [fdroid/SUBMISSION.md](fdroid/SUBMISSION.md)
- 📜 **License:** [LICENSE](LICENSE)

---

**BlueNote v1.0.3** • Local-first organization • Android + Web • Apache 2.0
