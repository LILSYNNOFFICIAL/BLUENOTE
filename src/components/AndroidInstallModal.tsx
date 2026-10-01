import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Code2,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'fdroid' | 'playstore' | 'privacy'>(
    'install'
  );
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/20">
                  io.github.lilsynnofficial.bluenote
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/30">
                  API 35 • FOSS Ready
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                BlueNote for Android — F-Droid, Google Play & WebAPK
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          {[
            { id: 'install' as const, label: '1-Click Install & APK' },
            { id: 'fdroid' as const, label: 'F-Droid (FOSS Build)' },
            { id: 'playstore' as const, label: 'Google Play Store (.aab)' },
            { id: 'privacy' as const, label: 'Store Privacy Policy' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800/70'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 flex-1">
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Instant Home Screen WebAPK / Standalone App
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isInstalled
                      ? 'BlueNote is currently running in standalone installed mode on your device!'
                      : 'Install BlueNote directly onto your Android home screen or desktop with full offline caching.'}
                  </p>
                </div>

                {isInstallable && !isInstalled && (
                  <button
                    onClick={install}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Install App Now
                  </button>
                )}
              </div>

              {isIOS && !isInstalled && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Install on iPhone / iPad (Safari):
                  </div>
                  <p>
                    1. Tap the <strong>Share</strong> button in your Safari toolbar.
                    <br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    F-Droid & GitHub Releases APK
                  </div>
                  <p className="text-[11px] text-slate-500">
                    100% open-source, reproducible APK (<code>bluenote-android-installable.apk</code>) built automatically by GitHub Actions without proprietary blobs.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href="https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/latest/download/bluenote-android-installable.apk"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Direct APK Download <Download className="w-3 h-3" />
                    </a>
                    <a
                      href="https://github.com/LILSYNNOFFICIAL/BLUENOTE/actions/workflows/android-release.yml"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold hover:underline"
                    >
                      GitHub Actions Artifacts <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Google Play Store Bundle (.aab)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Targets Android 15 (`targetSdk = 35`), includes adaptive vector icons, R8 shrinking, and Fastlane store metadata.
                  </p>
                  <button
                    onClick={() => setActiveTab('playstore')}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline pt-1"
                  >
                    View Play Console Setup →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fdroid' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  100% F-Droid FOSS Compliant Architecture
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 text-[11px]">
                  • <code>dependenciesInfo &#123; includeInApk = false &#125;</code> enabled in <code>android/app/build.gradle</code>.<br />
                  • Zero proprietary API keys or non-free binary dependencies in the <code>fdroid</code> product flavor.<br />
                  • Complete F-Droid recipe included at <code>fdroid/io.github.lilsynnofficial.bluenote.yml</code>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  Build F-Droid APK Locally:
                </div>
                <div className="p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] flex items-center justify-between gap-2">
                  <code>
                    npm run build && cp -r dist/* android/app/src/main/assets/public/ && cd android && gradle assembleFdroidRelease
                  </code>
                  <button
                    onClick={() =>
                      copyCommand(
                        'npm run build && mkdir -p android/app/src/main/assets/public && cp -r dist/* android/app/src/main/assets/public/ && cd android && gradle assembleFdroidRelease'
                      )
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'playstore' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Google Play Console Readiness Checklist
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  • <strong>Package Name:</strong> <code>io.github.lilsynnofficial.bluenote</code><br />
                  • <strong>Target SDK:</strong> API 35 (Android 15 — meets Google Play 2025/2026 mandatory policy)<br />
                  • <strong>Fastlane Store Listing:</strong> Pre-populated in <code>/fastlane/metadata/android/en-US/</code><br />
                  • <strong>Hardware Features:</strong> Camera & Microphone marked <code>android:required="false"</code> for universal device compatibility.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  Build Signed Google Play App Bundle (`.aab`):
                </div>
                <div className="p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] flex items-center justify-between gap-2">
                  <code>
                    npm run build && cp -r dist/* android/app/src/main/assets/public/ && cd android && gradle bundlePlaystoreRelease
                  </code>
                  <button
                    onClick={() =>
                      copyCommand(
                        'npm run build && mkdir -p android/app/src/main/assets/public && cp -r dist/* android/app/src/main/assets/public/ && cd android && gradle bundlePlaystoreRelease'
                      )
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                BlueNote Store Privacy Policy Summary
              </h3>
              <p>
                <strong>1. Local-First by Default:</strong> All notes, tasks, habits, events, contacts, and files are stored locally on your device. No account or API key is required.
              </p>
              <p>
                <strong>2. 100% On-Device AI:</strong> Brain Dump parsing, OCR receipt scanning, note summarization, and media synthesis run locally in the application runtime. No personal data is sold or shared with third parties.
              </p>
              <p>
                <strong>3. Optional Permissions:</strong> Camera and Microphone permissions are requested only when you actively use Voice Dictation or the OCR Scanner.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            v1.0.0 (versionCode 1) • Apache-2.0 License
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
