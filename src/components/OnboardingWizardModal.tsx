import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  Zap,
  Flame,
  Wand2,
  Network,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  LayoutDashboard,
  Check,
  X,
  Palette,
} from 'lucide-react';
import { AIPersonality, EnergyMode, Habit, ThemeMode, UserSettings } from '../types/bluenote';
import { parseQuickCaptureLocally } from '../services/aiService';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  settings: UserSettings;
  onClose: () => void;
  onPreviewSettings?: (updates: Partial<UserSettings>) => void;
  onCompleteOnboarding: (payload: {
    name: string;
    theme: ThemeMode;
    energyMode: EnergyMode;
    aiPersonality: AIPersonality;
    starterHabits: { name: string; schedule: Habit['schedule']; targetPerWeek: number }[];
    firstCaptureText?: string;
  }) => void;
}

export const THEME_CATALOG: {
  id: ThemeMode;
  title: string;
  desc: string;
  swatchBg: string;
  swatchSidebar: string;
  swatchAccent: string;
  headerGradient: string;
  activeCardClass: string;
  primaryBtnClass: string;
  badgeClass: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'blue',
    title: 'Signature Blue',
    desc: 'Deep midnight navy & sapphire slate dark mode',
    swatchBg: '#091326',
    swatchSidebar: '#071124',
    swatchAccent: '#3b82f6',
    headerGradient: 'from-[#071124] via-blue-900 to-indigo-900 text-white border-b border-blue-800/60',
    activeCardClass:
      'border-blue-500 bg-blue-950/70 text-white ring-2 ring-blue-500/30 shadow-sm',
    primaryBtnClass:
      'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/25',
    badgeClass: 'text-blue-400',
    icon: Sparkles,
  },
  {
    id: 'dark',
    title: 'True Black Dark',
    desc: 'Pure #000000 OLED black background with crisp #FFFFFF white text',
    swatchBg: '#000000',
    swatchSidebar: '#09090b',
    swatchAccent: '#ffffff',
    headerGradient: 'from-black via-zinc-950 to-neutral-900 text-white border-b border-zinc-800',
    activeCardClass:
      'border-white bg-black text-white ring-2 ring-white/25 shadow-sm',
    primaryBtnClass:
      'bg-white hover:bg-zinc-200 text-black font-extrabold shadow-white/10',
    badgeClass: 'text-white',
    icon: Moon,
  },
  {
    id: 'light',
    title: 'Daylight Minimal',
    desc: 'Crisp executive alabaster canvas & slate ink typography',
    swatchBg: '#f8fafc',
    swatchSidebar: '#ffffff',
    swatchAccent: '#2563eb',
    headerGradient: 'from-slate-900 via-slate-800 to-blue-900 text-white',
    activeCardClass:
      'border-blue-600 bg-blue-50/90 text-slate-900 ring-2 ring-blue-600/20 shadow-sm',
    primaryBtnClass:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
    badgeClass: 'text-blue-600',
    icon: Sun,
  },
  {
    id: 'emerald',
    title: 'Emerald Forest',
    desc: 'Deep pine night canvas & luminous emerald accents',
    swatchBg: '#022c22',
    swatchSidebar: '#022019',
    swatchAccent: '#10b981',
    headerGradient: 'from-[#022c22] via-emerald-900 to-teal-900 text-white',
    activeCardClass:
      'border-emerald-500 bg-emerald-950/60 text-white ring-2 ring-emerald-500/25 shadow-sm',
    primaryBtnClass:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25',
    badgeClass: 'text-emerald-400',
    icon: Palette,
  },
  {
    id: 'violet',
    title: 'Royal Amethyst',
    desc: 'Deep cosmic plum canvas & violet studio highlights',
    swatchBg: '#170736',
    swatchSidebar: '#120529',
    swatchAccent: '#a855f7',
    headerGradient: 'from-[#1e0938] via-violet-900 to-fuchsia-900 text-white',
    activeCardClass:
      'border-violet-500 bg-violet-950/60 text-white ring-2 ring-violet-500/25 shadow-sm',
    primaryBtnClass:
      'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-violet-600/25',
    badgeClass: 'text-violet-400',
    icon: Wand2,
  },
];

const STARTER_HABIT_OPTIONS: {
  name: string;
  schedule: Habit['schedule'];
  targetPerWeek: number;
  desc: string;
}[] = [
  {
    name: 'Morning Hydration & 15m Walk',
    schedule: 'Daily',
    targetPerWeek: 7,
    desc: 'Start the morning energized before checking messages',
  },
  {
    name: '45m Deep Work Focus Block',
    schedule: 'Weekdays',
    targetPerWeek: 5,
    desc: 'Distraction-free progress on your top priority',
  },
  {
    name: '25 Pages Daily Reading',
    schedule: 'Daily',
    targetPerWeek: 7,
    desc: 'Build continuous Second Brain knowledge',
  },
  {
    name: 'Evening Inbox Zero & Tomorrow Plan',
    schedule: 'Weekdays',
    targetPerWeek: 5,
    desc: 'Review Universal Inbox and lock in top 3 tasks',
  },
];

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  settings,
  onClose,
  onPreviewSettings,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState(settings.name || '');
  const [theme, setTheme] = useState<ThemeMode>(settings.theme || 'blue');
  const [energyMode, setEnergyMode] = useState<EnergyMode>(settings.energyMode || 'Focused');
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>(
    settings.aiPersonality || 'Personal Assistant'
  );
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState('');
  const [firstCaptureText, setFirstCaptureText] = useState('');

  // Keep local state synced if settings prop changes externally
  useEffect(() => {
    if (settings.theme) setTheme(settings.theme);
  }, [settings.theme]);

  if (!isOpen) return null;

  const totalSteps = 5;
  const activeThemeMeta =
    THEME_CATALOG.find((t) => t.id === theme) || THEME_CATALOG[0];

  const handleSelectTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    // Immediately apply to the live workspace so the entire UI transforms right now
    onPreviewSettings?.({ theme: newTheme });
  };

  const handleSelectEnergy = (mode: EnergyMode) => {
    setEnergyMode(mode);
    onPreviewSettings?.({ energyMode: mode });
  };

  const handleSelectPersonality = (style: AIPersonality) => {
    setAiPersonality(style);
    onPreviewSettings?.({ aiPersonality: style });
  };

  const toggleHabitSelection = (habitName: string) => {
    setSelectedHabits((prev) =>
      prev.includes(habitName) ? prev.filter((h) => h !== habitName) : [...prev, habitName]
    );
  };

  const addCustomHabitChip = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customHabit.trim();
    if (!trimmed) return;
    if (!selectedHabits.includes(trimmed)) {
      setSelectedHabits((prev) => [...prev, trimmed]);
    }
    setCustomHabit('');
  };

  const liveParsedPreview = firstCaptureText.trim()
    ? parseQuickCaptureLocally(firstCaptureText.trim())[0]
    : null;

  const handleFinish = () => {
    const starterHabits = selectedHabits.map((hName) => {
      const preset = STARTER_HABIT_OPTIONS.find((o) => o.name === hName);
      return {
        name: hName,
        schedule: preset?.schedule || ('Daily' as const),
        targetPerWeek: preset?.targetPerWeek || 7,
      };
    });

    onCompleteOnboarding({
      name: name.trim() || 'Explorer',
      theme,
      energyMode,
      aiPersonality,
      starterHabits,
      firstCaptureText: firstCaptureText.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 transition-colors duration-300">
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-black border-zinc-700 text-white'
            : theme === 'blue'
            ? 'bg-[#0b1528] border-blue-800 text-slate-100'
            : theme === 'emerald'
            ? 'bg-[#022019] border-emerald-800 text-emerald-50'
            : theme === 'violet'
            ? 'bg-[#120529] border-violet-800 text-violet-50'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Progress Header — Dynamically adapts to the selected theme */}
        <div
          className={`px-6 py-5 bg-gradient-to-r transition-all duration-300 ${activeThemeMeta.headerGradient}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-85">
                  First-Time Setup & Interactive Tutorial • Step {step} of {totalSteps} •{' '}
                  {activeThemeMeta.title} Active
                </span>
                <h2 className="text-lg font-extrabold tracking-tight">
                  Welcome to Your Clean BlueNote Workspace
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              title="Skip tutorial for now"
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/25'
                }`}
                aria-label={`Go to step ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: PROFILE & LIVE VISUAL THEME */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${activeThemeMeta.badgeClass}`}
                >
                  <User className="w-3.5 h-3.5" /> Step 1: Personalize Your Workspace
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  What should BlueNote call you?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your workspace starts 100% clean with zero pre-filled demo clutter. Click any theme below to watch the entire interface transform immediately.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your First Name or Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) {
                      onPreviewSettings?.({ name: e.target.value.trim() });
                    }
                  }}
                  placeholder="e.g. Alex, Jordan, Sam..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choose Your Workspace Interface Theme (Live Preview)
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active: {activeThemeMeta.title}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {THEME_CATALOG.map((tOption) => {
                    const Icon = tOption.icon;
                    const active = theme === tOption.id;
                    return (
                      <button
                        key={tOption.id}
                        type="button"
                        onClick={() => handleSelectTheme(tOption.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all space-y-2 ${
                          active
                            ? tOption.activeCardClass
                            : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Mini UI Swatch Preview */}
                          <div className="flex items-center gap-1">
                            <span
                              className="w-4 h-4 rounded-md border border-black/15 shadow-2xs"
                              style={{ backgroundColor: tOption.swatchSidebar }}
                              title="Sidebar color"
                            />
                            <span
                              className="w-4 h-4 rounded-md border border-black/15 shadow-2xs"
                              style={{ backgroundColor: tOption.swatchBg }}
                              title="Canvas color"
                            />
                            <span
                              className="w-4 h-4 rounded-md border border-black/15 shadow-2xs"
                              style={{ backgroundColor: tOption.swatchAccent }}
                              title="Accent color"
                            />
                          </div>
                          {active ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {tOption.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            {tOption.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ADAPTIVE ENERGY MODE & AI PERSONALITY */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${activeThemeMeta.badgeClass}`}
                >
                  <Zap className="w-3.5 h-3.5" /> Step 2: Adaptive Energy & Assistant Style
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  How are you feeling today?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  BlueNote adapts your Dashboard task list based on your real-time energy level so you never feel overwhelmed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      mode: 'Focused' as EnergyMode,
                      title: 'Focused Mode',
                      desc: 'Surfaces deep work & high-impact project tasks',
                    },
                    {
                      mode: 'Normal' as EnergyMode,
                      title: 'Balanced Mode',
                      desc: 'Standard mix of tasks, meetings, and errands',
                    },
                    {
                      mode: 'Busy' as EnergyMode,
                      title: 'Busy / Crunch Mode',
                      desc: 'Hides low-priority items; shows only urgent tasks',
                    },
                    {
                      mode: 'Tired' as EnergyMode,
                      title: 'Low-Energy Mode',
                      desc: 'Highlights quick <25m wins to keep momentum',
                    },
                  ] as const
                ).map((item) => {
                  const active = energyMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => handleSelectEnergy(item.mode)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? activeThemeMeta.activeCardClass
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Local AI Assistant Coaching Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      'Personal Assistant',
                      'Executive Assistant',
                      'Friendly',
                      'Minimal',
                      'Motivational',
                      'Professional',
                      'Calm & Quiet',
                    ] as AIPersonality[]
                  ).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => handleSelectPersonality(style)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        aiPersonality === style
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: OPTIONAL STARTER HABITS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5" /> Step 3: Weekly Habit Tracker & 30D Analytics
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Pick any daily habits you want to track (or skip for blank)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your Dashboard includes a 7-day interactive checkmark grid and a 30-day Recharts streak visualization. Select any habits below or add your own:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_HABIT_OPTIONS.map((hab) => {
                  const selected = selectedHabits.includes(hab.name);
                  return (
                    <button
                      key={hab.name}
                      type="button"
                      onClick={() => toggleHabitSelection(hab.name)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        selected
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                          selected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {hab.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hab.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={addCustomHabitChip} className="flex gap-2">
                <input
                  type="text"
                  value={customHabit}
                  onChange={(e) => setCustomHabit(e.target.value)}
                  placeholder="Or type your own custom habit (e.g. 'Practice Spanish 15m')..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  + Add Habit
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: INTERACTIVE QUICK CAPTURE & BRAIN DUMP TUTORIAL */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${activeThemeMeta.badgeClass}`}
                >
                  <Wand2 className="w-3.5 h-3.5" /> Step 4: Try Natural Language Capture
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  How BlueNote’s Local AI Organizes Your Thoughts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Type a real task, reminder, or appointment below to see how BlueNote automatically classifies it—or leave it blank to start completely empty.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={firstCaptureText}
                  onChange={(e) => setFirstCaptureText(e.target.value)}
                  placeholder='Try typing: "Remind me tomorrow at 10am to call Alex" or "Finish project proposal"...'
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Remind me tomorrow at 9am to review weekly goals',
                    'Schedule dentist appointment Friday at 2pm',
                    'Buy coffee beans and oat milk',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setFirstCaptureText(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      Try: "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              {liveParsedPreview && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                      Auto-Detected: {liveParsedPreview.category}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {liveParsedPreview.confidence}% Confidence
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {liveParsedPreview.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {liveParsedPreview.aiReasoning}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: 4-PILLAR ARCHITECTURE TOUR & FINISH */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <Network className="w-3.5 h-3.5" /> Step 5: Your Second Brain Tour
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  You’re all set, {name.trim() || 'Explorer'}!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Here is a quick map of your BlueNote workspace ({activeThemeMeta.title} theme active):
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    1. Daily Focus & Habits
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Adaptive Dashboard, 7-day Habit Checkmarks, 30-day Recharts Streak Analytics, and Pomodoro Focus Timer.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    2. Brain Dump & OCR Scanner
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Click <strong>AI Brain Dump</strong> in the sidebar or <strong>Scan OCR</strong> in the header to extract tasks, contacts, and receipts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-emerald-600" />
                    3. Knowledge Graph & Search
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-[10px] font-mono">⌘K</kbd> anytime to search across notes, tasks, contacts, and links.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-amber-500" />
                    4. Local Multimodal AI Studio
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Generate custom illustrations, animated videos, ambient focus music, and voice notes 100% locally.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Skip setup
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${activeThemeMeta.primaryBtnClass}`}
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${activeThemeMeta.primaryBtnClass}`}
              >
                <CheckCircle2 className="w-4 h-4" /> Launch My Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
