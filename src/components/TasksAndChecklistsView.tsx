import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Sparkles,
  Play,
  Trash2,
  Archive,
  Clock,
  Link2,
  AlertTriangle,
  ShoppingBag,
  Columns,
  List,
  CheckCircle2,
  Circle,
  Repeat,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Filter,
  Zap,
  BatteryLow,
  Scale,
  ArrowUpDown,
  Check,
  ListTodo,
  Wand2,
  CheckCheck,
} from 'lucide-react';
import {
  EnergyMode,
  PriorityLevel,
  ShoppingItem,
  Subtask,
  Task,
  TaskEnergyLevel,
  TaskStatus,
  WorkspaceState,
} from '../types/bluenote';

export type SmartSortEnergyProfile = 'high-energy' | 'balanced' | 'low-energy';

interface TasksAndChecklistsViewProps {
  workspace: WorkspaceState;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTasks: (taskIds: string[]) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onStartFocus: (task: Task) => void;
  onAddShoppingItem: (
    listId: string,
    name: string,
    quantity: string,
    category: ShoppingItem['category']
  ) => void;
  onToggleShoppingItem: (listId: string, itemId: string) => void;
  onDeleteShoppingItem?: (listId: string, itemId: string) => void;
  onClearCheckedShoppingItems?: (listId: string) => void;
  onAddShoppingList?: (name: string, store: string) => void;
  onDeleteShoppingList?: (listId: string) => void;
  onChangeEnergyMode?: (mode: EnergyMode) => void;
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Someday: 5,
};

const STATUS_COLUMNS: TaskStatus[] = [
  'Not Started',
  'In Progress',
  'Waiting',
  'Scheduled',
  'Completed',
];

const SHOPPING_CATEGORIES: ShoppingItem['category'][] = [
  'Produce',
  'Dairy',
  'Pantry',
  'Groceries',
  'Household',
  'Pharmacy',
  'Hardware',
  'Other',
];

export function inferTaskEnergyLevel(task: Task): TaskEnergyLevel {
  if (task.energyLevel) return task.energyLevel;
  const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();

  if (
    /\b(quick|call|email|reply|buy|order|pay|check|clean|water|schedule|confirm|book|inbox|errand|pickup)\b/i.test(
      text
    ) ||
    task.estimatedMinutes <= 20 ||
    task.priority === 'Low' ||
    task.priority === 'Someday'
  ) {
    return 'Low';
  }

  if (
    /\b(architect|strategy|design|build|prepare|tax|financial|proposal|write|research|analysis|code|refactor|audit|launch|presentation|deep)\b/i.test(
      text
    ) ||
    task.estimatedMinutes >= 45 ||
    task.priority === 'Critical'
  ) {
    return 'High';
  }

  return 'Medium';
}

export function parseDescriptionIntoChecklistSteps(
  description: string,
  taskTitle: string
): { title: string; completed: boolean }[] {
  const raw = (description || '').trim();
  if (raw) {
    // First split by newlines, bullet symbols, or semicolons
    let lines = raw
      .split(/\r?\n|;\s+|•\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // If single paragraph with multiple sentences or comma/conjunction clauses, split into granular steps
    if (lines.length === 1) {
      const sentenceParts = lines[0]
        .split(/(?:\.\s+|\s+then\s+|\s+and\s+(?=[a-z]{3,})|,\s+(?=(?:verify|check|send|prepare|review|update|draft|call|email|upload|test|confirm|schedule|create|submit|finalize)))/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 2);

      if (sentenceParts.length > 1) {
        lines = sentenceParts;
      } else if (lines[0].includes(',') && lines[0].split(',').length >= 2) {
        const commaParts = lines[0]
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
        if (commaParts.length >= 2) {
          lines = commaParts;
        }
      }
    }

    const parsedSteps: { title: string; completed: boolean }[] = [];
    for (const line of lines) {
      const isChecked = /^[-*•]?\s*\[[xX]\]/.test(line) || /^✓\s+/.test(line);
      const cleaned = line
        .replace(/^[-*•]\s*\[[ xX]\]\s*/, '')
        .replace(/^(\d+[.)]|[-*•✓☑️])\s*/, '')
        .replace(/\.$/, '')
        .trim();

      if (cleaned.length >= 2) {
        parsedSteps.push({
          title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
          completed: isChecked,
        });
      }
    }

    if (parsedSteps.length === 1 && parsedSteps[0].title.length > 18) {
      // Expand a single descriptive note into 3 actionable sub-checklist phases
      return [
        { title: `Prepare & gather context: ${parsedSteps[0].title}`, completed: false },
        { title: `Execute core step: ${parsedSteps[0].title}`, completed: false },
        { title: `Review & finalize ${taskTitle}`, completed: false },
      ];
    }

    if (parsedSteps.length > 0) {
      return parsedSteps;
    }
  }

  // Fallback when description is empty: generate a 3-step sub-checklist from task title
  const cleanTitle = taskTitle.trim() || 'Task';
  return [
    { title: `Outline requirements & resources for "${cleanTitle}"`, completed: false },
    { title: `Complete primary execution of "${cleanTitle}"`, completed: false },
    { title: `Verify quality & mark "${cleanTitle}" complete`, completed: false },
  ];
}

function mapWorkspaceEnergyToProfile(mode?: EnergyMode): SmartSortEnergyProfile {
  if (!mode) return 'high-energy';
  if (mode === 'High Energy' || mode === 'Focused') return 'high-energy';
  if (mode === 'Low Energy' || mode === 'Tired' || mode === 'Sick' || mode === 'Vacation') {
    return 'low-energy';
  }
  return 'balanced';
}

export interface TaskEnergyImpactMetrics {
  impactPercent: number;
  barsFilled: 1 | 2 | 3 | 4 | 5;
  tierLabel: 'Light Drain' | 'Moderate Load' | 'High Load' | 'Peak Burn';
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  isManual: boolean;
  formulaSummary: string;
}

export function computeTaskEnergyImpact(
  estimatedMinutes: number,
  energyLevel: TaskEnergyLevel,
  isManual: boolean,
  incompleteSubtasksCount = 0
): TaskEnergyImpactMetrics {
  const mins = Math.max(5, Number(estimatedMinutes) || 15);

  // Base cognitive load from assigned/inferred energy level (Low=22, Medium=48, High=72)
  const energyBase = energyLevel === 'High' ? 72 : energyLevel === 'Medium' ? 48 : 22;

  // Duration load factor (scales from +3% for 10m up to +25% for 120m+)
  const durationFactor = Math.min(25, Math.round((mins / 120) * 25));

  // Subtask step complexity (+1.5% per open step, max +6%)
  const subtaskFactor = Math.min(6, Math.round(incompleteSubtasksCount * 1.5));

  const rawPercent = energyBase + durationFactor + subtaskFactor;
  const impactPercent = Math.max(12, Math.min(100, rawPercent));

  let barsFilled: 1 | 2 | 3 | 4 | 5 = 1;
  if (impactPercent >= 86) barsFilled = 5;
  else if (impactPercent >= 68) barsFilled = 4;
  else if (impactPercent >= 48) barsFilled = 3;
  else if (impactPercent >= 30) barsFilled = 2;
  else barsFilled = 1;

  let tierLabel: TaskEnergyImpactMetrics['tierLabel'] = 'Light Drain';
  let tone: TaskEnergyImpactMetrics['tone'] = 'emerald';

  if (impactPercent >= 86) {
    tierLabel = 'Peak Burn';
    tone = 'rose';
  } else if (impactPercent >= 68) {
    tierLabel = 'High Load';
    tone = 'amber';
  } else if (impactPercent >= 42) {
    tierLabel = 'Moderate Load';
    tone = 'blue';
  } else {
    tierLabel = 'Light Drain';
    tone = 'emerald';
  }

  return {
    impactPercent,
    barsFilled,
    tierLabel,
    tone,
    isManual,
    formulaSummary: `${mins}m est × ${energyLevel} Energy (${isManual ? 'Manual' : 'Auto'})`,
  };
}

const TaskEnergyImpactMeter: React.FC<{
  estimatedMinutes: number;
  energyLevel: TaskEnergyLevel;
  isManual: boolean;
  incompleteSubtasksCount?: number;
  compact?: boolean;
  onSelectEnergyLevel?: (level: TaskEnergyLevel) => void;
}> = ({
  estimatedMinutes,
  energyLevel,
  isManual,
  incompleteSubtasksCount = 0,
  compact = false,
  onSelectEnergyLevel,
}) => {
  const metrics = computeTaskEnergyImpact(
    estimatedMinutes,
    energyLevel,
    isManual,
    incompleteSubtasksCount
  );

  const activeBarClass =
    metrics.tone === 'rose'
      ? 'bg-rose-500 dark:bg-rose-400'
      : metrics.tone === 'amber'
      ? 'bg-amber-500 dark:bg-amber-400'
      : metrics.tone === 'blue'
      ? 'bg-blue-600 dark:bg-blue-400'
      : 'bg-emerald-500 dark:bg-emerald-400';

  const badgeToneClass =
    metrics.tone === 'rose'
      ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200'
      : metrics.tone === 'amber'
      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200'
      : metrics.tone === 'blue'
      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/70 text-blue-800 dark:text-blue-200'
      : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200';

  if (compact) {
    return (
      <div
        className={`rounded-lg border px-2 py-1.5 space-y-1 ${badgeToneClass}`}
        title={`Energy Impact: ${metrics.impactPercent}% (${metrics.tierLabel}) — ${metrics.formulaSummary}`}
      >
        <div className="flex items-center justify-between gap-1.5 text-[10px]">
          <span className="font-bold flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 shrink-0" />
            Impact: {metrics.impactPercent}%
          </span>
          <span className="font-mono opacity-80">{metrics.tierLabel}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${activeBarClass}`}
            style={{ width: `${metrics.impactPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-[11px] transition-all ${badgeToneClass}`}
      title={`Energy Impact Meter: ${metrics.impactPercent}% (${metrics.tierLabel}) — Calculated from ${metrics.formulaSummary}`}
    >
      {/* 5-Segment Visual Energy Impact Bars */}
      <div className="flex items-center gap-1" aria-label="Energy Impact Segments">
        {[1, 2, 3, 4, 5].map((barIdx) => {
          const filled = barIdx <= metrics.barsFilled;
          return (
            <span
              key={barIdx}
              className={`w-1.5 rounded-xs transition-all ${
                barIdx === 1
                  ? 'h-2'
                  : barIdx === 2
                  ? 'h-2.5'
                  : barIdx === 3
                  ? 'h-3'
                  : barIdx === 4
                  ? 'h-3.5'
                  : 'h-4'
              } ${
                filled
                  ? activeBarClass
                  : 'bg-slate-300/70 dark:bg-slate-700/80'
              }`}
            />
          );
        })}
      </div>

      {/* Impact Percentage & Tier */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight">
            Energy Impact: {metrics.impactPercent}%
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/70 dark:bg-slate-900/60 font-semibold">
            {metrics.tierLabel}
          </span>
        </div>
        <span className="text-[10px] opacity-80 font-mono">
          {metrics.formulaSummary}
        </span>
      </div>

      {/* Quick Manual Energy Level Assignment Buttons */}
      {onSelectEnergyLevel && (
        <div className="flex items-center gap-0.5 bg-white/80 dark:bg-slate-900/70 p-0.5 rounded-lg border border-black/5 dark:border-white/10 ml-auto">
          {(['Low', 'Medium', 'High'] as const).map((lvl) => {
            const active = energyLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onSelectEnergyLevel(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  active
                    ? lvl === 'High'
                      ? 'bg-amber-500 text-white'
                      : lvl === 'Low'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
                title={`Manually set task energy level to ${lvl}`}
              >
                {lvl === 'Low' ? '🔋 Low' : lvl === 'Medium' ? '⚖️ Med' : '⚡ High'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SmartTaskEvaluation {
  taskId: string;
  energyLevel: TaskEnergyLevel;
  daysUntilDue: number;
  urgencyLabel: string;
  urgencyTone: 'overdue' | 'today' | 'soon' | 'upcoming';
  smartScore: number;
  energyMatchReason: string;
  isEnergyMatched: boolean;
  isBlocked: boolean;
  unblocksCount: number;
  recommendedPriority: PriorityLevel;
}

function evaluateTaskForSmartSort(
  task: Task,
  allTasks: Task[],
  energyProfile: SmartSortEnergyProfile,
  todayStr: string
): SmartTaskEvaluation {
  const energyLevel = inferTaskEnergyLevel(task);

  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
  const dueMs = new Date(`${task.dueDate || todayStr}T00:00:00`).getTime();
  const rawDiffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Number.isFinite(rawDiffDays) ? rawDiffDays : 3;

  // 1. Deadline Urgency Score (0 - 45 pts)
  let deadlineScore = 8;
  let urgencyLabel = `Due in ${daysUntilDue}d`;
  let urgencyTone: SmartTaskEvaluation['urgencyTone'] = 'upcoming';

  if (daysUntilDue < 0) {
    deadlineScore = 45;
    urgencyLabel = `Overdue (${Math.abs(daysUntilDue)}d)`;
    urgencyTone = 'overdue';
  } else if (daysUntilDue === 0) {
    deadlineScore = 38;
    urgencyLabel = 'Due Today';
    urgencyTone = 'today';
  } else if (daysUntilDue === 1) {
    deadlineScore = 29;
    urgencyLabel = 'Due Tomorrow';
    urgencyTone = 'soon';
  } else if (daysUntilDue <= 3) {
    deadlineScore = 21;
    urgencyLabel = `Due in ${daysUntilDue}d`;
    urgencyTone = 'soon';
  } else if (daysUntilDue <= 7) {
    deadlineScore = 13;
    urgencyLabel = `Due in ${daysUntilDue}d`;
    urgencyTone = 'upcoming';
  } else {
    deadlineScore = 5;
    urgencyLabel = task.dueDate;
    urgencyTone = 'upcoming';
  }

  // 2. Base Priority Score (2 - 24 pts)
  const priorityScoreMap: Record<PriorityLevel, number> = {
    Critical: 24,
    High: 18,
    Medium: 12,
    Low: 6,
    Someday: 2,
  };
  const basePriorityScore = priorityScoreMap[task.priority] ?? 10;

  // 3. Dependency analysis
  const blockerTask = task.dependsOnTaskId
    ? allTasks.find((t) => t.id === task.dependsOnTaskId)
    : undefined;
  const isBlocked = Boolean(blockerTask && blockerTask.status !== 'Completed');
  const unblocksCount = allTasks.filter(
    (t) => t.dependsOnTaskId === task.id && t.status !== 'Completed' && !t.deletedAt
  ).length;

  // 4. Energy Level & Duration Alignment Score
  let energyScore = 0;
  let energyMatchReason = '';
  let isEnergyMatched = false;

  if (energyProfile === 'high-energy') {
    if (energyLevel === 'High') {
      energyScore += 26;
      isEnergyMatched = true;
      energyMatchReason = '⚡ Peak Deep-Work Match';
    } else if (energyLevel === 'Medium') {
      energyScore += 14;
      energyMatchReason = '⚖️ Moderate Focus';
    } else {
      energyScore += 4;
      energyMatchReason = '🔋 Light Admin (Deferrable)';
    }
    if (task.estimatedMinutes >= 45) {
      energyScore += 6;
    }
  } else if (energyProfile === 'low-energy') {
    if (energyLevel === 'Low') {
      energyScore += 28;
      isEnergyMatched = true;
      energyMatchReason = '🔋 Low-Energy Quick Win';
    } else if (energyLevel === 'Medium') {
      energyScore += 12;
      if (task.estimatedMinutes <= 25) {
        energyScore += 10;
        isEnergyMatched = true;
        energyMatchReason = `🔋 Manageable Sprint (${task.estimatedMinutes}m)`;
      } else {
        energyMatchReason = '⚖️ Moderate Effort';
      }
    } else {
      // High energy task when user is in Low-Energy mode
      energyScore -= 10;
      energyMatchReason = '⚡ Heavy Deep Work (Save for High Energy)';
    }
    if (task.estimatedMinutes <= 20) {
      energyScore += 10;
    }
  } else {
    // Balanced Mode
    if (energyLevel === 'Medium' || energyLevel === 'High') {
      energyScore += 16;
      isEnergyMatched = true;
      energyMatchReason = '⚖️ Balanced Deadline + Effort';
    } else {
      energyScore += 12;
      isEnergyMatched = daysUntilDue <= 1;
      energyMatchReason = '🔋 Quick Momentum Task';
    }
  }

  // Dependency adjustments
  if (unblocksCount > 0) {
    energyScore += 9 * unblocksCount;
    energyMatchReason = `🔓 Unblocks ${unblocksCount} task${unblocksCount > 1 ? 's' : ''} • ${energyMatchReason}`;
  }
  if (isBlocked) {
    energyScore -= 35;
    energyMatchReason = '⏳ Blocked by dependency';
  }

  // In-progress momentum bonus
  const statusBonus = task.status === 'In Progress' ? 6 : 0;

  const rawTotal = deadlineScore + basePriorityScore + energyScore + statusBonus;
  const smartScore = Math.max(5, Math.min(99, Math.round(rawTotal)));

  let recommendedPriority: PriorityLevel = task.priority;
  if (smartScore >= 82) recommendedPriority = 'Critical';
  else if (smartScore >= 66) recommendedPriority = 'High';
  else if (smartScore >= 46) recommendedPriority = 'Medium';
  else if (smartScore >= 25) recommendedPriority = 'Low';
  else recommendedPriority = 'Someday';

  return {
    taskId: task.id,
    energyLevel,
    daysUntilDue,
    urgencyLabel,
    urgencyTone,
    smartScore,
    energyMatchReason,
    isEnergyMatched,
    isBlocked,
    unblocksCount,
    recommendedPriority,
  };
}

export const TasksAndChecklistsView: React.FC<TasksAndChecklistsViewProps> = ({
  workspace,
  onAddTask,
  onUpdateTask,
  onDeleteTasks,
  onToggleSubtask,
  onAddSubtask,
  onStartFocus,
  onAddShoppingItem,
  onToggleShoppingItem,
  onDeleteShoppingItem,
  onClearCheckedShoppingItems,
  onAddShoppingList,
  onDeleteShoppingList,
  onChangeEnergyMode,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'shopping'>('list');
  const [sortBy, setSortBy] = useState<'smart' | 'priority' | 'dueDate' | 'estimated'>('smart');
  const [energyProfile, setEnergyProfile] = useState<SmartSortEnergyProfile>(() =>
    mapWorkspaceEnergyToProfile(workspace.settings?.energyMode)
  );
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterEnergy, setFilterEnergy] = useState<'ALL' | TaskEnergyLevel>('ALL');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [smartSortBannerMsg, setSmartSortBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    setEnergyProfile(mapWorkspaceEnergyToProfile(workspace.settings?.energyMode));
  }, [workspace.settings?.energyMode]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // New Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [autoConvertDesc, setAutoConvertDesc] = useState(true);
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');
  const [newEnergyLevel, setNewEnergyLevel] = useState<TaskEnergyLevel>('High');
  const [newDueDate, setNewDueDate] = useState(todayStr);
  const [newProjectId, setNewProjectId] = useState('');
  const [newEstMinutes, setNewEstMinutes] = useState(30);
  const [newRepeat, setNewRepeat] = useState<Task['repeatRule']>('None');

  // Per-task Subtask Drafts & Inline Step Editing
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState<string>('');

  // Per-list Shopping Item Drafts
  const [shopDrafts, setShopDrafts] = useState<
    Record<string, { name: string; qty: string; category: ShoppingItem['category'] }>
  >({});

  // New Shopping List / Checklist Form
  const [newListName, setNewListName] = useState('');
  const [newListStore, setNewListStore] = useState('General');

  const handleSelectEnergyProfile = (profile: SmartSortEnergyProfile) => {
    setEnergyProfile(profile);
    setSortBy('smart');
    if (onChangeEnergyMode) {
      if (profile === 'high-energy') onChangeEnergyMode('High Energy');
      else if (profile === 'low-energy') onChangeEnergyMode('Low Energy');
      else onChangeEnergyMode('Normal');
    }
  };

  // Evaluate all non-deleted tasks with Smart Sort scoring
  const smartEvaluationsMap = useMemo(() => {
    const map = new Map<string, SmartTaskEvaluation>();
    const nonDeleted = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Archived');
    for (const t of nonDeleted) {
      map.set(t.id, evaluateTaskForSmartSort(t, nonDeleted, energyProfile, todayStr));
    }
    return map;
  }, [workspace.tasks, energyProfile, todayStr]);

  const activeTasks = useMemo(() => {
    let list = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Archived');
    if (filterPriority !== 'ALL') {
      list = list.filter((t) => t.priority === filterPriority);
    }
    if (filterEnergy !== 'ALL') {
      list = list.filter((t) => inferTaskEnergyLevel(t) === filterEnergy);
    }
    return [...list].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;

      if (sortBy === 'smart') {
        const evalA = smartEvaluationsMap.get(a.id);
        const evalB = smartEvaluationsMap.get(b.id);
        const scoreDiff = (evalB?.smartScore ?? 0) - (evalA?.smartScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return a.dueDate.localeCompare(b.dueDate);
      }

      if (sortBy === 'priority') {
        const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (diff !== 0) return diff;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
      return a.estimatedMinutes - b.estimatedMinutes;
    });
  }, [workspace.tasks, filterPriority, filterEnergy, sortBy, smartEvaluationsMap]);

  const incompleteActiveTasks = useMemo(
    () => activeTasks.filter((t) => t.status !== 'Completed'),
    [activeTasks]
  );

  const smartSummary = useMemo(() => {
    let urgentCount = 0;
    let energyMatchedCount = 0;
    for (const t of incompleteActiveTasks) {
      const ev = smartEvaluationsMap.get(t.id);
      if (!ev) continue;
      if (ev.daysUntilDue <= 1) urgentCount++;
      if (ev.isEnergyMatched && !ev.isBlocked) energyMatchedCount++;
    }
    const topTask = incompleteActiveTasks[0] || null;
    const topEval = topTask ? smartEvaluationsMap.get(topTask.id) || null : null;
    return { urgentCount, energyMatchedCount, topTask, topEval };
  }, [incompleteActiveTasks, smartEvaluationsMap]);

  const handleApplySmartPriorities = () => {
    let updatedCount = 0;
    const modeLabel =
      energyProfile === 'high-energy'
        ? 'High-Energy Deep Work'
        : energyProfile === 'low-energy'
        ? 'Low-Energy Quick Wins'
        : 'Balanced Deadline';

    for (const t of incompleteActiveTasks) {
      const ev = smartEvaluationsMap.get(t.id);
      if (!ev) continue;
      const newReasoning = `Smart Sort (${modeLabel}): Score ${ev.smartScore}/99 • ${ev.urgencyLabel} • ${ev.energyMatchReason}`;
      if (
        t.priority !== ev.recommendedPriority ||
        t.energyLevel !== ev.energyLevel ||
        t.aiReasoning !== newReasoning
      ) {
        onUpdateTask(t.id, {
          priority: ev.recommendedPriority,
          energyLevel: ev.energyLevel,
          aiReasoning: newReasoning,
        });
        updatedCount++;
      }
    }
    setSortBy('smart');
    setSmartSortBannerMsg(
      `Smart Sort applied to ${updatedCount || incompleteActiveTasks.length} active task(s) for ${modeLabel} mode.`
    );
    setTimeout(() => setSmartSortBannerMsg(null), 4000);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const cleanTitle = newTitle.trim();
    const cleanDesc = newDescription.trim();
    const initialSubtasks: Subtask[] =
      cleanDesc && autoConvertDesc
        ? parseDescriptionIntoChecklistSteps(cleanDesc, cleanTitle).map((step, idx) => ({
            id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            title: step.title,
            completed: step.completed,
          }))
        : [];
    const completedCount = initialSubtasks.filter((s) => s.completed).length;
    const initialPct =
      initialSubtasks.length > 0
        ? Math.round((completedCount / initialSubtasks.length) * 100)
        : 0;

    onAddTask({
      title: cleanTitle,
      description: cleanDesc,
      priority: newPriority,
      energyLevel: newEnergyLevel,
      status: initialPct === 100 ? 'Completed' : initialPct > 0 ? 'In Progress' : 'Not Started',
      dueDate: newDueDate,
      estimatedMinutes: newEstMinutes,
      actualMinutes: 0,
      completionPercentage: initialPct,
      projectId: newProjectId || undefined,
      category: 'Work',
      tags: [
        newPriority === 'Critical' ? 'Urgent' : 'Task',
        `${newEnergyLevel}-Energy`,
      ],
      subtasks: initialSubtasks,
      repeatRule: newRepeat,
      aiReasoning: `Smart Sort indexed as ${newPriority} priority (${newEnergyLevel} Energy, ${newEstMinutes}m est, due ${newDueDate}).`,
      linkedItems: [],
    });
    setNewTitle('');
    setNewDescription('');
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = () => {
    selectedTaskIds.forEach((id) =>
      onUpdateTask(id, { status: 'Completed', completionPercentage: 100 })
    );
    setSelectedTaskIds([]);
  };

  const handleBulkArchive = () => {
    selectedTaskIds.forEach((id) => onUpdateTask(id, { status: 'Archived' }));
    setSelectedTaskIds([]);
  };

  const handleBulkDelete = () => {
    onDeleteTasks(selectedTaskIds);
    setSelectedTaskIds([]);
  };

  // Convert a task's description (or title) into secondary sub-checklist items with automatic progress tracking
  const handleConvertDescriptionToSubChecklist = (
    task: Task,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    const extracted = parseDescriptionIntoChecklistSteps(task.description || '', task.title);
    let mergedSubtasks: Subtask[] = [];

    if (mode === 'replace') {
      mergedSubtasks = extracted.map((step, idx) => ({
        id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: step.title,
        completed: step.completed,
      }));
    } else {
      const existingTitles = new Set(
        task.subtasks.map((s) => s.title.toLowerCase().trim())
      );
      const newSubtasks: Subtask[] = [];
      extracted.forEach((step, idx) => {
        if (!existingTitles.has(step.title.toLowerCase().trim())) {
          newSubtasks.push({
            id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            title: step.title,
            completed: step.completed,
          });
          existingTitles.add(step.title.toLowerCase().trim());
        }
      });
      mergedSubtasks = [...task.subtasks, ...newSubtasks];
    }

    const completedCount = mergedSubtasks.filter((s) => s.completed).length;
    const completionPercentage =
      mergedSubtasks.length > 0
        ? Math.round((completedCount / mergedSubtasks.length) * 100)
        : task.completionPercentage;

    onUpdateTask(task.id, {
      subtasks: mergedSubtasks,
      completionPercentage,
      status:
        completionPercentage === 100
          ? 'Completed'
          : completionPercentage > 0 && task.status === 'Not Started'
          ? 'In Progress'
          : task.status,
    });

    setExpandedTaskId(task.id);
    setSmartSortBannerMsg(
      `Converted description into ${mergedSubtasks.length} secondary sub-checklist step(s) for "${task.title}" (${completionPercentage}% complete).`
    );
    setTimeout(() => setSmartSortBannerMsg(null), 4000);
  };

  // Sync secondary sub-checklist steps back into the task description as formatted markdown checklist lines
  const handleSyncSubChecklistToDescription = (task: Task) => {
    if (task.subtasks.length === 0) return;
    const markdownLines = task.subtasks
      .map((s) => `- [${s.completed ? 'x' : ' '}] ${s.title}`)
      .join('\n');
    onUpdateTask(task.id, { description: markdownLines });
    setSmartSortBannerMsg(
      `Synced ${task.subtasks.length} sub-checklist steps to description for "${task.title}".`
    );
    setTimeout(() => setSmartSortBannerMsg(null), 3500);
  };

  // Save inline edit to a secondary sub-checklist step title
  const handleSaveSubtaskEdit = (task: Task, subtaskId: string) => {
    const clean = editingSubtaskTitle.trim();
    if (!clean) {
      setEditingSubtaskKey(null);
      return;
    }
    const updated = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, title: clean } : s
    );
    onUpdateTask(task.id, { subtasks: updated });
    setEditingSubtaskKey(null);
    setEditingSubtaskTitle('');
  };

  // Toggle a sub-checklist item and sync granular task completionPercentage & status
  const handleToggleSubChecklistStep = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const completedCount = updatedSubtasks.filter((s) => s.completed).length;
    const totalCount = updatedSubtasks.length;
    const completionPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    let nextStatus = task.status;
    if (totalCount > 0 && completedCount === totalCount) {
      nextStatus = 'Completed';
    } else if (completedCount > 0 && task.status === 'Not Started') {
      nextStatus = 'In Progress';
    } else if (
      completedCount < totalCount &&
      task.status === 'Completed'
    ) {
      nextStatus = 'In Progress';
    }

    onUpdateTask(task.id, {
      subtasks: updatedSubtasks,
      completionPercentage,
      status: nextStatus,
    });
  };

  // Add a sub-checklist step and keep completionPercentage synchronized
  const handleAddSubChecklistStep = (task: Task, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const nextSubtasks: Subtask[] = [
      ...task.subtasks,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: clean,
        completed: false,
      },
    ];
    const completedCount = nextSubtasks.filter((s) => s.completed).length;
    const completionPercentage = Math.round((completedCount / nextSubtasks.length) * 100);
    onUpdateTask(task.id, {
      subtasks: nextSubtasks,
      completionPercentage,
    });
  };

  const getListDraft = (listId: string) =>
    shopDrafts[listId] || { name: '', qty: '1', category: 'Produce' as ShoppingItem['category'] };

  const updateListDraft = (
    listId: string,
    patch: Partial<{ name: string; qty: string; category: ShoppingItem['category'] }>
  ) => {
    setShopDrafts((prev) => ({
      ...prev,
      [listId]: { ...getListDraft(listId), ...patch },
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-blue-600" />
              Tasks, Subtasks & Shopping Lists
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Smart Sort auto-prioritizes your queue based on upcoming deadlines, dependencies, and your current Energy Mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" /> List View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Status Board
              </button>
              <button
                onClick={() => setViewMode('shopping')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'shopping'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Shopping & Checklists
              </button>
            </div>
          </div>
        </div>

        {/* SMART SORT & ENERGY MODE ENGINE PANEL */}
        {viewMode !== 'shopping' && (
          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 p-4 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Smart Sort • Deadline & Energy Engine
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {smartSummary.urgentCount} Due Soon • {smartSummary.energyMatchedCount} Energy-Matched
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Select your current energy level below—Smart Sort dynamically ranks tasks by combining deadline urgency with cognitive load.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectEnergyProfile('high-energy')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    energyProfile === 'high-energy'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>High-Energy (Deep Work)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectEnergyProfile('balanced')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    energyProfile === 'balanced'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Balanced (Deadlines)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectEnergyProfile('low-energy')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    energyProfile === 'low-energy'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <BatteryLow className="w-3.5 h-3.5" />
                  <span>Low-Energy (Quick Wins)</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplySmartPriorities}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  title="Automatically update task priority levels and AI reasoning based on Smart Sort scores"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Apply Smart Priorities</span>
                </button>
              </div>
            </div>

            {smartSortBannerMsg && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{smartSortBannerMsg}</span>
              </div>
            )}

            {sortBy === 'smart' && smartSummary.topTask && smartSummary.topEval && (
              <div className="pt-2.5 border-t border-blue-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    #1 Smart Pick Right Now:
                  </span>
                  <span className="font-extrabold text-blue-700 dark:text-blue-300">
                    {smartSummary.topTask.title}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-semibold">
                    Score {smartSummary.topEval.smartScore}/99 • {smartSummary.topEval.urgencyLabel} • {smartSummary.topEval.energyMatchReason}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onStartFocus(smartSummary.topTask!)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Play className="w-3 h-3" /> Start Focus on #1 Pick
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Task Bar */}
        {viewMode !== 'shopping' && (
          <div className="space-y-2.5">
            <form onSubmit={handleCreateTask} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Add a new task (e.g. 'Prepare Q4 financial model' or 'Quick reply to vendor')..."
                  className="md:col-span-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                  className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-medium"
                  title="Task Priority"
                >
                  <option value="Critical">Critical Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                  <option value="Someday">Someday</option>
                </select>
                <select
                  value={newEnergyLevel}
                  onChange={(e) => setNewEnergyLevel(e.target.value as TaskEnergyLevel)}
                  className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-semibold"
                  title="Manual Energy Level Assignment"
                >
                  <option value="High">⚡ High Energy (Deep)</option>
                  <option value="Medium">⚖️ Medium Energy</option>
                  <option value="Low">🔋 Low Energy (Quick)</option>
                </select>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
                  title="Due Date"
                />
                <select
                  value={newEstMinutes}
                  onChange={(e) => setNewEstMinutes(Number(e.target.value))}
                  className="md:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs font-mono"
                  title="Estimated Duration"
                >
                  <option value={15}>15m</option>
                  <option value={25}>25m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>60m</option>
                  <option value={90}>90m</option>
                  <option value={120}>2h</option>
                </select>
                <button
                  type="submit"
                  className="md:col-span-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Optional Task Description Input + Auto-Convert to Secondary Sub-Checklist */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Task description / steps (e.g. 'Draft outline; gather Q3 metrics; review slides with team')..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoConvertDesc}
                    onChange={(e) => setAutoConvertDesc(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <Wand2 className="w-3 h-3 text-blue-600" />
                  <span>
                    Convert description → Sub-Checklist
                    {newDescription.trim()
                      ? ` (${
                          parseDescriptionIntoChecklistSteps(
                            newDescription,
                            newTitle || 'Task'
                          ).length
                        } steps)`
                      : ''}
                  </span>
                </label>
              </div>
            </form>

            {/* Live New Task Energy Impact Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                New Task Energy Impact Preview (based on {newEstMinutes}m duration + manual {newEnergyLevel} Energy):
              </span>
              <TaskEnergyImpactMeter
                estimatedMinutes={newEstMinutes}
                energyLevel={newEnergyLevel}
                isManual={true}
                onSelectEnergyLevel={(lvl) => setNewEnergyLevel(lvl)}
              />
            </div>
          </div>
        )}

        {/* Filter, Sort & Bulk Action Bar */}
        {viewMode !== 'shopping' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Sort by:</span>
              {(
                [
                  ['smart', '✨ Smart Sort (Deadline + Energy)'],
                  ['priority', 'Priority'],
                  ['dueDate', 'Due Date'],
                  ['estimated', 'Shortest Time'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === k
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}

              <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    title="Filter by Priority"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="Critical">Critical Only</option>
                    <option value="High">High Only</option>
                    <option value="Medium">Medium Only</option>
                    <option value="Low">Low Only</option>
                    <option value="Someday">Someday Only</option>
                  </select>
                </div>

                <select
                  value={filterEnergy}
                  onChange={(e) => setFilterEnergy(e.target.value as 'ALL' | TaskEnergyLevel)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  title="Filter by Required Energy"
                >
                  <option value="ALL">All Energy Levels</option>
                  <option value="High">⚡ High Energy Only</option>
                  <option value="Medium">⚖️ Medium Energy Only</option>
                  <option value="Low">🔋 Low Energy Only</option>
                </select>
              </div>
            </div>

            {selectedTaskIds.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-slate-700">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {selectedTaskIds.length} Selected:
                </span>
                <button
                  onClick={handleBulkComplete}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Complete
                </button>
                <button
                  onClick={handleBulkArchive}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" /> Archive
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {activeTasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-3">
              <CheckSquare className="w-8 h-8 text-blue-500 mx-auto opacity-80" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No matching tasks found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Reset your priority or energy filters, or add a new task above.
                </p>
              </div>
              {(filterPriority !== 'ALL' || filterEnergy !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPriority('ALL');
                    setFilterEnergy('ALL');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            activeTasks.map((task, idx) => {
              const isExpanded = expandedTaskId === task.id;
              const smartEval = smartEvaluationsMap.get(task.id);
              const taskEnergy = smartEval?.energyLevel || inferTaskEnergyLevel(task);
              const blockerTask = task.dependsOnTaskId
                ? workspace.tasks.find((t) => t.id === task.dependsOnTaskId)
                : undefined;
              const isBlocked = blockerTask && blockerTask.status !== 'Completed';
              const linkedProject = task.projectId
                ? workspace.projects.find((p) => p.id === task.projectId)
                : undefined;
              const subtaskDraft = subtaskDrafts[task.id] || '';
              const isTopSmartPick =
                sortBy === 'smart' && idx === 0 && task.status !== 'Completed';

              return (
                <div
                  key={task.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                    isTopSmartPick
                      ? 'border-blue-500/80 ring-1 ring-blue-500/20'
                      : 'border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => toggleSelectTask(task.id)}
                      className="mt-1.5 rounded border-slate-300 text-blue-600"
                      title="Select for bulk action"
                    />

                    <button
                      onClick={() =>
                        onUpdateTask(task.id, {
                          status: task.status === 'Completed' ? 'Not Started' : 'Completed',
                          completionPercentage: task.status === 'Completed' ? 0 : 100,
                        })
                      }
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {task.status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {sortBy === 'smart' && task.status !== 'Completed' && smartEval && (
                          <span
                            className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md border ${
                              isTopSmartPick
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}
                            title="Smart Sort combined deadline & energy score"
                          >
                            #{idx + 1} • Smart {smartEval.smartScore}
                          </span>
                        )}

                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className={`text-sm font-bold text-left hover:text-blue-600 transition-colors ${
                            task.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </button>

                        <select
                          value={task.priority}
                          onChange={(e) =>
                            onUpdateTask(task.id, { priority: e.target.value as PriorityLevel })
                          }
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          title="Priority Level"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Someday">Someday</option>
                        </select>

                        {/* Inline Task Energy Level Selector */}
                        <select
                          value={taskEnergy}
                          onChange={(e) =>
                            onUpdateTask(task.id, {
                              energyLevel: e.target.value as TaskEnergyLevel,
                            })
                          }
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            taskEnergy === 'High'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                              : taskEnergy === 'Low'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                          title="Task Energy Requirement"
                        >
                          <option value="High">⚡ High Energy</option>
                          <option value="Medium">⚖️ Medium Energy</option>
                          <option value="Low">🔋 Low Energy</option>
                        </select>

                        <select
                          value={task.status}
                          onChange={(e) =>
                            onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                          }
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          {STATUS_COLUMNS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            smartEval?.urgencyTone === 'overdue'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold'
                              : smartEval?.urgencyTone === 'today'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {smartEval ? smartEval.urgencyLabel : `Due ${task.dueDate}`} ({task.estimatedMinutes}m)
                        </span>

                        {linkedProject && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" /> {linkedProject.name}
                          </span>
                        )}

                        {task.repeatRule && task.repeatRule !== 'None' && (
                          <span className="text-[11px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> {task.repeatRule}
                          </span>
                        )}
                      </div>

                      {isBlocked && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          Waiting on dependency: &ldquo;{blockerTask.title}&rdquo;
                        </div>
                      )}

                      {/* Visual Energy Impact Meter & Sub-Checklist Progress Bar for Each Task */}
                      <div className="mt-2 flex flex-wrap items-center gap-2.5">
                        <TaskEnergyImpactMeter
                          estimatedMinutes={task.estimatedMinutes}
                          energyLevel={taskEnergy}
                          isManual={Boolean(task.energyLevel)}
                          incompleteSubtasksCount={
                            task.subtasks.filter((s) => !s.completed).length
                          }
                          onSelectEnergyLevel={(lvl) =>
                            onUpdateTask(task.id, { energyLevel: lvl })
                          }
                        />

                        {/* Granular Sub-Checklist Progress Tracker Pill */}
                        {task.subtasks.length > 0 && (
                          <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/80 dark:border-indigo-800/70 bg-indigo-50/70 dark:bg-indigo-950/30 px-2.5 py-1.5 text-[11px] text-indigo-900 dark:text-indigo-200">
                            <ListTodo className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div className="flex flex-col gap-0.5 min-w-[115px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold">
                                  Sub-Checklist: {task.subtasks.filter((s) => s.completed).length}/
                                  {task.subtasks.length}
                                </span>
                                <span className="font-mono font-extrabold text-[10px]">
                                  {Math.round(
                                    (task.subtasks.filter((s) => s.completed).length /
                                      task.subtasks.length) *
                                      100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-indigo-200/70 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                                  style={{
                                    width: `${Math.round(
                                      (task.subtasks.filter((s) => s.completed).length /
                                        task.subtasks.length) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Action on Card: Convert Description into Secondary Sub-Checklist */}
                        <button
                          type="button"
                          onClick={() => handleConvertDescriptionToSubChecklist(task, 'merge')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 transition-colors"
                          title="Convert task description (or title) into interactive secondary sub-checklist items"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>
                            Convert Description → Sub-Checklist (
                            {
                              parseDescriptionIntoChecklistSteps(
                                task.description || '',
                                task.title
                              ).length
                            }{' '}
                            steps)
                          </span>
                        </button>
                      </div>

                      {/* Description Preview & Inline Secondary Sub-Checklist on Card */}
                      {!isExpanded && task.description && task.description.trim().length > 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          {task.description}
                        </p>
                      )}

                      {!isExpanded && task.subtasks.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                            <span className="font-semibold flex items-center gap-1">
                              <ListTodo className="w-3 h-3 text-indigo-500" />
                              Secondary Sub-Checklist ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} steps • ~{Math.max(2, Math.round(task.estimatedMinutes / task.subtasks.length))}m/step)
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(task.id)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              Manage Steps
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {task.subtasks.map((sub, sIdx) => (
                              <label
                                key={sub.id}
                                className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer px-2 py-1 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={() => handleToggleSubChecklistStep(task, sub.id)}
                                  className="rounded border-slate-300 text-blue-600"
                                />
                                <span className="text-[10px] font-mono text-slate-400">
                                  {sIdx + 1}.
                                </span>
                                <span
                                  className={`truncate flex-1 ${
                                    sub.completed ? 'line-through text-slate-400' : 'font-medium'
                                  }`}
                                >
                                  {sub.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {sortBy === 'smart' && smartEval && task.status !== 'Completed' ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>
                            <strong>{smartEval.energyMatchReason}</strong>
                            {task.aiReasoning ? ` — ${task.aiReasoning}` : ''}
                          </span>
                        </p>
                      ) : (
                        task.aiReasoning && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{task.aiReasoning}</span>
                          </p>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onStartFocus(task)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Focus
                      </button>
                      <button
                        onClick={() => onDeleteTasks([task.id])}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        title="Expand task details & subtasks"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subtasks, Metadata Editor & Dependencies */}
                  {isExpanded && (
                    <div className="pl-9 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {/* Editable Description & Scheduling Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Task Notes / Description (Separate lines or sentences for checklist conversion)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleConvertDescriptionToSubChecklist(task)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors shadow-2xs"
                              title="Convert description lines/sentences into checkable sub-checklist items below"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Convert Description to Sub-Checklist</span>
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={task.description || ''}
                            onChange={(e) =>
                              onUpdateTask(task.id, { description: e.target.value })
                            }
                            placeholder="Write task description, bullet points, or paste steps here, then click 'Convert Description to Sub-Checklist'..."
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-6 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) =>
                                onUpdateTask(task.id, { dueDate: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Estimated Mins
                            </label>
                            <input
                              type="number"
                              min={5}
                              step={5}
                              value={task.estimatedMinutes}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  estimatedMinutes: Math.max(5, Number(e.target.value) || 15),
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Project
                            </label>
                            <select
                              value={task.projectId || ''}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  projectId: e.target.value || undefined,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                            >
                              <option value="">No Project</option>
                              {workspace.projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Depends On (Blocker)
                            </label>
                            <select
                              value={task.dependsOnTaskId || ''}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  dependsOnTaskId: e.target.value || undefined,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                            >
                              <option value="">No Dependency</option>
                              {workspace.tasks
                                .filter((other) => other.id !== task.id && !other.deletedAt)
                                .map((other) => (
                                  <option key={other.id} value={other.id}>
                                    {other.title.slice(0, 32)}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Secondary Sub-Checklist & Granular Progress Bar */}
                      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Secondary Sub-Checklist ({task.subtasks.filter((s) => s.completed).length}/
                              {task.subtasks.length} completed)
                            </span>
                            {task.subtasks.length > 0 && (
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300">
                                {Math.round(
                                  (task.subtasks.filter((s) => s.completed).length /
                                    task.subtasks.length) *
                                    100
                                )}
                                % Progress
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConvertDescriptionToSubChecklist(task, 'merge')}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 border border-blue-200/80 dark:border-blue-800"
                              title="Append new steps extracted from task description"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Extract Steps from Description</span>
                            </button>

                            {task.description && task.description.trim().length > 0 && task.subtasks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleConvertDescriptionToSubChecklist(task, 'replace')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 border border-indigo-200/80 dark:border-indigo-800"
                                title="Replace current sub-checklist with freshly parsed steps from description"
                              >
                                <span>Rebuild from Description</span>
                              </button>
                            )}

                            {task.subtasks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSyncSubChecklistToDescription(task)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                                title="Write sub-checklist items back into the task description as Markdown checkboxes"
                              >
                                <span>Sync → Description</span>
                              </button>
                            )}

                            {task.subtasks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const allDone = task.subtasks.every((s) => s.completed);
                                  const toggled = task.subtasks.map((s) => ({
                                    ...s,
                                    completed: !allDone,
                                  }));
                                  onUpdateTask(task.id, {
                                    subtasks: toggled,
                                    completionPercentage: !allDone ? 100 : 0,
                                    status: !allDone ? 'Completed' : 'In Progress',
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>
                                  {task.subtasks.every((s) => s.completed)
                                    ? 'Uncheck All'
                                    : 'Check All Steps'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {task.subtasks.length > 0 && (
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                              style={{
                                width: `${Math.round(
                                  (task.subtasks.filter((s) => s.completed).length /
                                    task.subtasks.length) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        )}

                        {task.subtasks.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                            No sub-checklist steps yet. Click <strong>Convert Description to Sub-Checklist</strong> above or add a step below to track granular progress.
                          </p>
                        ) : (
                          <div className="space-y-1 pt-1">
                            {task.subtasks.map((sub, sIdx) => {
                              const stepEditKey = `${task.id}:${sub.id}`;
                              const isEditingStep = editingSubtaskKey === stepEditKey;
                              const stepEstMins = Math.max(
                                2,
                                Math.round(task.estimatedMinutes / Math.max(1, task.subtasks.length))
                              );
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 group"
                                >
                                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={sub.completed}
                                      onChange={() => handleToggleSubChecklistStep(task, sub.id)}
                                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {sIdx + 1}.
                                    </span>
                                    {isEditingStep ? (
                                      <input
                                        type="text"
                                        value={editingSubtaskTitle}
                                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveSubtaskEdit(task, sub.id);
                                          } else if (e.key === 'Escape') {
                                            setEditingSubtaskKey(null);
                                          }
                                        }}
                                        onBlur={() => handleSaveSubtaskEdit(task, sub.id)}
                                        autoFocus
                                        className="flex-1 rounded border border-blue-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs"
                                      />
                                    ) : (
                                      <span
                                        onClick={() => {
                                          setEditingSubtaskKey(stepEditKey);
                                          setEditingSubtaskTitle(sub.title);
                                        }}
                                        title="Click to edit sub-checklist step"
                                        className={`truncate cursor-pointer hover:text-blue-600 ${
                                          sub.completed
                                            ? 'line-through text-slate-400'
                                            : 'font-medium'
                                        }`}
                                      >
                                        {sub.title}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                      ~{stepEstMins}m
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const remaining = task.subtasks.filter(
                                          (s) => s.id !== sub.id
                                        );
                                        const doneCount = remaining.filter((s) => s.completed).length;
                                        const pct =
                                          remaining.length > 0
                                            ? Math.round((doneCount / remaining.length) * 100)
                                            : 0;
                                        onUpdateTask(task.id, {
                                          subtasks: remaining,
                                          completionPercentage: pct,
                                        });
                                      }}
                                      className="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1.5"
                                      title="Remove sub-checklist step"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1 max-w-lg">
                          <input
                            type="text"
                            value={subtaskDraft}
                            onChange={(e) =>
                              setSubtaskDrafts((prev) => ({
                                ...prev,
                                [task.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!subtaskDraft.trim()) return;
                                handleAddSubChecklistStep(task, subtaskDraft);
                                setSubtaskDrafts((prev) => ({ ...prev, [task.id]: '' }));
                              }
                            }}
                            placeholder="Add sub-checklist step..."
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!subtaskDraft.trim()) return;
                              handleAddSubChecklistStep(task, subtaskDraft);
                              setSubtaskDrafts((prev) => ({ ...prev, [task.id]: '' }));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold"
                          >
                            + Add Step
                          </button>
                        </div>
                      </div>

                      {task.linkedItems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Connected in Second Brain:
                          </span>
                          {task.linkedItems.map((ref) => (
                            <span
                              key={ref.id}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-medium"
                            >
                              {ref.type}: {ref.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN STATUS BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((statusCol) => {
            const colTasks = activeTasks.filter((t) => t.status === statusCol);
            return (
              <div
                key={statusCol}
                className="bg-slate-100/80 dark:bg-slate-900/70 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {statusCol}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => {
                    const smartEval = smartEvaluationsMap.get(task.id);
                    const energy = smartEval?.energyLevel || inferTaskEnergyLevel(task);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {task.title}
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteTasks([task.id])}
                            className="text-slate-400 hover:text-red-500 shrink-0"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                          <span className="font-semibold text-blue-600">{task.priority}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold">
                            {energy === 'High' ? '⚡ High' : energy === 'Low' ? '🔋 Low' : '⚖️ Med'}
                          </span>
                          {smartEval && sortBy === 'smart' && (
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              Score {smartEval.smartScore}
                            </span>
                          )}
                          <span>{task.dueDate}</span>
                        </div>
                        <TaskEnergyImpactMeter
                          estimatedMinutes={task.estimatedMinutes}
                          energyLevel={energy}
                          isManual={Boolean(task.energyLevel)}
                          incompleteSubtasksCount={
                            task.subtasks.filter((s) => !s.completed).length
                          }
                          compact={true}
                        />

                        {/* Kanban Card Secondary Sub-Checklist Progress & Quick Converter */}
                        {task.subtasks.length > 0 ? (
                          <div className="rounded-lg border border-indigo-200/70 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800 dark:text-indigo-200">
                              <span className="flex items-center gap-1">
                                <ListTodo className="w-3 h-3" />
                                Sub-Checklist: {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                              </span>
                              <span className="font-mono">
                                {Math.round(
                                  (task.subtasks.filter((s) => s.completed).length /
                                    task.subtasks.length) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-indigo-200/70 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                                style={{
                                  width: `${Math.round(
                                    (task.subtasks.filter((s) => s.completed).length /
                                      task.subtasks.length) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                              {task.subtasks.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={() => handleToggleSubChecklistStep(task, sub.id)}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span
                                    className={`truncate ${
                                      sub.completed ? 'line-through text-slate-400' : ''
                                    }`}
                                  >
                                    {sub.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertDescriptionToSubChecklist(task, 'merge')}
                            className="w-full py-1 px-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Wand2 className="w-2.5 h-2.5" />
                            <span>Convert Description → Sub-Checklist</span>
                          </button>
                        )}
                        <select
                          value={task.status}
                          onChange={(e) =>
                            onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                          }
                          className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1"
                        >
                          {STATUS_COLUMNS.map((s) => (
                            <option key={s} value={s}>
                              Move to: {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-slate-400">
                      No tasks in {statusCol}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: SHOPPING LISTS & CHECKLISTS */}
      {viewMode === 'shopping' && (
        <div className="space-y-6">
          {/* Create New Shopping List / Checklist Bar */}
          {onAddShoppingList && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newListName.trim()) return;
                onAddShoppingList(newListName.trim(), newListStore.trim() || 'General');
                setNewListName('');
                setNewListStore('General');
              }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span>New Checklist / Store List:</span>
              </div>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name (e.g. Weekly Groceries, Camping Packing List, Hardware Store)..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newListStore}
                onChange={(e) => setNewListStore(e.target.value)}
                placeholder="Store or Category (e.g. Trader Joe's, Travel)"
                className="sm:w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Create List
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspace.shoppingLists.map((list) => {
              const draft = getListDraft(list.id);
              return (
                <div
                  key={list.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {list.name}
                        </h3>
                        <p className="text-xs text-slate-500">Store / Context: {list.store}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-600">
                          {list.items.filter((i) => i.checked).length}/{list.items.length} Checked
                        </span>
                        {onClearCheckedShoppingItems && list.items.some((i) => i.checked) && (
                          <button
                            type="button"
                            onClick={() => onClearCheckedShoppingItems(list.id)}
                            className="text-[11px] font-semibold text-red-600 hover:underline"
                          >
                            Clear Checked
                          </button>
                        )}
                        {onDeleteShoppingList && workspace.shoppingLists.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteShoppingList(list.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Delete entire list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {list.items.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">
                          Your list is empty. Add items below or approve predictive restock suggestions.
                        </p>
                      ) : (
                        list.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => onToggleShoppingItem(list.id, item.id)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span
                                className={`text-xs font-semibold truncate ${
                                  item.checked
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                ({item.quantity})
                              </span>
                            </label>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                {item.category}
                              </span>
                              {item.isRecurring && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                                  Recurring
                                </span>
                              )}
                              {item.estimatedPrice && (
                                <span className="text-xs font-mono text-slate-500">
                                  ${item.estimatedPrice.toFixed(2)}
                                </span>
                              )}
                              {onDeleteShoppingItem && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteShoppingItem(list.id, item.id)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft.name.trim()) return;
                      onAddShoppingItem(
                        list.id,
                        draft.name.trim(),
                        draft.qty || '1',
                        draft.category
                      );
                      updateListDraft(list.id, { name: '', qty: '1' });
                    }}
                    className="flex flex-wrap sm:flex-nowrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
                  >
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateListDraft(list.id, { name: e.target.value })}
                      placeholder="Add item to list..."
                      className="flex-1 min-w-[140px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={draft.qty}
                      onChange={(e) => updateListDraft(list.id, { qty: e.target.value })}
                      placeholder="Qty"
                      className="w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={draft.category}
                      onChange={(e) =>
                        updateListDraft(list.id, {
                          category: e.target.value as ShoppingItem['category'],
                        })
                      }
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs"
                    >
                      {SHOPPING_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
