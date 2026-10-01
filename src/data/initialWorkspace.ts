import { WorkspaceState } from '../types/bluenote';
import {
  DEFAULT_PERSONAL_PATTERNS,
  DEFAULT_PATTERN_OBSERVATIONS,
  DEFAULT_PREDICTION_SAFEGUARDS,
} from '../services/patternEngine';

export const initialWorkspace: WorkspaceState = {
  settings: {
    name: '',
    email: '',
    avatarUrl: '',
    bio: '',
    roleTitle: '',
    authDomainAlias: 'BLUENOTE-AI-APP.firebase.com',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    language: 'English (US)',
    timeFormat: '12h',
    weekStart: 'Monday',
    theme: 'light',
    accentColor: '#2563eb',
    energyMode: 'Normal',
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    aiPersonality: 'Professional',
    aiConfirmationMode: 'Smart Mode',
    aiMemoryEnabled: true,
    knowledgeGraphEnabled: true,
    autoCategorize: true,
    autoPrioritize: true,
    autoSchedule: true,
    browserNotifications: true,
    dailyEmailEnabled: true,
    dailyEmailTime: '07:30',
    weeklyEmailEnabled: true,
    monthlyEmailEnabled: false,
    workHoursStart: '09:00',
    workHoursEnd: '17:30',
    adaptiveDashboard: true,
    showProductivityScore: true,
    showAchievements: true,
    onboardingCompleted: false,
    learnedMemoryFacts: [],
  },

  // Clean, zero-demo state — ready for real user tasks, notes, projects, and captures
  tasks: [],
  notes: [],
  projects: [],
  events: [],
  reminders: [],
  contacts: [],
  links: [],
  files: [],
  habits: [],
  goals: [],
  inbox: [],
  knowledgeGraph: [],
  conversations: [],
  activityLog: [],
  savedSearches: [],
  personalPatterns: DEFAULT_PERSONAL_PATTERNS,
  patternObservations: DEFAULT_PATTERN_OBSERVATIONS,
  predictionSafeguards: DEFAULT_PREDICTION_SAFEGUARDS,

  folders: [
    { id: 'fld-work', name: 'Work & Strategy', icon: 'Briefcase', color: '#2563eb' },
    { id: 'fld-home', name: 'Home & Life', icon: 'Home', color: '#0d9488' },
    { id: 'fld-finance', name: 'Finance & Tax', icon: 'DollarSign', color: '#d97706' },
    { id: 'fld-ideas', name: 'Ideas & Brainstorms', icon: 'Sparkles', color: '#7c3aed' },
  ],

  shoppingLists: [
    {
      id: 'shop-1',
      name: 'Shopping & Errands',
      store: 'General',
      items: [],
    },
  ],

  automations: [],
};

export const AUTOMATION_TEMPLATES = [
  {
    id: 'tpl-auto-receipts',
    name: 'Auto-Tag Uploaded Receipts for Tax Time',
    trigger: 'When a receipt image or PDF is uploaded',
    action: 'Run OCR, tag #Tax-Deductible, and link to Finance folder',
  },
  {
    id: 'tpl-auto-cards',
    name: 'Business Card → Contact CRM Auto-Builder',
    trigger: 'When a business card photo is scanned',
    action: 'Extract Name, Phone, Email & Company and create Contact Card',
  },
  {
    id: 'tpl-auto-morning',
    name: 'Morning Briefing & Overdue Rollover',
    trigger: 'Every morning at 7:30 AM',
    action: 'Roll over unfinished tasks and generate Today Priority Brief',
  },
  {
    id: 'tpl-auto-meetings',
    name: 'Meeting Note → Action Item Extractor',
    trigger: 'When a note is saved in Meeting Notes category',
    action: 'Identify action verbs and propose Tasks with deadlines',
  },
];

export const NOTE_TEMPLATES = [
  {
    id: 'tpl-meeting',
    name: 'Meeting Notes',
    category: 'Meeting',
    content: `# Meeting Title\n**Date:** ${new Date().toISOString().split('T')[0]}\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Key Decisions\n- \n\n## Action Items\n- [ ] `,
  },
  {
    id: 'tpl-daily',
    name: 'Daily Journal & Reflection',
    category: 'Journal',
    content: `# Daily Reflection — ${new Date().toISOString().split('T')[0]}\n\n## Top 3 Wins Today\n1. \n2. \n3. \n\n## What’s On My Mind\n- \n\n## Tomorrow’s #1 Focus\n- [ ] `,
  },
  {
    id: 'tpl-project',
    name: 'Project Plan',
    category: 'Project',
    content: `# Project Name\n\n## Objective\nDescribe the core outcome and success criteria.\n\n## Milestones\n- [ ] Phase 1: Research & Architecture\n- [ ] Phase 2: Execution\n- [ ] Phase 3: Launch & Review\n\n## Risks & Dependencies\n- `,
  },
  {
    id: 'tpl-decision',
    name: 'Decision Log',
    category: 'Strategy',
    content: `# Decision Log\n**Status:** Proposed\n\n## Context & Problem\nWhat decision needs to be made?\n\n## Options Considered\n1. **Option A:** Pros / Cons\n2. **Option B:** Pros / Cons\n\n## Final Decision & Rationale\n`,
  },
  {
    id: 'tpl-proscons',
    name: 'Pros & Cons Matrix',
    category: 'Decision',
    content: `# Pros & Cons Evaluation\n\n## Pros (+)\n- \n- \n\n## Cons (-)\n- \n- \n\n## Verdict\n`,
  },
];

export const PROJECT_TEMPLATES = [
  {
    id: 'pt-home',
    name: 'Home Renovation',
    category: 'Home',
    color: '#0d9488',
    icon: 'Home',
    description: 'Contractor quotes, permits, material receipts, and inspection milestones.',
    defaultTasks: [
      { title: 'Collect 3 licensed contractor quotes', priority: 'High' as const, est: 45 },
      { title: 'Verify insurance & building permits', priority: 'Critical' as const, est: 30 },
      { title: 'Create materials & hardware shopping list', priority: 'Medium' as const, est: 25 },
    ],
  },
  {
    id: 'pt-trip',
    name: 'Trip Planning',
    category: 'Travel',
    color: '#0284c7',
    icon: 'Plane',
    description: 'Flights, hotel bookings, packing checklist, and itinerary schedule.',
    defaultTasks: [
      { title: 'Book flights and save confirmation PDFs', priority: 'Critical' as const, est: 30 },
      { title: 'Reserve hotel / lodging & add to Calendar', priority: 'High' as const, est: 25 },
      { title: 'Complete travel packing checklist', priority: 'Medium' as const, est: 20 },
    ],
  },
  {
    id: 'pt-launch',
    name: 'Business Launch',
    category: 'Work',
    color: '#2563eb',
    icon: 'Rocket',
    description: 'Product architecture, go-to-market checklist, legal setup, and launch timeline.',
    defaultTasks: [
      { title: 'Finalize MVP feature specification', priority: 'Critical' as const, est: 60 },
      { title: 'Set up domain, analytics, and landing page', priority: 'High' as const, est: 45 },
      { title: 'Prepare launch announcement & customer list', priority: 'Medium' as const, est: 30 },
    ],
  },
  {
    id: 'pt-move',
    name: 'Moving Checklist',
    category: 'Personal',
    color: '#7c3aed',
    icon: 'Truck',
    description: 'Address changes, utility transfers, packing room-by-room, and movers.',
    defaultTasks: [
      { title: 'Book moving company & confirm insurance', priority: 'Critical' as const, est: 40 },
      { title: 'Transfer electricity, internet, and water utilities', priority: 'High' as const, est: 30 },
      { title: 'Label boxes by room and essentials first', priority: 'Medium' as const, est: 60 },
    ],
  },
  {
    id: 'pt-semester',
    name: 'School Semester',
    category: 'Education',
    color: '#d97706',
    icon: 'GraduationCap',
    description: 'Course syllabi, exam dates, reading schedule, and research papers.',
    defaultTasks: [
      { title: 'Import all exam & assignment deadlines to Calendar', priority: 'Critical' as const, est: 35 },
      { title: 'Organize digital folders for each course', priority: 'High' as const, est: 20 },
      { title: 'Schedule weekly 2-hour review blocks', priority: 'Medium' as const, est: 15 },
    ],
  },
];
