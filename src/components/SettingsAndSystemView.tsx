import React, { useState, useRef } from 'react';
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
  Plus,
  Upload,
  Camera,
  User as UserIcon,
  Briefcase,
  FileText,
  Globe,
} from 'lucide-react';
import {
  AIConfirmationMode,
  AIPersonality,
  THEME_OPTIONS,
  ThemeMode,
  UserSettings,
  WorkspaceState,
  compressImageFileToDataUrl,
} from '../types/bluenote';
import { getActiveAIProviderBadge } from '../services/aiService';
import { AUTOMATION_TEMPLATES } from '../data/initialWorkspace';

interface SettingsAndSystemViewProps {
  initialSection?: 'settings' | 'help';
  workspace: WorkspaceState;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onToggleAutomation: (id: string) => void;
  onAddAutomation?: (name: string, trigger: string, action: string) => void;
  onDeleteAutomation?: (id: string) => void;
  onExportWorkspace: (format: 'json' | 'markdown' | 'csv') => void;
  onImportWorkspace?: (jsonText: string) => void;
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
  onAddAutomation,
  onDeleteAutomation,
  onExportWorkspace,
  onImportWorkspace,
  onRestoreDeletedItem,
  onEmptyRecycleBin,
  onResetDemoWorkspace,
  onOpenAIKeysModal,
}) => {
  const [tab, setTab] = useState<
    'general' | 'ai' | 'emails' | 'automations' | 'export-recycle' | 'help'
  >(initialSection === 'help' ? 'help' : 'general');
  const [emailPreviewSent, setEmailPreviewSent] = useState(false);
  const [autoName, setAutoName] = useState('');
  const [autoTrigger, setAutoTrigger] = useState('');
  const [autoAction, setAutoAction] = useState('');
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<'all' | 'light' | 'dark'>('all');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 256, 0.85);
      onUpdateSettings({ avatarUrl: dataUrl });
    } catch (err) {
      console.warn('Photo upload error:', err);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const profileInitials = (workspace.settings.name || workspace.settings.email || 'BN')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const filteredThemes = THEME_OPTIONS.filter((t) => {
    if (themeCategoryFilter === 'light') return !t.isDark;
    if (themeCategoryFilter === 'dark') return t.isDark;
    return true;
  });

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
              ['general', 'Profile, Bio & 12 Themes', Palette],
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

      {/* TAB 1: PROFILE, BIO, PHOTOGRAPH & 12-THEME STUDIO */}
      {tab === 'general' && (
        <div className="space-y-6">
          {/* Executive Profile, Bio & Photograph Upload Studio */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  Executive Profile, Bio &amp; Photograph
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload your profile photograph, customize your personal bio, and manage your BLUENOTE-AI-APP.firebase.com cloud identity.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 self-start sm:self-auto">
                <Globe className="w-3.5 h-3.5" />
                {workspace.settings.authDomainAlias || 'BLUENOTE-AI-APP.firebase.com'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Photograph Upload Card */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
                <div className="relative group">
                  {workspace.settings.avatarUrl ? (
                    <img
                      src={workspace.settings.avatarUrl}
                      alt={workspace.settings.name || 'User Photograph'}
                      className="w-28 h-28 rounded-3xl object-cover border-2 border-blue-500 shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-3xl flex items-center justify-center border-2 border-blue-400/40 shadow-lg">
                      {profileInitials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-2 border-white dark:border-slate-900 transition-transform hover:scale-105"
                    title="Upload Photograph"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {workspace.settings.name || 'Workspace Owner'}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {workspace.settings.roleTitle || 'Executive Second Brain'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {photoUploading
                      ? 'Uploading...'
                      : workspace.settings.avatarUrl
                      ? 'Change Photo'
                      : 'Upload Photograph'}
                  </button>
                  {workspace.settings.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ avatarUrl: '' })}
                      className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Supports JPG, PNG &amp; WebP. Automatically cropped &amp; compressed for instant cloud sync.
                </p>
              </div>

              {/* Right Column: Name, Role, Domain Alias & Bio */}
              <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                      Your Display Name
                    </label>
                    <input
                      type="text"
                      value={workspace.settings.name}
                      onChange={(e) => onUpdateSettings({ name: e.target.value })}
                      placeholder="Enter your full name..."
                      className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      Role / Headline
                    </label>
                    <input
                      type="text"
                      value={workspace.settings.roleTitle || ''}
                      onChange={(e) => onUpdateSettings({ roleTitle: e.target.value })}
                      placeholder="e.g., Founder & Systems Architect"
                      className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={workspace.settings.email || ''}
                      onChange={(e) => onUpdateSettings({ email: e.target.value })}
                      placeholder="you@bluenote-ai-app.firebase.com"
                      className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      Sign-Up / Cloud Auth Domain Label
                    </label>
                    <input
                      type="text"
                      value={
                        workspace.settings.authDomainAlias || 'BLUENOTE-AI-APP.firebase.com'
                      }
                      onChange={(e) => onUpdateSettings({ authDomainAlias: e.target.value })}
                      placeholder="BLUENOTE-AI-APP.firebase.com"
                      className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-sm font-mono font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      Personal Bio &amp; Executive Focus Statement
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(workspace.settings.bio || '').length}/280
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={280}
                    value={workspace.settings.bio || ''}
                    onChange={(e) => onUpdateSettings({ bio: e.target.value })}
                    placeholder="Write your bio, personal mission, or what you're currently building..."
                    className="w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-500" />
                    12-Theme Studio Gallery
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose from 12 handcrafted light, OLED dark, and atmospheric studio themes with instant live preview.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  {(
                    [
                      ['all', `All (${THEME_OPTIONS.length})`],
                      ['light', `Light (${THEME_OPTIONS.filter((t) => !t.isDark).length})`],
                      ['dark', `Dark (${THEME_OPTIONS.filter((t) => t.isDark).length})`],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setThemeCategoryFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        themeCategoryFilter === id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredThemes.map((t) => {
                    const isSelected = workspace.settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onUpdateSettings({ theme: t.id })}
                        className={`group relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-600 bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-3 h-3 rounded-full shrink-0 ${t.accentDot} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
                                isSelected ? 'ring-blue-500' : 'ring-transparent'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {t.label}
                            </span>
                          </div>
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1 shrink-0">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              {t.badge}
                            </span>
                          )}
                        </div>

                        {/* Mini UI Swatch Preview */}
                        <div
                          className={`w-full h-11 rounded-xl ${t.bgPreview} p-2 flex items-center gap-2 border border-black/10 dark:border-white/10 overflow-hidden`}
                        >
                          <div className={`w-7 h-full rounded-lg ${t.cardPreview} border shrink-0`} />
                          <div className={`flex-1 h-full rounded-lg ${t.cardPreview} border px-2 flex items-center justify-between`}>
                            <div className="space-y-1">
                              <div className={`h-1.5 w-12 rounded-full ${t.accentDot}`} />
                              <div className="h-1 w-16 rounded-full bg-current opacity-30" />
                            </div>
                            <span className={`text-[9px] font-mono font-bold ${t.textPreview}`}>
                              {t.isDark ? 'DARK' : 'LIGHT'}
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

            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
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
                ☀️ Good Morning
                {workspace.settings.name.trim()
                  ? `, ${workspace.settings.name.trim().split(' ')[0]}`
                  : ''}
                ! Here is Today’s Focus:
              </div>
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Top Priority Tasks:
                </div>
                {workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Completed').length ===
                0 ? (
                  <div className="text-slate-400">No active tasks pending today.</div>
                ) : (
                  workspace.tasks
                    .filter((t) => !t.deletedAt && t.status !== 'Completed')
                    .slice(0, 3)
                    .map((t) => (
                      <div key={t.id} className="text-slate-600 dark:text-slate-300">
                        ✓ [{t.priority}] {t.title} ({t.dueTime || 'Today'})
                      </div>
                    ))
                )}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Today’s Calendar:
                </div>
                {workspace.events.length === 0 ? (
                  <div className="text-slate-400">No events scheduled on your calendar today.</div>
                ) : (
                  workspace.events.slice(0, 3).map((e) => (
                    <div key={e.id} className="text-slate-600 dark:text-slate-300">
                      📅 {e.startTime}–{e.endTime}: {e.title}
                    </div>
                  ))
                )}
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Smart Workspace Automations
              </h2>
              <p className="text-xs text-slate-500">
                Create custom Trigger → Action rules or activate a recommended workflow template below.
              </p>
            </div>
          </div>

          {/* Create Custom Automation Rule */}
          {onAddAutomation && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!autoName.trim() || !autoTrigger.trim() || !autoAction.trim()) return;
                onAddAutomation(autoName.trim(), autoTrigger.trim(), autoAction.trim());
                setAutoName('');
                setAutoTrigger('');
                setAutoAction('');
              }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-2.5"
            >
              <input
                type="text"
                value={autoName}
                onChange={(e) => setAutoName(e.target.value)}
                placeholder="Rule Name (e.g., Auto-Tag Tax Receipts)"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={autoTrigger}
                onChange={(e) => setAutoTrigger(e.target.value)}
                placeholder="Trigger (When...)"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={autoAction}
                onChange={(e) => setAutoAction(e.target.value)}
                placeholder="Action (Then...)"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Automation
              </button>
            </form>
          )}

          {/* Active User Automations */}
          {workspace.automations.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                No custom automations active yet.
              </p>
              <p className="text-[11px] text-slate-400">
                Create a custom rule above or add one of the 1-click automation templates below.
              </p>
            </div>
          ) : (
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
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => onToggleAutomation(rule.id)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    {onDeleteAutomation && (
                      <button
                        type="button"
                        onClick={() => onDeleteAutomation(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Delete automation rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 1-Click Automation Templates */}
          {onAddAutomation && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Automation Templates
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AUTOMATION_TEMPLATES.map((tpl) => {
                  const alreadyAdded = workspace.automations.some((r) => r.name === tpl.name);
                  return (
                    <div
                      key={tpl.id}
                      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {tpl.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tpl.trigger} → {tpl.action}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => onAddAutomation(tpl.name, tpl.trigger, tpl.action)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 ${
                          alreadyAdded
                            ? 'bg-emerald-500/15 text-emerald-600 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {alreadyAdded ? 'Added ✓' : '+ Enable'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
              {onImportWorkspace && (
                <label className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Restore Backup (JSON)
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onImportWorkspace(reader.result);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onResetDemoWorkspace}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All Workspace Data & Start Fresh
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Getting Started, Zero-Demo Architecture &amp; Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                BlueNote starts 100% clean with zero demo clutter. Use these shortcuts to navigate Today, PROJECTS (10 GB AI Workspace), and your Second Brain.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              ['Ctrl / ⌘ + K', 'Open Command Palette & Semantic Search'],
              ['⌘K → P', 'Jump to PROJECTS (10 GB AI Project Workspace)'],
              ['/', 'Focus Instant Global Omnibox Capture'],
              ['Ctrl / ⌘ + B', 'Launch AI Brain Dump & Voice Dictation'],
              ['Ctrl + Z', 'Undo Last Workspace Change'],
              ['Esc', 'Close Active Modal, Lightbox, or Drawer'],
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
