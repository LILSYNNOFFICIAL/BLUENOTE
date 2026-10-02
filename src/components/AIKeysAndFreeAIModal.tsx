import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  X,
  Loader2,
  Cpu,
  Image as ImageIcon,
  Mic,
  Globe,
  FileText,
} from 'lucide-react';
import {
  getActiveAIProviderBadge,
  getAIConfig,
  saveAIConfig,
  testAIProviderConnection,
  UserAIConfig,
} from '../services/aiService';

interface AIKeysAndFreeAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: UserAIConfig) => void;
}

export const AIKeysAndFreeAIModal: React.FC<AIKeysAndFreeAIModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<UserAIConfig>(() => getAIConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    provider: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getAIConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAIProviderConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleConfirmBuiltInAI = () => {
    const updated = saveAIConfig({
      ...config,
      preferredProvider: 'free-cloud',
      hasSeenKeyPrompt: true,
    });
    setConfig(updated);
    onConfigSaved?.(updated);
    onClose();
  };

  const activeBadge = getActiveAIProviderBadge();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2.5 sm:p-5 overflow-y-auto">
      <div className="bn-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        {/* Sticky Top Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 sm:px-6 py-4 text-white border-b border-blue-500/25 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  BlueNote Managed AI Infrastructure
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-blue-200 border border-white/15 truncate">
                  Active: {activeBadge}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold tracking-tight mt-0.5">
                Built-In Cloud &amp; On-Device AI Engines
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                All AI capabilities are pre-configured and managed by the application infrastructure. No user API keys or credentials are required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 transition-colors"
            aria-label="Close AI Engine Status"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Zero-Configuration Managed AI Architecture
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                Ready Out-of-the-Box
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              BlueNote handles all AI model routing automatically through server-side infrastructure and built-in neural/synthesis engines. Normal users never need to enter developer API keys or OAuth secrets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                FLUX.1 8K Image &amp; 2K Crispness Engine
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Generates ultra-crisp 8K artwork via Black Forest Labs FLUX.1-schnell &amp; FLUX.1-Merged with built-in 3×3 Unsharp Mask micro-contrast enhancement.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-500" />
                Audio Transcription &amp; Live Voice
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Transcribes microphone voice notes and uploaded audio files into clean Smart Notes, plus low-latency Live Voice conversation sessions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                Google Search &amp; Maps Grounding
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Delivers real-time web research and spatial place discovery with verified source links that can be saved directly to your Links organizer.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" />
                PROJECTS OS &amp; Brain Dump Intelligence
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Includes multi-document lyric extraction, topic-focused document merging, receipt/handwriting OCR, and natural-language task parsing.
              </p>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <div>
                <div className="font-extrabold">{testResult.provider}</div>
                <div className="mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Managed server &amp; on-device architecture • Zero client secrets exposed</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify AI Engine</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleConfirmBuiltInAI}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
