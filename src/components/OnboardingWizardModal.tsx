import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Mic,
  Camera,
  Flame,
  Network,
  Wand2,
  Calendar,
  Palette,
  User,
  Check,
  Rocket,
  ShieldAlert,
  Sliders,
  Layers,
  Plus,
} from 'lucide-react';
import {
  AIPersonality,
  EnergyMode,
  ThemeMode,
  UserSettings,
} from '../types/bluenote';
import { BlueNoteLogo } from './BlueNoteLogo';

interface StarterHabitOption {
  id: string;
  name: string;
  schedule: 'Daily' | 'Weekdays';
  targetPerWeek: number;
  desc: string;
}

const STARTER_HABIT_OPTIONS: StarterHabitOption[] = [
  {
    id: 'sh-water',
    name: 'Hydration (8 Glasses)',
    schedule: 'Daily',
    targetPerWeek: 7,
    desc: 'Stay energized with daily hydration tracking',
  },
  {
    id: 'sh-deepwork',
    name: 'Deep Work Block (60m)',
    schedule: 'Weekdays',
    targetPerWeek: 5,
    desc: 'One distraction-free focus session each weekday',
  },
  {
    id: 'sh-reading',
    name: 'Daily Reading (20 pages)',
    schedule: 'Daily',
    targetPerWeek: 7,
    desc: 'Compound knowledge in your Second Brain',
  },
  {
    id: 'sh-inbox',
    name: 'Evening Inbox Zero Triage',
    schedule: 'Weekdays',
    targetPerWeek: 5,
    desc: '5-minute end-of-day review of captured items',
  },
  {
    id: 'sh-movement',
    name: 'Morning Mobility & Walk (30m)',
    schedule: 'Daily',
    targetPerWeek: 6,
    desc: 'Physical movement before screen time',
  },
];

interface OnboardingWizardModalProps {
  isOpen: boolean;
  settings: UserSettings;
  onChangeTheme?: (theme: ThemeMode) => void;
  onCompleteOnboarding: (payload: {
    name: string;
    theme: ThemeMode;
    energyMode: EnergyMode;
    aiPersonality: AIPersonality;
    starterHabits: StarterHabitOption[];
    firstCaptureText: string;
    predictionStage?: number;
    suggestionBudgetMax?: number;
  }) => void;
  onClose: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  settings,
  onChangeTheme,
  onCompleteOnboarding,
  onClose,
}) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [name, setName] = useState(settings.name || '');
  const [theme, setTheme] = useState<ThemeMode>(settings.theme || 'light');
  const [energyMode, setEnergyMode] = useState<EnergyMode>(settings.energyMode || 'Normal');
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>(
    settings.aiPersonality || 'Professional'
  );
  // Zero demo clutter: starter habits are UNCHECKED by default so workspace starts 100% clean unless chosen
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabitName, setCustomHabitName] = useState('');
  const [customHabits, setCustomHabits] = useState<StarterHabitOption[]>([]);
  const [firstCaptureText, setFirstCaptureText] = useState('');
  const [activeTourCard, setActiveTourCard] = useState<number>(0);

  // Personal Pattern Engine onboarding calibration
  const [predictionStage, setPredictionStage] = useState<number>(7);
  const [suggestionBudgetMax, setSuggestionBudgetMax] = useState<number>(6);

  if (!isOpen) return null;

  const allHabitOptions = [...STARTER_HABIT_OPTIONS, ...customHabits];

  const toggleHabit = (habitName: string) => {
    setSelectedHabits((prev) =>
      prev.includes(habitName) ? prev.filter((h) => h !== habitName) : [...prev, habitName]
    );
  };

  const handleAddCustomHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customHabitName.trim();
    if (!trimmed) return;
    const newOpt: StarterHabitOption = {
      id: `sh-custom-${Date.now()}`,
      name: trimmed,
      schedule: 'Daily',
      targetPerWeek: 7,
      desc: 'Custom personal habit created during onboarding',
    };
    setCustomHabits((prev) => [...prev, newOpt]);
    setSelectedHabits((prev) => [...prev, trimmed]);
    setCustomHabitName('');
  };

  const handleFinish = () => {
    const chosenHabits = allHabitOptions.filter((h) =>
      selectedHabits.includes(h.name)
    );
    onCompleteOnboarding({
      name: name.trim() || 'Workspace Owner',
      theme,
      energyMode,
      aiPersonality,
      starterHabits: chosenHabits,
      firstCaptureText: firstCaptureText.trim(),
      predictionStage,
      suggestionBudgetMax,
    });
  };

  const TOUR_FEATURES = [
    {
      icon: Zap,
      badge: 'Pillar 1 • Natural Language Capture',
      title: 'Today Command Center & Omnibox Capture',
      desc: 'Start from a clean, zero-clutter command center. Type naturally into the Omnibox at the top of your dashboard—BlueNote automatically classifies tasks, shopping items, reminders, contacts, calendar events, and notes.',
      tip: 'Switch your Energy State (High Energy, Normal, Low Energy / Overwhelmed, Focus Mode) anytime to dynamically adapt the dashboard.',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      icon: Camera,
      badge: 'Pillar 2 • Voice & Visual Intelligence',
      title: 'AI Brain Dump & Multimodal OCR Vault',
      desc: 'Speak or paste an unstructured paragraph of thoughts, or upload a photo of a handwritten sticky note, business card, whiteboard, or receipt. BlueNote extracts every entity into an interactive AI Review Screen before saving.',
      tip: 'Use keyboard shortcut ⇧⌘B (or Ctrl+Shift+B) from anywhere in the app to launch AI Brain Dump.',
      color: 'from-indigo-600 to-violet-600',
    },
    {
      icon: Sparkles,
      badge: 'Pillar 3 • Quiet Predictive Architecture',
      title: '🔮 Predictive Lists & Personal Pattern Engine',
      desc: 'BlueNote observes → learns → predicts → explains → asks → learns from your answer. Every prediction is treated strictly as a hypothesis backed by your real recurrence intervals—never a fact or false inventory claim.',
      tip: 'Predictions accumulate quietly in your Centralized Predictive Inbox with Approve, Edit, Snooze, Deny, and "Stop suggesting..." overrides.',
      color: 'from-violet-600 to-fuchsia-600',
    },
    {
      icon: Calendar,
      badge: 'Pillar 4 • Deep Execution & Notes',
      title: 'Tasks, Projects, Split-Screen Notes & Pomodoro',
      desc: 'Manage multi-priority tasks with subtasks, launch distraction-free Pomodoro Focus timers, write in the Split-Screen Markdown Note Editor with version history, or spin up 1-Click Project Templates.',
      tip: 'Click the Focus button on any active task to enter a distraction-free Pomodoro countdown session.',
      color: 'from-sky-600 to-blue-600',
    },
    {
      icon: Flame,
      badge: 'Pillar 5 • Behavioral Consistency',
      title: '30-Day Habit Streak Heatmaps & Time-Blocking',
      desc: 'Track daily and weekday routines with interactive 30-day completion heatmaps right on your dashboard, and auto-schedule deep work blocks onto your daily timeline.',
      tip: 'Click any cell in the 30-day habit heatmap to toggle completion for that specific date.',
      color: 'from-emerald-600 to-teal-600',
    },
    {
      icon: Network,
      badge: 'Pillar 6 • Connected Memory & Studio',
      title: 'Second Brain Graph, Semantic Search & AI Studio',
      desc: 'Explore automatic relationships across your notes, projects, contacts, and files in the Second Brain Graph, search semantically with ⌘K, or synthesize visuals and ambient focus audio in the AI Studio Hub.',
      tip: 'Press ⌘K (or Ctrl+K) anytime to jump to any tool, note, contact, or command.',
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto">
      <div className="bn-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden my-auto transition-all">
        {/* Top Gradient Banner */}
        <div className="relative shrink-0 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 sm:px-6 py-3.5 sm:py-5 text-white border-b border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-blue-500/15 backdrop-blur-xs border border-blue-400/30 shadow-inner shrink-0">
                <BlueNoteLogo size={32} />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-300">
                  <Sparkles className="w-3 h-3" />
                  <span>Onboarding • Step {step + 1} of 4</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate">
                  Welcome to BlueNote
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                  AI Second Brain, Executive Organizer & Personal Pattern Engine
                </p>
              </div>
            </div>

            {/* Step Progress Pills (Responsive Grid on Mobile) */}
            <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2">
              {[
                { idx: 0, label: '1. Theme' },
                { idx: 1, label: '2. Pillars' },
                { idx: 2, label: '3. Patterns' },
                { idx: 3, label: '4. Launch' },
              ].map((s) => (
                <button
                  key={s.idx}
                  type="button"
                  onClick={() => setStep(s.idx as 0 | 1 | 2 | 3)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all text-center ${
                    step === s.idx
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
                      : step > s.idx
                      ? 'bg-white/15 text-white hover:bg-white/25'
                      : 'bg-white/5 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 p-4 sm:p-8 overflow-y-auto overscroll-contain space-y-5">
          {/* =================================================================
              STEP 0: PROFILE, UPDATED THEME ENGINE & ENERGY CALIBRATION
              ================================================================= */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Personalize Your Executive Workspace & Visual Theme
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your workspace starts 100% clean with zero pre-filled demo clutter. Choose your name, live visual theme, and default energy mode.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* User Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    What should BlueNote call you?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name (e.g., Jordan)..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Used in your morning briefings and personalized workspace header.
                  </p>
                </div>

                {/* AI Assistant Personality */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    AI Assistant Personality
                  </label>
                  <select
                    value={aiPersonality}
                    onChange={(e) => setAiPersonality(e.target.value as AIPersonality)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Professional">Professional — Clear, structured & analytical</option>
                    <option value="Executive Assistant">Executive Assistant — Action-first & concise</option>
                    <option value="Coach">Momentum Coach — Encouraging & streak-focused</option>
                    <option value="Friendly">Friendly — Warm & conversational</option>
                    <option value="Minimal">Minimal — Ultra-brief bullet points only</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Shapes how BlueNote summarizes notes and synthesizes daily priorities.
                  </p>
                </div>
              </div>

              {/* Theme Picker (Live Preview — Updated Signature Blue vs True Dark OLED) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  Choose Your Visual Theme (Click to Preview Live)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(
                    [
                      {
                        id: 'light',
                        label: 'Architectural White',
                        desc: 'Default Studio White',
                        swatch: 'bg-white border border-slate-300 shadow-2xs',
                      },
                      {
                        id: 'dark',
                        label: 'Obsidian Carbon',
                        desc: 'OLED Black & White',
                        swatch: 'bg-black border border-neutral-700',
                      },
                      {
                        id: 'blue',
                        label: 'Sapphire Executive',
                        desc: 'Midnight Navy Slate',
                        swatch: 'bg-[#0d1b36] border border-blue-500/50',
                      },
                      {
                        id: 'emerald',
                        label: 'Nordic Botanical',
                        desc: 'Deep Pine & Sage',
                        swatch: 'bg-emerald-950 border border-emerald-500/50',
                      },
                      {
                        id: 'violet',
                        label: 'Atelier Amethyst',
                        desc: 'Cosmic Plum Studio',
                        swatch: 'bg-violet-950 border border-violet-500/50',
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        onChangeTheme?.(t.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        theme === t.id
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-lg ${t.swatch} shadow-xs`} />
                        {theme === t.id && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy Mode Picker */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  How is your energy level right now?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'High Energy',
                        title: '⚡ High Energy',
                        desc: 'Surface critical deep-work tasks & ambitious milestones first.',
                      },
                      {
                        id: 'Normal',
                        title: '⚖️ Balanced Flow',
                        desc: 'Standard daily mix of priorities, schedule, and habit streaks.',
                      },
                      {
                        id: 'Low Energy',
                        title: '🌿 Low Energy / Overwhelmed',
                        desc: 'Hides heavy backlog and shows only quick, low-friction wins.',
                      },
                    ] as const
                  ).map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => setEnergyMode(em.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        energyMode === em.id
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {em.title}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {em.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 1: INTERACTIVE TOUR OF THE 6 CORE PILLARS
              ================================================================= */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  How BlueNote Works: 6 Core Architectural Pillars
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click any pillar below to explore how Capture, Predictive Intelligence, Tasks, Notes, and your Second Brain work together.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Pillar Selector */}
                <div className="lg:col-span-5 space-y-2">
                  {TOUR_FEATURES.map((feat, idx) => {
                    const Icon = feat.icon;
                    const active = activeTourCard === idx;
                    return (
                      <button
                        key={feat.title}
                        type="button"
                        onClick={() => setActiveTourCard(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                          active
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl bg-gradient-to-br ${feat.color} text-white shrink-0`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            {feat.badge}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {feat.title}
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            active ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Right Detailed Preview Card */}
                <div className="lg:col-span-7">
                  {(() => {
                    const feat = TOUR_FEATURES[activeTourCard];
                    const Icon = feat.icon;
                    return (
                      <div className="h-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-6 flex flex-col justify-between space-y-5">
                        <div className="space-y-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{feat.badge}</span>
                          </div>

                          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                            {feat.title}
                          </h4>

                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {feat.desc}
                          </p>

                          {/* Interactive Visual Diagram inside Tour Card */}
                          {activeTourCard === 0 && (
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Omnibox Natural Language Example
                              </div>
                              <div className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                "Remind me Friday at 2pm to review Q4 budget and buy coffee beans"
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold">
                                  ✓ Reminder: Friday 2:00 PM
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold">
                                  ✓ Shopping List: Coffee beans
                                </span>
                              </div>
                            </div>
                          )}

                          {activeTourCard === 1 && (
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Multimodal Input Channels
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold">
                                  🎙️ Voice Dictation
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold">
                                  📇 Business Card OCR
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold">
                                  🧾 Receipt & Note Scan
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTourCard === 2 && (
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
                                Prediction Lifecycle & Hypothesis Distinction
                              </div>
                              <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                OBSERVED (1x) → CANDIDATE (2x) → EVALUATING (3x) → PREDICTED → PRESENTED
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-semibold">
                                  ✓ Known Fact: What you explicitly added
                                </div>
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300 font-semibold">
                                  🔮 Hypothesis: Inferred from cadence
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTourCard >= 3 && (
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Accessible anytime via left navigation or Command Palette
                              </span>
                              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-600 dark:text-slate-300">
                                ⌘K
                              </kbd>
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pro Tip: </span>
                            {feat.tip}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 2: 🔮 PERSONAL PATTERN ENGINE & SAFEGUARDS CALIBRATION
              ================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-2">
                  <span>🔮 Predictive Intelligence Calibration</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Configure Your Personal Pattern Engine & Anti-Nagging Safeguards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  BlueNote starts with an empty Pattern Store and learns strictly from your real actions over time. Choose your preferred predictive scope and suggestion budget.
                </p>
              </div>

              {/* Rollout Stage Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Select Active Predictive Architecture Stage
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      stage: 3,
                      title: 'Stage 3 • Shopping Lists MVP',
                      desc: 'Low-risk household & grocery cycle predictions only.',
                    },
                    {
                      stage: 5,
                      title: 'Stage 5 • + Tasks & Reminders',
                      desc: 'Adds recurring routine task & monthly reminder detection.',
                    },
                    {
                      stage: 7,
                      title: 'Stage 7 • Cross-System Prep (Recommended)',
                      desc: 'Combines Calendar, Tasks, Notes & Shopping for contextual bundles.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.stage}
                      type="button"
                      onClick={() => setPredictionStage(opt.stage)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        predictionStage === opt.stage
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {opt.title}
                        </span>
                        {predictionStage === opt.stage && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestion Budget Slider */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    Centralized Predictive Inbox Suggestion Budget
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    Max {suggestionBudgetMax} active suggestions
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={suggestionBudgetMax}
                  onChange={(e) => setSuggestionBudgetMax(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Predictions never interrupt you with pop-up spam. They wait quietly in your Predictive Inbox capped at your budget limit.
                </p>
              </div>

              {/* 4 Non-Negotiable Safeguards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                    1. Hypothesis, Never a Fact
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    BlueNote clearly distinguishes what you explicitly recorded from what it inferred—and never makes false physical inventory claims.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
                    2. Explicit Instructions Always Win
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Single occurrences stay silent (`OBSERVED`). Denials trigger exponential cooldowns, and commands like “Stop suggesting coffee” permanently suppress a pattern.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 3: CLEAN ZERO-DEMO LAUNCH (OPTIONAL HABITS & FIRST CAPTURE)
              ================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    100% Clean Zero-Demo Workspace Ready
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    All demo tasks, notes, projects, contacts, and sample patterns have been removed. Leave the options below blank for a completely empty slate, or optionally pick habits and your first real item to start with.
                  </p>
                </div>
              </div>

              {/* Optional Starter Habits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Optional Daily Habits ({selectedHabits.length} selected — 0 by default)
                  </label>
                  {selectedHabits.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedHabits([])}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear selection (Start with 0 habits)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allHabitOptions.map((h) => {
                    const checked = selectedHabits.includes(h.name);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => toggleHabit(h.name)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          checked
                            ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {h.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {h.schedule}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {h.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Habit inline */}
                <form onSubmit={handleAddCustomHabit} className="flex gap-2">
                  <input
                    type="text"
                    value={customHabitName}
                    onChange={(e) => setCustomHabitName(e.target.value)}
                    placeholder="Or type your own custom habit (e.g., 'Practice Spanish 15m')..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Habit
                  </button>
                </form>
              </div>

              {/* Optional First Capture */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Optional: Capture Your First Real Task, Reminder, or Note
                </label>
                <input
                  type="text"
                  value={firstCaptureText}
                  onChange={(e) => setFirstCaptureText(e.target.value)}
                  placeholder="Leave blank for an empty workspace, or type your first task/reminder..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2 | 3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip Onboarding Guide
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 0 | 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch Clean BlueNote Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
