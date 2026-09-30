import {
  PatternObservationLog,
  PersonalPattern,
  PredictionConfidenceTier,
  PredictionLifecycleState,
  PredictionSafeguardSettings,
} from '../types/bluenote';

export const DEFAULT_PREDICTION_SAFEGUARDS: PredictionSafeguardSettings = {
  enabled: true,
  currentStage: 7, // Stages 0-7 active out of the box (configurable up to Stage 9)
  suggestionBudgetMax: 6,
  cooldownBaseDays: 14,
  decayDaysThreshold: 75,
  quietDashboardSummary: true,
  explicitSuppressions: [],
};

// Clean default Pattern Store — starts completely empty with zero demo data.
// BlueNote observes real user actions over time (Observe -> Learn -> Predict -> Ask -> Learn).
export const DEFAULT_PERSONAL_PATTERNS: PersonalPattern[] = [];

export const DEFAULT_PATTERN_OBSERVATIONS: PatternObservationLog[] = [];

// Step up or step down confidence tier
export function adjustConfidenceTier(
  current: PredictionConfidenceTier,
  direction: 'up' | 'down'
): PredictionConfidenceTier {
  const order: PredictionConfidenceTier[] = ['Low', 'Medium', 'High', 'Very High'];
  const idx = order.indexOf(current);
  if (direction === 'up') {
    return order[Math.min(order.length - 1, idx + 1)];
  }
  return order[Math.max(0, idx - 1)];
}

// Compute surfaced predictions respecting Suggestion Budget, Cooldowns, Snoozes, and Suppressions
export function getSurfacedPredictions(
  patterns: PersonalPattern[],
  safeguards: PredictionSafeguardSettings
): PersonalPattern[] {
  if (!safeguards.enabled || safeguards.currentStage < 3) return [];

  const now = Date.now();
  const confidenceRank: Record<PredictionConfidenceTier, number> = {
    'Very High': 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const eligible = patterns.filter((p) => {
    if (p.suppressed || p.lifecycleState === 'SUPPRESSED') return false;
    if (
      safeguards.explicitSuppressions.some((rule) =>
        p.title.toLowerCase().includes(rule.toLowerCase())
      )
    ) {
      return false;
    }
    if (p.lifecycleState !== 'PRESENTED' && p.lifecycleState !== 'PREDICTED') {
      return false;
    }
    if (p.cooldownUntil && new Date(p.cooldownUntil).getTime() > now) {
      return false;
    }
    if (p.snoozedUntil && new Date(p.snoozedUntil).getTime() > now) {
      return false;
    }
    // Stage gating (Stage 3 = Shopping/Household only, Stage 5+ = Tasks/Reminders, Stage 6+ = Calendar/Cross-System)
    if (
      safeguards.currentStage === 3 &&
      p.category !== 'Shopping' &&
      p.category !== 'Household'
    ) {
      return false;
    }
    return true;
  });

  // Sort by confidence, approval history, and occurrence count, then cap at Suggestion Budget
  return eligible
    .sort((a, b) => {
      const cDiff = confidenceRank[b.confidence] - confidenceRank[a.confidence];
      if (cDiff !== 0) return cDiff;
      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, safeguards.suggestionBudgetMax);
}

// Record a new observation from user behavior (Stage 0 -> Stage 1 -> Stage 2 -> Stage 3)
export function recordUserObservation(
  patterns: PersonalPattern[],
  title: string,
  category: PersonalPattern['category'],
  actionType: PersonalPattern['suggestedPayload']['actionType']
): { updatedPatterns: PersonalPattern[]; promotedState?: PredictionLifecycleState } {
  const normalized = title.trim().toLowerCase();
  const existingIdx = patterns.findIndex(
    (p) =>
      p.title.toLowerCase().includes(normalized) ||
      normalized.includes(p.title.toLowerCase())
  );

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = patterns[existingIdx];
    if (existing.suppressed) {
      return { updatedPatterns: patterns };
    }
    const nextCount = existing.occurrenceCount + 1;
    let nextState: PredictionLifecycleState = existing.lifecycleState;
    let nextConfidence: PredictionConfidenceTier = existing.confidence;

    if (nextCount === 2 && existing.lifecycleState === 'OBSERVED') {
      nextState = 'CANDIDATE';
    } else if (nextCount === 3 && existing.lifecycleState === 'CANDIDATE') {
      nextState = 'EVALUATING';
      nextConfidence = 'Medium';
    } else if (nextCount >= 4) {
      nextState = 'PRESENTED';
      nextConfidence = nextCount >= 6 ? 'High' : 'Medium';
    }

    const updated: PersonalPattern = {
      ...existing,
      occurrenceCount: nextCount,
      lastObservedAt: now,
      lifecycleState: nextState,
      confidence: nextConfidence,
      knownFactStatement: `You recorded "${existing.title}" ${nextCount} times (most recently today).`,
      hypothesisStatement:
        nextCount >= 4
          ? `Based on ${nextCount} recurring entries, BlueNote thinks you may want to add or automate "${existing.title}".`
          : `Observed ${nextCount} times so far — tracking cadence silently before generating a prediction.`,
      explanation: `Recorded ${nextCount} occurrences across your workspace activity.`,
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          stage: nextState,
          action: `Observed user entry (#${nextCount})`,
          historicalEvidence: `${nextCount} occurrences recorded`,
          typicalInterval:
            existing.typicalIntervalDays > 0
              ? `${existing.observedRangeDays[0]}–${existing.observedRangeDays[1]} days`
              : '~14–21 days',
          confidence: nextConfidence,
          result: `Lifecycle state: ${nextState}`,
        },
        ...existing.auditTrail,
      ],
    };

    const nextList = [...patterns];
    nextList[existingIdx] = updated;
    return { updatedPatterns: nextList, promotedState: nextState };
  }

  // Brand-new observation starts at Stage 1: OBSERVED (never immediately nags!)
  const created: PersonalPattern = {
    id: `pat-${Date.now()}`,
    title: title.trim(),
    category,
    lifecycleState: 'OBSERVED',
    confidence: 'Low',
    riskLevel: category === 'Shopping' || category === 'Household' ? 'Low Risk' : 'Medium Risk',
    occurrenceCount: 1,
    typicalIntervalDays: 0,
    observedRangeDays: [0, 0],
    lastObservedAt: now,
    knownFactStatement: `You added "${title.trim()}" once today.`,
    hypothesisStatement:
      'Single observation recorded. BlueNote waits for multiple occurrences before evaluating a recurring pattern.',
    explanation:
      'A single occurrence is an observation, never a prediction. Held silently in the Pattern Store.',
    approvalCount: 0,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    suggestedPayload: {
      actionType,
      itemName: title.trim(),
      quantity: '1',
      shoppingCategory: 'Groceries',
      taskTitle: title.trim(),
      taskPriority: 'Medium',
      reminderTitle: title.trim(),
      reminderRecurrence: 'Weekly',
    },
    auditTrail: [
      {
        id: `aud-${Date.now()}`,
        timestamp: now,
        stage: 'OBSERVED',
        action: 'Stage 0/1 Initial Observation Recorded',
        historicalEvidence: '1st occurrence',
        typicalInterval: 'Awaiting recurrence',
        confidence: 'Low',
        result: 'Stored in Pattern Store (OBSERVED)',
      },
    ],
  };

  return { updatedPatterns: [created, ...patterns], promotedState: 'OBSERVED' };
}
