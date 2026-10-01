import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Bell,
  FileText,
  FolderKanban,
  Flame,
  Zap,
  Camera,
  Mic,
  Plus,
  ArrowRight,
  Pin,
  SlidersHorizontal,
  Inbox,
  Play,
  AlarmClock,
  Award,
  TrendingUp,
  Check,
  X,
  Trash2,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ActiveSection,
  EnergyMode,
  Habit,
  Task,
  WorkspaceState,
} from '../types/bluenote';
import {
  DEFAULT_PERSONAL_PATTERNS,
  DEFAULT_PREDICTION_SAFEGUARDS,
  getSurfacedPredictions,
} from '../services/patternEngine';

interface DashboardViewProps {
  workspace: WorkspaceState;
  onNavigate: (section: ActiveSection, itemId?: string) => void;
  onToggleTask: (taskId: string) => void;
  onStartFocus: (task: Task) => void;
  onOpenBrainDump: (tab?: 'brain-dump' | 'ocr-scanner') => void;
  onQuickCapture: (text: string) => void;
  onChangeEnergyMode: (mode: EnergyMode) => void;
  onSnoozeReminder: (reminderId: string, minutes: number) => void;
  onCompleteReminder: (reminderId: string) => void;
  onToggleHabit: (habitId: string, dateStr?: string) => void;
  onAddHabit: (habit: {
    name: string;
    schedule: Habit['schedule'];
    targetPerWeek: number;
    reminderTime?: string;
  }) => void;
  onDeleteHabit?: (habitId: string) => void;
  onRedistributeWorkload: () => void;
}

const ENERGY_MODES: { mode: EnergyMode; label: string; desc: string }[] = [
  { mode: 'Focused', label: 'Focused', desc: 'Prioritize deep work & critical tasks' },
  { mode: 'Normal', label: 'Normal', desc: 'Balanced daily schedule' },
  { mode: 'Busy', label: 'Busy', desc: 'Only show essential & urgent tasks' },
  { mode: 'Tired', label: 'Tired', desc: 'Show quick, low-effort wins' },
  { mode: 'Sick', label: 'Sick', desc: 'Pause non-critical work' },
  { mode: 'Vacation', label: 'Vacation', desc: 'Silence work tasks & reminders' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  onNavigate,
  onToggleTask,
  onStartFocus,
  onOpenBrainDump,
  onQuickCapture,
  onChangeEnergyMode,
  onSnoozeReminder,
  onCompleteReminder,
  onToggleHabit,
  onAddHabit,
  onDeleteHabit,
  onRedistributeWorkload,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitSchedule, setNewHabitSchedule] = useState<Habit['schedule']>('Daily');
  const [newHabitTarget, setNewHabitTarget] = useState<number>(7);
  const [newHabitReminder, setNewHabitReminder] = useState<string>('08:00');
  const [habitChartView, setHabitChartView] = useState<'combined' | 'bars'>('combined');

  const todayISO = new Date().toISOString().split('T')[0];

  // Build 30-day streak trends & completion rate dataset for Recharts
  const thirtyDayHabitAnalytics = React.useMemo(() => {
    const hasHabits = workspace.habits.length > 0;
    const totalHabits = Math.max(1, workspace.habits.length);
    const data: {
      dateStr: string;
      label: string;
      completionRate: number;
      completedCount: number;
      streakScore: number;
    }[] = [];

    let runningStreakMomentum = 0;
    let totalCheckIns30d = 0;
    let sumRates = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let completedOnDay = 0;
      workspace.habits.forEach((hab) => {
        const isDone =
          (i === 0 && hab.completedToday) || hab.historyDates.includes(dateStr);
        if (isDone) completedOnDay += 1;
      });

      const rate = hasHabits ? Math.round((completedOnDay / totalHabits) * 100) : 0;
      if (hasHabits && rate >= 50) {
        runningStreakMomentum += 1;
      } else if (hasHabits) {
        runningStreakMomentum = Math.max(0, runningStreakMomentum - 1);
      }

      totalCheckIns30d += completedOnDay;
      sumRates += rate;

      data.push({
        dateStr,
        label: monthDay,
        completionRate: rate,
        completedCount: completedOnDay,
        streakScore: runningStreakMomentum,
      });
    }

    const avgCompletionRate = Math.round(sumRates / 30);
    const peakStreak = Math.max(
      ...data.map((d) => d.streakScore),
      ...workspace.habits.map((h) => h.streak),
      0
    );

    return {
      data,
      avgCompletionRate,
      totalCheckIns30d,
      peakStreak,
    };
  }, [workspace.habits]);

  // Build the 7-day weekly view ending Today (or current 7-day rolling window)
  const weekDays = React.useMemo(() => {
    const days: { dateStr: string; dayShort: string; dayNum: string; isToday: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayShort: dayNames[d.getDay()],
        dayNum: String(d.getDate()),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    onAddHabit({
      name: newHabitName.trim(),
      schedule: newHabitSchedule,
      targetPerWeek: newHabitTarget,
      reminderTime: newHabitReminder || undefined,
    });
    setNewHabitName('');
    setNewHabitSchedule('Daily');
    setNewHabitTarget(7);
    setShowAddHabitForm(false);
  };
  const [visibleWidgets, setVisibleWidgets] = useState({
    aiSuggestions: true,
    tasks: true,
    calendarReminders: true,
    projectsNotes: true,
    habitsGoals: true,
    pinnedTimeline: true,
  });

  const activeTasks = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Archived');
  const completedCount = activeTasks.filter((t) => t.status === 'Completed').length;
  const completionRate =
    activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  // Filter tasks based on Energy Mode (Part 2 Requirement)
  const displayedTasks = activeTasks.filter((t) => {
    if (t.status === 'Completed') return false;
    const mode = workspace.settings.energyMode;
    if (mode === 'Busy' || mode === 'Sick') {
      return t.priority === 'Critical' || t.priority === 'High';
    }
    if (mode === 'Tired') {
      return t.estimatedMinutes <= 25 || t.priority === 'Critical';
    }
    if (mode === 'Vacation') {
      return t.category === 'Personal';
    }
    return true;
  });

  const pendingInboxCount = workspace.inbox.filter((i) => i.status === 'Pending Review').length;
  const activeReminders = workspace.reminders.filter((r) => r.status === 'Active');

  const surfacedPredictions = getSurfacedPredictions(
    workspace.personalPatterns || DEFAULT_PERSONAL_PATTERNS,
    workspace.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS
  );
  const predictedShoppingCount = surfacedPredictions.filter(
    (p) => p.category === 'Shopping' || p.category === 'Household'
  ).length;
  const predictedTasksCount = surfacedPredictions.filter((p) => p.category === 'Tasks').length;
  const predictedPrepCount = surfacedPredictions.filter(
    (p) => p.category === 'Reminders' || p.category === 'Cross-System' || p.category === 'Calendar'
  ).length;

  const totalEstimatedMins = displayedTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 20), 0);
  const productivityScore =
    activeTasks.length === 0 && workspace.habits.length === 0
      ? 0
      : Math.min(
          100,
          completionRate + workspace.habits.filter((h) => h.completedToday).length * 12
        );

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onQuickCapture(quickInput.trim());
    setQuickInput('');
  };

  const priorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Executive Command Hero & Natural Language Omnibox */}
      <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-6 relative overflow-hidden">
        {/* Subtle Top Accent Hairline */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Command Center</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
              Good morning, {(workspace.settings.name || 'Explorer').split(' ')[0]}.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              You have{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {displayedTasks.length} priority tasks
              </span>{' '}
              (~{totalEstimatedMins} mins estimated) and{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {workspace.events.length} scheduled blocks
              </span>{' '}
              queued for today.
            </p>
          </div>

          {/* Energy Mode Segmented Selector & Module Customizer */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5 pl-2 pr-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                <span>Energy State:</span>
              </div>
              <select
                value={workspace.settings.energyMode}
                onChange={(e) => onChangeEnergyMode(e.target.value as EnergyMode)}
                className="bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Select Energy Mode"
              >
                {ENERGY_MODES.map((m) => (
                  <option key={m.mode} value={m.mode}>
                    {m.label} — {m.desc}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setCustomizeOpen(!customizeOpen)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                customizeOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Customize Dashboard Widgets"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layout</span>
            </button>
          </div>
        </div>

        {/* Customize Widgets Bar */}
        {customizeOpen && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Active Workspace Modules:
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['aiSuggestions', 'AI Suggestions'],
                  ['tasks', 'Today’s Tasks'],
                  ['calendarReminders', 'Calendar & Reminders'],
                  ['projectsNotes', 'Projects & Notes'],
                  ['habitsGoals', 'Habits & Goals'],
                  ['pinnedTimeline', 'Pinned & Timeline'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    setVisibleWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    visibleWidgets[key]
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Universal Natural Language Command Bar */}
        <form onSubmit={handleQuickSubmit} className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-3 bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-inner">
            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder='Command or capture anything: "Remind me Friday to pay rent", "I need oat milk", "Mike’s number is (555) 555-1234"...'
              className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-600/25 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Smart Add
            </button>
            <button
              type="button"
              onClick={() => onOpenBrainDump('brain-dump')}
              className="px-3.5 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
            >
              <Mic className="w-4 h-4" />
              Brain Dump
            </button>
            <button
              type="button"
              onClick={() => onOpenBrainDump('ocr-scanner')}
              className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Scan Handwritten Note, Business Card, or Receipt"
            >
              <Camera className="w-4 h-4 text-blue-500" />
              OCR Scan
            </button>
          </div>
        </form>

        {/* Executive 4-Card Telemetry Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Progress
              </span>
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                {completionRate}%
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Streak
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                {workspace.habits.length > 0
                  ? Math.max(...workspace.habits.map((h) => h.streak))
                  : 0}{' '}
                <span className="text-xs font-sans font-semibold text-slate-500">Days</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {workspace.habits.filter((h) => h.completedToday).length} of {workspace.habits.length} habits logged today
              </p>
            </div>
          </div>

          {workspace.settings.showProductivityScore && (
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Velocity Index
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {productivityScore}{' '}
                  <span className="text-xs font-sans font-semibold text-slate-500">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Optimal focus window active
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => onNavigate('inbox')}
            className="p-4 rounded-2xl bg-slate-50/90 hover:bg-blue-500/10 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 flex flex-col justify-between gap-2 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Universal Inbox
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 group-hover:scale-105 transition-transform">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {pendingInboxCount}{' '}
                <span className="text-xs font-sans font-semibold text-slate-500">Pending</span>
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 flex items-center gap-1">
                Review AI classifications <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* AI Proactive Suggestions & Coach Bar */}
      {visibleWidgets.aiSuggestions && (
        <div className="bn-card bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shrink-0 mt-0.5 shadow-sm shadow-blue-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  AI Coach & Smart Scheduling
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                  {workspace.settings.energyMode} Mode Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {displayedTasks.length === 0 && pendingInboxCount === 0 ? (
                  <>
                    Your daily slate is completely clear. Type any task, reminder, or idea into the Omnibox above—or launch <strong>AI Brain Dump</strong> to organize multiple items at once.
                  </>
                ) : (
                  <>
                    You have <strong>{displayedTasks.length} active priority {displayedTasks.length === 1 ? 'item' : 'items'}</strong> (~{totalEstimatedMins}m total) and{' '}
                    <strong>{pendingInboxCount} {pendingInboxCount === 1 ? 'item' : 'items'}</strong> waiting in your Universal Inbox.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {pendingInboxCount > 0 && (
              <button
                onClick={() => onNavigate('inbox')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
              >
                Review Inbox ({pendingInboxCount})
              </button>
            )}
            <button
              onClick={onRedistributeWorkload}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all"
            >
              Auto-Balance Today’s Schedule
            </button>
          </div>
        </div>
      )}

      {/* Quiet Personal Pattern Engine Summary ("🔮 BlueNote noticed a few things") */}
      {surfacedPredictions.length > 0 && (
        <div className="bn-card bg-white dark:bg-slate-900 border border-violet-500/30 dark:border-violet-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-lg shrink-0">
              🔮
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  BlueNote noticed a few things
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                  “Hey. I think this might be useful.”
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                {predictedShoppingCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {predictedShoppingCount} predicted shopping items
                  </span>
                )}
                {predictedTasksCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {predictedTasksCount} recurring task
                  </span>
                )}
                {predictedPrepCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    {predictedPrepCount} upcoming preparation reminders
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('predictive')}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <span>Review Predictive Lists ({surfacedPredictions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Today's Tasks & Projects/Notes */}
        <div className="lg:col-span-7 space-y-6">
          {visibleWidgets.tasks && (
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      Today’s Priority Execution Queue
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filtered for {workspace.settings.energyMode} Energy Mode
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 transition-colors"
                >
                  All Tasks <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {displayedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 bg-slate-50/70 dark:bg-slate-800/40 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors"
                        aria-label={`Mark "${task.title}" complete`}
                      >
                        <Circle className="w-5 h-5" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {task.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                          {task.dueTime && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3" /> {task.dueTime}
                            </span>
                          )}
                        </div>
                        {task.aiReasoning && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{task.aiReasoning}</span>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onStartFocus(task)}
                        className="opacity-90 group-hover:opacity-100 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-xs font-bold transition-all shrink-0"
                        title="Start Focus Timer on this task"
                      >
                        <Play className="w-3 h-3" /> Focus
                      </button>
                    </div>
                  </div>
                ))}

                {displayedTasks.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">
                    All priority tasks for {workspace.settings.energyMode} mode are complete!
                  </div>
                )}
              </div>
            </div>
          )}

          {visibleWidgets.projectsNotes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Projects */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-blue-600" />
                    Active Projects
                  </h3>
                  <button
                    onClick={() => onNavigate('projects')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Open
                  </button>
                </div>

                <div className="space-y-3">
                  {workspace.projects.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No active projects yet. Start from a template or create a custom goal.
                      </p>
                      <button
                        onClick={() => onNavigate('projects')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Project
                      </button>
                    </div>
                  ) : (
                    workspace.projects.slice(0, 3).map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => onNavigate('projects', proj.id)}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 border border-slate-200/70 dark:border-slate-800 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {proj.name}
                          </span>
                          <span className="text-xs font-mono font-semibold text-blue-600">
                            {proj.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${proj.progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {proj.aiSummary || proj.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Notes */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Recent Notes
                  </h3>
                  <button
                    onClick={() => onNavigate('notes')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    All Notes
                  </button>
                </div>

                <div className="space-y-2.5">
                  {workspace.notes.filter((n) => !n.deletedAt).length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No notes yet. Create a smart note or use Brain Dump.
                      </p>
                      <button
                        onClick={() => onNavigate('notes')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Smart Note
                      </button>
                    </div>
                  ) : (
                    workspace.notes
                      .filter((n) => !n.deletedAt)
                      .slice(0, 3)
                      .map((note) => (
                        <button
                          key={note.id}
                          onClick={() => onNavigate('notes', note.id)}
                          className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 border border-slate-200/70 dark:border-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {note.title}
                            </span>
                            {note.isPinned && <Pin className="w-3 h-3 text-blue-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {note.summary || note.content}
                          </p>
                        </button>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Calendar, Smart Reminders, Habits & Pinned */}
        <div className="lg:col-span-5 space-y-6">
          {visibleWidgets.calendarReminders && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Today’s Schedule & Reminders
                </h2>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Open Planner
                </button>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {workspace.events.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-500">
                      No events scheduled today. Open Planner to block focus time or meetings.
                    </p>
                  </div>
                ) : (
                  workspace.events.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4"
                      style={{ borderLeftColor: evt.color || '#2563eb' }}
                    >
                      <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 w-24 shrink-0">
                        {evt.startTime}–{evt.endTime}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {evt.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {evt.location || evt.category}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Smart Reminders with Snooze */}
              {activeReminders.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Smart Reminders
                  </div>
                  {activeReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {rem.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {rem.triggerDate} at {rem.triggerTime} ({rem.repeatRule})
                          </div>
                        </div>
                        <button
                          onClick={() => onCompleteReminder(rem.id)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold"
                        >
                          Done
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlarmClock className="w-3 h-3 text-amber-600" />
                        <span className="text-[10px] text-slate-500 mr-1">Snooze:</span>
                        {[15, 60, 1440].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => onSnoozeReminder(rem.id, mins)}
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium hover:border-blue-400"
                          >
                            {mins === 15 ? '15m' : mins === 60 ? '1h' : 'Tomorrow'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {visibleWidgets.habitsGoals && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              {/* Habits Header with Streak Summary & Add Habit Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    Habits
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
                      🔥 Best Streak:{' '}
                      {workspace.habits.length > 0
                        ? Math.max(...workspace.habits.map((h) => h.streak))
                        : 0}
                      d
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Weekly view of daily habits • Click any day to check off
                  </p>
                </div>

                <button
                  onClick={() => setShowAddHabitForm((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  {showAddHabitForm ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add Habit
                    </>
                  )}
                </button>
              </div>

              {/* Inline Add Habit Form */}
              {showAddHabitForm && (
                <form
                  onSubmit={handleCreateHabit}
                  className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-800/70 border border-blue-200/80 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Create New Daily Habit
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Auto-syncs with Streak Counter
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g., Read 20 pages, Drink 2L water, 15m Meditation..."
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Frequency
                      </label>
                      <select
                        value={newHabitSchedule}
                        onChange={(e) => {
                          const sched = e.target.value as Habit['schedule'];
                          setNewHabitSchedule(sched);
                          setNewHabitTarget(sched === 'Daily' ? 7 : sched === 'Weekdays' ? 5 : 3);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="Daily">Daily (7x/wk)</option>
                        <option value="Weekdays">Weekdays (5x/wk)</option>
                        <option value="Weekly">Weekly (3x/wk)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Weekly Goal
                      </label>
                      <select
                        value={newHabitTarget}
                        onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <option key={n} value={n}>
                            {n} days / wk
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Reminder
                      </label>
                      <input
                        type="time"
                        value={newHabitReminder}
                        onChange={(e) => setNewHabitReminder(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddHabitForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Habit
                    </button>
                  </div>
                </form>
              )}

              {/* Weekly Column Headers */}
              <div className="pt-1">
                <div className="grid grid-cols-7 gap-1.5 px-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {weekDays.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`flex flex-col items-center py-1 rounded-lg ${
                        day.isToday
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider">{day.dayShort}</span>
                      <span className="text-xs font-mono">{day.dayNum}</span>
                    </div>
                  ))}
                </div>

                {/* Habits Weekly Rows */}
                <div className="space-y-3 pt-3">
                  {workspace.habits.map((hab) => {
                    const completedDaysInWeek = weekDays.filter((d) =>
                      d.isToday
                        ? hab.completedToday || hab.historyDates.includes(d.dateStr)
                        : hab.historyDates.includes(d.dateStr)
                    ).length;

                    return (
                      <div
                        key={hab.id}
                        className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5 transition-all hover:border-blue-300 dark:hover:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleHabit(hab.id, todayISO)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                hab.completedToday
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-500'
                              }`}
                              title="Toggle today's completion"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span
                              className={`text-xs font-bold truncate ${
                                hab.completedToday
                                  ? 'text-slate-600 dark:text-slate-300'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {hab.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                              {completedDaysInWeek}/{hab.targetPerWeek || 7} wk
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/80 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"
                              title={`${hab.streak} day streak`}
                            >
                              🔥 {hab.streak}d
                            </span>
                            {onDeleteHabit && (
                              <button
                                type="button"
                                onClick={() => onDeleteHabit(hab.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Delete habit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 7-Day Checkmark Grid */}
                        <div className="grid grid-cols-7 gap-1.5">
                          {weekDays.map((day) => {
                            const isChecked = day.isToday
                              ? hab.completedToday || hab.historyDates.includes(day.dateStr)
                              : hab.historyDates.includes(day.dateStr);

                            return (
                              <button
                                key={day.dateStr}
                                type="button"
                                onClick={() => onToggleHabit(hab.id, day.dateStr)}
                                title={`${hab.name} — ${day.dayShort} (${day.dateStr}): ${
                                  isChecked ? 'Completed' : 'Not completed'
                                }`}
                                className={`h-8 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                    : day.isToday
                                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-600 hover:bg-blue-100/70'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-300 dark:text-slate-600 hover:border-blue-400'
                                }`}
                              >
                                {isChecked ? (
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {workspace.habits.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No daily habits yet. Click <strong>+ Add Habit</strong> above to start tracking your weekly streaks!
                    </div>
                  )}
                </div>

                {/* 30-Day Recharts Streak Trends & Completion Rate Visualization */}
                <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        30-Day Streak Trends & Completion Rates
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Daily habit completion percentage vs. cumulative streak momentum
                      </p>
                    </div>

                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setHabitChartView('combined')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          habitChartView === 'combined'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Area + Streak
                      </button>
                      <button
                        type="button"
                        onClick={() => setHabitChartView('bars')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          habitChartView === 'bars'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Daily Bars
                      </button>
                    </div>
                  </div>

                  {/* 30-Day KPI Metrics Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500">30d Completion Rate</div>
                      <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {thirtyDayHabitAnalytics.avgCompletionRate}%
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500">Peak Streak Trend</div>
                      <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                        🔥 {thirtyDayHabitAnalytics.peakStreak}d
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500">30d Check-ins</div>
                      <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                        {thirtyDayHabitAnalytics.totalCheckIns30d}
                      </div>
                    </div>
                  </div>

                  {/* Recharts Responsive Container */}
                  <div className="h-56 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={thirtyDayHabitAnalytics.data}
                        margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="habitCompletionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          interval={4}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          unit="%"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10, fill: '#d97706' }}
                          unit="d"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#f8fafc',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        {habitChartView === 'combined' ? (
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="completionRate"
                            name="Completion Rate (%)"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#habitCompletionGrad)"
                          />
                        ) : (
                          <Bar
                            yAxisId="left"
                            dataKey="completionRate"
                            name="Completion Rate (%)"
                            fill="#2563eb"
                            radius={[4, 4, 0, 0]}
                          />
                        )}
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="streakScore"
                          name="Streak Momentum (days)"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pinned Notes & Recent Activity Timeline Widget */}
          {visibleWidgets.pinnedTimeline && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pin className="w-4 h-4 text-blue-600" />
                  Pinned Notes & Activity Timeline
                </h3>
                <button
                  onClick={() => onNavigate('second-brain')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Full Timeline →
                </button>
              </div>

              {workspace.notes.filter((n) => !n.deletedAt && n.isPinned).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pinned Smart Notes
                  </div>
                  {workspace.notes
                    .filter((n) => !n.deletedAt && n.isPinned)
                    .slice(0, 3)
                    .map((note) => (
                      <button
                        key={note.id}
                        onClick={() => onNavigate('notes', note.id)}
                        className="w-full text-left p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 hover:border-amber-400 transition-colors"
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">{note.title}</span>
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Pinned
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {note.summary || note.content.replace(/[#*`]/g, '').slice(0, 90)}
                        </p>
                      </button>
                    ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recent Activity
                </div>
                {workspace.activityLog.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No activity logged yet. Capture a task, note, or event to start your timeline.
                  </p>
                ) : (
                  workspace.activityLog.slice(0, 4).map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {act.action}:
                        </span>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {act.entityTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
