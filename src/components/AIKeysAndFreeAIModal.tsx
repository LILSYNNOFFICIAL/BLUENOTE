import React, { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
  X,
  Loader2,
  Check,
  HelpCircle,
  Cpu,
  Globe,
  RotateCcw,
} from 'lucide-react';
import {
  AIProviderPreference,
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
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [showHf, setShowHf] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    provider: string;
    message: string;
  } | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getAIConfig());
      setTestResult(null);
      setSavedBanner(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProvider = (provider: AIProviderPreference) => {
    const updated = saveAIConfig({
      ...config,
      preferredProvider: provider,
      hasSeenKeyPrompt: true,
    });
    setConfig(updated);
  };

  const handleUse100PercentFreeAI = () => {
    const updated = saveAIConfig({
      ...config,
      preferredProvider: 'free-cloud',
      hasSeenKeyPrompt: true,
    });
    setConfig(updated);
    onConfigSaved?.(updated);
    onClose();
  };

  const handleSaveKeys = () => {
    // Automatically pick the provider whose key was just entered if still on default
    let nextProvider = config.preferredProvider;
    if (nextProvider === 'free-cloud') {
      if (config.groqApiKey.trim()) nextProvider = 'groq';
      else if (config.geminiApiKey.trim()) nextProvider = 'gemini';
      else if (config.openRouterApiKey.trim()) nextProvider = 'openrouter';
      else if (config.huggingFaceToken.trim()) nextProvider = 'huggingface';
    }
    const updated = saveAIConfig({
      ...config,
      preferredProvider: nextProvider,
      hasSeenKeyPrompt: true,
    });
    setConfig(updated);
    setSavedBanner(true);
    onConfigSaved?.(updated);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleTestConnection = async () => {
    saveAIConfig({
      ...config,
      hasSeenKeyPrompt: true,
    });
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAIProviderConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleClearAllKeys = () => {
    const cleared = saveAIConfig({
      preferredProvider: 'free-cloud',
      groqApiKey: '',
      geminiApiKey: '',
      openRouterApiKey: '',
      huggingFaceToken: '',
      hasSeenKeyPrompt: true,
    });
    setConfig(cleared);
    setTestResult({
      ok: true,
      provider: '100% Free Cloud AI (No Key Needed)',
      message: 'Cleared custom keys — switched back to 100% Free Cloud AI mode.',
    });
    onConfigSaved?.(cleared);
  };

  const activeBadge = getActiveAIProviderBadge(config);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2.5 sm:p-5 overflow-y-auto">
      <div className="bn-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        {/* Sticky Top Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 sm:px-6 py-4 text-white border-b border-blue-500/25 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Free AI Engine & API Key Setup
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-blue-200 border border-white/15 truncate">
                  Active: {activeBadge}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold tracking-tight mt-0.5">
                Use 100% Free AI or Connect Your Own Free API Keys
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Choose zero-key Free Cloud AI immediately, or follow the step-by-step instructions below to get free API keys.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              saveAIConfig({ ...config, hasSeenKeyPrompt: true });
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 transition-colors"
            aria-label="Close AI Key Setup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {/* OPTION 1: 100% FREE CLOUD AI (RECOMMENDED - ZERO API KEYS REQUIRED) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
              config.preferredProvider === 'free-cloud'
                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Option 1: 100% Free Cloud & On-Device AI (No API Key Needed)
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                    Recommended • $0.00 Forever
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Works out-of-the-box with <strong>zero sign-up and zero API keys</strong>. Uses free open cloud inference (Pollinations OpenAI-compatible text + Flux HD image generation) paired with BlueNote’s 44.1kHz Stereo Song Studio, Web Speech Voice, and 60FPS Video Engine.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUse100PercentFreeAI}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm shrink-0 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Use 100% Free AI (No Key)</span>
              </button>
            </div>
          </div>

          {/* PREFERRED ENGINE SELECTOR TABS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Active AI Provider Priority
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { id: 'free-cloud', label: '100% Free AI', sub: 'No Key Required' },
                  { id: 'groq', label: 'Groq Free API', sub: 'Llama 3.3 70B' },
                  { id: 'gemini', label: 'Google Gemini', sub: 'Free Tier Key' },
                  { id: 'openrouter', label: 'OpenRouter', sub: '25+ :free Models' },
                  { id: 'huggingface', label: 'Hugging Face', sub: 'Free FLUX & LLMs' },
                ] as const
              ).map((item) => {
                const active = config.preferredProvider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectProvider(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-xs font-extrabold flex items-center justify-between">
                      <span>{item.label}</span>
                      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        active ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP-BY-STEP INSTRUCTIONS & API KEY INPUTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Where & How to Obtain Free API Keys (Step-by-Step Guide)
              </h3>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                All keys are stored privately on your device
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. GROQ CLOUD FREE API KEY */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        1. Groq Cloud API Key (100% Free Tier)
                      </span>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Best for: Ultra-fast Llama 3.3 70B Chat, Brain Dump & Notes
                      </p>
                    </div>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <li>
                      Visit{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold underline"
                      >
                        console.groq.com/keys
                      </a>{' '}
                      and sign in free with Google or GitHub (no credit card needed).
                    </li>
                    <li>
                      Click <strong>&ldquo;Create API Key&rdquo;</strong>, type{' '}
                      <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        BlueNote
                      </code>
                      , and click <strong>Submit</strong>.
                    </li>
                    <li>
                      Copy the key starting with <code className="font-mono font-bold">gsk_...</code>{' '}
                      and paste it below:
                    </li>
                  </ol>
                </div>

                <div className="relative">
                  <input
                    type={showGroq ? 'text' : 'password'}
                    value={config.groqApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        groqApiKey: val,
                        preferredProvider: val.trim() ? 'groq' : prev.preferredProvider,
                      }));
                    }}
                    placeholder="Paste Groq API Key (gsk_...)"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroq((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle Groq key visibility"
                  >
                    {showGroq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 2. GOOGLE GEMINI FREE TIER API KEY */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        2. Google Gemini API Key (Free Tier)
                      </span>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        Best for: Gemini 2.5 / 3 Flash, Search Grounding, OCR & Audio
                      </p>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <li>
                      Open{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold underline"
                      >
                        aistudio.google.com/app/apikey
                      </a>{' '}
                      and sign in with your Google account.
                    </li>
                    <li>
                      Click <strong>&ldquo;Create API key&rdquo;</strong> (Free Tier requires no billing for Flash models).
                    </li>
                    <li>
                      Copy the key starting with{' '}
                      <code className="font-mono font-bold">AIzaSy...</code> and paste it below:
                    </li>
                  </ol>
                </div>

                <div className="relative">
                  <input
                    type={showGemini ? 'text' : 'password'}
                    value={config.geminiApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        geminiApiKey: val,
                        preferredProvider: val.trim() ? 'gemini' : prev.preferredProvider,
                      }));
                    }}
                    placeholder="Paste Google Gemini Key (AIzaSy...)"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle Gemini key visibility"
                  >
                    {showGemini ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. OPENROUTER FREE MODELS API KEY */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        3. OpenRouter API Key (25+ Free Models)
                      </span>
                      <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">
                        Best for: DeepSeek R1 Free, Llama 3.3 Free & Gemma 3 Free
                      </p>
                    </div>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <li>
                      Visit{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold underline"
                      >
                        openrouter.ai/keys
                      </a>{' '}
                      and sign in free with Google or GitHub.
                    </li>
                    <li>
                      Click <strong>&ldquo;Create Key&rdquo;</strong>, name it{' '}
                      <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        BlueNote
                      </code>
                      , and leave credit limit blank (all <code className="font-mono">:free</code> models cost $0).
                    </li>
                    <li>
                      Copy the key starting with{' '}
                      <code className="font-mono font-bold">sk-or-v1-...</code> and paste it below:
                    </li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showOpenRouter ? 'text' : 'password'}
                      value={config.openRouterApiKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => ({
                          ...prev,
                          openRouterApiKey: val,
                          preferredProvider: val.trim() ? 'openrouter' : prev.preferredProvider,
                        }));
                      }}
                      placeholder="Paste OpenRouter Key (sk-or-v1-...)"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenRouter((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle OpenRouter key visibility"
                    >
                      {showOpenRouter ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <select
                    value={config.openRouterModel}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, openRouterModel: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="meta-llama/llama-3.3-70b-instruct:free">
                      Llama 3.3 70B Instruct (:free — $0.00)
                    </option>
                    <option value="deepseek/deepseek-chat:free">
                      DeepSeek V3 Chat (:free — $0.00)
                    </option>
                    <option value="deepseek/deepseek-r1:free">
                      DeepSeek R1 Reasoning (:free — $0.00)
                    </option>
                    <option value="google/gemma-3-27b-it:free">
                      Google Gemma 3 27B (:free — $0.00)
                    </option>
                    <option value="qwen/qwen-2.5-72b-instruct:free">
                      Qwen 2.5 72B Instruct (:free — $0.00)
                    </option>
                  </select>
                </div>
              </div>

              {/* 4. HUGGING FACE FREE INFERENCE TOKEN */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        4. Hugging Face Token (Free FLUX Images & AI)
                      </span>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        Best for: FLUX.1-schnell Image Studio & Open-Source Qwen 72B
                      </p>
                    </div>
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Get Free Token</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <li>
                      Open{' '}
                      <a
                        href="https://huggingface.co/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold underline"
                      >
                        huggingface.co/settings/tokens
                      </a>{' '}
                      and sign in or create a free account.
                    </li>
                    <li>
                      Click <strong>&ldquo;Create new token&rdquo;</strong>, select{' '}
                      <strong>&ldquo;Read&rdquo;</strong>, and generate your token.
                    </li>
                    <li>
                      Copy the token starting with{' '}
                      <code className="font-mono font-bold">hf_...</code> and paste it below:
                    </li>
                  </ol>
                </div>

                <div className="relative">
                  <input
                    type={showHf ? 'text' : 'password'}
                    value={config.huggingFaceToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        huggingFaceToken: val,
                        preferredProvider: val.trim() ? 'huggingface' : prev.preferredProvider,
                      }));
                    }}
                    placeholder="Paste Hugging Face Token (hf_...)"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowHf((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle Hugging Face token visibility"
                  >
                    {showHf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Test Feedback */}
          {testResult && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  Connected: {testResult.provider}
                </div>
                <div className="text-slate-600 dark:text-slate-300">{testResult.message}</div>
              </div>
            </div>
          )}

          {savedBanner && (
            <div className="p-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>AI Provider & Free API Key preferences saved!</span>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{testing ? 'Testing AI...' : 'Test AI Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllKeys}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Free Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleUse100PercentFreeAI}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
            >
              Skip Keys (Use 100% Free AI)
            </button>
            <button
              type="button"
              onClick={handleSaveKeys}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save AI Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
