import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LATEST_APK_URL =
  'https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/latest/download/BlueNote.apk';
const RELEASES_URL = 'https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases';

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'fdroid' | 'privacy'>('install');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/20">
                  io.github.lilsynnofficial.bluenote
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/30">
                  API 35
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                BlueNote for Android
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Android installation window"
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          {[
            { id: 'install' as const, label: 'Android APK' },
            { id: 'fdroid' as const, label: 'F-Droid' },
            { id: 'privacy' as const, label: 'Privacy' },
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

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 flex-1">
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-4">
                <div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Download BlueNote APK
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    The normal Android download. GitHub Actions builds the installable APK,
                    and the latest published build is attached to a GitHub Release.
                    No npm commands, Android Studio, or developer tools are required.
                  </p>
                </div>

                <a
                  href={LATEST_APK_URL}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download BlueNote APK
                </a>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    View GitHub Releases <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-blue-200/70 dark:border-blue-800/70">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    Installing on Android
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Tap <strong>Download BlueNote APK</strong>. Android may ask you to allow
                    your browser or file manager to install apps from this source. Approve that
                    permission, then open the downloaded APK and tap <strong>Install</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Direct APK Distribution
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    This is the supported direct-install distribution path for BlueNote right now.
                    The APK is built by GitHub Actions and published as a GitHub Release.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Web App / PWA
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If you do not want to install the APK, BlueNote can also be installed as a
                    browser-based PWA when your browser supports it.
                  </p>
                  {isInstallable && !isInstalled && (
                    <button
                      onClick={install}
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline pt-1"
                    >
                      Install Web App
                    </button>
                  )}
                </div>
              </div>

              {isIOS && !isInstalled && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Install on iPhone / iPad (Safari):
                  </div>
                  <p>
                    Tap the <strong>Share</strong> button in Safari, then choose{' '}
                    <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fdroid' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  F-Droid is planned
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  BlueNote has an F-Droid product flavor and submission configuration, but the
                  F-Droid listing is not the current installation path. F-Droid publication and
                  update timing are separate from the direct GitHub APK releases.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Want BlueNote on Android now?
                </div>
                <p className="text-[11px] leading-relaxed">
                  Use the <strong>Android APK</strong> tab and download the latest GitHub Release
                  APK. You do not need to wait for F-Droid.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                BlueNote Privacy Summary
              </h3>
              <p>
                <strong>1. Local-First by Default:</strong> Notes, tasks, habits, events, contacts,
                and files are stored locally on your device. No account or API key is required.
              </p>
              <p>
                <strong>2. On-Device AI:</strong> Core local processing runs in the application
                runtime. Optional cloud AI providers are controlled by the user.
              </p>
              <p>
                <strong>3. Optional Permissions:</strong> Camera and Microphone permissions are
                requested only when you actively use features that need them.
              </p>
            </div>
          )}
        </div>

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
