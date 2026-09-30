import React, { useState } from 'react';
import {
  Sparkles,
  ShoppingCart,
  CheckSquare,
  Bell,
  Calendar,
  Home,
  FolderKanban,
  Network,
  Check,
  X,
  Clock,
  Edit3,
  EyeOff,
  ShieldAlert,
  History,
  Info,
  Layers,
  Sliders,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveSection,
  PersonalPattern,
  PredictionCategory,
  PredictionConfidenceTier,
  PredictionLifecycleState,
  PredictionSafeguardSettings,
  WorkspaceState,
} from '../types/bluenote';
import {
  DEFAULT_PERSONAL_PATTERNS,
  DEFAULT_PREDICTION_SAFEGUARDS,
  getSurfacedPredictions,
} from '../services/patternEngine';

interface PredictiveListsViewProps {
  workspace: WorkspaceState;
  onNavigate: (section: ActiveSection) => void;
  onApprovePrediction: (patternId: string, editedTitle?: string, editedQty?: string) => void;
  onApproveBatchPredictions: (patternIds: string[]) => void;
  onDenyPrediction: (patternId: string) => void;
  onSnoozePrediction: (patternId: string, days: number) => void;
  onSuppressPrediction: (patternId: string, reason?: string) => void;
  onRestorePattern: (patternId: string) => void;
  onToggleBatchSelect: (patternId: string) => void;
  onSimulateObservation: (
    title: string,
    category: PredictionCategory,
    actionType: PersonalPattern['suggestedPayload']['actionType']
  ) => void;
  onUpdateSafeguards: (updates: Partial<PredictionSafeguardSettings>) => void;
  onApplyExplicitCommand: (commandText: string) => void;
}

const CONFIDENCE_BADGE: Record<PredictionConfidenceTier, string> = {
  'Very High':
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  High: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  Medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  Low: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

const RISK_BADGE: Record<PersonalPattern['riskLevel'], string> = {
  'Low Risk': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Medium Risk': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'High Risk': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const STAGES_ROADMAP = [
  {
    stage: 0,
    title: 'Stage 0 — Historical Data Foundation',
    desc: 'Reliably records shopping items, tasks, reminders, events, timestamps, approvals, denials, edits, and suppressions.',
  },
  {
    stage: 1,
    title: 'Stage 1 — Pattern Observation',
    desc: 'Deterministic detection of repeated items, approximate intervals, and co-occurring groups without surfacing noise.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Pattern Evaluation',
    desc: 'Evaluates recurrence consistency, recency, pattern decay, and minimum evidence thresholds (Observed → Candidate → Evaluating).',
  },
  {
    stage: 3,
    title: 'Stage 3 — Predictive Shopping Lists (MVP)',
    desc: 'Low-risk household & shopping cycle predictions with Approve Selected, Edit, Dismiss, and Shopping List integration.',
  },
  {
    stage: 4,
    title: 'Stage 4 — Prediction Learning',
    desc: 'Confidence updates from approvals/denials, exponential cooldowns, plain-English explanations, and full Audit Trail.',
  },
  {
    stage: 5,
    title: 'Stage 5 — Predictive Tasks & Reminders',
    desc: 'Detects recurring manual tasks (e.g., Sunday evening routines) and monthly reminders with explicit user approval.',
  },
  {
    stage: 6,
    title: 'Stage 6 — Predictive Calendar',
    desc: 'Detects recurring planning blocks and preparation windows while requiring confirmation for schedule changes.',
  },
  {
    stage: 7,
    title: 'Stage 7 — Cross-System Intelligence',
    desc: 'Combines Calendar + Tasks + Notes + Shopping to suggest contextual bundles like Trip Preparation.',
  },
  {
    stage: 8,
    title: 'Stage 8 — Advanced Integrations',
    desc: 'Optional Receipt OCR, voice notes, and authorized smart-home / inventory inputs with explicit user permission.',
  },
  {
    stage: 9,
    title: 'Stage 9 — Mature Personal Pattern Engine',
    desc: 'Explainable, conservative, quiet, privacy-conscious intelligence that gets smarter without becoming louder.',
  },
];

export const PredictiveListsView: React.FC<PredictiveListsViewProps> = ({
  workspace,
  onNavigate,
  onApprovePrediction,
  onApproveBatchPredictions,
  onDenyPrediction,
  onSnoozePrediction,
  onSuppressPrediction,
  onRestorePattern,
  onToggleBatchSelect,
  onSimulateObservation,
  onUpdateSafeguards,
  onApplyExplicitCommand,
}) => {
  const [activeTab, setActiveTab] = useState<
    'predictive-lists' | 'inbox' | 'pattern-store' | 'safeguards' | 'roadmap'
  >('predictive-lists');
  const [selectedCategory, setSelectedCategory] = useState<PredictionCategory | 'ALL'>('ALL');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editQty, setEditQty] = useState('');
  const [overrideCommand, setOverrideCommand] = useState('');
  const [simTitle, setSimTitle] = useState('');
  const [simCategory, setSimCategory] = useState<PredictionCategory>('Shopping');

  const patterns = workspace.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
  const safeguards = workspace.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS;

  const surfacedPredictions = getSurfacedPredictions(patterns, safeguards);
  const shoppingPredictions = surfacedPredictions.filter(
    (p) => p.category === 'Shopping' || p.category === 'Household'
  );
  const selectedShoppingIds = shoppingPredictions
    .filter((p) => p.selectedForBatch)
    .map((p) => p.id);

  const filteredInbox = surfacedPredictions.filter((p) =>
    selectedCategory === 'ALL' ? true : p.category === selectedCategory
  );

  const suppressedOrCooldownPatterns = patterns.filter(
    (p) =>
      p.suppressed ||
      p.lifecycleState === 'SUPPRESSED' ||
      p.lifecycleState === 'DENIED' ||
      Boolean(p.cooldownUntil) ||
      Boolean(p.snoozedUntil)
  );

  const startEditing = (pat: PersonalPattern) => {
    setEditingId(pat.id);
    setEditTitle(pat.title);
    setEditQty(pat.suggestedPayload.quantity || '1');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Executive Header */}
      <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
              <span>🔮 Personal Pattern Engine</span>
              <span>•</span>
              <span className="font-mono text-[10px]">
                Stage {safeguards.currentStage} Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Predictive Lists & Personal Pattern Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              <strong className="text-slate-800 dark:text-slate-200">
                Observe → Learn → Predict → Explain → Ask → Learn from the answer.
              </strong>{' '}
              Every prediction is treated strictly as a hypothesis backed by historical cadence — never a fact or false physical inventory claim.
            </p>
          </div>

          {/* Core Philosophy Pill Box */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Predictive Inbox Queue
              </div>
              <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                {surfacedPredictions.length} Active / {safeguards.suggestionBudgetMax} Budget Max
              </div>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/10 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
              Open Shopping List
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {(
            [
              ['predictive-lists', '🔮 Predictive Lists (Shopping & Household)', ShoppingCart],
              ['inbox', `Centralized Predictive Inbox (${surfacedPredictions.length})`, Sparkles],
              ['pattern-store', `Pattern Store & Lifecycle (${patterns.length})`, Layers],
              ['safeguards', 'Fatigue Prevention & Safeguards', ShieldAlert],
              ['roadmap', 'Staged Architecture (Stages 0–9)', Sliders],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: 🔮 PREDICTIVE LISTS (SHOPPING & HOUSEHOLD CYCLE MVP)
          ===================================================================== */}
      {activeTab === 'predictive-lists' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Columns: Predicted Shopping List */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔮</span>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Predicted Shopping List
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Household Shopping Cycle
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    “Based on your previous shopping activity, you may be approaching your usual household shopping cycle.”
                  </p>
                </div>

                {/* Batch Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    disabled={selectedShoppingIds.length === 0}
                    onClick={() => onApproveBatchPredictions(selectedShoppingIds)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Selected ({selectedShoppingIds.length})
                  </button>
                </div>
              </div>

              {shoppingPredictions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Your Predictive Shopping List is all caught up.
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    BlueNote will stay quiet and only surface new household or grocery predictions when historical intervals indicate they are genuinely useful.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shoppingPredictions.map((pat) => {
                    const isChecked = Boolean(pat.selectedForBatch);
                    const isEditing = editingId === pat.id;
                    const isAuditOpen = expandedAuditId === pat.id;

                    return (
                      <div
                        key={pat.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isChecked
                            ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10'
                            : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleBatchSelect(pat.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              aria-label={`Select ${pat.title}`}
                            />
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {pat.title}
                                </span>
                                {pat.suggestedPayload.quantity && (
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {pat.suggestedPayload.quantity}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                    CONFIDENCE_BADGE[pat.confidence]
                                  }`}
                                >
                                  {pat.confidence} Confidence
                                </span>
                                {pat.recurringGroupName && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                                    Group: {pat.recurringGroupName}
                                  </span>
                                )}
                              </div>

                              {/* Known Fact vs Predicted Hypothesis Distinction (Section 2) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                                  <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                                    ✓ Known Fact (User Recorded)
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    {pat.knownFactStatement}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                                  <span className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                                    🔮 Predicted Hypothesis (Cadence Inference)
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    {pat.hypothesisStatement}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Individual Prediction Controls (Section 6) */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onApprovePrediction(pat.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Approve and add to Shopping List"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => startEditing(pat)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Edit item before approving (Corrective learning)"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => onSnoozePrediction(pat.id, 7)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Snooze for 7 days without lowering confidence"
                            >
                              <Clock className="w-3 h-3" /> Snooze
                            </button>
                            <button
                              onClick={() => onDenyPrediction(pat.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Deny & enter cooldown (Lowers confidence)"
                            >
                              <X className="w-3 h-3" /> Deny
                            </button>
                            <button
                              onClick={() =>
                                onSuppressPrediction(pat.id, 'User clicked Never Suggest Again')
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Never Suggest Again (Permanent Suppression)"
                            >
                              <EyeOff className="w-3 h-3" /> Never
                            </button>
                          </div>
                        </div>

                        {/* Inline Corrective Edit Bar */}
                        {isEditing && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-500/40 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                              placeholder="Item name..."
                            />
                            <input
                              type="text"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono"
                              placeholder="Quantity..."
                            />
                            <button
                              onClick={() => {
                                onApprovePrediction(pat.id, editTitle.trim(), editQty.trim());
                                setEditingId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                            >
                              Save Edit & Approve
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Footer: Why is this predicted? + Audit Trail Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>
                              <strong>Why predicted:</strong> {pat.explanation}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setExpandedAuditId(isAuditOpen ? null : pat.id)
                            }
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                          >
                            <History className="w-3 h-3" />
                            Audit Trail ({pat.auditTrail.length})
                            {isAuditOpen ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Expandable Prediction Audit Trail (Section 14) */}
                        {isAuditOpen && (
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                              <span>Internal Prediction Audit Trail — {pat.title}</span>
                              <span className="font-mono text-[11px] text-slate-500">
                                Interval: {pat.observedRangeDays[0]}–{pat.observedRangeDays[1]} days ({pat.occurrenceCount} occurrences)
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {pat.auditTrail.map((aud) => (
                                <div
                                  key={aud.id}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                                >
                                  <div>
                                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 mr-2">
                                      {aud.stage}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {aud.action}
                                    </span>
                                    <span className="text-slate-500 ml-2">
                                      ({aud.historicalEvidence} • {aud.typicalInterval})
                                    </span>
                                  </div>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    → {aud.result}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Columns: Core Safeguard Rules & Recurring Group Policy */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-500" />
                Prediction Safeguards Active
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    1. Hypothesis, Never a Fact
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Every item clearly separates what you explicitly recorded from what BlueNote inferred.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    2. No False Inventory Claims
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    BlueNote never claims “You have 4 squares of toilet paper left.” It only models your historical purchasing cadence (~20–24 days).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    3. Group Membership ≠ Proof
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Toilet Paper, Paper Towels, Trash Bags, and Laundry Detergent form a recurring group, but each item maintains its own independent confidence tier.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    4. Zero Nagging / Cooldowns
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Denying a prediction immediately places it into a multi-week cooldown and steps down its confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CENTRALIZED PREDICTIVE INBOX (ALL CATEGORIES)
          ===================================================================== */}
      {activeTab === 'inbox' && (
        <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Centralized Predictive Inbox — {surfacedPredictions.length} things BlueNote thinks you may want to review
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Predictions accumulate quietly here instead of interrupting you with notifications. Review when convenient.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['ALL', 'All Categories'],
                  ['Shopping', '🛒 Shopping'],
                  ['Tasks', '✓ Tasks'],
                  ['Reminders', '🔔 Reminders'],
                  ['Cross-System', '🔮 Cross-System Prep'],
                ] as const
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            {filteredInbox.map((pat) => (
              <div
                key={pat.id}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                        {pat.category}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {pat.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          CONFIDENCE_BADGE[pat.confidence]
                        }`}
                      >
                        {pat.confidence} Confidence
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          RISK_BADGE[pat.riskLevel]
                        }`}
                      >
                        {pat.riskLevel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Known:</strong> {pat.knownFactStatement}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      <strong>Predicted:</strong> {pat.hypothesisStatement}
                    </p>

                    {pat.suggestedPayload.bundleItems && (
                      <div className="pt-1.5 flex flex-wrap gap-1.5">
                        {pat.suggestedPayload.bundleItems.map((b, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                          >
                            • {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onApprovePrediction(pat.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {pat.category === 'Tasks'
                        ? 'Create Recurring Task'
                        : pat.category === 'Reminders'
                        ? 'Create Recurring Reminder'
                        : pat.category === 'Cross-System'
                        ? 'Approve Prep Checklist'
                        : 'Approve'}
                    </button>
                    <button
                      onClick={() => onSnoozePrediction(pat.id, 7)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                    >
                      Not Now (Snooze)
                    </button>
                    <button
                      onClick={() => onDenyPrediction(pat.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() =>
                        onSuppressPrediction(pat.id, 'Suppressed from Predictive Inbox')
                      }
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold"
                    >
                      Never Suggest
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PERSONAL PATTERN STORE & LIFECYCLE INSPECTOR
          ===================================================================== */}
      {activeTab === 'pattern-store' && (
        <div className="space-y-6">
          {/* Interactive Observation Simulator */}
          <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Test the Pattern Lifecycle (OBSERVED → CANDIDATE → EVALUATING → PRESENTED)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                A single occurrence never triggers a prediction. Log an item below (e.g. “Barista Oat Milk” or a new item) to watch how BlueNote requires repeated evidence before promoting a pattern.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!simTitle.trim()) return;
                onSimulateObservation(
                  simTitle.trim(),
                  simCategory,
                  simCategory === 'Tasks'
                    ? 'create_recurring_task'
                    : simCategory === 'Reminders'
                    ? 'create_recurring_reminder'
                    : 'add_shopping_item'
                );
                setSimTitle('');
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={simTitle}
                onChange={(e) => setSimTitle(e.target.value)}
                placeholder='Enter item or task (e.g. "Barista Oat Milk", "AA Lithium Batteries", "Sparkling Water")...'
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              />
              <select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value as PredictionCategory)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              >
                <option value="Shopping">Shopping Item</option>
                <option value="Household">Household Supply</option>
                <option value="Tasks">Recurring Task</option>
                <option value="Reminders">Recurring Reminder</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Record Observation
              </button>
            </form>
          </div>

          {/* All Patterns Table by Lifecycle State */}
          <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Complete Personal Pattern Store ({patterns.length} Tracked Patterns)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {patterns.map((pat) => (
                <div
                  key={pat.id}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {pat.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/25">
                      {pat.lifecycleState}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pat.explanation}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-500">
                    <span>Occurrences: {pat.occurrenceCount}</span>
                    <span>
                      Interval:{' '}
                      {pat.typicalIntervalDays > 0
                        ? `~${pat.typicalIntervalDays}d (${pat.observedRangeDays[0]}–${pat.observedRangeDays[1]}d)`
                        : 'Single event'}
                    </span>
                    <span>
                      Approvals: {pat.approvalCount} / Denials: {pat.denialCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: FATIGUE PREVENTION, COOLDOWNS & SAFEGUARDS CONSOLE
          ===================================================================== */}
      {activeTab === 'safeguards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* Section 17: Explicit User Instructions Always Win */}
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Explicit User Instruction Override (“Stop suggesting...”)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explicit user preferences always override statistical inference. Tell BlueNote to stop suggesting any item or routine and it will immediately suppress it regardless of historical frequency.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!overrideCommand.trim()) return;
                  onApplyExplicitCommand(overrideCommand.trim());
                  setOverrideCommand('');
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={overrideCommand}
                  onChange={(e) => setOverrideCommand(e.target.value)}
                  placeholder='Try: "Stop suggesting coffee" or "Never suggest dish soap"...'
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0"
                >
                  Suppress Pattern
                </button>
              </form>
            </div>

            {/* Suppressed, Denied & Cooldown Patterns */}
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Suppressed, Snoozed & Cooldown Patterns ({suppressedOrCooldownPatterns.length})
              </h3>
              {suppressedOrCooldownPatterns.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No patterns are currently suppressed or in denial cooldown.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {suppressedOrCooldownPatterns.map((pat) => (
                    <div
                      key={pat.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {pat.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                            {pat.lifecycleState}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {pat.suppressionReason ||
                            (pat.cooldownUntil
                              ? `Cooldown active until ${new Date(
                                  pat.cooldownUntil
                                ).toLocaleDateString()}`
                              : 'Snoozed by user')}
                        </p>
                      </div>
                      <button
                        onClick={() => onRestorePattern(pat.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Re-Enable
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Budget & Decay Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Suggestion Budget & Cooldown Parameters
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200 mb-1">
                    <span>Suggestion Budget (Max Active Predictions)</span>
                    <span className="font-mono text-blue-500">
                      {safeguards.suggestionBudgetMax} items
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={safeguards.suggestionBudgetMax}
                    onChange={(e) =>
                      onUpdateSafeguards({ suggestionBudgetMax: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    If BlueNote discovers 30 candidate patterns, it ranks them and surfaces at most {safeguards.suggestionBudgetMax} high-value suggestions.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200 mb-1">
                    <span>Base Denial Cooldown Window</span>
                    <span className="font-mono text-blue-500">
                      {safeguards.cooldownBaseDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={60}
                    value={safeguards.cooldownBaseDays}
                    onChange={(e) =>
                      onUpdateSafeguards({ cooldownBaseDays: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Repeated denials multiply this cooldown exponentially so BlueNote never nags you.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200 mb-1">
                    <span>Prediction Decay Threshold (STALE cutoff)</span>
                    <span className="font-mono text-blue-500">
                      {safeguards.decayDaysThreshold} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={180}
                    value={safeguards.decayDaysThreshold}
                    onChange={(e) =>
                      onUpdateSafeguards({ decayDaysThreshold: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: STAGED ARCHITECTURE ROADMAP (STAGE 0 TO STAGE 9)
          ===================================================================== */}
      {activeTab === 'roadmap' && (
        <div className="bn-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Progressive Implementation Roadmap (Stage 0 → Stage 9)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select which rollout stage is active in your workspace (Stage 3 = Shopping MVP only; Stage 7+ = Full Tasks, Reminders & Cross-System Intelligence).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Active Rollout Stage:
              </span>
              <select
                value={safeguards.currentStage}
                onChange={(e) =>
                  onUpdateSafeguards({ currentStage: Number(e.target.value) })
                }
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              >
                {STAGES_ROADMAP.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    Stage {s.stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {STAGES_ROADMAP.map((s) => {
              const isReached = safeguards.currentStage >= s.stage;
              return (
                <div
                  key={s.stage}
                  onClick={() => onUpdateSafeguards({ currentStage: s.stage })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isReached
                      ? 'border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {s.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isReached
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isReached ? 'Enabled' : 'Future Stage'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
