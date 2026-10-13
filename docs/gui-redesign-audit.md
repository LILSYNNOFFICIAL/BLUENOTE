# BlueNote GUI redesign audit and preservation checklist

Branch: `feat/bluenote-workspace-redesign-20261013`
Base: `main` at the repository state inspected before implementation.
Scope: presentation and navigation only; preserve the current workspace schema and behavior.

## Architecture inspected

- `src/App.tsx`: application shell, persisted `WorkspaceState`, local/cloud persistence, history/popstate navigation, quick capture, modal/drawer state, and active-view routing.
- `src/components/DashboardView.tsx`: dashboard metrics, energy-mode filtering, quick capture parsing handoff, tasks/focus actions, projects, notes, reminders, habits, charts, predictions, and widget visibility.
- `src/components/BlueNotePageTemplate.tsx`: shared wrapper for active workspace pages.
- `src/index.css`, `src/premium-redesign.css`, `src/main.tsx`: Tailwind v4, bundled local fonts, global theme/safe-area rules, existing presentation layer.
- `src/types/bluenote.ts`, `src/data/initialWorkspace.ts`, `src/services/projectsOSService.ts`, `src/services/aiService.ts`, `src/services/patternEngine.ts`: workspace types, initial state, project logic, quick capture/AI, and predictive workflows.
- `package.json`, `vite.config.ts`, `capacitor.config.ts`: available commands/dependencies, relative Vite base, F-Droid alias, Capacitor app ID and `dist` webDir.
- `README.md`: local-first scope, web/Android variants, build and distribution guidance.

## Screen and component inventory

| Area | Entry point / implementation | Preservation focus |
|---|---|---|
| Home / executive dashboard | `DashboardView` in `src/components/DashboardView.tsx` | Real metrics, energy filtering, quick capture, priority queue, focus, projects, notes, schedule, reminders, habits, predictions and charts |
| Universal Inbox / Brain Dump | `UniversalInboxView`, `BrainDumpModal` | Classification, review states, OCR/voice capture and real actions |
| Predictive Lists | `PredictiveListsView`, `patternEngine` | Prediction safeguards, confidence tiers and observation history |
| Tasks & checklists / Kanban | `TasksAndChecklistsView` | CRUD, status, priority, filters, subtasks, scheduling and energy indicators |
| Smart Notes / Wiki | `NotesEditorView` | Editor state, note relationships, pinning, persistence and version behavior |
| PROJECTS OS | `ProjectsOSView`, `projectsOSService` | Project templates, documents, versions, lyrics/topics, albums and duplicate detection |
| Projects & Goals | `ProjectsAndGoalsView` | Existing project/goal relationships and progress |
| Calendar & Planner | `CalendarAndPlannerView` | Events, reminders, time blocks, overlap detection, snooze/complete and date navigation |
| Contacts CRM | `ContactsLinksFilesView` with contacts tab | Contact creation, interactions, favorites, duplicate merge and edits |
| Saved Links | `ContactsLinksFilesView` with links tab | URL normalization, categorization, favorites and delete behavior |
| Files & OCR Vault | `ContactsLinksFilesView` with files tab; OCR modal | Local file records, OCR flow, deletion and file relationships |
| Second Brain graph | `SecondBrainGraphView` | Graph entities/edges, navigation and search entry |
| Semantic Search | `SecondBrainGraphView` with search tab | Search query and results behavior |
| AI Image Generator | `AIStudioHubView` | Existing provider/API flows and F-Droid restrictions |
| AI Assistant | `AIChatDrawer` and AI chat view | Conversation state, key setup and provider behavior |
| Settings & Themes | `SettingsAndSystemView` | Theme preference, profile, integrations, automations, import/export, recycle bin and settings |
| Help & shortcuts | `SettingsAndSystemView` help mode | Existing documentation and support actions |
| Shared shell | `App.tsx` | Sidebar, mobile drawer/bottom nav, command palette, quick capture, auth, cloud/local status, undo, notifications and route/history behavior |
| Shared modals | `AuthModal`, `AIKeysAndFreeAIModal`, `FocusAndPomodoroModal`, `CommandPaletteModal`, `OnboardingWizardModal`, `AndroidInstallModal`, `SplashScreen` | Existing interactions, keyboard behavior and platform availability |

## Persistence and platform constraints

- Workspace persistence key is `bluenote_workspace_clean_v4`; redesign must not clear, migrate, or rewrite stored user data.
- Existing local/cloud sync and offline state remain authoritative.
- Keep local fontsource assets; do not add remotely fetched fonts.
- Preserve Vite `base: './'`, F-Droid Firebase alias/build behavior, Capacitor app ID `io.github.lilsynnofficial.bluenote`, and `webDir: 'dist'`.
- Do not alter Android WebView security, product flavors, release workflows, or the separate security-hardening work.
- Use existing React, Tailwind v4, Motion, Lucide and Recharts dependencies.

## Acceptance checklist

- [x] Repository docs, app entry, dashboard, shared page wrapper, CSS, type/service references, and web/Android configuration inspected before editing.
- [x] Dedicated feature branch created; no changes to main, releases, tags, or APKs.
- [x] Cohesive shell and design system implemented across shared and feature UI.
- [x] Dashboard hierarchy and responsive layout improved while keeping real data and handlers.
- [x] All existing route conditions and feature entry points remain present in the application shell.
- [x] TypeScript, existing tests, production Vite build, Android asset sync, and Android F-Droid validation APK build passed in CI run [38403564834](https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/runs/38403564834).
- [ ] Rendered visual inspection and representative UI interaction workflows remain unverified; the branch has no preview deployment and was not merged/published.
- [x] Android/F-Droid configuration and relative asset base are unchanged in the proposed diff.

## Verification log

### Automated checks

- CI / validate run 38403564834: **passed**. TypeScript check, existing `npm test`, production Vite build, Android WebView asset sync, Android F-Droid validation APK build, and F-Droid local-only build all completed successfully.
- Security Audit run 38403564854: **passed**. CodeQL and npm audit succeeded.
- Dedicated F-Droid OCR source build run 38403564761: **in progress** at last inspection; no success/failure is claimed until it finishes.

### Visual and interaction checks

- The deployed baseline was inspected through rendered page content extraction, including the dashboard and its actual empty-state sections.
- The redesign branch was not deployed or rendered in a browser preview. Desktop/tablet/mobile screenshot inspection, browser console inspection, and live interaction walkthroughs remain outstanding. Do not treat those acceptance gates as complete.
