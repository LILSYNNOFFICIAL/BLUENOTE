export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Someday';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Waiting' | 'Scheduled' | 'Completed' | 'Archived';
export type EnergyMode = 'Focused' | 'Normal' | 'Busy' | 'Tired' | 'Sick' | 'Vacation' | 'High Energy' | 'Low Energy';
export type ThemeMode =
  | 'light'
  | 'dark'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyber'
  | 'ocean'
  | 'sunset'
  | 'sepia'
  | 'nord'
  | 'system';
export type AIPersonality = 'Personal Assistant' | 'Professional' | 'Friendly' | 'Minimal' | 'Motivational' | 'Executive Assistant' | 'Calm & Quiet';
export type AIConfirmationMode = 'Always Ask' | 'Usually Ask' | 'Auto Save' | 'Never Ask' | 'Smart Mode';

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

export type TaskEnergyLevel = 'High' | 'Medium' | 'Low';

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
  energyLevel?: TaskEnergyLevel;
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
  recurrence?: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  priority?: PriorityLevel;
  category?: string;
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
  category: 'Produce' | 'Dairy' | 'Pantry' | 'Household' | 'Pharmacy' | 'Hardware' | 'Groceries' | 'Other';
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
  updatedAt?: string;
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
  condition?: string;
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
  bio?: string;
  roleTitle?: string;
  location?: string;
  authDomainAlias?: string;
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
  osProjects?: import('./projectsOS').OSProject[];
}

export type ActiveSection =
  | 'dashboard'
  | 'inbox'
  | 'predictive'
  | 'tasks'
  | 'projects-os'
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

export interface ThemeOptionMeta {
  id: Exclude<ThemeMode, 'system'>;
  label: string;
  shortLabel: string;
  title: string;
  desc: string;
  isDark: boolean;
  dot: string;
  swatch: string;
  bgPreview: string;
  cardPreview: string;
  accentDot: string;
  textPreview: string;
  badge: string;
  themeColorHex: string;
}

export const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: 'light',
    label: 'Architectural White',
    shortLabel: 'White',
    title: 'Architectural White (Default)',
    desc: 'Pure #FFFFFF elevated studio cards with subtle slate hairlines & cobalt highlights',
    isDark: false,
    dot: 'bg-white border border-slate-400',
    swatch: 'bg-white border border-slate-300 shadow-2xs',
    bgPreview: 'bg-slate-100',
    cardPreview: 'bg-white border-slate-200',
    accentDot: 'bg-blue-600',
    textPreview: 'text-slate-900',
    badge: 'Default Light',
    themeColorHex: '#ffffff',
  },
  {
    id: 'dark',
    label: 'Obsidian Carbon',
    shortLabel: 'Dark',
    title: 'Obsidian Carbon (OLED Dark)',
    desc: 'Precision #050507 carbon surfaces with high-contrast #FAFAFA typography',
    isDark: true,
    dot: 'bg-black border border-white/60',
    swatch: 'bg-black border border-neutral-700',
    bgPreview: 'bg-black',
    cardPreview: 'bg-[#09090b] border-zinc-700',
    accentDot: 'bg-white',
    textPreview: 'text-white',
    badge: 'Pure OLED',
    themeColorHex: '#050507',
  },
  {
    id: 'blue',
    label: 'Sapphire Executive',
    shortLabel: 'Blue',
    title: 'Sapphire Executive (Navy)',
    desc: 'Deep architectural navy & sapphire slate surfaces with electric blue highlights',
    isDark: true,
    dot: 'bg-blue-500',
    swatch: 'bg-[#0d1b36] border border-blue-500/50',
    bgPreview: 'bg-[#091326]',
    cardPreview: 'bg-[#0f1b33] border-[#1e3a8a]',
    accentDot: 'bg-blue-500',
    textPreview: 'text-blue-100',
    badge: 'Executive Navy',
    themeColorHex: '#071226',
  },
  {
    id: 'emerald',
    label: 'Nordic Botanical',
    shortLabel: 'Pine',
    title: 'Nordic Botanical (Emerald)',
    desc: 'Deep pine studio canvas with luminous sage & emerald accents',
    isDark: true,
    dot: 'bg-emerald-500',
    swatch: 'bg-emerald-950 border border-emerald-500/50',
    bgPreview: 'bg-[#022c22]',
    cardPreview: 'bg-[#042f24] border-emerald-700',
    accentDot: 'bg-emerald-400',
    textPreview: 'text-emerald-100',
    badge: 'Botanical',
    themeColorHex: '#03221a',
  },
  {
    id: 'violet',
    label: 'Atelier Amethyst',
    shortLabel: 'Plum',
    title: 'Atelier Amethyst (Violet)',
    desc: 'Deep obsidian plum canvas with refined ultraviolet specular accents',
    isDark: true,
    dot: 'bg-violet-500',
    swatch: 'bg-violet-950 border border-violet-500/50',
    bgPreview: 'bg-[#170736]',
    cardPreview: 'bg-[#1b093b] border-purple-700',
    accentDot: 'bg-purple-400',
    textPreview: 'text-purple-100',
    badge: 'Atelier',
    themeColorHex: '#13072b',
  },
  {
    id: 'rose',
    label: 'Crimson Velvet',
    shortLabel: 'Rose',
    title: 'Crimson Velvet (Burgundy Rose)',
    desc: 'Rich Bordeaux & ruby nightfall surfaces with warm rose-gold highlights',
    isDark: true,
    dot: 'bg-rose-500',
    swatch: 'bg-rose-950 border border-rose-500/50',
    bgPreview: 'bg-[#2a0815]',
    cardPreview: 'bg-[#3b0a1e] border-rose-700',
    accentDot: 'bg-rose-400',
    textPreview: 'text-rose-100',
    badge: 'New • Velvet',
    themeColorHex: '#230612',
  },
  {
    id: 'amber',
    label: 'Solaris Gold',
    shortLabel: 'Gold',
    title: 'Solaris Gold (Espresso & Amber)',
    desc: 'Warm roasted espresso & bronze slate infused with sunlit amber gold',
    isDark: true,
    dot: 'bg-amber-500',
    swatch: 'bg-amber-950 border border-amber-500/50',
    bgPreview: 'bg-[#241404]',
    cardPreview: 'bg-[#331c06] border-amber-700',
    accentDot: 'bg-amber-400',
    textPreview: 'text-amber-100',
    badge: 'New • Luxury Gold',
    themeColorHex: '#1e1003',
  },
  {
    id: 'cyber',
    label: 'Cyberpunk Neon',
    shortLabel: 'Cyber',
    title: 'Cyberpunk Neon (Synthwave)',
    desc: 'High-voltage synthwave indigo with electric cyan & neon magenta edge glow',
    isDark: true,
    dot: 'bg-cyan-400',
    swatch: 'bg-[#0b0426] border border-cyan-400/60',
    bgPreview: 'bg-[#090320]',
    cardPreview: 'bg-[#120738] border-cyan-500',
    accentDot: 'bg-cyan-400',
    textPreview: 'text-cyan-100',
    badge: 'New • Neon',
    themeColorHex: '#090320',
  },
  {
    id: 'ocean',
    label: 'Abyssal Teal',
    shortLabel: 'Ocean',
    title: 'Abyssal Teal (Deep Ocean)',
    desc: 'Tranquil deep-sea teal & marine slate with bioluminescent aqua clarity',
    isDark: true,
    dot: 'bg-teal-400',
    swatch: 'bg-teal-950 border border-teal-400/50',
    bgPreview: 'bg-[#04242c]',
    cardPreview: 'bg-[#07323d] border-teal-600',
    accentDot: 'bg-teal-300',
    textPreview: 'text-teal-100',
    badge: 'New • Deep Sea',
    themeColorHex: '#04242c',
  },
  {
    id: 'sunset',
    label: 'Dusk Horizon',
    shortLabel: 'Sunset',
    title: 'Dusk Horizon (Twilight Coral)',
    desc: 'Atmospheric twilightplum & warm dusk coral gradients for evening flow',
    isDark: true,
    dot: 'bg-orange-500',
    swatch: 'bg-[#2b0f28] border border-orange-400/50',
    bgPreview: 'bg-[#240b24]',
    cardPreview: 'bg-[#361130] border-orange-500/60',
    accentDot: 'bg-orange-400',
    textPreview: 'text-orange-100',
    badge: 'New • Twilight',
    themeColorHex: '#240b24',
  },
  {
    id: 'sepia',
    label: 'Warm Parchment',
    shortLabel: 'Sepia',
    title: 'Warm Parchment (Editorial Cream)',
    desc: 'Eye-soothing archival cream paper with warm espresso ink & terracotta accents',
    isDark: false,
    dot: 'bg-[#e6d5b8] border border-amber-700',
    swatch: 'bg-[#f7f1e3] border border-amber-300',
    bgPreview: 'bg-[#efe6d5]',
    cardPreview: 'bg-[#fbf7ee] border-[#dccbb1]',
    accentDot: 'bg-amber-700',
    textPreview: 'text-[#3d2e1e]',
    badge: 'New • Light Paper',
    themeColorHex: '#f7f1e3',
  },
  {
    id: 'nord',
    label: 'Arctic Frost',
    shortLabel: 'Frost',
    title: 'Arctic Frost (Nordic Ice)',
    desc: 'Crisp Scandinavian glacier blue-white surfaces with cool polar steel borders',
    isDark: false,
    dot: 'bg-sky-200 border border-sky-600',
    swatch: 'bg-[#ecf3f9] border border-sky-300',
    bgPreview: 'bg-[#e3edf7]',
    cardPreview: 'bg-[#f5f9fd] border-sky-200',
    accentDot: 'bg-sky-600',
    textPreview: 'text-slate-800',
    badge: 'New • Light Frost',
    themeColorHex: '#ecf3f9',
  },
];

export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 256,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const targetSize = Math.min(maxDimension, Math.max(128, size));
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  });
}
