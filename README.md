# ✨ BlueNote — AI-Powered Personal Organizer, Second Brain & Project Operating System

> **"Remember everything. Organize anything. Focus on what matters."**

[![Live on GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-lilsynnofficial.github.io%2FBLUENOTE-2563eb?style=for-the-badge&logo=github)](https://lilsynnofficial.github.io/BLUENOTE/)
[![Repository](https://img.shields.io/badge/Repo-LILSYNNOFFICIAL%2FBLUENOTE-0f172a?style=for-the-badge&logo=github)](https://github.com/LILSYNNOFFICIAL/BLUENOTE)
[![Android Direct APK](https://img.shields.io/badge/Android-Direct%20APK%20Download-059669?style=for-the-badge&logo=android)](#android-application--direct-apk-download)
[![100% Local AI](https://img.shields.io/badge/AI%20Engine-100%25%20On--Device%20%E2%80%A2%20Zero%20API%20Keys-059669?style=for-the-badge)](#10-100-local-multimodal-ai-studio-zero-api-keys-required)
[![Built with React 19 & Vite](https://img.shields.io/badge/Stack-React%2019%20%E2%80%A2%20TypeScript%20%E2%80%A2%20Tailwind%204-4f46e5?style=for-the-badge)](#tech-stack--architecture)

**BlueNote** is a comprehensive, local-first **Personal Organizer, AI-Powered Project Operating System (`PROJECTS`), Quiet Predictive Pattern Engine, Habit & Streak Analytics Tracker, Smart Note Editor, Personal CRM, Knowledge Graph, and Multimodal AI Studio**.

Designed to start **100% clean with zero pre-loaded demo clutter**, BlueNote features an animated startup splash screen and a **5-Step Interactive Onboarding Wizard**, runs its entire AI suite **100% locally in your browser with zero external API keys required** (plus optional BYOK/Cloud AI providers), and supports real-time cloud synchronization via Firebase Authentication & Firestore.

---

## 🌐 Live Deployment & Repository Links

- **GitHub Repository:** [https://github.com/LILSYNNOFFICIAL/BLUENOTE](https://github.com/LILSYNNOFFICIAL/BLUENOTE)
- **Live GitHub Pages URL:** [https://lilsynnofficial.github.io/BLUENOTE/](https://lilsynnofficial.github.io/BLUENOTE/)

> **🔒 Isolated Project Pages Guarantee:**
> BlueNote is configured with relative asset paths (`base: './'`) and a scoped PWA manifest (`scope: './'`) so that it deploys strictly to its own repository subpath (`https://lilsynnofficial.github.io/BLUENOTE/`). **It does not touch, overwrite, or interfere with your root `lilsynnofficial.github.io` site or any other GitHub Pages repositories on your account.**

---

## 🚀 Key Features & Modules

### 1. 100% Clean Zero-Demo Guarantee & 5-Step Interactive Onboarding Wizard
- **Zero Demo Clutter:** New users start with a completely clean workspace (`tasks`, `notes`, `projects`, `OSProjects`, `documents`, `photoAlbums`, `habits`, `events`, `contacts`, `links`, `files`, and `personalPatterns` all start at `0`).
- **Animated Startup Splash Screen (`SplashScreen.tsx`):** Displays real-time engine initialization stages with an instant **Enter Workspace** / **Replay** option.
- **Interactive 5-Step Onboarding Wizard (`OnboardingWizardModal.tsx`):**
  1. **Step 1 — Profile, 12 Live Studio Themes & Energy Calibration:** Set your display name, profile photograph, bio, AI assistant personality, default energy mode (*High Energy*, *Balanced Flow*, *Low Energy / Overwhelmed*), and preview all **12 Studio Themes** live.
  2. **Step 2 — 7 Core Architectural Pillars Tour:** Interactive walkthrough covering Omnibox Capture, the **PROJECTS AI Operating System**, AI Brain Dump & OCR Vault, the Quiet Predictive Pattern Engine, Deep Execution & Pomodoro, 30-Day Habit Heatmaps, and the Second Brain Graph.
  3. **Step 3 — PROJECTS AI Operating System Setup:** Explore the 12-module Project Workspace (10 GB chunked uploads, non-destructive version diffs, HTML photo albums, and AI Sandbox) and optionally create your first clean project container (blank by default).
  4. **Step 4 — Personal Pattern Engine & Anti-Nagging Safeguards:** Calibrate your predictive rollout stage (*Stage 3 Shopping MVP*, *Stage 5 + Tasks & Reminders*, or *Stage 7 Cross-System Prep*) and Centralized Predictive Inbox suggestion budget.
  5. **Step 5 — Clean Zero-Demo Launch:** Choose your initial destination (**Today Command Center** or **PROJECTS AI Workspace**), optionally select daily habits (`0` selected by default), or capture your first real task/note.

---

### 2. 📂 PROJECTS — Complete AI-Powered Project Operating System (10 GB Quota)
Accessible from the top-level **PROJECTS** item in the main sidebar, the Dashboard hero bar, or by pressing **`⌘K` → `P`**, **PROJECTS** is a complete, modular operating system for managing project knowledge, large document collections, versions, media, photo albums, tasks, and non-destructive AI workflows:

- **Projects Home & Isolated Containers (`ProjectsOSView.tsx`):**
  - Create, open, rename, duplicate, archive/restore, delete, search, sort, and filter projects (*Active*, *Recently Opened*, *Recently Modified*, *Archived*).
  - Built-in project templates (*Blank Project*, *Writing Project*, *Music Project*, *Research Project*, *Photo Project*, *Business Project*, *Custom*) — each initialized as a clean, zero-demo container with a **10 GB storage quota**.
- **12 Integrated Workspace Modules per Project:**
  1. **Overview Dashboard:** Quick actions (`[ UPLOAD ]`, `[ NEW DOCUMENT ]`, `[ NEW NOTE ]`, `[ NEW TASK ]`, `[ ASK AI ]`, `[ MERGE DOCUMENTS ]`, `[ PHOTO ALBUM ]`), live project metrics, recent document versions, open tasks, and AI activity feed.
  2. **Documents & 10 GB Chunked Upload Engine (`ProjectsOSDocumentsSubView.tsx`):**
     - Supports `.txt`, `.md`, `.doc`, `.docx`, and `.pdf` with **2 MB chunked streaming uploads** backed by IndexedDB (`bluenote_projects_os_chunks_v1`), live upload progress bar, transfer speed (`MB/s`), ETA, and **Pause / Resume / Cancel** controls without loading multi-GB files into browser RAM.
     - **True Binary `.DOCX` & Multi-Page `.PDF` Extraction:** Client-side binary parser extracts `word/document.xml` from `.docx` ZIP containers (via `DecompressionStream('deflate-raw')`) preserving headings (`H1`/`H2`/`H3`) and paragraphs, and parses `.pdf` text blocks (`BT...ET`, `Tj`/`TJ`) with automatic page markers.
     - **Split-Screen Live Markdown Preview & Clickable TOC Outline:** Switch between `Edit`, `Split Preview`, and `Reader` modes with a live Table of Contents sidebar that extracts `# Headings`, `[Verse]`/`[Chorus]` markers, and page numbers with section word counts and 1-click cursor jump.
     - **Non-Destructive Version History:** Preserves every stage (`Original → Working Version → Edited Version → Final Version`) with 1-click **View**, **Compare**, **Restore**, and **Download**.
     - **Word-Level Inline Diff & Side-by-Side Comparison Studio:** Toggle between **Word-Level Inline Diff** (highlighting exact deleted `[-word-]` and added `{+word+}` tokens within modified lines) and **Side-by-Side Line Diff** with **Accept Version**, **Restore Version**, and **Create Combined Version**.
     - **Merge Documents Studio:** Combine multiple documents with drag/reorder controls, custom headings/separators, duplicate passage removal, and AI organization while leaving original files untouched.
     - **Dynamic Smart Collections & Duplicate Detection:** Rule-based Smart Collections (e.g., `Content Type = Lyrics` AND `Status = Unfinished`) plus automatic duplicate/near-duplicate cluster detection with `[ COMPARE ]`, `[ MERGE ]`, and `[ KEEP SEPARATE ]` actions.
  3. **General Files Layer:** Manage `.csv`, `.xlsx`, `.json`, `.zip`, documents, images, audio, and video with tag filtering and instant downloads.
  4. **Project Notes / Scratchpad:** Fast markdown scratchpad with pinning, tags, search, and **1-Click AI Scratchpad Organizer** to transform raw thoughts into structured project notes.
  5. **Project Tasks & Checklists:** Full task & step-by-step checklist manager with priority levels, due dates, **1-Click Document → Task Checklist extraction**, individual task sync, and **Sync All Open Tasks to Global Tasks**.
  6. **Pro Media Studio (Audio, Video & Transcripts):** Interactive 40-bar **Audio Waveform Visualizer** with click-to-seek, variable **Playback Speed (`0.5x`–`2.0x`)**, **A–B Section Loop Markers** (`[A]` / `[B]` / `Loop ON`) for rehearsing or transcribing demos, and **`+ [mm:ss] Stamp`** insertion into searchable transcripts.
  7. **Standalone HTML Photo Album Builder:** Upload multiple photos (`JPG`, `PNG`, `WEBP`, `GIF`), automatically scan for visual duplicates via **8×8 Perceptual Luminance Hashing (`aHash`)** with 1-click **Deduplicate Album**, choose from **4 Visual Themes** (*Dark Cinema*, *Editorial White*, *Warm Gallery*, *Neon Studio*), configure **Auto-Play Slideshow (`3s`–`8s`)**, and export a **standalone, zero-dependency `My_Photo_Album.html`**.
  8. **AI Workspace, Sandbox Mode & Automated Pipelines:**
     - **ASK THIS PROJECT:** Natural-language intelligence briefing across all documents, notes, tasks, and media in the project.
     - **10 Specialized AI Actions:** *Summarize*, *Extract Tasks*, *Organize Notes*, *Clean Up Formatting*, *Tag Content*, *Merge & Synthesize*, *Find Duplicates*, *Build Master Index*, *Compare Versions*, and *Generate Outline*.
     - **Non-Destructive AI Sandbox Mode:** Inspect AI-generated proposals side-by-side against original source documents before clicking **Approve & Commit** or **Discard**.
     - **Custom AI Workflow Pipeline Builder:** Create and execute multi-step automated chains (e.g., `FIND ALL LYRICS → GROUP BY SONG → REMOVE DUPLICATES → CREATE MARKDOWN DOCUMENT`).
  9. **Exact + Conceptual Semantic Search:** Search across a single document or the entire project using **Exact Keyword Match** or **AI Conceptual Search** (e.g., searching *"songs about losing someone"* surfaces lines like *"I watched you disappear..."* with clickable document/line jump).
  10. **Project Timeline:** Chronological audit trail of uploads, version diffs, AI operations, and custom milestones.
  11. **Interactive SVG Knowledge Graph:** Visualizes content relationships (`SONG → LYRICS → DEMO → MASTER TASK → ARTWORK → VIDEO`) with AI relationship auto-discovery and manual entity linking.
  12. **Settings & 6-Mode Export Studio (Including Complete `.ZIP` Bundle):** Inspect the live 10 GB storage bar, configure permissions and local/hybrid AI processing, and export your project as a **Complete PKZIP Project Bundle (`.zip` with CRC32 integrity checksums)**, **Full Archive JSON**, **Multi-Document Markdown Bundle (`.md`)**, **AI Master Content Bundle**, **Standalone HTML Photo Album (`.html`)**, or **`Project_Manifest.json`**.
- **Cross-System Deep Bridges:**
  - **Send to PROJECTS from Second Brain Notes:** Push any note in `NotesEditorView` directly into `PROJECTS` as a 4-stage versioned document in 1 click.
  - **Global `⌘K` Command Palette Indexing:** Search across all `PROJECTS` workspaces and documents from anywhere in BlueNote via `⌘K`.

---

### 3. 🔮 Quiet Predictive Lists & Personal Pattern Engine
- **Core Loop:** `Observe → Learn → Predict → Explain → Ask → Learn from the Answer`.
- **Strict Hypothesis vs. Known Fact Distinction:** Every prediction card clearly separates **Known Fact** (what you explicitly recorded and when) from **Hypothesis** (what BlueNote inferred from your recurrence intervals), and never makes false physical inventory claims.
- **Anti-Nagging Safeguards:** Single occurrences remain silent (`OBSERVED`), denials trigger exponential cooldowns, active suggestions are capped by your **Suggestion Budget**, and natural-language commands like *"Stop suggesting coffee"* permanently suppress a pattern.

---

### 4. Adaptive Today Dashboard & 30-Day Recharts Habit Analytics
- **7-Day Weekly Habit Checkmark Grid & 30-Day Heatmaps:** Interactive habit tracker with day-by-day checkmarks, individual habit streaks (`🔥 Xd`), weekly completion targets, and 30-day completion heatmaps.
- **30-Day Recharts Data Visualization:** Daily Completion Rate (%) area trendline, 7-Day Rolling Average (%) curve, and Active Streak Momentum bar series.
- **Energy-Aware Task Filtering & 1-Click AI Workload Redistributor:** Dynamically adapts your task view to your current energy state and rebalances overloaded schedules.

---

### 5. Universal Capture, AI Brain Dump & Multimodal OCR Scanner
- **Global Omnibox Quick Capture:** Type natural sentences anywhere in the header or Dashboard (e.g., *"Remind me Friday at 2pm to call Alex"*, *"Buy oat milk and coffee beans"*) for instant classification.
- **Multi-Intent Brain Dump Modal (`BrainDumpModal.tsx`):** Paste unstructured paragraphs or dictate via voice; BlueNote extracts separate Tasks, Reminders, Calendar Events, Contacts, Saved Links, Shopping Items, and Smart Notes into an interactive review screen.
- **On-Device OCR Scanner:** Extract text, line items, and contact details from Receipts, Business Cards, Handwritten Sticky Notes, and Whiteboards.

---

### 6. Tasks, Kanban Board, Split-Screen Notes, CRM & Second Brain Graph
- **Tasks & Checklists (`TasksAndChecklistsView.tsx`):** List & Kanban views, subtasks, recurring rules, Pomodoro Focus launcher, and categorized Shopping & Errands lists.
- **Split-Screen Markdown Note Editor (`NotesEditorView.tsx`):** Rich formatting toolbar, color-coded cards, 1-click templates, on-device executive summarizer, and version history drawer.
- **Personal CRM Contacts, Saved Links & OCR File Vault (`ContactsLinksFilesView.tsx`):** Contact cards with interaction logs, duplicate contact merging, categorized bookmarks, and indexed OCR files.
- **Second Brain Knowledge Graph (`SecondBrainGraphView.tsx`):** Interactive SVG network map connecting notes, projects, contacts, tasks, and files with 1-click AI relationship discovery.

---

### 7. 100% Local Multimodal AI Studio & Optional Free/BYOK AI Providers
- **Works 100% Out-of-the-Box with Zero API Keys:** Built-in local engines for HD Canvas Image Synthesis, Animated Video Stream Recording, Web Audio PCM `.wav` Ambient/Lo-Fi Music Synthesis, and Web Speech Voice Transcription.
- **Optional Free & BYOK AI Provider Hub (`AIKeysAndFreeAIModal.tsx`):** Connect Google Gemini, OpenRouter (free models), Groq, Mistral, Cohere, HuggingFace, or local Ollama/LM Studio endpoints anytime.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tooling** | Vite 8 (`base: './'` for universal GitHub Pages & root compatibility) |
| **Styling & Design System** | Tailwind CSS 4 + Lucide React Icons + 12 Studio Themes |
| **Data Visualization** | Recharts + Custom Interactive SVG Knowledge Graphs |
| **Local Persistence** | Instant `localStorage` (`bluenote_workspace_clean_v4`, `bluenote_ai_projects_os_clean_v2`) + `IndexedDB` 2 MB Chunk Store (`bluenote_projects_os_chunks_v1`) |
| **Cloud Sync & Auth** | Firebase Authentication (Google Sign-In) + Cloud Firestore (`/workspaces/{userId}`) |
| **On-Device AI Engines** | Local Document Diff/Merge/Semantic Engine, HTML5 Canvas 2D Shader Engine, MediaRecorder Stream Synthesis, Web Audio PCM WAV Synthesizer, Web Speech API |

---

## 📦 Local Development & Build

```bash
# 1. Clone your repository
git clone https://github.com/LILSYNNOFFICIAL/BLUENOTE.git
cd BLUENOTE

# 2. Install dependencies
npm install

# 3. Start the local development server on http://localhost:3000
npm run dev

# 4. Type-check and build the production static bundle into ./dist
npm run build
```

---

## 🤖 Android Application — Direct APK Download

BlueNote is currently distributed to Android users as a **direct-install APK from GitHub Releases**. There is **no Google Play Store listing** at this time. F-Droid support is planned separately.

### 📱 Install BlueNote on Android

**[⬇️ DOWNLOAD THE LATEST BLUENOTE APK](https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/latest/download/BlueNote.apk)**

The download above is the normal user installation path. Users do **not** need Node.js, npm, Android Studio, Gradle, or any developer commands.

1. Open the download link on an Android device.
2. Download `BlueNote.apk`.
3. If Android asks, allow the browser/file manager to install apps from that source.
4. Open the APK and tap **Install**.
5. Launch BlueNote.

**GitHub Release page:** https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases

### 🔧 How the APK is produced

GitHub Actions automatically builds the Android APK from the repository's Android WebView project.

- **Workflow:** `.github/workflows/android-release.yml`
- **Build:** `gradle assembleFdroidRelease`
- **Target SDK:** API 35
- **Minimum SDK:** API 24 (Android 7.0+)
- **Application ID:** `io.github.lilsynnofficial.bluenote`
- **Release asset:** `BlueNote.apk`
- **Checksum:** `BlueNote.apk.sha256`
- **Actions artifact:** `BlueNote-Android-APK` (kept for 30 days as a build/debug backup)
- **Public distribution:** GitHub Releases, not the Actions artifact page

### 🚀 Publishing a new Android APK release

Normal pushes to `main` continue to build and verify the APK. When a stable Android build is ready for public distribution, create a version tag such as `v1.0.0`.

The Android workflow detects `v*` tags and automatically:

1. Builds the installable APK.
2. Verifies the APK exists.
3. Generates a SHA-256 checksum.
4. Uploads the APK and checksum as workflow artifacts.
5. Creates a GitHub Release and attaches `BlueNote.apk`.
6. Makes the release available through the stable **latest release download** link used by the app and README.

GitHub provides stable links to the latest release and its assets, which makes the Release asset a much better public download surface than requiring users to navigate through Actions runs and temporary workflow artifacts.

### 🛠️ Developer build commands

For contributors/developers only:

~~~bash
# Install dependencies
npm install

# Build the web application
npm run build

# Sync the web build into the Android WebView assets
npm run android:sync

# Build the Android APK
cd android
gradle assembleFdroidRelease
~~~

### 🧪 F-Droid status

BlueNote includes an `fdroid` product flavor and F-Droid submission configuration, but **F-Droid is not currently the primary Android download path**. The direct GitHub Release APK is available independently of the F-Droid review/update cycle.

### 🚫 Google Play Store status

BlueNote is **not currently published on Google Play**. The project may retain Play Store build configuration for future use, but users should not be directed to Google Play for the current Android installation.

---
## ⌨️ Keyboard Shortcuts & Quick Actions

| Shortcut / Trigger | Action |
| :--- | :--- |
| `⌘K` / `Ctrl + K` | Open Global Command Palette & Semantic Search |
| `⌘K` → `P` | Jump directly to **PROJECTS — AI-Powered Project Workspace (10 GB Docs, Diffs, Photo Albums)** |
| `⇧⌘B` / `Ctrl + Shift + B` | Open Multi-Item AI Brain Dump & Voice Dictation Modal |
| **Top Quick Capture Input** | Type natural language to create a Task, Reminder, Event, Contact, Shopping Item, or Note |
| **Header → Scan OCR** | Open Receipt, Business Card & Handwritten Note OCR Scanner |
| **Header → Focus Timer** | Launch Pomodoro & Deep Work Timer (25m / 50m / 90m) |
| **Sidebar → Onboarding Guide** | Re-run the 5-Step Zero-Demo Onboarding & Personalization Wizard anytime |

---

## 📄 License

SPDX-License-Identifier: Apache-2.0
