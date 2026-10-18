# Privacy Policy for BlueNote (Android, F-Droid, Google Play Store & Web)

**Effective Date:** September 29, 2026  
**Application ID:** `io.github.lilsynnofficial.bluenote`  
**Developer / Maintainer:** LILSYNNOFFICIAL  
**Repository:** [https://github.com/LILSYNNOFFICIAL/BLUENOTE](https://github.com/LILSYNNOFFICIAL/BLUENOTE)

## 1. Local-First Data Storage by Default
BlueNote is architected as a **local-first** application. By default, all notes, tasks, habits, calendar events, reminders, contacts, saved links, files, and settings are stored locally on your device (`localStorage` / WebView storage). No account is required to use BlueNote.

## 2. Local and Optional Online Processing
BlueNote is local-first. Core workspace data and local capture workflows operate on-device, and OCR includes a keyless local processing path. Account sign-in and cross-device workspace synchronization are optional online features available in the web and Android builds, including the F-Droid flavor. You can dismiss the sign-in prompt and continue using the local workspace. Some optional AI, media, or grounding integrations may also contact their configured providers. BlueNote does not sell user data or use advertising trackers.

## 3. Optional Supabase Account and Cloud Sync
If you choose to create an account or sign in, BlueNote uses its dedicated Supabase project for email/password authentication, password recovery, and optional cross-device workspace synchronization.

- **Account data:** Supabase Auth processes your email address, authentication credentials, and account metadata. Passwords are handled by Supabase Auth and are not stored as plaintext by BlueNote.
- **Workspace data:** when signed in, BlueNote uploads the workspace snapshot, account email/display name, and update timestamp to the BlueNote Supabase database hosted in the US West region. The app uses PostgreSQL Row Level Security so each signed-in account can access only its own workspace row.
- **Local storage:** BlueNote continues to autosave the workspace locally for offline use. Signing out stops cloud synchronization but does not automatically erase the local workspace on that device.
- **Email links:** account confirmation and password-recovery messages are delivered through the configured Supabase Auth email service.
- **F-Droid:** the F-Droid build includes these optional HTTPS requests for account sign-in and cloud sync. Account creation and synchronization require an internet connection; the core organizer remains usable locally.

Do not use BlueNote's cloud-sync feature if you do not want workspace data sent to the hosted Supabase service. You can sign out or export/delete your workspace data from the app.

## 4. Device Permissions (Android)
- **Microphone (`RECORD_AUDIO`)**: Optional. Used only when you actively tap the microphone button for voice notes or speech transcription.
- **Camera (`CAMERA`)**: Optional. Used only when you actively scan a receipt, business card, or handwritten note in the OCR Scanner.
- **Notifications (`POST_NOTIFICATIONS`)**: Optional. Used for local task and habit reminders.

## 5. Contact & Open-Source Transparency
BlueNote is open-source under the Apache-2.0 License. You can inspect the complete source code or report privacy inquiries at [https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues](https://github.com/LILSYNNOFFICIAL/BLUENOTE/issues).
