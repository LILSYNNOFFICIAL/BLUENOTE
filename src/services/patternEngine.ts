import {
  PatternObservationLog,
  PersonalPattern,
  PredictionConfidenceTier,
  PredictionLifecycleState,
  PredictionSafeguardSettings,
} from '../types/bluenote';

export const DEFAULT_PREDICTION_SAFEGUARDS: PredictionSafeguardSettings = {
  enabled: true,
  currentStage: 7, // Stages 0–7 active out of the box, configurable 0–9
  suggestionBudgetMax: 8,
  cooldownBaseDays: 14,
  decayDaysThreshold: 75,
  quietDashboardSummary: true,
  explicitSuppressions: [],
};

const nowISO = new Date().toISOString();
const daysAgoISO = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();

export const DEFAULT_PERSONAL_PATTERNS: PersonalPattern[] = [
  {
    id: 'pat-toilet-paper',
    title: 'Toilet Paper',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Low Risk',
    occurrenceCount: 7,
    typicalIntervalDays: 21,
    observedRangeDays: [20, 24],
    lastObservedAt: daysAgoISO(21),
    knownFactStatement:
      'You added Toilet Paper to your shopping list on 7 of your last 8 household cycles (last added 21 days ago).',
    hypothesisStatement:
      'You usually buy Toilet Paper around every three weeks (20–24 days) and you are approaching that timeframe. (Predicts purchasing cadence, never physical inventory.)',
    explanation:
      'Toilet paper appeared on 7 of your last 8 shopping lists and was typically added approximately every 20–24 days.',
    recurringGroupName: 'Household Shopping Pattern',
    approvalCount: 5,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: true,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Toilet Paper',
      quantity: '1 pack',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-tp-1',
        timestamp: daysAgoISO(140),
        stage: 'OBSERVED',
        action: 'Initial observation recorded',
        historicalEvidence: '1st occurrence in Shopping List',
        typicalInterval: 'N/A (Single observation)',
        confidence: 'Low',
        result: 'Logged to Stage 0 Historical Foundation',
      },
      {
        id: 'aud-tp-2',
        timestamp: daysAgoISO(63),
        stage: 'EVALUATING',
        action: 'Pattern consistency verified across 5 cycles',
        historicalEvidence: '5 previous occurrences',
        typicalInterval: '20–24 days',
        confidence: 'Medium',
        result: 'Promoted to PREDICTED state',
      },
      {
        id: 'aud-tp-3',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Surfaced in Predictive Shopping List',
        historicalEvidence: '7 previous occurrences (87.5% list inclusion)',
        typicalInterval: '20–24 days (~21d avg)',
        confidence: 'High',
        result: 'Awaiting user decision in Predictive Inbox',
      },
    ],
  },
  {
    id: 'pat-paper-towels',
    title: 'Paper Towels',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Low Risk',
    occurrenceCount: 6,
    typicalIntervalDays: 22,
    observedRangeDays: [20, 25],
    lastObservedAt: daysAgoISO(21),
    knownFactStatement:
      'You added Paper Towels 6 times over the last 4.5 months, frequently alongside Toilet Paper.',
    hypothesisStatement:
      'Based on your previous shopping activity, you may be approaching your usual 3-week household restock cycle.',
    explanation:
      'Paper towels appeared on 6 of your last 8 shopping lists at an interval of 20–25 days and co-occurred with your Household Shopping Pattern.',
    recurringGroupName: 'Household Shopping Pattern',
    approvalCount: 4,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: true,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Paper Towels',
      quantity: '1 pack (6 rolls)',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-pt-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Prediction generated from recurring household group',
        historicalEvidence: '6 previous occurrences',
        typicalInterval: '20–25 days',
        confidence: 'High',
        result: 'Queued in Predictive Shopping List',
      },
    ],
  },
  {
    id: 'pat-trash-bags',
    title: 'Trash Bags',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Low Risk',
    occurrenceCount: 5,
    typicalIntervalDays: 24,
    observedRangeDays: [21, 27],
    lastObservedAt: daysAgoISO(23),
    knownFactStatement:
      'You added Trash Bags on 5 prior shopping lists (last added 23 days ago).',
    hypothesisStatement:
      'You typically add Trash Bags every 21–27 days as part of your household cycle.',
    explanation:
      'Trash bags were recorded 5 times with a consistent 21–27 day interval and zero recent denials.',
    recurringGroupName: 'Household Shopping Pattern',
    approvalCount: 3,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: true,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Trash Bags',
      quantity: '1 box',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-tb-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Surfaced in Predictive Shopping List',
        historicalEvidence: '5 previous occurrences',
        typicalInterval: '21–27 days',
        confidence: 'High',
        result: 'Awaiting user decision',
      },
    ],
  },
  {
    id: 'pat-laundry-detergent',
    title: 'Laundry Detergent',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'Medium',
    riskLevel: 'Low Risk',
    occurrenceCount: 4,
    typicalIntervalDays: 30,
    observedRangeDays: [27, 34],
    lastObservedAt: daysAgoISO(28),
    knownFactStatement:
      'You added Laundry Detergent 4 times historically (last added 28 days ago).',
    hypothesisStatement:
      'Part of your Household Shopping Pattern, though purchased slightly less frequently (~30 days). Group membership is treated as evidence, not proof.',
    explanation:
      'Laundry detergent co-occurs with your Household Shopping Pattern on roughly every second cycle (27–34 days). Maintained at Medium confidence independently of higher-frequency group items.',
    recurringGroupName: 'Household Shopping Pattern',
    approvalCount: 2,
    denialCount: 1,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Laundry Detergent',
      quantity: '1 bottle',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-ld-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Independent group item evaluation',
        historicalEvidence: '4 previous occurrences, 1 prior denial',
        typicalInterval: '27–34 days',
        confidence: 'Medium',
        result: 'Unchecked by default due to Medium confidence tier',
      },
    ],
  },
  {
    id: 'pat-coffee',
    title: 'Coffee Beans (Whole Bean)',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'Medium',
    riskLevel: 'Low Risk',
    occurrenceCount: 5,
    typicalIntervalDays: 16,
    observedRangeDays: [14, 19],
    lastObservedAt: daysAgoISO(16),
    knownFactStatement:
      'You added Coffee to your shopping list 5 times over the last 11 weeks.',
    hypothesisStatement:
      'You usually purchase Coffee every 14–19 days and your last recorded entry was 16 days ago.',
    explanation:
      'Detected 5 historical additions with an observed interval range of 14–19 days.',
    approvalCount: 2,
    denialCount: 1,
    editCount: 1,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Coffee Beans',
      quantity: '12 oz bag',
      shoppingCategory: 'Groceries',
    },
    auditTrail: [
      {
        id: 'aud-cf-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Surfaced in Predictive Shopping List',
        historicalEvidence: '5 previous occurrences',
        typicalInterval: '14–19 days',
        confidence: 'Medium',
        result: 'Awaiting user review',
      },
    ],
  },
  {
    id: 'pat-dish-soap',
    title: 'Dish Soap',
    category: 'Shopping',
    lifecycleState: 'PRESENTED',
    confidence: 'Low',
    riskLevel: 'Low Risk',
    occurrenceCount: 3,
    typicalIntervalDays: 35,
    observedRangeDays: [30, 42],
    lastObservedAt: daysAgoISO(33),
    knownFactStatement:
      'You added Dish Soap 3 times over the past 3.5 months.',
    hypothesisStatement:
      'Wider interval variance (30–42 days) places this at Low confidence, included optionally in your household cycle.',
    explanation:
      'Dish soap has 3 recorded occurrences with a broader 30–42 day range. Surfaced passively inside the household batch without notification.',
    recurringGroupName: 'Household Shopping Pattern',
    approvalCount: 1,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Dish Soap',
      quantity: '1 bottle',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-ds-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Low-confidence passive item attached to Household cycle',
        historicalEvidence: '3 previous occurrences',
        typicalInterval: '30–42 days',
        confidence: 'Low',
        result: 'Unchecked by default',
      },
    ],
  },
  {
    id: 'pat-sunday-trash-task',
    title: 'Take the trash & recycling out',
    category: 'Tasks',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Medium Risk',
    occurrenceCount: 5,
    typicalIntervalDays: 7,
    observedRangeDays: [6, 7],
    lastObservedAt: daysAgoISO(7),
    knownFactStatement:
      'You manually created "Take the trash out" 5 times on Sunday evenings between 6:30 PM and 8:30 PM.',
    hypothesisStatement:
      'You seem to do this regularly every Sunday evening. Would you like to make it a recurring task?',
    explanation:
      'Detected 5 manual task creations on Sunday evenings with a tight 6–7 day recurrence interval and 100% completion rate.',
    approvalCount: 3,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'create_recurring_task',
      taskTitle: 'Take the trash & recycling out (Weekly Sunday Routine)',
      taskSchedule: 'Every Sunday Evening',
      taskPriority: 'Medium',
    },
    auditTrail: [
      {
        id: 'aud-tr-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Stage 5 Predictive Task suggestion generated',
        historicalEvidence: '5 Sunday evening manual creations',
        typicalInterval: '7 days',
        confidence: 'High',
        result: 'Presented in Predictive Inbox with [Create Recurring Task] [Not Now] [Never Suggest]',
      },
    ],
  },
  {
    id: 'pat-monthly-rent-reminder',
    title: 'Beginning-of-Month Utilities & Rent Check',
    category: 'Reminders',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Medium Risk',
    occurrenceCount: 4,
    typicalIntervalDays: 30,
    observedRangeDays: [29, 31],
    lastObservedAt: daysAgoISO(29),
    knownFactStatement:
      'You created a bill/rent review reminder around the 1st of the month for the last 4 consecutive months.',
    hypothesisStatement:
      'Turn this into a monthly recurring reminder so you do not have to recreate it manually?',
    explanation:
      'Created on the 1st or 2nd day of each month across 4 consecutive monthly cycles.',
    approvalCount: 2,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'create_recurring_reminder',
      reminderTitle: 'Monthly Utilities & Rent Review',
      reminderRecurrence: 'Monthly',
    },
    auditTrail: [
      {
        id: 'aud-mr-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Stage 5 Predictive Reminder candidate surfaced',
        historicalEvidence: '4 monthly occurrences',
        typicalInterval: '29–31 days',
        confidence: 'High',
        result: 'Awaiting explicit user confirmation',
      },
    ],
  },
  {
    id: 'pat-trip-preparation',
    title: 'Possible Trip Preparation Bundle',
    category: 'Cross-System',
    lifecycleState: 'PRESENTED',
    confidence: 'High',
    riskLevel: 'Medium Risk',
    occurrenceCount: 4,
    typicalIntervalDays: 45,
    observedRangeDays: [35, 60],
    lastObservedAt: daysAgoISO(2),
    knownFactStatement:
      'Calendar & Notes indicate upcoming travel preparation patterns; before your last 4 trips you created a packing list and transportation check.',
    hypothesisStatement:
      'BlueNote combined Calendar + Tasks + Smart Notes patterns to prepare a draft Trip Preparation checklist for your review.',
    explanation:
      'Cross-System Context (Stage 7): Historical behavior shows you create a packing list 3 days before travel, verify transportation the day before, and gather travel documents.',
    approvalCount: 3,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    selectedForBatch: false,
    suggestedPayload: {
      actionType: 'create_cross_system_bundle',
      bundleItems: [
        'Complete trip packing checklist',
        'Verify flight / train transportation & boarding passes',
        'Gather passport, ID & hotel confirmations',
        'Set out-of-office & review pre-trip tasks',
      ],
    },
    auditTrail: [
      {
        id: 'aud-trip-1',
        timestamp: nowISO,
        stage: 'PRESENTED',
        action: 'Cross-System Context synthesis (Calendar + Tasks + Notes)',
        historicalEvidence: '4 prior travel sequences',
        typicalInterval: 'Contextual (3 days prior to travel event)',
        confidence: 'High',
        result: 'Surfaced in Predictive Inbox for user approval',
      },
    ],
  },
  // Early-stage & Decayed patterns kept in Pattern Store (NOT surfaced in Predictive Inbox to prevent spam!)
  {
    id: 'pat-observed-batteries',
    title: 'AA Lithium Batteries',
    category: 'Household',
    lifecycleState: 'OBSERVED',
    confidence: 'Low',
    riskLevel: 'Low Risk',
    occurrenceCount: 1,
    typicalIntervalDays: 0,
    observedRangeDays: [0, 0],
    lastObservedAt: daysAgoISO(5),
    knownFactStatement: 'You added AA Batteries once 5 days ago.',
    hypothesisStatement:
      'Single observation only — not a recurring pattern yet. Held in OBSERVED state and never surfaced as a prediction.',
    explanation:
      'A single occurrence never establishes a recurring pattern (Section 9). Waiting for additional observations.',
    approvalCount: 0,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'AA Lithium Batteries',
      quantity: '1 pack',
      shoppingCategory: 'Household',
    },
    auditTrail: [
      {
        id: 'aud-bat-1',
        timestamp: daysAgoISO(5),
        stage: 'OBSERVED',
        action: 'Single event recorded',
        historicalEvidence: '1 occurrence',
        typicalInterval: 'Insufficient data',
        confidence: 'Low',
        result: 'Held silently in Stage 1 Pattern Store',
      },
    ],
  },
  {
    id: 'pat-candidate-oat-milk',
    title: 'Barista Oat Milk',
    category: 'Shopping',
    lifecycleState: 'CANDIDATE',
    confidence: 'Low',
    riskLevel: 'Low Risk',
    occurrenceCount: 2,
    typicalIntervalDays: 12,
    observedRangeDays: [11, 13],
    lastObservedAt: daysAgoISO(9),
    knownFactStatement: 'Oat Milk has appeared twice on your shopping list.',
    hypothesisStatement:
      'Detected a possible recurring pattern (2 occurrences), currently tracked silently as a CANDIDATE until minimum evidence threshold is met.',
    explanation:
      'Appeared twice (12 days apart). BlueNote tracks CANDIDATE patterns in the background without interrupting you.',
    approvalCount: 0,
    denialCount: 0,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'Barista Oat Milk',
      quantity: '2 cartons',
      shoppingCategory: 'Groceries',
    },
    auditTrail: [
      {
        id: 'aud-om-1',
        timestamp: daysAgoISO(9),
        stage: 'CANDIDATE',
        action: 'Promoted from OBSERVED to CANDIDATE on 2nd occurrence',
        historicalEvidence: '2 occurrences',
        typicalInterval: '~12 days',
        confidence: 'Low',
        result: 'Awaiting 3rd occurrence for EVALUATING stage',
      },
    ],
  },
  {
    id: 'pat-stale-summer-sunscreen',
    title: 'SPF 50 Mineral Sunscreen',
    category: 'Seasonal' as any,
    lifecycleState: 'STALE',
    confidence: 'Low',
    riskLevel: 'Low Risk',
    occurrenceCount: 4,
    typicalIntervalDays: 25,
    observedRangeDays: [22, 29],
    lastObservedAt: daysAgoISO(105),
    knownFactStatement:
      'Purchased 4 times during summer months, but no occurrence for the last 105 days.',
    hypothesisStatement:
      'Pattern decayed to STALE due to 3.5 months of inactivity (Section 15 Prediction Decay). Stopped generating predictions.',
    explanation:
      'Historically occurred every ~25 days in summer, followed by 105 days of zero occurrences. Confidence automatically decayed.',
    approvalCount: 2,
    denialCount: 1,
    editCount: 0,
    cooldownDays: 0,
    cooldownUntil: null,
    snoozedUntil: null,
    suppressed: false,
    suggestedPayload: {
      actionType: 'add_shopping_item',
      itemName: 'SPF 50 Mineral Sunscreen',
      quantity: '1 bottle',
      shoppingCategory: 'Pharmacy',
    },
    auditTrail: [
      {
        id: 'aud-sun-1',
        timestamp: daysAgoISO(15),
        stage: 'STALE',
        action: 'Automatic Prediction Decay triggered (>75 days inactive)',
        historicalEvidence: '4 summer occurrences, 105 days elapsed',
        typicalInterval: '22–29 days (Historical)',
        confidence: 'Low',
        result: 'Transitioned to STALE; paused normal predictions',
      },
    ],
  },
];

export const DEFAULT_PATTERN_OBSERVATIONS: PatternObservationLog[] = [
  {
    id: 'obs-1',
    sourceType: 'Shopping',
    itemTitle: 'Toilet Paper',
    observedAt: daysAgoISO(21),
    eventType: 'created',
    notes: '7th recorded shopping addition (interval: 21 days)',
  },
  {
    id: 'obs-2',
    sourceType: 'Task',
    itemTitle: 'Take the trash & recycling out',
    observedAt: daysAgoISO(7),
    eventType: 'completed',
    notes: '5th Sunday evening task completion',
  },
  {
    id: 'obs-3',
    sourceType: 'Shopping',
    itemTitle: 'AA Lithium Batteries',
    observedAt: daysAgoISO(5),
    eventType: 'created',
    notes: '1st occurrence — logged as OBSERVED only',
  },
];

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
  const existingIdx = patterns.findIndex((p) =>
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
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          stage: nextState,
          action: `Observed manual user entry (#${nextCount})`,
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
