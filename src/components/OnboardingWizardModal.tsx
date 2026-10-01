import React, { useState, useRef } from 'react';
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
  Upload,
  FileText,
  FolderKanban,
  GitMerge,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react';
import {
  AIPersonality,
  EnergyMode,
  THEME_OPTIONS,
  ThemeMode,
  UserSettings,
  compressImageFileToDataUrl,
} from '../types/bluenote';
import { ProjectTemplateType } from '../types/projectsOS';
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
    bio?: string;
    avatarUrl?: string;
    theme: ThemeMode;
    energyMode: EnergyMode;
    aiPersonality: AIPersonality;
    starterHabits: StarterHabitOption[];
    firstCaptureText: string;
    predictionStage?: number;
    suggestionBudgetMax?: number;
    firstOSProjectName?: string;
    firstOSProjectTemplate?: ProjectTemplateType;
    launchSection?: 'dashboard' | 'projects-os';
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
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [name, setName] = useState(settings.name || '');
  const [bio, setBio] = useState(settings.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl || '');
  const [theme, setTheme] = useState<ThemeMode>(settings.theme || 'light');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [energyMode, setEnergyMode] = useState<EnergyMode>(settings.energyMode || 'Normal');
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>(
    settings.aiPersonality || 'Professional'
  );
  // Zero demo clutter: starter habits and starter project are blank/unchecked by default so workspace starts 100% clean
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabitName, setCustomHabitName] = useState('');
  const [customHabits, setCustomHabits] = useState<StarterHabitOption[]>([]);
  const [firstCaptureText, setFirstCaptureText] = useState('');
  const [firstOSProjectName, setFirstOSProjectName] = useState('');
  const [firstOSProjectTemplate, setFirstOSProjectTemplate] =
    useState<ProjectTemplateType>('Blank Project');
  const [launchSection, setLaunchSection] = useState<'dashboard' | 'projects-os'>('dashboard');
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
      bio: bio.trim(),
      avatarUrl,
      theme,
      energyMode,
      aiPersonality,
      starterHabits: chosenHabits,
      firstCaptureText: firstCaptureText.trim(),
      predictionStage,
      suggestionBudgetMax,
      firstOSProjectName: firstOSProjectName.trim() || undefined,
      firstOSProjectTemplate,
      launchSection,
    });
  };

  const TOUR_FEATURES = [
    {
      icon: Zap,
      badge: 'Pillar 1 • Natural Language Capture',
      title: 'Today Command Center & Omnibox Capture',
      desc: 'Start from a 100% clean, zero-demo command center. Type naturally into the Omnibox at the top of your dashboard—BlueNote automatically classifies tasks, shopping items, reminders, contacts, calendar events, and notes.',
      tip: 'Switch your Energy State (High Energy, Normal, Low Energy / Overwhelmed, Focus Mode) anytime to dynamically adapt the dashboard.',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      icon: FolderKanban,
      badge: 'Pillar 2 • AI Project Operating System',
      title: 'PROJECTS — 10 GB Docs, Version Diffs & HTML Photo Albums',
      desc: 'Create isolated Project Workspaces with 12 integrated modules: 10 GB chunked & resumable document uploads (.txt, .md, .doc, .docx, .pdf), non-destructive version history (Original → Working → Edited → Final), side-by-side diffs, multi-document merge, standalone HTML photo albums, and AI Sandbox Mode.',
      tip: 'Press ⌘K and hit P from anywhere to jump straight into PROJECTS, or click "PROJECTS" in the main sidebar.',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      icon: Camera,
      badge: 'Pillar 3 • Voice & Visual Intelligence',
      title: 'AI Brain Dump & Multimodal OCR Vault',
      desc: 'Speak or paste an unstructured paragraph of thoughts, or upload a photo of a handwritten sticky note, business card, whiteboard, or receipt. BlueNote extracts every entity into an interactive AI Review Screen before saving.',
      tip: 'Use keyboard shortcut ⇧⌘B (or Ctrl+Shift+B) from anywhere in the app to launch AI Brain Dump.',
      color: 'from-indigo-600 to-violet-600',
    },
    {
      icon: Sparkles,
      badge: 'Pillar 4 • Quiet Predictive Architecture',
      title: '🔮 Predictive Lists & Personal Pattern Engine',
      desc: 'BlueNote observes → learns → predicts → explains → asks → learns from your answer. Every prediction is treated strictly as a hypothesis backed by your real recurrence intervals—never a fact or false inventory claim.',
      tip: 'Predictions accumulate quietly in your Centralized Predictive Inbox with Approve, Edit, Snooze, Deny, and "Stop suggesting..." overrides.',
      color: 'from-violet-600 to-fuchsia-600',
    },
    {
      icon: Calendar,
      badge: 'Pillar 5 • Deep Execution & Notes',
      title: 'Tasks, Split-Screen Notes, Calendar & Pomodoro',
      desc: 'Manage multi-priority tasks with subtasks, launch distraction-free Pomodoro Focus timers, write in the Split-Screen Markdown Note Editor with version history, or schedule time-blocked deep work.',
      tip: 'Click the Focus button on any active task to enter a distraction-free Pomodoro countdown session.',
      color: 'from-sky-600 to-blue-600',
    },
    {
      icon: Flame,
      badge: 'Pillar 6 • Behavioral Consistency',
      title: '30-Day Habit Streak Heatmaps & Analytics',
      desc: 'Track daily and weekday routines with interactive 30-day completion heatmaps right on your dashboard, and auto-schedule deep work blocks onto your daily timeline.',
      tip: 'Click any cell in the 30-day habit heatmap to toggle completion for that specific date.',
      color: 'from-emerald-600 to-teal-600',
    },
    {
      icon: Network,
      badge: 'Pillar 7 • Connected Memory & Studio',
      title: 'Second Brain Graph, Semantic Search & Local AI Studio',
      desc: 'Explore automatic relationships across your notes, projects, contacts, and files in the Second Brain Graph, search semantically with ⌘K, or synthesize visuals and ambient focus audio in the AI Studio Hub.',
      tip: 'Press ⌘K (or Ctrl+K) anytime to jump to any tool, note, project, contact, or command.',
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
                  <span>Zero-Demo Onboarding • Step {step + 1} of 5</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate">
                  Welcome to BlueNote
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                  AI Second Brain, 10 GB Projects Operating System &amp; Personal Pattern Engine
                </p>
              </div>
            </div>

            {/* Step Progress Pills (Responsive Grid on Mobile) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
              {[
                { idx: 0, label: '1. Theme' },
                { idx: 1, label: '2. Pillars' },
                { idx: 2, label: '3. Projects OS' },
                { idx: 3, label: '4. Patterns' },
                { idx: 4, label: '5. Launch' },
              ].map((s) => (
                <button
                  key={s.idx}
                  type="button"
                  onClick={() => setStep(s.idx as 0 | 1 | 2 | 3 | 4)}
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
                {/* User Name & Photograph Upload */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Your Name &amp; Profile Photograph
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name || 'Profile'}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center border border-blue-400/30">
                          {(name || 'BN').trim().slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md border border-white dark:border-slate-900"
                        title="Upload Profile Photograph"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !file.type.startsWith('image/')) return;
                          try {
                            const compressed = await compressImageFileToDataUrl(file, 256, 0.85);
                            setAvatarUrl(compressed);
                          } catch {
                            // ignore
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name (e.g., Jordan)..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        {avatarUrl ? 'Change Photograph' : 'Upload Profile Photograph'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Bio Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Your Bio &amp; AI Assistant Personality
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short bio or current focus (e.g., Building calm systems)..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <select
                    value={aiPersonality}
                    onChange={(e) => setAiPersonality(e.target.value as AIPersonality)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Professional">AI Tone: Professional — Structured &amp; analytical</option>
                    <option value="Executive Assistant">AI Tone: Executive Assistant — Action-first</option>
                    <option value="Motivational">AI Tone: Momentum Coach — Encouraging</option>
                    <option value="Friendly">AI Tone: Friendly — Warm &amp; conversational</option>
                    <option value="Minimal">AI Tone: Minimal — Ultra-brief bullets</option>
                  </select>
                </div>
              </div>

              {/* Theme Picker (All 12 Themes — Live Preview) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  Choose Your Visual Theme ({THEME_OPTIONS.length} Studio Themes — Click to Preview Live)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        onChangeTheme?.(t.id);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        theme === t.id
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`w-5 h-5 rounded-lg ${t.swatch} shadow-xs`} />
                        {theme === t.id ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400">
                            {t.isDark ? 'Dark' : 'Light'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {t.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {t.badge}
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
              STEP 2: NEW PROJECTS — COMPLETE AI-POWERED PROJECT WORKSPACE
              ================================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300 mb-2">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>New Top-Level Section • PROJECTS Operating System</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  PROJECTS — Complete AI-Powered Project Workspace (10 GB Quota)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Every project is an isolated 12-module container for documents, files, notes, tasks, audio/video, standalone HTML photo albums, knowledge graphs, and non-destructive AI workflows.
                </p>
              </div>

              {/* 4 Core Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    10 GB Chunked &amp; Resumable Uploads
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Streams `.txt`, `.md`, `.doc`, `.docx`, and `.pdf` files in 2 MB IndexedDB chunks with live speed/ETA telemetry, Pause/Resume/Cancel, and zero browser RAM spikes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-indigo-600" />
                    Non-Destructive Versions, Diffs &amp; Merge
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Never overwrites your original upload (`Original → Working → Edited → Final`). Compare versions side-by-side, detect near-duplicates, and merge multiple documents.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    Standalone HTML Photo Album Builder
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload JPG, PNG, WEBP, or GIF photos and generate a downloadable `My_Photo_Album.html` with Modern Grid, Masonry layout, Lightbox, and Fullscreen navigation.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-violet-600" />
                    AI Sandbox Mode &amp; 5-Mode Export Studio
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Run "ASK THIS PROJECT" and 10 AI actions in a safe Sandbox with side-by-side source comparison before committing, plus portable `Project_Manifest.json` backups.
                  </p>
                </div>
              </div>

              {/* Optional First Clean Project Container Creator */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-blue-600" />
                    Optional: Create Your First Clean Project Container (Starts Empty by Default)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    0 Demo Projects Pre-Loaded
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={firstOSProjectName}
                    onChange={(e) => setFirstOSProjectName(e.target.value)}
                    placeholder="Leave blank for 0 projects, or enter a project name..."
                    className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                  <select
                    value={firstOSProjectTemplate}
                    onChange={(e) =>
                      setFirstOSProjectTemplate(e.target.value as ProjectTemplateType)
                    }
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Blank Project">Blank Project</option>
                    <option value="Writing Project">Writing Project</option>
                    <option value="Music Project">Music Project</option>
                    <option value="Research Project">Research Project</option>
                    <option value="Photo Project">Photo Project</option>
                    <option value="Business Project">Business Project</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 3: 🔮 PERSONAL PATTERN ENGINE & SAFEGUARDS CALIBRATION
              ================================================================= */}
          {step === 3 && (
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
              STEP 4: CLEAN ZERO-DEMO LAUNCH (OPTIONAL HABITS & FIRST CAPTURE)
              ================================================================= */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    100% Clean Zero-Demo Workspace Verified
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    All demo tasks, notes, projects, documents, photo albums, contacts, and sample patterns have been completely removed. Leave the fields below blank for a completely empty slate, or optionally select habits and your launch destination.
                  </p>
                </div>
              </div>

              {/* Choose Initial Destination on Launch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLaunchSection('dashboard')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    launchSection === 'dashboard'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    🚀 Open Today Command Center
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Start on your clean daily dashboard, Omnibox capture bar, and habit tracker.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setLaunchSection('projects-os')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    launchSection === 'projects-os'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    📂 Open PROJECTS AI Workspace
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Jump straight into the 12-module AI Project Operating System (10 GB Docs, Diffs &amp; Albums).
                  </p>
                </button>
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
                onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2 | 3 | 4)}
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
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 0 | 1 | 2 | 3 | 4)}
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
