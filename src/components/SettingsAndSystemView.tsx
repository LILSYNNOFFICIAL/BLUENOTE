import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Sparkles,
  Mail,
  Shield,
  Download,
  Trash2,
  HelpCircle,
  Zap,
  RotateCcw,
  Check,
  Eye,
  Key,
  ExternalLink,
} from 'lucide-react';
import {
  AIConfirmationMode,
  AIPersonality,
  ThemeMode,
  UserSettings,
  WorkspaceState,
} from '../types/bluenote';
import { getActiveAIProviderBadge } from '../services/aiService';

interface SettingsAndSystemViewProps {
  initialSection?: 'settings' | 'help';
  workspace: WorkspaceState;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onToggleAutomation: (id: string) => void;
  onExportWorkspace: (format: 'json' | 'markdown' | 'csv') => void;
  onRestoreDeletedItem: (type: 'task' | 'note', id: string) => void;
  onEmptyRecycleBin: () => void;
  onResetDemoWorkspace: () => void;
  onOpenAIKeysModal?: () => void;
}

export const SettingsAndSystemView: React.FC<SettingsAndSystemViewProps> = ({
  initialSection = 'settings',
  workspace,
  onUpdateSettings,
  onToggleAutomation,
  onExportWorkspace,
  onRestoreDeletedItem,
  onEmptyRecycleBin,
  onResetDemoWorkspace,
  onOpenAIKeysModal,
}) => {
  const [tab, setTab] = useState<
    'general' | 'ai' | 'emails' | 'automations' | 'export-recycle' | 'help'
  >(initialSection === 'help' ? 'help' : 'general');
  const [emailPreviewSent, setEmailPreviewSent] = useState(false);

  React.useEffect(() => {
    if (initialSection === 'help') setTab('help');
  }, [initialSection]);

  const deletedTasks = workspace.tasks.filter((t) => Boolean(t.deletedAt));
  const deletedNotes = workspace.notes.filter((n) => Boolean(n.deletedAt));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Executive Settings Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  System Preferences
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Active Theme: {workspace.settings.theme.toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                Workspace Appearance, AI Behavior & System Control
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure your theme engine, accessibility scaling, Free AI & API keys, automated digests, and data vault.
              </p>
            </div>
          </div>

          {onOpenAIKeysModal && (
            <button
              type="button"
              onClick={onOpenAIKeysModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Free AI & API Keys ({getActiveAIProviderBadge()})</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {(
            [
              ['general', 'Appearance & Accessibility', Palette],
              ['ai', 'Free AI, API Keys & Memory', Sparkles],
              ['emails', 'Daily & Weekly Emails', Mail],
              ['automations', 'Automations', Zap],
              ['export-recycle', 'Export, Privacy & Recycle Bin', Download],
              ['help', 'Help & Keyboard Shortcuts', HelpCircle],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent dark:border-slate-700/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: GENERAL, APPEARANCE & ACCESSIBILITY */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-500" />
                  Theme Engine & Workspace Identity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a live workspace theme. Blue is our rich Midnight Navy Slate, and Dark is True Pitch Black (#000000) with crisp white text.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={workspace.settings.name}
                  onChange={(e) => onUpdateSettings({ name: e.target.value })}
                  className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Color Theme Selection
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {(
                    [
                      {
                        id: 'light' as ThemeMode,
                        title: 'Architectural White (Default)',
                        desc: 'Pure #FFFFFF elevated studio cards with subtle slate hairlines & ambient shadows',
                        bgPreview: 'bg-slate-100',
                        cardPreview: 'bg-white border-slate-200',
                        accentDot: 'bg-blue-600',
                        textPreview: 'text-slate-900',
                        badge: 'Default White',
                      },
                      {
                        id: 'dark' as ThemeMode,
                        title: 'Obsidian Carbon (OLED Dark)',
                        desc: 'Precision #050507 carbon surfaces with high-contrast #FAFAFA typography',
                        bgPreview: 'bg-black',
                        cardPreview: 'bg-[#09090b] border-zinc-700',
                        accentDot: 'bg-white',
                        textPreview: 'text-white',
                        badge: 'Pure Dark',
                      },
                      {
                        id: 'blue' as ThemeMode,
                        title: 'Sapphire Executive (Navy)',
                        desc: 'Deep architectural navy & sapphire slate surfaces with cobalt highlights',
                        bgPreview: 'bg-[#091326]',
                        cardPreview: 'bg-[#0f1b33] border-[#1e3a8a]',
                        accentDot: 'bg-blue-500',
                        textPreview: 'text-blue-100',
                        badge: 'Executive Navy',
                      },
                      {
                        id: 'emerald' as ThemeMode,
                        title: 'Nordic Botanical (Emerald)',
                        desc: 'Deep pine studio canvas with luminous sage & emerald accents',
                        bgPreview: 'bg-[#022c22]',
                        cardPreview: 'bg-[#042f24] border-emerald-700',
                        accentDot: 'bg-emerald-400',
                        textPreview: 'text-emerald-100',
                        badge: 'Botanical',
                      },
                      {
                        id: 'violet' as ThemeMode,
                        title: 'Atelier Amethyst (Violet)',
                        desc: 'Deep obsidian plum canvas with refined violet specular accents',
                        bgPreview: 'bg-[#170736]',
                        cardPreview: 'bg-[#1b093b] border-purple-700',
                        accentDot: 'bg-purple-400',
                        textPreview: 'text-purple-100',
                        badge: 'Atelier',
                      },
                    ]
                  ).map((t) => {
                    const isSelected = workspace.settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onUpdateSettings({ theme: t.id })}
                        className={`group relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-600 bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3 h-3 rounded-full ${t.accentDot} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
                                isSelected ? 'ring-blue-500' : 'ring-transparent'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.title}
                            </span>
                          </div>
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {t.badge}
                            </span>
                          )}
                        </div>

                        {/* Mini UI Swatch Preview */}
                        <div
                          className={`w-full h-12 rounded-xl ${t.bgPreview} p-2 flex items-center gap-2 border border-black/10 dark:border-white/10 overflow-hidden`}
                        >
                          <div className={`w-8 h-full rounded-lg ${t.cardPreview} border shrink-0`} />
                          <div className={`flex-1 h-full rounded-lg ${t.cardPreview} border px-2 flex items-center justify-between`}>
                            <div className="space-y-1">
                              <div className={`h-1.5 w-14 rounded-full ${t.accentDot}`} />
                              <div className="h-1 w-20 rounded-full bg-current opacity-30" />
                            </div>
                            <span className={`text-[9px] font-mono font-bold ${t.textPreview}`}>
                              Aa
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {t.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Work Hours Start
                  </label>
                  <input
                    type="time"
                    value={workspace.settings.workHoursStart}
                    onChange={(e) => onUpdateSettings({ workHoursStart: e.target.value })}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Work Hours End
                  </label>
                  <input
                    type="time"
                    value={workspace.settings.workHoursEnd}
                    onChange={(e) => onUpdateSettings({ workHoursEnd: e.target.value })}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Accessibility & Visual Ergonomics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Instant visual modifiers applied across the entire application shell.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'largeText' as const,
                  title: 'Large Typography Scale (112.5%)',
                  desc: 'Increases font sizing and line heights across all views.',
                },
                {
                  key: 'highContrast' as const,
                  title: 'Enhanced High Contrast Mode',
                  desc: 'Sharpens surface borders and text luminance ratios.',
                },
                {
                  key: 'reducedMotion' as const,
                  title: 'Reduced Motion & Instant Transitions',
                  desc: 'Disables decorative animations for immediate response.',
                },
                {
                  key: 'showProductivityScore' as const,
                  title: 'Executive Productivity Telemetry',
                  desc: 'Display daily completion index on the Command Dashboard.',
                },
              ].map((item) => {
                const enabled = Boolean(workspace.settings[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onUpdateSettings({ [item.key]: !enabled })}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-left transition-all"
                  >
                    <div className="pr-4">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI PERSONALITY, FREE AI & API KEYS */}
      {tab === 'ai' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-6">
          {/* Free AI & API Keys Banner inside AI Settings Tab */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-500" />
                  Free AI Engine & Optional API Key Manager
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold">
                  Active: {getActiveAIProviderBadge()}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                BlueNote works out-of-the-box with <strong>100% Free Cloud & On-Device AI (Zero API Key Needed)</strong>, or you can connect free API keys from Groq (<code className="font-mono">console.groq.com/keys</code>), Google AI Studio (<code className="font-mono">aistudio.google.com/app/apikey</code>), OpenRouter (<code className="font-mono">openrouter.ai/keys</code>), or Hugging Face (<code className="font-mono">huggingface.co/settings/tokens</code>).
              </p>
            </div>
            {onOpenAIKeysModal && (
              <button
                type="button"
                onClick={onOpenAIKeysModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Key className="w-4 h-4" />
                <span>Open Free AI & API Keys Popup</span>
              </button>
            )}
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            AI Assistant Personality, Confirmation & Memory Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  AI Assistant Personality (Part 7)
                </label>
                <select
                  value={workspace.settings.aiPersonality}
                  onChange={(e) =>
                    onUpdateSettings({ aiPersonality: e.target.value as AIPersonality })
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold"
                >
                  {[
                    'Personal Assistant',
                    'Professional',
                    'Friendly',
                    'Minimal',
                    'Motivational',
                    'Executive Assistant',
                    'Calm & Quiet',
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  AI Confirmation Threshold (Part 2)
                </label>
                <select
                  value={workspace.settings.aiConfirmationMode}
                  onChange={(e) =>
                    onUpdateSettings({
                      aiConfirmationMode: e.target.value as AIConfirmationMode,
                    })
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold"
                >
                  <option value="Always Ask">Always Ask Before Saving</option>
                  <option value="Usually Ask">Usually Ask (When Confidence &lt; 85%)</option>
                  <option value="Auto Save">Auto Save Immediately</option>
                  <option value="Never Ask">Never Ask</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Enable AI Memory Engine
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Remember preferred work hours, recurring grocery items, and frequent contacts.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={workspace.settings.aiMemoryEnabled}
                  onChange={(e) => onUpdateSettings({ aiMemoryEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Enable Second Brain Knowledge Graph Auto-Linking
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Automatically link notes, tasks, receipts, and contacts.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={workspace.settings.knowledgeGraphEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ knowledgeGraphEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY, WEEKLY & MONTHLY EMAIL BRIEFING PREVIEW */}
      {tab === 'emails' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Email Briefing Schedule
            </h2>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-xs font-semibold">Daily Morning Agenda Email</span>
              <input
                type="checkbox"
                checked={workspace.settings.dailyEmailEnabled}
                onChange={(e) => onUpdateSettings({ dailyEmailEnabled: e.target.checked })}
              />
            </label>
            <div>
              <label className="text-xs font-semibold text-slate-500">Delivery Time</label>
              <input
                type="time"
                value={workspace.settings.dailyEmailTime}
                onChange={(e) => onUpdateSettings({ dailyEmailTime: e.target.value })}
                className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono"
              />
            </div>
            <button
              onClick={() => setEmailPreviewSent(true)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {emailPreviewSent ? 'Test Daily Summary Queued!' : 'Send Test Daily Email Now'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Live Daily Email Preview ({workspace.settings.dailyEmailTime} Delivery)
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="font-bold text-base text-slate-900 dark:text-white">
                ☀️ Good Morning, {workspace.settings.name.split(' ')[0]}! Here is Today’s Focus:
              </div>
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Top Priority Tasks:
                </div>
                {workspace.tasks
                  .filter((t) => t.status !== 'Completed')
                  .slice(0, 3)
                  .map((t) => (
                    <div key={t.id} className="text-slate-600 dark:text-slate-300">
                      ✓ [{t.priority}] {t.title} ({t.dueTime || 'Today'})
                    </div>
                  ))}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Today’s Calendar:
                </div>
                {workspace.events.slice(0, 3).map((e) => (
                  <div key={e.id} className="text-slate-600 dark:text-slate-300">
                    📅 {e.startTime}–{e.endTime}: {e.title}
                  </div>
                ))}
              </div>
              <p className="text-[11px] italic text-slate-500 pt-2">
                "Focus on what matters—BlueNote has everything else organized."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATION RULES */}
      {tab === 'automations' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Smart Workspace Automations
          </h2>
          <div className="space-y-3">
            {workspace.automations.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {rule.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    <strong>Trigger:</strong> {rule.trigger} → <strong>Action:</strong> {rule.action}
                  </div>
                  <div className="text-[11px] font-mono text-blue-600">
                    Executed {rule.runsCount} times
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => onToggleAutomation(rule.id)}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ONE-CLICK EXPORT, PRIVACY & RECYCLE BIN */}
      {tab === 'export-recycle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Data Ownership & One-Click Export
            </h2>
            <p className="text-xs text-slate-500">
              You own 100% of your data. Export your entire Second Brain workspace anytime.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => onExportWorkspace('json')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Full Backup (JSON)
              </button>
              <button
                onClick={() => onExportWorkspace('markdown')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold"
              >
                Export Notes & Tasks (Markdown)
              </button>
              <button
                onClick={() => onExportWorkspace('csv')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold"
              >
                Export Tasks & Contacts (CSV)
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onResetDemoWorkspace}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Workspace to Default Sample State
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Recycle Bin ({deletedTasks.length + deletedNotes.length})
              </h2>
              {(deletedTasks.length > 0 || deletedNotes.length > 0) && (
                <button
                  onClick={onEmptyRecycleBin}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Empty Bin
                </button>
              )}
            </div>

            <div className="space-y-2">
              {deletedTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                >
                  <span>[Task] {t.title}</span>
                  <button
                    onClick={() => onRestoreDeletedItem('task', t.id)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {deletedNotes.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                >
                  <span>[Note] {n.title}</span>
                  <button
                    onClick={() => onRestoreDeletedItem('note', n.id)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {deletedTasks.length === 0 && deletedNotes.length === 0 && (
                <p className="text-xs text-slate-400">Recycle Bin is empty.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HELP & KEYBOARD SHORTCUTS */}
      {tab === 'help' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Getting Started & Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              ['Ctrl + K', 'Open Command Palette & Global Search'],
              ['/', 'Focus Instant Global Search'],
              ['Ctrl + B', 'Launch AI Brain Dump & Voice Dictation'],
              ['Ctrl + Z', 'Undo Last Workspace Change'],
              ['Ctrl + Shift + Z', 'Redo Workspace Change'],
              ['Esc', 'Close Active Modal or Drawer'],
            ].map(([key, desc]) => (
              <div
                key={key}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
              >
                <span className="text-slate-600 dark:text-slate-300">{desc}</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-600 shrink-0">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
