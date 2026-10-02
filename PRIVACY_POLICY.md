# Privacy Policy for BlueNote (Android, F-Droid, Google Play Store & Web)

**Effective Date:** September 29, 2026  
**Application ID:** `io.github.lilsynnofficial.bluenote`  
**Developer / Maintainer:** LILSYNNOFFICIAL  
**Repository:** [https://github.com/LILSYNNOFFICIAL/BLUENOTE](https://github.com/LILSYNNOFFICIAL/BLUENOTE)

## 1. Local-First Data Storage by Default
BlueNote is architected as a **local-first** application. By default, all notes, tasks, habits, calendar events, reminders, contacts, saved links, files, and settings are stored locally on your device (`localStorage` / WebView storage). No account is required to use BlueNote.

## 2. Local and Optional Online Processing
BlueNote is designed around local-first operation. Core workspace data and local capture workflows can operate on-device, and OCR includes a keyless local processing path. Some optional AI, media, grounding, authentication, and synchronization features can use online services in non-F-Droid builds. The F-Droid build disables Firebase authentication and cloud workspace synchronization. BlueNote does not sell user data or use advertising trackers.

## 3. Optional Cloud Sync
If you explicitly choose to sign in using the optional Cloud Sync feature, your workspace data is synchronized to your isolated private document (`/workspaces/{userId}`) so you can access your organizer across devices. You can sign out or export/delete your workspace data at any time from **Settings & Privacy**.

## 4. Device Permissions (Android)
- **Microphone (`RECORD_AUDIO`)**: Optional. Used only when you actively tap the microphone button for voice notes or speech transcription.
- **Camera (`CAMERA`)**: Optional. Used only when you actively scan a receipt, business card, or handwritten note in the OCR Scanner.
- **Notifications (`POST_NOTIFICATIONS`)**: Optional. Used for local task and habit reminders.

## 5. Contact & Open-Source Transparency
BlueNote is open-source under the Apache-2.0 License. You can inspect the complete source code or report privacy inquiries at [https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues](https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues).
