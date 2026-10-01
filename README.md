# BlueNote — AI Life & Work Operating System

BlueNote is a complete **AI Life & Work Operating System** combining **PROJECTS OS** (10 GB multi-file project containers, document versioning, lyric/topic organization, and interactive HTML photo albums), **AI Studio Lab** (ultra-crisp **FLUX.1 8K Image Generation**, **LTX-Video AI MP4 Video Generation**, and **Studio-Mastered MP3 + 48kHz Stereo FM Music Synthesis**), **Brain Dump & OCR**, **Tasks & Kanban**, **Notes & Wiki**, **Calendar**, **Contacts**, **Predictive Lists**, and **Second Brain Graph**.

---

## 🌐 Live Web App & Android APK

- **GitHub Pages Web App:** [https://lilsynnofficial.github.io/BLUENOTE/](https://lilsynnofficial.github.io/BLUENOTE/)
- **Direct Installable Android APK:** [Download `bluenote-android-installable.apk`](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/latest/download/bluenote-android-installable.apk)
- **GitHub Actions Build Artifacts:** [Android Release Workflow](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml)

---

## 🔐 Firebase Authentication & Security Architecture

1. **Primary User Authentication via Firebase (`src/firebase.ts` & `src/components/AuthModal.tsx`):**
   - BlueNote uses **Firebase Authentication** (`projectId: "ai-studio-applet-webapp-d45ee"`, `authDomain: "ai-studio-applet-webapp-d45ee.firebaseapp.com"`) for **Google Sign-In** (`signInWithPopup` with `signInWithRedirect` fallback) and **Email/Password Authentication** (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`).
   - Normal users **never** enter developer API keys, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or Firebase credentials.
2. **Firebase Console Authorized Domain Configuration (`lilsynnofficial.github.io`):**
   - `authDomain` in `src/firebase.ts` always points to the canonical Firebase Auth handler (`ai-studio-applet-webapp-d45ee.firebaseapp.com`).
   - For Google OAuth popups/redirects to succeed on `https://lilsynnofficial.github.io`, `lilsynnofficial.github.io` must be listed under **Firebase Console → Authentication → Settings → Authorized domains** for the `ai-studio-applet-webapp-d45ee` Firebase project.
3. **Strict Server-Side Secret Isolation (`server.ts`, `vite.config.ts`, `.env.example`):**
   - Confidential credentials (`GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`) are read **exclusively on the backend** (`server.ts` via `process.env`).
   - No `VITE_*` secret variables or `vite.config.ts` `define` secret injections exist, ensuring zero secrets are ever bundled into `dist/`, GitHub Pages, or Android APK assets.

---

## ✨ Built-In AI Engines (Zero User Configuration Required)

BlueNote works **out of the box with zero API keys required from users**:

- **Ultra-Crisp AI Image Studio (`FLUX.1-schnell` + `FLUX.1-Merged` + 2K Unsharp Enhancer):**
  - Direct GPU generation via Black Forest Labs `FLUX.1-schnell` and `FLUX.1-Merged` (8-step HD), with automatic multi-space failover and an on-device **3×3 Unsharp Mask & Micro-Contrast Enhancer** (`2K Crisp` button).
- **AI Video Studio (`Lightricks LTX-Video` + `Wan2.1` + 8 Mbps Ken Burns HD MP4/WebM):**
  - Generates AI `.mp4` video clips via `Lightricks/ltx-video-distilled` & `Wan-AI/Wan2.1`, or renders an ultra-crisp FLUX.1 keyframe first and records smooth camera motion at 8 Mbps HD bitrate.
- **Studio-Mastered `.MP3` Music & 48kHz Stereo FM Synthesizer:**
  - Matches prompts against studio-mastered `.MP3` tracks with AI-written song lyrics, plus an upgraded **48,000 Hz 16-bit stereo FM Rhodes + sub-bass + stereo ping-pong reverb synthesizer**.
- **PROJECTS OS Document, Lyric & Topic Organization:**
  - Built-in multi-document lyric extraction (`All_Lyrics_Organized.md`), **Topic-Focused Multi-Document Merger** (`Merged_<Topic>.md`), perceptual hash duplicate photo detection, and standalone interactive HTML photo album export.

---

## 🛠️ Local Development & Building

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server on port 3000
npm run dev

# 3. Build production bundle
npm run build

# 4. Sync web bundle into Android WebView & build APK
npm run android:sync
cd android && ./gradlew assembleFdroidRelease
```
