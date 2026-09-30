# ✨ BlueNote — AI-Powered Personal Organizer & Second Brain

> **"Remember everything. Organize anything. Focus on what matters."**

[![Live on GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-lilsynnofficial.github.io%2FBLUENOTE-2563eb?style=for-the-badge&logo=github)](https://lilsynnofficial.github.io/BLUENOTE/)
[![Repository](https://img.shields.io/badge/Repo-LILSYNNOFFICIAL%2FBLUENOTE-0f172a?style=for-the-badge&logo=github)](https://github.com/LILSYNNOFFICIAL/BLUENOTE)
[![Android F-Droid & Play Store](https://img.shields.io/badge/Android-F--Droid%20%26%20Google%20Play%20Ready%20(API%2035)-059669?style=for-the-badge&logo=android)](#android-application--f-droid--google-play-store-build-guide)
[![100% Local AI](https://img.shields.io/badge/AI%20Engine-100%25%20On--Device%20%E2%80%A2%20Zero%20API%20Keys-059669?style=for-the-badge)](#9-100-local-multimodal-ai-studio-zero-api-keys-required)
[![Built with React 19 & Vite](https://img.shields.io/badge/Stack-React%2019%20%E2%80%A2%20TypeScript%20%E2%80%A2%20Tailwind%204-4f46e5?style=for-the-badge)](#tech-stack--architecture)

**BlueNote** is a comprehensive, local-first **Personal Organizer, Habit & Streak Analytics Tracker, Smart Note Editor, Personal CRM, Knowledge Graph, and Multimodal AI Studio**. Designed to start 100% clean with an animated startup splash screen and a 5-step interactive onboarding tutorial, BlueNote runs its entire AI suite **100% locally in your browser with zero external API keys required**, while offering optional real-time cloud synchronization via Firebase Authentication & Firestore.

---

## 🌐 Live Deployment & Repository Links

- **GitHub Repository:** [https://github.com/LILSYNNOFFICIAL/BLUENOTE](https://github.com/LILSYNNOFFICIAL/BLUENOTE)
- **Live GitHub Pages URL:** [https://lilsynnofficial.github.io/BLUENOTE/](https://lilsynnofficial.github.io/BLUENOTE/)

> **🔒 Isolated Project Pages Guarantee:**
> BlueNote is configured with relative asset paths (`base: './'`) and a scoped PWA manifest (`scope: './'`) so that it deploys strictly to its own repository subpath (`https://lilsynnofficial.github.io/BLUENOTE/`). **It does not touch, overwrite, or interfere with your root `lilsynnofficial.github.io` site or any other GitHub Pages repositories on your account.**

---

## 🚀 Key Features & Modules

### 1. Startup Splash Screen & 5-Step First-Time Onboarding Wizard
- **Zero Demo Clutter:** New users start with a completely clean workspace (`tasks`, `notes`, `projects`, `habits`, `events`, `contacts`, `links`, and `files` all start empty), while preserving folder structures and 1-click starter templates.
- **Animated Startup Splash Screen (`SplashScreen.tsx`):** Displays real-time engine initialization stages with an instant **Skip Intro** option.
- **Interactive 5-Step Onboarding Tutorial (`OnboardingWizardModal.tsx`):**
  1. **Personalize Profile & Theme:** Configure your display name and choose between *Signature Blue*, *Daylight Minimal*, or *Midnight Slate* dark mode.
  2. **Adaptive Energy & AI Coaching Style:** Set your current energy mode (*Focused*, *Normal*, *Busy*, *Tired*, *Vacation*) and preferred AI persona (*Personal Assistant*, *Executive Coach*, *Friendly Encourager*, *Minimalist*).
  3. **Weekly Habit Setup:** Select optional starter habits or create your own custom daily habit.
  4. **Interactive Quick Capture Tutorial:** Live natural-language parsing preview that shows how BlueNote classifies thoughts into Tasks, Reminders, Calendar Events, and Shopping items.
  5. **4-Pillar Second Brain Tour:** Guided overview of the workspace before launching into the Dashboard.

### 2. Adaptive Today Dashboard & 30-Day Recharts Habit Analytics
- **7-Day Weekly Habit Checkmark Grid:** Interactive rolling 7-day habit tracker with day-by-day checkmarks, individual habit streaks (`🔥 Xd`), weekly completion targets (`X/7 wk`),Best Streak badge, and inline **+ Add Habit** creator.
- **30-Day Recharts Data Visualization:**
  - **Daily Completion Rate (%)** area trendline + **7-Day Rolling Average (%)** curve.
  - **Active Streak Momentum** bar series tracking consecutive check-in momentum across 30 days.
  - **Summary KPI Strip:** 30-Day Average Completion, Recent 7D vs. Prior 7D Momentum Delta, Total 30-Day Check-ins, and Active Streak Leaders.
- **Energy-Aware Task Filtering:** Dynamically adapts your visible task list based on whether you are in *Focused*, *Normal*, *Busy*, *Tired*, *Sick*, or *Vacation* mode.
- **1-Click AI Workload Redistributor:** Automatically balances non-critical tasks into open schedule slots when your day is overloaded.

### 3. Universal Capture, AI Brain Dump & Multimodal OCR Scanner
- **Global Quick Capture Bar:** Type natural sentences anywhere in the header or Dashboard (e.g., *"Remind me Friday at 2pm to call Alex"*, *"Buy oat milk and coffee beans"*, or paste a URL) for instant classification.
- **Multi-Intent Brain Dump Modal (`BrainDumpModal.tsx`):** Paste messy paragraphs or dictate via voice; BlueNote splits multi-sentence input into separate Tasks, Reminders, Calendar Events, Contacts, Saved Links, Shopping Items, and Smart Notes with confidence scores and AI reasoning.
- **On-Device OCR Scanner:** Extract text, line items, and contact details from Receipts, Business Cards, Handwritten Notes, and Whiteboards directly into your Files Vault and CRM.

### 4. Tasks, Subtasks, Kanban Board & Smart Shopping Lists
- **List & Kanban Status Views:** Manage tasks across *Not Started*, *In Progress*, *Waiting*, *Scheduled*, and *Completed* columns.
- **Subtasks & Recurring Rules:** Break complex tasks into checkable subtasks with completion progress bars and recurring schedules (*Daily*, *Weekdays*, *Weekly*, *Monthly*).
- **Bulk Operations:** Multi-select tasks for 1-click bulk completion, archiving, or moving to the Recycle Bin.
- **Categorized Shopping & Errands Checklists:** Dedicated tab for grocery and errand items auto-routed from Brain Dump.

### 5. Smart Notes Editor, Templates & Version History
- **Rich Markdown Formatting Toolbar:** Headings, Bold, Italic, Bullet Lists, Checklists, and Code Blocks.
- **Color-Coded Note Cards & Folders:** Organize notes into folders (*Work & Strategy*, *Personal & Home*, *Finance & Receipts*, *Second Brain Ideas*) with 6 customizable card themes.
- **1-Click Note Templates:** *Structured Meeting Notes*, *Daily Focus & Reflection*, *Research & Second Brain Synthesis*, and *Medical & Insurance Log*.
- **On-Device Note Summarizer:** Generate *Short*, *Medium*, or *Detailed* executive summaries and restore any previous version from the built-in **Version History** drawer.

### 6. Projects, Starter Templates, Long-Term Goals & Calendar Planner
- **5 Built-In Project Templates:** *Software Product Launch*, *Home Renovation & Repair*, *Vacation & Travel Planner*, *Annual Tax & Financial Review*, and *Moving & Relocation Checklist*—each automatically generating starter tasks.
- **Calendar, Time-Blocking & Smart Reminders:** Daily, Weekly, and Monthly schedule views with automatic **Time Overlap Conflict Detection**, **1-Click AI Time-Blocking**, and multi-interval reminder snoozing (`5m`, `15m`, `30m`, `1h`, `Tomorrow`).

### 7. Personal CRM Contacts, Smart Bookmarks & OCR File Vault
- **Contacts CRM:** Store phone numbers, emails, companies, relationship notes, and chronological interaction logs (`[Call]`, `[Meeting]`, `[Email]`, `[Note]`), plus **1-Click Duplicate Contact Merging**.
- **Saved Links Organizer:** Domain-tagged bookmarks with reading time estimates and category filters (*Article*, *Research*, *Video*, *Code*, *Recipe*, *Shopping*).
- **Files & OCR Vault:** Track indexed OCR documents, receipts, and generated media assets with storage usage metrics.

### 8. Second Brain Knowledge Graph & Semantic Search
- **Interactive SVG Network Map (`SecondBrainGraphView.tsx`):** Visual node-and-edge graph connecting your notes, projects, contacts, tasks, and files. Click any node to jump directly to that record.
- **Synonym-Aware Semantic Search:** Understands conceptual relationships (e.g., searching `"doctor"` matches `"dentist"`, `"clinic"`, and `"medical"`; searching `"tax"` matches `"receipt"`, `"invoice"`, and `"CPA"`).
- **Command Palette (`⌘K` / `Ctrl+K`):** Instant keyboard-driven navigation and search from anywhere in the app.

### 9. 100% Local Multimodal AI Studio (Zero API Keys Required)
- **Local HD Image Studio:** Synthesizes high-resolution procedural vector/shader illustrations across 5 aspect ratios (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`) and applies prompt-aware color grading to uploaded photos using an HTML5 `<canvas>` engine.
- **Local Video Studio:** Renders playable animated video streams (`16:9` and `9:16`) from text prompts or uploaded starting images via `<canvas>` stream capture and `MediaRecorder`.
- **Local Ambient & Lo-Fi Music Synthesizer:** Generates playable multi-chord 16-bit PCM `.wav` focus soundtracks directly in the browser using Web Audio synthesis.
- **Local Live Voice & Speech Transcription:** Uses native browser `SpeechRecognition` and `speechSynthesis` for real-time voice conversations and voice-to-note transcription with zero external API calls.
- **Local Web Research & Maps Discovery:** Synthesizes structured research briefs and direct Google Scholar, Wikipedia, Semantic Scholar, and Google Maps links.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tooling** | Vite 8 (`base: './'` for universal GitHub Pages & root compatibility) |
| **Styling & Design System** | Tailwind CSS 4 + Lucide React Icons |
| **Data Visualization** | Recharts (`ComposedChart`, `Area`, `Bar`, `Line`, `ResponsiveContainer`) |
| **Local Persistence** | Instant `localStorage` synchronization (`bluenote_workspace_v2`) |
| **Cloud Sync & Auth** | Firebase Authentication (Google Sign-In) + Cloud Firestore (`/workspaces/{userId}`) |
| **On-Device AI Engines** | HTML5 Canvas 2D Shader Engine, MediaRecorder Stream Synthesis, Web Audio PCM WAV Synthesizer, Web Speech API |

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

## 🤖 Android Application — F-Droid & Google Play Store Build Guide

BlueNote includes a complete, production-ready native **Android Gradle Project (`/android`)**, **F-Droid Submission Recipe (`/fdroid/io.github.lilsynnofficial.bluenote.yml`)**, **Fastlane Store Metadata (`/fastlane/metadata/android/en-US/`)**, **Store Privacy Policy ([`PRIVACY_POLICY.md`](PRIVACY_POLICY.md))**, and an automated **GitHub Actions Android APK & AAB Release Pipeline ([`.github/workflows/android-release.yml`](.github/workflows/android-release.yml))**.

| Android Specification | Configuration |
| :--- | :--- |
| **Application ID / Package Name** | `io.github.lilsynnofficial.bluenote` |
| **Compile & Target SDK** | **API 35 (Android 15)** — meets Google Play 2025/2026 mandatory target SDK policy |
| **Minimum SDK** | **API 24 (Android 7.0+)** |
| **Product Flavors** | `fdroid` (100% FOSS reproducible APK) & `playstore` (Google Play `.aab` bundle) |
| **F-Droid Reproducible Flag** | `dependenciesInfo { includeInApk = false; includeInBundle = false }` enabled |
| **Fastlane Store Metadata** | Located in [`fastlane/metadata/android/en-US/`](fastlane/metadata/android/en-US/) |

### 1. Build F-Droid APK (`fdroid` flavor)
The `fdroid` flavor strips Google's encrypted dependency metadata block and contains zero proprietary binary dependencies:
```bash
npm run android:fdroid
# Output APK: android/app/build/outputs/apk/fdroid/release/app-fdroid-release-unsigned.apk
```
To submit to F-Droid, open a Merge Request on [`fdroiddata`](https://gitlab.com/fdroid/fdroiddata) using the pre-configured recipe in [`fdroid/io.github.lilsynnofficial.bluenote.yml`](fdroid/io.github.lilsynnofficial.bluenote.yml).

### 2. Build Google Play Store App Bundle (`.aab` `playstore` flavor)
```bash
npm run android:playstore
# Output AAB: android/app/build/outputs/bundle/playstoreRelease/app-playstore-release.aab
```
Upload the `.aab` bundle to **Google Play Console** along with the store listing texts in [`fastlane/metadata/android/en-US/`](fastlane/metadata/android/en-US/) and the Privacy Policy URL (`https://github.com/LILSYNNOFFICIAL/BLUENOTE/blob/main/PRIVACY_POLICY.md`).

---

## 🌐 How to Enable GitHub Pages on `LILSYNNOFFICIAL/BLUENOTE`

This repository includes a pre-configured GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that automatically builds and publishes the app to **`https://lilsynnofficial.github.io/BLUENOTE/`** without affecting any of your other repositories.

1. Push this codebase to [`https://github.com/LILSYNNOFFICIAL/BLUENOTE`](https://github.com/LILSYNNOFFICIAL/BLUENOTE) on the `main` branch.
2. On GitHub, open **LILSYNNOFFICIAL/BLUENOTE** → **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. The **`Deploy BlueNote to GitHub Pages`** workflow will automatically run (or you can trigger it manually under the **Actions** tab) and publish your live app at:
   👉 **`https://lilsynnofficial.github.io/BLUENOTE/`**

---

## ⌨️ Keyboard Shortcuts & Quick Actions

| Shortcut / Trigger | Action |
| :--- | :--- |
| `⌘K` / `Ctrl + K` | Open Global Command Palette & Semantic Search |
| **Top Quick Capture Input** | Type natural language to create a Task, Reminder, Event, Contact, or Link |
| **Sidebar → AI Brain Dump** | Open Multi-Item Brain Dump & Voice Dictation Modal |
| **Header → Scan OCR** | Open Receipt, Business Card & Handwritten Note OCR Scanner |
| **Header → Focus Timer** | Launch Pomodoro & Deep Work Timer (25m / 50m / 90m) |
| **Sidebar → Interactive Tour** | Re-run the 5-Step Onboarding & Personalization Wizard anytime |

---

## 📄 License

SPDX-License-Identifier: Apache-2.0
