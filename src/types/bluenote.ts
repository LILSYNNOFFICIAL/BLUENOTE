export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Someday';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Waiting' | 'Scheduled' | 'Completed' | 'Archived';
export type EnergyMode = 'Focused' | 'Normal' | 'Busy' | 'Tired' | 'Sick' | 'Vacation';
export type ThemeMode = 'blue' | 'light' | 'dark' | 'emerald' | 'violet' | 'system';
export type AIPersonality = 'Personal Assistant' | 'Professional' | 'Friendly' | 'Minimal' | 'Motivational' | 'Executive Assistant' | 'Calm & Quiet';
export type AIConfirmationMode = 'Always Ask' | 'Usually Ask' | 'Auto Save' | 'Never Ask';

export type AIAgentType =
  | 'Auto'
  | 'Task Assistant'
  | 'Note Assistant'
  | 'Research Assistant'
  | 'Calendar Assistant'
  | 'Contact Assistant'
  | 'File Assistant'
  | 'Writing Assistant'
  | 'Planning Assistant';

export type EntityType =
  | 'task'
  | 'note'
  | 'project'
  | 'event'
  | 'reminder'
  | 'contact'
  | 'link'
  | 'file'
  | 'shopping'
  | 'habit'
  | 'goal'
  | 'conversation';

export interface LinkedReference {
  id: string;
  type: EntityType;
  title: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  estimatedMinutes: number;
  actualMinutes: number;
  completionPercentage: number;
  projectId?: string;
  category: string;
  tags: string[];
  subtasks: Subtask[];
  dependsOnTaskId?: string;
  repeatRule?: 'None' | 'Daily' | 'Weekdays' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Yearly';
  aiReasoning?: string;
  linkedItems: LinkedReference[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface NoteVersion {
  id: string;
  timestamp: string;
  title: string;
  content: string;
  summary?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  folderId: string;
  color: 'white' | 'blue' | 'amber' | 'emerald' | 'rose' | 'violet';
  category: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  deletedAt?: string | null;
  wordCount: number;
  version: number;
  history: NoteVersion[];
  linkedItems: LinkedReference[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string;
  icon: string;
  color: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  status: 'Active' | 'Planning' | 'On Hold' | 'Completed' | 'Archived';
  progress: number;
  color: string;
  icon: string;
  category: string;
  templateUsed?: string;
  aiSummary?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay: boolean;
  location?: string;
  meetingUrl?: string;
  repeatRule?: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  color: string;
  category: 'Meeting' | 'Appointment' | 'Focus Block' | 'Deadline' | 'Personal' | 'Birthday';
  tags: string[];
  linkedContactIds: string[];
  projectId?: string;
  deletedAt?: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  triggerDate: string; // YYYY-MM-DD
  triggerTime: string; // HH:mm
  repeatRule: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  status: 'Active' | 'Snoozed' | 'Completed' | 'Dismissed';
  snoozeUntil?: string;
  smartSuggestionReason?: string;
  linkedTaskId?: string;
  linkedContactId?: string;
  notificationType: 'Browser' | 'Email' | 'Both';
  createdAt: string;
}

export interface ContactInteraction {
  id: string;
  date: string;
  type: 'Call' | 'Meeting' | 'Email' | 'Note';
  summary: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  phones: string[];
  emails: string[];
  website?: string;
  address?: string;
  birthday?: string;
  relationship: 'Work' | 'Client' | 'Family' | 'Friend' | 'Medical' | 'Service' | 'Other';
  preferredMethod: 'Phone' | 'Email' | 'Text';
  notes: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived?: boolean;
  deletedAt?: string | null;
  interactions: ContactInteraction[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedLink {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  category: 'Article' | 'Video' | 'Code' | 'Recipe' | 'Shopping' | 'Research' | 'Reference' | 'Other';
  tags: string[];
  readingMinutes?: number;
  notes?: string;
  projectId?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface WorkspaceFile {
  id: string;
  filename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  category: 'Document' | 'Receipt' | 'Business Card' | 'Whiteboard' | 'Handwritten Note' | 'Image' | 'Spreadsheet' | 'Other';
  folderId?: string;
  tags: string[];
  notes: string;
  dataUrl?: string;
  ocrStatus: 'None' | 'Processing' | 'Completed';
  ocrText?: string;
  extractedSummary?: string;
  projectId?: string;
  contactId?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  deletedAt?: string | null;
  version: number;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: 'Produce' | 'Dairy' | 'Pantry' | 'Household' | 'Pharmacy' | 'Hardware' | 'Other';
  checked: boolean;
  priority: 'Essential' | 'Normal' | 'Optional';
  estimatedPrice?: number;
  store?: string;
  isRecurring?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  store: string;
  items: ShoppingItem[];
  updatedAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  schedule: 'Daily' | 'Weekdays' | 'Weekly';
  streak: number;
  completedToday: boolean;
  historyDates: string[]; // YYYY-MM-DD
  targetPerWeek: number;
  reminderTime?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  category: 'Career' | 'Health' | 'Finance' | 'Education' | 'Personal';
  status: 'On Track' | 'At Risk' | 'Completed';
  linkedProjectIds: string[];
  linkedHabitIds: string[];
}

export interface InboxItem {
  id: string;
  rawContent: string;
  sourceType: 'Quick Capture' | 'Voice Note' | 'Photo OCR' | 'Business Card' | 'Receipt' | 'Link' | 'Brain Dump';
  detectedCategory: EntityType;
  confidence: number; // 0 to 100
  aiSuggestedTitle: string;
  aiExplanation: string;
  extractedMetadata?: {
    dueDate?: string;
    dueTime?: string;
    priority?: PriorityLevel;
    phone?: string;
    email?: string;
    company?: string;
    url?: string;
    amount?: string;
    tags?: string[];
  };
  status: 'Pending Review' | 'Approved' | 'Archived';
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  sourceTitle: string;
  targetType: EntityType;
  targetId: string;
  targetTitle: string;
  relationshipType: string;
  confidenceScore: number;
  createdByAi: boolean;
  approvedByUser: boolean;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  runsCount: number;
  lastRunAt?: string;
}

export interface AIMessageSource {
  id: string;
  type: EntityType;
  title: string;
  snippet: string;
}

export interface SuggestedAction {
  id: string;
  label: string;
  actionType: 'create_task' | 'create_reminder' | 'create_note' | 'create_contact' | 'create_event' | 'save_link' | 'create_project';
  payload: Record<string, string>;
  executed?: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  agent: AIAgentType;
  content: string;
  timestamp: string;
  sources?: AIMessageSource[];
  suggestedActions?: SuggestedAction[];
  groundingLinks?: {
    title: string;
    uri: string;
    sourceType: 'web' | 'maps';
    reviewSnippet?: string;
  }[];
  modelUsed?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  agent: AIAgentType;
  messages: AIMessage[];
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  entityType: EntityType | 'system';
  entityTitle: string;
  timestamp: string;
}

export type PredictionLifecycleState =
  | 'OBSERVED'
  | 'CANDIDATE'
  | 'EVALUATING'
  | 'PREDICTED'
  | 'PRESENTED'
  | 'APPROVED'
  | 'DENIED'
  | 'SNOOZED'
  | 'SUPPRESSED'
  | 'ACTIVE'
  | 'STALE'
  | 'EXPIRED';

export type PredictionConfidenceTier = 'Low' | 'Medium' | 'High' | 'Very High';

export type PredictionRiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';

export type PredictionCategory =
  | 'Shopping'
  | 'Tasks'
  | 'Reminders'
  | 'Calendar'
  | 'Household'
  | 'Projects'
  | 'Cross-System';

export interface PredictionAuditEntry {
  id: string;
  timestamp: string;
  stage: PredictionLifecycleState;
  action: string;
  historicalEvidence: string;
  typicalInterval: string;
  confidence: PredictionConfidenceTier;
  result: string;
}

export interface PersonalPattern {
  id: string;
  title: string;
  category: PredictionCategory;
  lifecycleState: PredictionLifecycleState;
  confidence: PredictionConfidenceTier;
  riskLevel: PredictionRiskLevel;
  occurrenceCount: number;
  typicalIntervalDays: number;
  observedRangeDays: [number, number];
  lastObservedAt: string;
  knownFactStatement: string;
  hypothesisStatement: string;
  explanation: string;
  recurringGroupName?: string;
  approvalCount: number;
  denialCount: number;
  editCount: number;
  cooldownDays: number;
  cooldownUntil?: string | null;
  snoozedUntil?: string | null;
  suppressed: boolean;
  suppressionReason?: string | null;
  selectedForBatch?: boolean;
  suggestedPayload: {
    actionType:
      | 'add_shopping_item'
      | 'create_recurring_task'
      | 'create_recurring_reminder'
      | 'create_calendar_prep'
      | 'create_cross_system_bundle';
    itemName?: string;
    quantity?: string;
    shoppingCategory?: ShoppingItem['category'];
    taskTitle?: string;
    taskSchedule?: string;
    taskPriority?: PriorityLevel;
    reminderTitle?: string;
    reminderRecurrence?: Reminder['recurrence'];
    bundleItems?: string[];
  };
  auditTrail: PredictionAuditEntry[];
}

export interface PatternObservationLog {
  id: string;
  sourceType: 'Shopping' | 'Task' | 'Reminder' | 'Calendar' | 'OCR' | 'Voice' | 'UserFeedback';
  itemTitle: string;
  observedAt: string;
  eventType: 'created' | 'completed' | 'approved' | 'denied' | 'edited' | 'suppressed';
  notes?: string;
}

export interface PredictionSafeguardSettings {
  enabled: boolean;
  currentStage: number; // Stage 0 to Stage 9
  suggestionBudgetMax: number; // Max surfaced predictions at once
  cooldownBaseDays: number; // Base cooldown after denial
  decayDaysThreshold: number; // Days of inactivity before pattern becomes STALE
  quietDashboardSummary: boolean;
  explicitSuppressions: string[]; // Explicit user instructions e.g. "coffee"
}

export interface UserSettings {
  name: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  language: string;
  timeFormat: '12h' | '24h';
  weekStart: 'Monday' | 'Sunday';
  theme: ThemeMode;
  accentColor: string;
  energyMode: EnergyMode;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  aiPersonality: AIPersonality;
  aiConfirmationMode: AIConfirmationMode;
  aiMemoryEnabled: boolean;
  knowledgeGraphEnabled: boolean;
  autoCategorize: boolean;
  autoPrioritize: boolean;
  autoSchedule: boolean;
  browserNotifications: boolean;
  dailyEmailEnabled: boolean;
  dailyEmailTime: string;
  weeklyEmailEnabled: boolean;
  monthlyEmailEnabled: boolean;
  workHoursStart: string;
  workHoursEnd: string;
  adaptiveDashboard: boolean;
  showProductivityScore: boolean;
  showAchievements: boolean;
  onboardingCompleted: boolean;
  learnedMemoryFacts: string[];
}

export interface WorkspaceState {
  settings: UserSettings;
  tasks: Task[];
  notes: Note[];
  folders: NoteFolder[];
  projects: Project[];
  events: CalendarEvent[];
  reminders: Reminder[];
  contacts: Contact[];
  links: SavedLink[];
  files: WorkspaceFile[];
  shoppingLists: ShoppingList[];
  habits: Habit[];
  goals: Goal[];
  inbox: InboxItem[];
  knowledgeGraph: KnowledgeEdge[];
  automations: AutomationRule[];
  conversations: AIConversation[];
  activityLog: ActivityLogItem[];
  savedSearches: { id: string; name: string; query: string; filterType: string }[];
  personalPatterns?: PersonalPattern[];
  patternObservations?: PatternObservationLog[];
  predictionSafeguards?: PredictionSafeguardSettings;
}

export type ActiveSection =
  | 'dashboard'
  | 'inbox'
  | 'predictive'
  | 'tasks'
  | 'calendar'
  | 'notes'
  | 'projects'
  | 'contacts'
  | 'links'
  | 'files'
  | 'second-brain'
  | 'search'
  | 'ai-chat'
  | 'ai-studio'
  | 'settings'
  | 'help';
