import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Calendar,
  FileText,
  FolderKanban,
  Users,
  Link2,
  FolderOpen,
  Network,
  Search,
  Bot,
  Settings,
  HelpCircle,
  Mic,
  Camera,
  Plus,
  Command,
  Sun,
  Moon,
  Cloud,
  CloudOff,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Bell,
  User as UserIcon,
  CheckCircle2,
  ArrowRight,
  X,
  Wand2,
  Smartphone,
  Download,
  Menu,
  Key,
} from 'lucide-react';
import {
  ActiveSection,
  AIMessage,
  CalendarEvent,
  Contact,
  EnergyMode,
  EntityType,
  Goal,
  InboxItem,
  KnowledgeEdge,
  Note,
  Project,
  Reminder,
  SavedLink,
  SuggestedAction,
  THEME_OPTIONS,
  Task,
  UserSettings,
  WorkspaceFile,
  WorkspaceState,
} from './types/bluenote';
import { initialWorkspace, PROJECT_TEMPLATES } from './data/initialWorkspace';
import {
  auth,
  db,
  doc,
  setDoc,
  onSnapshot,
  onAuthStateChanged,
  getRedirectResult,
  handleFirestoreError,
  OperationType,
  User,
} from './firebase';
import {
  BrainDumpExtractedItem,
  getActiveAIProviderBadge,
  parseQuickCaptureLocally,
} from './services/aiService';
import { AIKeysAndFreeAIModal } from './components/AIKeysAndFreeAIModal';
import { DashboardView } from './components/DashboardView';
import { UniversalInboxView } from './components/UniversalInboxView';
import { TasksAndChecklistsView } from './components/TasksAndChecklistsView';
import { NotesEditorView } from './components/NotesEditorView';
import { ProjectsAndGoalsView } from './components/ProjectsAndGoalsView';
import { ProjectsOSView } from './components/ProjectsOSView';
import {
  autoTagAndClassifyDocument,
  computeDocumentMetrics,
  createProjectFromTemplate,
  stripLegacyDemoOSProjects,
} from './services/projectsOSService';
import { CalendarAndPlannerView } from './components/CalendarAndPlannerView';
import { ContactsLinksFilesView } from './components/ContactsLinksFilesView';
import { SecondBrainGraphView } from './components/SecondBrainGraphView';
import { SettingsAndSystemView } from './components/SettingsAndSystemView';
import { AIChatDrawer } from './components/AIChatDrawer';
import { BrainDumpModal } from './components/BrainDumpModal';
import { FocusAndPomodoroModal } from './components/FocusAndPomodoroModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { AuthModal } from './components/AuthModal';
import { AIStudioHubView } from './components/AIStudioHubView';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { BlueNoteLogo } from './components/BlueNoteLogo';
import { BlueNotePageTemplate } from './components/BlueNotePageTemplate';
import { PredictiveListsView } from './components/PredictiveListsView';
import {
  DEFAULT_PERSONAL_PATTERNS,
  DEFAULT_PREDICTION_SAFEGUARDS,
  adjustConfidenceTier,
  getSurfacedPredictions,
  recordUserObservation,
} from './services/patternEngine';
import { usePWAInstall } from './hooks/usePWAInstall';

const STORAGE_KEY = 'bluenote_workspace_clean_v4';

const LEGACY_DEMO_IDS = new Set([
  'pat-toilet-paper',
  'pat-paper-towels',
  'pat-trash-bags',
  'pat-laundry-detergent',
  'pat-coffee-beans',
  'pat-dish-soap',
  'pat-sunday-trash-routine',
  'pat-monthly-rent-reminder',
  'pat-trip-preparation',
  'pat-observed-batteries',
  'pat-candidate-oat-milk',
  'pat-stale-summer-sunscreen',
  'obs-1',
  'obs-2',
  'obs-3',
  'task-1',
  'task-2',
  'task-3',
  'task-4',
  'task-5',
  'task-6',
  'note-1',
  'note-2',
  'note-3',
  'note-4',
  'proj-1',
  'proj-2',
  'evt-1',
  'evt-2',
  'evt-3',
  'rem-1',
  'rem-2',
  'rem-3',
  'con-1',
  'con-2',
  'con-3',
  'lnk-1',
  'lnk-2',
  'lnk-3',
  'file-1',
  'file-2',
  'file-3',
  'inb-1',
  'inb-2',
  'inb-3',
  'hab-1',
  'hab-2',
  'hab-3',
  'hab-4',
  'auto-1',
  'auto-2',
  'auto-3',
  'auto-4',
  'goal-1',
  'goal-2',
  'kg-1',
  'kg-2',
  'kg-3',
  'kg-4',
  'act-1',
  'act-2',
  'act-3',
  'act-4',
  'ss-1',
  'ss-2',
  'cnt-1',
  'cnt-2',
  'cnt-3',
  'cnt-4',
]);

function stripLegacyDemoData(ws: WorkspaceState): WorkspaceState {
  const filterById = <T extends { id: string }>(arr?: T[]): T[] =>
    Array.isArray(arr) ? arr.filter((item) => !LEGACY_DEMO_IDS.has(item.id)) : [];

  return {
    ...ws,
    settings: {
      ...ws.settings,
      name: ws.settings?.name === 'Alex Rivera' ? '' : ws.settings?.name || '',
      email: ws.settings?.email === 'alex@bluenote.ai' ? '' : ws.settings?.email || '',
    },
    tasks: filterById(ws.tasks),
    notes: filterById(ws.notes),
    projects: filterById(ws.projects),
    events: filterById(ws.events),
    reminders: filterById(ws.reminders),
    contacts: filterById(ws.contacts),
    links: filterById(ws.links),
    files: filterById(ws.files),
    habits: filterById(ws.habits),
    goals: filterById(ws.goals),
    inbox: filterById(ws.inbox),
    knowledgeGraph: filterById(ws.knowledgeGraph),
    activityLog: filterById(ws.activityLog),
    savedSearches: filterById(ws.savedSearches),
    automations: filterById(ws.automations),
    personalPatterns: filterById(ws.personalPatterns),
    patternObservations: filterById(ws.patternObservations),
    osProjects: stripLegacyDemoOSProjects(ws.osProjects),
    shoppingLists: Array.isArray(ws.shoppingLists)
      ? ws.shoppingLists.map((list) => ({
          ...list,
          items: Array.isArray(list.items)
            ? list.items.filter(
                (i) => !['si-1', 'si-2', 'si-3', 'si-4', 'shop-1', 'shop-2'].includes(i.id)
              )
            : [],
        }))
      : initialWorkspace.shoppingLists,
  };
}

// Recursively remove undefined fields so Firestore native maps never fail validation
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return obj;
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    try {
      localStorage.removeItem('bluenote_workspace_v2');
      localStorage.removeItem('bluenote_workspace_clean_v3');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return stripLegacyDemoData({ ...initialWorkspace, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load workspace from localStorage:', e);
    }
    return initialWorkspace;
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(
    initialWorkspace.notes[0]?.id
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [brainDumpModal, setBrainDumpModal] = useState<{
    open: boolean;
    tab: 'brain-dump' | 'ocr-scanner';
  }>({ open: false, tab: 'brain-dump' });
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [aiKeysModalOpen, setAiKeysModalOpen] = useState(false);
  const [aiProviderLabel, setAiProviderLabel] = useState(() => getActiveAIProviderBadge());
  const [showSplash, setShowSplash] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(
    () => !workspace.settings.onboardingCompleted
  );
  const { isInstallable, isInstalled, isOnline, install } = usePWAInstall();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'offline'>('local');
  const [headerQuickInput, setHeaderQuickInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isApplyingRemoteUpdate = useRef(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSection]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Save to localStorage on every workspace update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch (e) {
      console.warn('LocalStorage quota warning:', e);
    }
  }, [workspace]);

  // Handle Android Launcher App Shortcuts (?action=brain-dump, ?action=ocr-scanner, ?section=...) & Hardware Back Button
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const sec = params.get('section') as ActiveSection | null;
    if (action === 'brain-dump') {
      setShowSplash(false);
      setBrainDumpModal({ open: true, tab: 'brain-dump' });
    } else if (action === 'ocr-scanner') {
      setShowSplash(false);
      setBrainDumpModal({ open: true, tab: 'ocr-scanner' });
    } else if (sec) {
      setActiveSection(sec);
    }

    const handlePopState = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      } else if (brainDumpModal.open) {
        setBrainDumpModal((prev) => ({ ...prev, open: false }));
      } else if (focusModalOpen) {
        setFocusModalOpen(false);
      } else if (commandPaletteOpen) {
        setCommandPaletteOpen(false);
      } else if (androidModalOpen) {
        setAndroidModalOpen(false);
      } else if (activeSection !== 'dashboard') {
        setActiveSection('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileMenuOpen, brainDumpModal.open, focusModalOpen, commandPaletteOpen, androidModalOpen, activeSection]);

  // Listen to Firebase Auth state (including mobile OAuth redirect result)
  useEffect(() => {
    getRedirectResult(auth).catch(() => {
      // Redirect errors are handled by AuthModal when initiated
    });
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setSyncStatus('local');
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener when user is authenticated with Firebase Auth
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const path = `workspaces/${currentUser.uid}`;
    const docRef = doc(db, 'workspaces', currentUser.uid);
    setSyncStatus('syncing');

    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.workspace && typeof data.workspace === 'object') {
            isApplyingRemoteUpdate.current = true;
            setWorkspace((prev) =>
              stripLegacyDemoData({
                ...prev,
                ...(data.workspace as WorkspaceState),
              })
            );
            setTimeout(() => {
              isApplyingRemoteUpdate.current = false;
            }, 100);
          }
          setSyncStatus('synced');
        } else {
          // Initialize cloud workspace with current local workspace
          const initialPayload = {
            uid: currentUser.uid,
            email: (currentUser.email || workspace.settings.email || '').slice(0, 250),
            name: (currentUser.displayName || workspace.settings.name || 'BlueNote User').slice(0, 120),
            updatedAt: new Date().toISOString(),
            workspace: sanitizeForFirestore(workspace),
          };
          setDoc(docRef, initialPayload)
            .then(() => setSyncStatus('synced'))
            .catch((err) => {
              setSyncStatus('offline');
              handleFirestoreError(err, OperationType.CREATE, path);
            });
        }
      },
      (err) => {
        setSyncStatus('offline');
        handleFirestoreError(err, OperationType.GET, path);
      }
    );

    return () => unsub();
  }, [authReady, currentUser]);

  // Sync local changes to Firestore debounced
  useEffect(() => {
    if (!authReady || !currentUser || isApplyingRemoteUpdate.current) return;
    const timer = setTimeout(async () => {
      const path = `workspaces/${currentUser.uid}`;
      const docRef = doc(db, 'workspaces', currentUser.uid);
      try {
        setSyncStatus('syncing');
        await setDoc(docRef, {
          uid: currentUser.uid,
          email: (currentUser.email || workspace.settings.email || '').slice(0, 250),
          name: (currentUser.displayName || workspace.settings.name || 'BlueNote User').slice(0, 120),
          updatedAt: new Date().toISOString(),
          workspace: sanitizeForFirestore(workspace),
        });
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [workspace, authReady, currentUser]);

  // Global keyboard shortcuts (Cmd/Ctrl+K, /, Cmd/Ctrl+B, Cmd/Ctrl+U, Cmd/Ctrl+F, Cmd/Ctrl+G, Cmd/Ctrl+J, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setBrainDumpModal((prev) => ({ ...prev, open: false }));
        setFocusModalOpen(false);
        setAuthModalOpen(false);
        setAndroidModalOpen(false);
        setAiKeysModalOpen(false);
        setAiDrawerOpen(false);
        return;
      }

      if (!isTyping && e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAiDrawerOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setBrainDumpModal({ open: true, tab: 'brain-dump' });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setBrainDumpModal({ open: true, tab: 'ocr-scanner' });
      } else if (!isTyping && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setActiveSection('second-brain');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply Theme & Accessibility classes to root container and <html> element (Default: Architectural White 'light')
  const activeTheme = workspace.settings.theme || 'light';
  const activeThemeMeta =
    THEME_OPTIONS.find((t) => t.id === activeTheme) || THEME_OPTIONS[0];
  const isDark = activeThemeMeta.isDark;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      ...THEME_OPTIONS.map((t) => `theme-${t.id}`),
      'theme-system',
      'dark'
    );
    root.classList.add(`theme-${activeTheme}`);
    if (isDark) {
      root.classList.add('dark');
    }
    root.classList.toggle('bn-large-text', Boolean(workspace.settings.largeText));
    root.classList.toggle('bn-high-contrast', Boolean(workspace.settings.highContrast));
    root.classList.toggle('bn-reduced-motion', Boolean(workspace.settings.reducedMotion));

    // Sync Android status bar theme-color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', activeThemeMeta.themeColorHex);
    }
  }, [
    activeTheme,
    activeThemeMeta.themeColorHex,
    isDark,
    workspace.settings.largeText,
    workspace.settings.highContrast,
    workspace.settings.reducedMotion,
  ]);

  const logActivity = useCallback(
    (action: string, entityType: EntityType | 'system', entityTitle: string) => {
      return {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action,
        entityType,
        entityTitle,
        timestamp: new Date().toISOString(),
      };
    },
    []
  );

  // Navigation handler
  const handleNavigate = useCallback((section: ActiveSection, itemId?: string) => {
    setActiveSection(section);
    if (section === 'notes' && itemId) {
      setSelectedNoteId(itemId);
    }
  }, []);

  // Quick Capture handler (parses natural language and either adds to Inbox or directly creates item based on confirmation mode)
  const handleQuickCapture = useCallback(
    (rawText: string) => {
      const extracted = parseQuickCaptureLocally(rawText);
      const first = extracted[0];
      if (!first) return;

      const newInboxItem: InboxItem = {
        id: `inb-${Date.now()}`,
        rawContent: rawText,
        sourceType: 'Quick Capture',
        detectedCategory: first.category,
        confidence: first.confidence ?? first.confidenceScore ?? 92,
        aiSuggestedTitle: first.title,
        aiExplanation: first.aiReasoning,
        extractedMetadata: {
          dueDate: first.dueDate,
          dueTime: first.dueTime,
          priority: first.priority,
          phone: first.phone,
          email: first.email,
          company: first.company,
          url: first.url,
          tags: first.tags,
        },
        status: 'Pending Review',
        createdAt: new Date().toISOString(),
      };

      setWorkspace((prev) => ({
        ...prev,
        inbox: [newInboxItem, ...prev.inbox],
        activityLog: [
          logActivity(`Captured to Universal Inbox (${first.category})`, first.category, first.title),
          ...prev.activityLog,
        ],
      }));
      showToast(`AI classified "${first.title}" as ${first.category.toUpperCase()} (${first.confidence}% confidence)`);
    },
    [logActivity, showToast]
  );

  // Commit items from Brain Dump or OCR Scanner directly into organized workspace collections
  const handleCommitBrainDumpItems = useCallback(
    (
      items: BrainDumpExtractedItem[],
      ocrFileRecord?: {
        filename: string;
        category: 'Receipt' | 'Business Card' | 'Handwritten Note' | 'Whiteboard' | 'Document';
        ocrText: string;
        summary: string;
        dataUrl?: string;
      }
    ) => {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      setWorkspace((prev) => {
        const nextTasks = [...prev.tasks];
        const nextNotes = [...prev.notes];
        const nextEvents = [...prev.events];
        const nextReminders = [...prev.reminders];
        const nextContacts = [...prev.contacts];
        const nextLinks = [...prev.links];
        const nextFiles = [...prev.files];
        const nextShopping = prev.shoppingLists.map((list, idx) =>
          idx === 0 ? { ...list, items: [...list.items] } : list
        );
        const nextEdges = [...prev.knowledgeGraph];

        if (ocrFileRecord) {
          nextFiles.unshift({
            id: `file-${Date.now()}`,
            filename: ocrFileRecord.filename,
            displayName: ocrFileRecord.filename,
            mimeType: 'image/jpeg',
            sizeBytes: 245000,
            category: ocrFileRecord.category,
            tags: ['OCR', ocrFileRecord.category],
            notes: ocrFileRecord.summary,
            ocrStatus: 'Completed',
            ocrText: ocrFileRecord.ocrText,
            extractedSummary: ocrFileRecord.summary,
            isFavorite: false,
            version: 1,
            createdAt: now,
          });
        }

        items.forEach((item, idx) => {
          const itemId = `${item.category}-${Date.now()}-${idx}`;
          switch (item.category) {
            case 'task':
              nextTasks.unshift({
                id: itemId,
                title: item.title,
                description: item.description || '',
                priority: item.priority || 'Medium',
                status: 'Not Started',
                dueDate: item.dueDate || today,
                dueTime: item.dueTime,
                estimatedMinutes: 30,
                actualMinutes: 0,
                completionPercentage: 0,
                category: 'Personal',
                tags: item.tags?.length ? item.tags : ['AI-Captured'],
                subtasks: [],
                aiReasoning: item.aiReasoning,
                linkedItems: [],
                createdAt: now,
                updatedAt: now,
              });
              break;
            case 'note':
              nextNotes.unshift({
                id: itemId,
                title: item.title,
                content: item.description || item.title,
                summary: item.aiReasoning,
                folderId: prev.folders[0]?.id || 'fld-work',
                color: 'blue',
                category: 'Notes',
                tags: item.tags?.length ? item.tags : ['BrainDump'],
                isPinned: false,
                isFavorite: false,
                isArchived: false,
                wordCount: (item.description || item.title).split(/\s+/).length,
                version: 1,
                history: [],
                linkedItems: [],
                createdAt: now,
                updatedAt: now,
              });
              break;
            case 'event':
              nextEvents.unshift({
                id: itemId,
                title: item.title,
                description: item.description || '',
                date: item.dueDate || today,
                startTime: item.dueTime || '10:00',
                endTime: '11:00',
                allDay: false,
                color: '#2563eb',
                category: 'Meeting',
                tags: item.tags || [],
                linkedContactIds: [],
                createdAt: now,
              });
              break;
            case 'reminder':
              nextReminders.unshift({
                id: itemId,
                title: item.title,
                triggerDate: item.dueDate || today,
                triggerTime: item.dueTime || '09:00',
                repeatRule: 'Once',
                status: 'Active',
                smartSuggestionReason: item.aiReasoning,
                notificationType: 'Browser',
                createdAt: now,
              });
              break;
            case 'contact': {
              const parts = item.title.split(' ');
              const firstName = parts[0] || 'New';
              const lastName = parts.slice(1).join(' ') || 'Contact';
              nextContacts.unshift({
                id: itemId,
                firstName,
                lastName,
                company: item.company || '',
                phones: item.phone ? [item.phone] : [],
                emails: item.email ? [item.email] : [],
                relationship: 'Work',
                preferredMethod: 'Phone',
                notes: item.description || '',
                tags: item.tags || ['AI-Extracted'],
                isFavorite: false,
                isPinned: false,
                interactions: [],
                createdAt: now,
                updatedAt: now,
              });
              break;
            }
            case 'link':
              nextLinks.unshift({
                id: itemId,
                url: item.url || 'https://bluenote.app',
                title: item.title,
                description: item.description || '',
                domain: (item.url || 'bluenote.app').replace(/^https?:\/\//, '').split('/')[0],
                category: 'Article',
                tags: item.tags || ['Saved'],
                isFavorite: false,
                createdAt: now,
              });
              break;
            case 'shopping':
              if (nextShopping[0]) {
                nextShopping[0].items.unshift({
                  id: itemId,
                  name: item.title.replace(/^Buy\s+/i, ''),
                  quantity: '1',
                  category: 'Produce',
                  checked: false,
                  priority: 'Normal',
                });
              }
              break;
            default:
              nextTasks.unshift({
                id: itemId,
                title: item.title,
                description: item.description || '',
                priority: 'Medium',
                status: 'Not Started',
                dueDate: today,
                estimatedMinutes: 25,
                actualMinutes: 0,
                completionPercentage: 0,
                category: 'General',
                tags: ['AI-Captured'],
                subtasks: [],
                linkedItems: [],
                createdAt: now,
                updatedAt: now,
              });
          }
        });

        // If multiple items were extracted together, link the first two in the Knowledge Graph
        if (items.length >= 2) {
          nextEdges.unshift({
            id: `edge-${Date.now()}`,
            sourceType: items[0].category,
            sourceId: `ai-src-${Date.now()}`,
            sourceTitle: items[0].title,
            targetType: items[1].category,
            targetId: `ai-tgt-${Date.now()}`,
            targetTitle: items[1].title,
            relationshipType: 'captured together in Brain Dump',
            confidenceScore: 92,
            createdByAi: true,
            approvedByUser: true,
            createdAt: now,
          });
        }

        return {
          ...prev,
          tasks: nextTasks,
          notes: nextNotes,
          events: nextEvents,
          reminders: nextReminders,
          contacts: nextContacts,
          links: nextLinks,
          files: nextFiles,
          shoppingLists: nextShopping,
          knowledgeGraph: nextEdges,
          activityLog: [
            logActivity(
              `AI Brain Dump organized ${items.length} item${items.length === 1 ? '' : 's'}`,
              'system',
              items.map((i) => i.title).join(', ').slice(0, 80)
            ),
            ...prev.activityLog,
          ],
        };
      });

      showToast(`Organized ${items.length} item${items.length === 1 ? '' : 's'} into your Second Brain!`);
    },
    [logActivity, showToast]
  );

  // Approve a single Inbox item
  const handleApproveInboxItem = useCallback(
    (item: InboxItem, overrideCategory?: EntityType) => {
      const targetType = overrideCategory || item.detectedCategory;
      handleCommitBrainDumpItems([
        {
          id: item.id,
          category: targetType,
          confidence: item.confidence,
          title: item.aiSuggestedTitle,
          description: item.rawContent,
          dueDate: item.extractedMetadata?.dueDate,
          dueTime: item.extractedMetadata?.dueTime,
          priority: item.extractedMetadata?.priority,
          phone: item.extractedMetadata?.phone,
          email: item.extractedMetadata?.email,
          company: item.extractedMetadata?.company,
          url: item.extractedMetadata?.url,
          tags: item.extractedMetadata?.tags || ['Inbox-Approved'],
          aiReasoning: item.aiExplanation,
          selected: true,
        },
      ]);

      setWorkspace((prev) => ({
        ...prev,
        inbox: prev.inbox.map((i) => (i.id === item.id ? { ...i, status: 'Approved' } : i)),
      }));
    },
    [handleCommitBrainDumpItems]
  );

  const handleApproveAllInbox = useCallback(() => {
    const pending = workspace.inbox.filter((i) => i.status === 'Pending Review');
    if (pending.length === 0) return;
    pending.forEach((item) => handleApproveInboxItem(item));
    showToast(`Approved and filed ${pending.length} inbox items!`);
  }, [workspace.inbox, handleApproveInboxItem, showToast]);

  // Task operations
  const handleToggleTask = useCallback((taskId: string) => {
    const now = new Date().toISOString();
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const completed = t.status !== 'Completed';
        return {
          ...t,
          status: completed ? 'Completed' : 'In Progress',
          completionPercentage: completed ? 100 : 50,
          completedAt: completed ? now : undefined,
          updatedAt: now,
        };
      }),
    }));
  }, []);

  const handleAddTask = useCallback(
    (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const created: Task = {
        ...newTask,
        id: `task-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      setWorkspace((prev) => ({
        ...prev,
        tasks: [created, ...prev.tasks],
        activityLog: [
          logActivity('Created task', 'task', created.title),
          ...prev.activityLog,
        ],
      }));
      showToast(`Task "${created.title}" added`);
    },
    [logActivity, showToast]
  );

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));
  }, []);

  const handleDeleteTasks = useCallback(
    (taskIds: string[]) => {
      const now = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          taskIds.includes(t.id) ? { ...t, deletedAt: now } : t
        ),
      }));
      showToast(`Moved ${taskIds.length} task(s) to Recycle Bin`);
    },
    [showToast]
  );

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSubs = t.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        const completedCount = updatedSubs.filter((s) => s.completed).length;
        const pct =
          updatedSubs.length > 0
            ? Math.round((completedCount / updatedSubs.length) * 100)
            : t.completionPercentage;
        const allDone = updatedSubs.length > 0 && completedCount === updatedSubs.length;
        return {
          ...t,
          subtasks: updatedSubs,
          completionPercentage: pct,
          status: allDone ? 'Completed' : t.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const handleAddSubtask = useCallback((taskId: string, title: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                { id: `sub-${Date.now()}`, title, completed: false },
              ],
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
  }, []);

  // AI Execute Suggested Action from AIChatDrawer
  const handleExecuteSuggestedAction = useCallback(
    (action: SuggestedAction) => {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      if (action.actionType === 'create_task') {
        handleAddTask({
          title: action.payload.title || 'AI Suggested Task',
          description: 'Created from BlueNote AI Assistant suggestion',
          priority: (action.payload.priority as any) || 'High',
          status: 'Not Started',
          dueDate: action.payload.dueDate || today,
          estimatedMinutes: 30,
          actualMinutes: 0,
          completionPercentage: 0,
          category: 'AI Action',
          tags: ['AI-Assistant'],
          subtasks: [],
          linkedItems: [],
        });
      } else if (action.actionType === 'create_reminder') {
        setWorkspace((prev) => ({
          ...prev,
          reminders: [
            {
              id: `rem-${Date.now()}`,
              title: action.payload.title || 'Follow-up Reminder',
              triggerDate: action.payload.triggerDate || today,
              triggerTime: action.payload.triggerTime || '09:00',
              repeatRule: 'Once',
              status: 'Active',
              notificationType: 'Browser',
              createdAt: now,
            },
            ...prev.reminders,
          ],
        }));
        showToast(`Reminder "${action.payload.title}" scheduled!`);
      } else if (action.actionType === 'create_note') {
        const newNoteId = `note-${Date.now()}`;
        setWorkspace((prev) => ({
          ...prev,
          notes: [
            {
              id: newNoteId,
              title: action.payload.title || 'AI Note',
              content: action.payload.content || '',
              folderId: prev.folders[0]?.id || 'fld-work',
              color: 'blue',
              category: 'Notes',
              tags: ['AI-Draft'],
              isPinned: false,
              isFavorite: false,
              isArchived: false,
              wordCount: (action.payload.content || '').split(/\s+/).length,
              version: 1,
              history: [],
              linkedItems: [],
              createdAt: now,
              updatedAt: now,
            },
            ...prev.notes,
          ],
        }));
        setSelectedNoteId(newNoteId);
        showToast(`Created note "${action.payload.title}"`);
      }
    },
    [handleAddTask, showToast]
  );

  // Export Workspace in JSON, Markdown, or CSV
  const handleExportWorkspace = useCallback(
    (format: 'json' | 'markdown' | 'csv') => {
      let content = '';
      let mime = 'application/json';
      let ext = 'json';

      if (format === 'json') {
        content = JSON.stringify(workspace, null, 2);
      } else if (format === 'markdown') {
        mime = 'text/markdown';
        ext = 'md';
        content = `# BlueNote Workspace Export (${new Date().toLocaleDateString()})\n\n## Tasks\n${workspace.tasks
          .map((t) => `- [${t.status === 'Completed' ? 'x' : ' '}] **${t.title}** (${t.priority} • Due ${t.dueDate})`)
          .join('\n')}\n\n## Notes\n${workspace.notes
          .map((n) => `### ${n.title}\n${n.content}\n`)
          .join('\n')}`;
      } else {
        mime = 'text/csv';
        ext = 'csv';
        content =
          'Type,Title,Status,Priority,DueDate,Category\n' +
          workspace.tasks
            .map(
              (t) =>
                `"Task","${t.title.replace(/"/g, '""')}","${t.status}","${t.priority}","${t.dueDate}","${t.category}"`
            )
            .join('\n');
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bluenote-backup-${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported workspace as ${ext.toUpperCase()}`);
    },
    [workspace, showToast]
  );

  const pendingInboxCount = workspace.inbox.filter((i) => i.status === 'Pending Review').length;
  const activeTasksCount = workspace.tasks.filter(
    (t) => !t.deletedAt && t.status !== 'Completed'
  ).length;
  const surfacedPredictionsCount = getSurfacedPredictions(
    workspace.personalPatterns || DEFAULT_PERSONAL_PATTERNS,
    workspace.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS
  ).length;

  const NAV_ITEMS: {
    id: ActiveSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    group: 'core' | 'knowledge' | 'ai';
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'core' },
    { id: 'projects-os', label: 'PROJECTS', icon: FolderKanban, group: 'core' },
    { id: 'inbox', label: 'Universal Inbox', icon: Inbox, badge: pendingInboxCount || undefined, group: 'core' },
    { id: 'predictive', label: '🔮 Predictive Lists', icon: Sparkles, badge: surfacedPredictionsCount || undefined, group: 'core' },
    { id: 'tasks', label: 'Tasks & Lists', icon: CheckSquare, badge: activeTasksCount || undefined, group: 'core' },
    { id: 'calendar', label: 'Calendar & Planner', icon: Calendar, group: 'core' },
    { id: 'notes', label: 'Smart Notes', icon: FileText, group: 'knowledge' },
    { id: 'projects', label: 'Projects & Goals', icon: FolderKanban, group: 'knowledge' },
    { id: 'contacts', label: 'Contacts CRM', icon: Users, group: 'knowledge' },
    { id: 'links', label: 'Saved Links', icon: Link2, group: 'knowledge' },
    { id: 'files', label: 'Files & OCR Vault', icon: FolderOpen, group: 'knowledge' },
    { id: 'second-brain', label: 'Knowledge Graph', icon: Network, group: 'ai' },
    { id: 'search', label: 'Semantic Search', icon: Search, group: 'ai' },
    { id: 'ai-studio', label: 'AI Image Generator', icon: Wand2, group: 'ai' },
    { id: 'ai-chat', label: 'AI Assistant', icon: Bot, group: 'ai' },
  ];

  return (
    <div
      className={`${isDark ? 'dark' : ''} theme-${activeTheme} ${
        workspace.settings.largeText ? 'text-[106%]' : ''
      } ${workspace.settings.highContrast ? 'contrast-125' : ''} h-[100dvh] max-h-[100dvh] overflow-hidden`}
    >
      <div className="bn-app-shell h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
        {/* Left Collapsible Executive Command Sidebar */}
        <aside
          className={`bn-sidebar ${
            sidebarCollapsed ? 'md:w-20' : 'md:w-68'
          } hidden md:flex flex-col justify-between md:h-screen md:max-h-screen md:overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 transition-all duration-200 shrink-0 select-none z-20 shadow-xl shadow-slate-950/5`}
        >
          <div className="p-4 space-y-5">
            {/* Brand Logo + Collapse Toggle */}
            <div className="flex items-center justify-between px-1.5 pt-0.5">
              <button
                onClick={() => setActiveSection('dashboard')}
                className="flex items-center gap-3 text-left group"
              >
                <div className="relative">
                  <BlueNoteLogo size={38} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[17px] tracking-tight leading-none">
                        <span className="text-slate-900 dark:text-white">Blue</span>
                        <span className="text-blue-500">Note</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        PRO 2.0
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 leading-none mt-1">
                      Executive Second Brain
                    </p>
                  </div>
                )}
              </button>
              <button
                onClick={() => setSidebarCollapsed((c) => !c)}
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Primary Brain Dump CTA */}
            <button
              onClick={() => setBrainDumpModal({ open: true, tab: 'brain-dump' })}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 border border-blue-400/20 flex items-center justify-between gap-2 transition-all group"
              title="AI Brain Dump & Voice Capture (⇧⌘B)"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 group-hover:rotate-12 transition-transform" />
                {!sidebarCollapsed && <span>AI Brain Dump</span>}
              </div>
              {!sidebarCollapsed && (
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-black/20 text-blue-100 rounded border border-white/15">
                  ⇧⌘B
                </kbd>
              )}
            </button>

            {/* Navigation Groups */}
            <nav className="space-y-5">
              {(['core', 'knowledge', 'ai'] as const).map((groupKey) => {
                const groupTitle =
                  groupKey === 'core'
                    ? 'Command Center'
                    : groupKey === 'knowledge'
                    ? 'Knowledge Vault'
                    : 'Neural Intelligence';
                const items = NAV_ITEMS.filter((i) => i.group === groupKey);
                return (
                  <div key={groupKey} className="space-y-1">
                    {!sidebarCollapsed && (
                      <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {groupTitle}
                      </p>
                    )}
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                active ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                              }`}
                            />
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!sidebarCollapsed && item.badge !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom System, Profile Card & Settings Links */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            {/* Executive Profile, Photograph & Bio Card */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              title="Edit Profile, Bio, Photograph & BLUENOTE-AI-APP.firebase.com Identity"
              className="w-full p-2.5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-blue-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5 text-left transition-all group"
            >
              {workspace.settings.avatarUrl ? (
                <img
                  src={workspace.settings.avatarUrl}
                  alt={workspace.settings.name || 'User'}
                  className="w-9 h-9 rounded-xl object-cover border border-blue-500 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {(workspace.settings.name || currentUser?.displayName || 'BN')
                    .trim()
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {workspace.settings.name ||
                      currentUser?.displayName ||
                      'Set Name, Bio & Photo'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {workspace.settings.bio ||
                      workspace.settings.roleTitle ||
                      workspace.settings.authDomainAlias ||
                      'BLUENOTE-AI-APP.firebase.com'}
                  </div>
                </div>
              )}
            </button>

            <button
              onClick={() => setAiKeysModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors"
              title="View Built-In AI Engine Status"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Built-In AI Engine</span>}
            </button>
            <button
              onClick={() => setAndroidModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Android APK</span>}
            </button>
            <button
              onClick={() => setOnboardingModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Interactive Tour</span>}
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeSection === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Settings & Themes</span>}
            </button>
            <button
              onClick={() => setActiveSection('help')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeSection === 'help'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Help & Shortcuts</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] max-h-[100dvh] overflow-hidden">
          {/* Top Global Executive Header Bar (Mobile-Optimized, Zero Horizontal Overflow) */}
          <header className="bn-header bn-safe-header shrink-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-2.5 sm:px-5 lg:px-7 py-2 flex items-center justify-between gap-2">
            {/* Left: Mobile Drawer Trigger, Brand Logo, Search & Desktop Quick Capture */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-2xl min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shrink-0"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className="md:hidden flex items-center gap-1.5 shrink-0 pr-0.5"
              >
                <BlueNoteLogo size={26} />
                <span className="font-extrabold text-sm tracking-tight">
                  <span className="text-slate-900 dark:text-white">Blue</span>
                  <span className="text-blue-600">Note</span>
                </span>
              </button>

              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0"
                title="Search & Command Palette (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {/* Inline Universal Quick Capture Bar (Desktop) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!headerQuickInput.trim()) return;
                  handleQuickCapture(headerQuickInput.trim());
                  setHeaderQuickInput('');
                }}
                className="hidden lg:flex items-center flex-1 relative min-w-0"
              >
                <input
                  type="text"
                  value={headerQuickInput}
                  onChange={(e) => setHeaderQuickInput(e.target.value)}
                  placeholder='Quick capture: "Call John tomorrow at 2pm" or paste a link...'
                  className="w-full pl-3.5 pr-20 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Capture
                </button>
              </form>
            </div>

            {/* Right: Built-In AI Status, Studio, Theme Bar, Cloud Sync, AI Drawer */}
            <div className="bn-header-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAiKeysModalOpen(true)}
                title={`Built-In AI Engine (${aiProviderLabel})`}
                className="bn-header-optional px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>AI Engine</span>
              </button>

              {isInstallable && !isInstalled ? (
                <button
                  onClick={install}
                  className="bn-header-optional hidden sm:flex px-2.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold items-center gap-1.5 transition-colors"
                  title="Install BlueNote App onto your Android or Desktop Home Screen"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Install</span>
                </button>
              ) : (
                <button
                  onClick={() => setAndroidModalOpen(true)}
                  title="Android APK Download"
                  className="bn-header-optional hidden md:flex p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-colors items-center gap-1.5 text-xs font-semibold"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden 2xl:inline">Android</span>
                </button>
              )}

              <button
                onClick={() => setActiveSection('ai-studio')}
                title="Open AI Image Generator"
                className={`bn-header-optional hidden sm:flex p-2 rounded-xl transition-colors items-center gap-1.5 text-xs font-semibold ${
                  activeSection === 'ai-studio'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden xl:inline">AI Images</span>
              </button>

              <button
                onClick={() => setBrainDumpModal({ open: true, tab: 'ocr-scanner' })}
                title="Scan Receipt, Business Card, or Handwritten Note (OCR)"
                className="bn-header-optional hidden lg:flex p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 transition-colors items-center gap-1.5 text-xs font-medium"
              >
                <Camera className="w-4 h-4 text-blue-500" />
                <span className="hidden 2xl:inline">OCR</span>
              </button>

              {/* Interactive 12-Theme Switcher Bar (Default: White 'light') */}
              <div
                className="bn-header-optional hidden md:flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 max-w-[360px] xl:max-w-[520px] overflow-x-auto no-scrollbar"
                role="group"
                aria-label="Quick 12-Theme Switcher"
              >
                {THEME_OPTIONS.map((t) => {
                  const active = activeTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setWorkspace((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, theme: t.id },
                        }));
                        showToast(`Theme switched to ${t.title}`);
                      }}
                      title={t.title}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                      <span className="hidden 2xl:inline">{t.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cloud Sync, Profile Photo & Auth Status Button */}
              <button
                onClick={() => setAuthModalOpen(true)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentUser
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                }`}
                title={`Profile, Bio, Photo & Cloud Sync (${
                  workspace.settings.authDomainAlias || 'BLUENOTE-AI-APP.firebase.com'
                })`}
              >
                {workspace.settings.avatarUrl ? (
                  <img
                    src={workspace.settings.avatarUrl}
                    alt={workspace.settings.name || 'Profile'}
                    className="w-5 h-5 rounded-full object-cover border border-blue-500 shrink-0"
                  />
                ) : currentUser ? (
                  <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="hidden sm:inline max-w-[105px] truncate">
                  {workspace.settings.name ||
                    currentUser?.displayName ||
                    currentUser?.email?.split('@')[0] ||
                    'Sign Up / Profile'}
                </span>
              </button>

              {/* Collapsible AI Assistant Panel Toggle */}
              <button
                onClick={() => setAiDrawerOpen((o) => !o)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aiDrawerOpen
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/25 hover:bg-blue-500/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Ask AI</span>
              </button>
            </div>
          </header>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="fixed bottom-16 md:bottom-6 right-6 z-50 bg-slate-900 dark:bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 dark:border-blue-400 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Offline Mode Indicator Banner */}
          {!isOnline && (
            <div className="fixed bottom-16 md:bottom-6 left-6 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
              <CloudOff className="w-4 h-4" />
              <span>Offline Mode — Local Second Brain & cached storage active</span>
            </div>
          )}

          {/* Active Workspace View (Smooth Scroll on Mobile & Desktop) */}
          <main
            ref={mainScrollRef}
            className="bn-main-scroll flex-1 min-h-0 p-3 sm:p-6 lg:p-8 pb-28 md:pb-12 overflow-y-auto overflow-x-hidden"
          >
            <BlueNotePageTemplate section={activeSection}>
            {/* Mobile Compact Quick Capture & Theme Strip (Visible only on Mobile < 768px) */}
            <div className="md:hidden mb-3.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!headerQuickInput.trim()) return;
                  handleQuickCapture(headerQuickInput.trim());
                  setHeaderQuickInput('');
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={headerQuickInput}
                  onChange={(e) => setHeaderQuickInput(e.target.value)}
                  placeholder='Quick capture task, reminder, or note...'
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setBrainDumpModal({ open: true, tab: 'brain-dump' })}
                  className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 shrink-0"
                  title="Voice & AI Brain Dump"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setWorkspace((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, theme: t.id },
                        }))
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                        activeTheme === t.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      <span>{t.shortLabel}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAiKeysModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                >
                  <Key className="w-3 h-3" />
                  <span>Free AI Setup</span>
                </button>
              </div>
            </div>
            {activeSection === 'dashboard' && (
              <DashboardView
                workspace={workspace}
                onNavigate={handleNavigate}
                onToggleTask={handleToggleTask}
                onStartFocus={(task) => {
                  setFocusTask(task);
                  setFocusModalOpen(true);
                }}
                onOpenBrainDump={(tab = 'brain-dump') =>
                  setBrainDumpModal({ open: true, tab })
                }
                onQuickCapture={handleQuickCapture}
                onChangeEnergyMode={(mode: EnergyMode) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, energyMode: mode },
                  }));
                  showToast(`Switched to ${mode} Energy Mode — dashboard adapted`);
                }}
                onSnoozeReminder={(id, mins) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: prev.reminders.map((r) =>
                      r.id === id ? { ...r, status: 'Snoozed' } : r
                    ),
                  }));
                  showToast(`Reminder snoozed for ${mins} minutes`);
                }}
                onCompleteReminder={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: prev.reminders.map((r) =>
                      r.id === id ? { ...r, status: 'Completed' } : r
                    ),
                  }));
                  showToast('Reminder marked completed');
                }}
                onToggleHabit={(habitId, dateStr) => {
                  const today = new Date().toISOString().split('T')[0];
                  const targetDate = dateStr || today;
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: prev.habits.map((h) => {
                      if (h.id !== habitId) return h;
                      const isTodayTarget = targetDate === today;
                      const currentlyChecked = isTodayTarget
                        ? h.completedToday || h.historyDates.includes(today)
                        : h.historyDates.includes(targetDate);
                      const nextChecked = !currentlyChecked;
                      const nextHistory = nextChecked
                        ? Array.from(new Set([...h.historyDates, targetDate]))
                        : h.historyDates.filter((d) => d !== targetDate);

                      return {
                        ...h,
                        completedToday: isTodayTarget ? nextChecked : h.completedToday,
                        streak: nextChecked ? h.streak + 1 : Math.max(0, h.streak - 1),
                        historyDates: nextHistory,
                      };
                    }),
                  }));
                }}
                onAddHabit={(newHab) => {
                  const today = new Date().toISOString().split('T')[0];
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: [
                      {
                        id: `hab-${Date.now()}`,
                        name: newHab.name,
                        icon: 'Flame',
                        schedule: newHab.schedule,
                        streak: 1,
                        completedToday: true,
                        historyDates: [today],
                        targetPerWeek: newHab.targetPerWeek,
                        reminderTime: newHab.reminderTime,
                      },
                      ...prev.habits,
                    ],
                  }));
                  showToast(`Added daily habit "${newHab.name}"`);
                }}
                onDeleteHabit={(habitId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: prev.habits.filter((h) => h.id !== habitId),
                  }));
                  showToast('Habit removed');
                }}
                onRedistributeWorkload={() => {
                  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                  const nextWeek = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
                  setWorkspace((prev) => ({
                    ...prev,
                    tasks: prev.tasks.map((t, idx) => {
                      if (t.status === 'Completed' || t.priority === 'Critical') return t;
                      return {
                        ...t,
                        dueDate: idx % 2 === 0 ? tomorrow : nextWeek,
                      };
                    }),
                  }));
                  showToast('AI balanced your schedule and moved non-critical tasks to open slots');
                }}
              />
            )}

            {activeSection === 'inbox' && (
              <UniversalInboxView
                workspace={workspace}
                onCaptureToInbox={handleQuickCapture}
                onApproveInboxItem={handleApproveInboxItem}
                onApproveAllInbox={handleApproveAllInbox}
                onDeleteInboxItem={(id) =>
                  setWorkspace((prev) => ({
                    ...prev,
                    inbox: prev.inbox.filter((i) => i.id !== id),
                  }))
                }
                onClearProcessedInbox={() => {
                  setWorkspace((prev) => ({
                    ...prev,
                    inbox: prev.inbox.filter((i) => i.status !== 'Approved'),
                  }));
                  showToast('Cleared processed inbox history');
                }}
                onOpenBrainDump={(tab = 'brain-dump') =>
                  setBrainDumpModal({ open: true, tab })
                }
              />
            )}

            {activeSection === 'predictive' && (
              <PredictiveListsView
                workspace={workspace}
                onNavigate={handleNavigate}
                onApprovePrediction={(patternId, editedTitle, editedQty) => {
                  const now = new Date().toISOString();
                  const today = now.split('T')[0];
                  setWorkspace((prev) => {
                    const patterns = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const target = patterns.find((p) => p.id === patternId);
                    if (!target) return prev;

                    const finalTitle = editedTitle || target.title;
                    const finalQty = editedQty || target.suggestedPayload.quantity || '1';
                    const nextConf = adjustConfidenceTier(target.confidence, 'up');

                    const nextShoppingLists = [...prev.shoppingLists];
                    const nextTasks = [...prev.tasks];
                    const nextReminders = [...prev.reminders];

                    if (
                      target.suggestedPayload.actionType === 'add_shopping_item' ||
                      target.category === 'Shopping' ||
                      target.category === 'Household'
                    ) {
                      if (nextShoppingLists.length > 0) {
                        nextShoppingLists[0] = {
                          ...nextShoppingLists[0],
                          items: [
                            {
                              id: `shop-pred-${Date.now()}`,
                              name: finalTitle,
                              quantity: finalQty,
                              category: target.suggestedPayload.shoppingCategory || 'Household',
                              checked: false,
                              priority: 'Normal',
                            },
                            ...nextShoppingLists[0].items,
                          ],
                        };
                      }
                    } else if (target.suggestedPayload.actionType === 'create_recurring_task') {
                      nextTasks.unshift({
                        id: `task-pred-${Date.now()}`,
                        title: finalTitle,
                        description: `Created from Personal Pattern Engine (${target.explanation})`,
                        priority: target.suggestedPayload.taskPriority || 'Medium',
                        status: 'Not Started',
                        dueDate: today,
                        estimatedMinutes: 20,
                        actualMinutes: 0,
                        completionPercentage: 0,
                        category: 'Personal',
                        tags: ['Recurring-Pattern', 'Predictive'],
                        subtasks: [],
                        linkedItems: [],
                        createdAt: now,
                        updatedAt: now,
                      });
                    } else if (target.suggestedPayload.actionType === 'create_recurring_reminder') {
                      nextReminders.unshift({
                        id: `rem-pred-${Date.now()}`,
                        title: finalTitle,
                        triggerDate: today,
                        triggerTime: '09:00',
                        repeatRule: target.suggestedPayload.reminderRecurrence || 'Monthly',
                        recurrence: target.suggestedPayload.reminderRecurrence || 'Monthly',
                        priority: 'High',
                        status: 'Active',
                        category: 'Finance',
                        notificationType: 'Browser',
                        createdAt: now,
                      });
                    } else if (target.suggestedPayload.actionType === 'create_cross_system_bundle') {
                      const bundle = target.suggestedPayload.bundleItems || [];
                      nextTasks.unshift({
                        id: `task-bundle-${Date.now()}`,
                        title: finalTitle,
                        description: 'Cross-System Context Preparation Checklist',
                        priority: 'High',
                        status: 'Not Started',
                        dueDate: today,
                        estimatedMinutes: 45,
                        actualMinutes: 0,
                        completionPercentage: 0,
                        category: 'Personal',
                        tags: ['Cross-System', 'Trip-Prep'],
                        subtasks: bundle.map((b, idx) => ({
                          id: `sub-b-${Date.now()}-${idx}`,
                          title: b,
                          completed: false,
                        })),
                        linkedItems: [],
                        createdAt: now,
                        updatedAt: now,
                      });
                    }

                    const updatedPatterns = patterns.map((p) =>
                      p.id === patternId
                        ? {
                            ...p,
                            title: finalTitle,
                            lifecycleState: 'ACTIVE' as const,
                            confidence: nextConf,
                            approvalCount: p.approvalCount + 1,
                            editCount: editedTitle ? p.editCount + 1 : p.editCount,
                            selectedForBatch: false,
                            auditTrail: [
                              {
                                id: `aud-${Date.now()}`,
                                timestamp: now,
                                stage: 'APPROVED' as const,
                                action: editedTitle
                                  ? `User edited ("${finalTitle}") and approved prediction`
                                  : 'User approved prediction',
                                historicalEvidence: `${p.occurrenceCount} occurrences`,
                                typicalInterval: `${p.observedRangeDays[0]}–${p.observedRangeDays[1]} days`,
                                confidence: nextConf,
                                result:
                                  p.category === 'Shopping' || p.category === 'Household'
                                    ? 'Added to Shopping List & Confidence increased'
                                    : 'Created real BlueNote object & Confidence increased',
                              },
                              ...p.auditTrail,
                            ],
                          }
                        : p
                    );

                    return {
                      ...prev,
                      shoppingLists: nextShoppingLists,
                      tasks: nextTasks,
                      reminders: nextReminders,
                      personalPatterns: updatedPatterns,
                    };
                  });
                  showToast(
                    `Approved "${editedTitle || 'prediction'}" — added to workspace & updated pattern confidence`
                  );
                }}
                onApproveBatchPredictions={(patternIds) => {
                  const now = new Date().toISOString();
                  setWorkspace((prev) => {
                    const patterns = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const selected = patterns.filter((p) => patternIds.includes(p.id));
                    if (selected.length === 0) return prev;

                    const newItems = selected.map((p, idx) => ({
                      id: `shop-batch-${Date.now()}-${idx}`,
                      name: p.title,
                      quantity: p.suggestedPayload.quantity || '1',
                      category: p.suggestedPayload.shoppingCategory || ('Household' as const),
                      checked: false,
                      priority: 'Normal' as const,
                    }));

                    const nextShoppingLists = prev.shoppingLists.map((list, idx) =>
                      idx === 0 ? { ...list, items: [...newItems, ...list.items] } : list
                    );

                    const updatedPatterns = patterns.map((p) =>
                      patternIds.includes(p.id)
                        ? {
                            ...p,
                            lifecycleState: 'ACTIVE' as const,
                            confidence: adjustConfidenceTier(p.confidence, 'up'),
                            approvalCount: p.approvalCount + 1,
                            selectedForBatch: false,
                            auditTrail: [
                              {
                                id: `aud-${Date.now()}-${p.id}`,
                                timestamp: now,
                                stage: 'APPROVED' as const,
                                action: 'Batch approved in Predictive Shopping List',
                                historicalEvidence: `${p.occurrenceCount} occurrences`,
                                typicalInterval: `${p.observedRangeDays[0]}–${p.observedRangeDays[1]} days`,
                                confidence: adjustConfidenceTier(p.confidence, 'up'),
                                result: 'Added to Shopping List',
                              },
                              ...p.auditTrail,
                            ],
                          }
                        : p
                    );

                    return {
                      ...prev,
                      shoppingLists: nextShoppingLists,
                      personalPatterns: updatedPatterns,
                    };
                  });
                  showToast(`Added ${patternIds.length} predicted items to your Shopping List`);
                }}
                onDenyPrediction={(patternId) => {
                  const now = new Date().toISOString();
                  setWorkspace((prev) => {
                    const patterns = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const safeguards = prev.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS;
                    const updatedPatterns = patterns.map((p) => {
                      if (p.id !== patternId) return p;
                      const nextDenials = p.denialCount + 1;
                      const cooldownDays =
                        safeguards.cooldownBaseDays * Math.pow(2, Math.max(0, nextDenials - 1));
                      const cooldownUntil = new Date(
                        Date.now() + cooldownDays * 86400000
                      ).toISOString();
                      const nextConf = adjustConfidenceTier(p.confidence, 'down');
                      return {
                        ...p,
                        lifecycleState: 'DENIED' as const,
                        confidence: nextConf,
                        denialCount: nextDenials,
                        cooldownDays,
                        cooldownUntil,
                        selectedForBatch: false,
                        auditTrail: [
                          {
                            id: `aud-deny-${Date.now()}`,
                            timestamp: now,
                            stage: 'DENIED' as const,
                            action: `User denied prediction (Denial #${nextDenials})`,
                            historicalEvidence: `${p.occurrenceCount} occurrences`,
                            typicalInterval: `${p.observedRangeDays[0]}–${p.observedRangeDays[1]} days`,
                            confidence: nextConf,
                            result: `Confidence stepped down & ${cooldownDays}-day Cooldown applied`,
                          },
                          ...p.auditTrail,
                        ],
                      };
                    });
                    return { ...prev, personalPatterns: updatedPatterns };
                  });
                  showToast('Prediction denied — confidence lowered & cooldown applied (zero nagging)');
                }}
                onSnoozePrediction={(patternId, days) => {
                  const snoozedUntil = new Date(Date.now() + days * 86400000).toISOString();
                  setWorkspace((prev) => ({
                    ...prev,
                    personalPatterns: (prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS).map(
                      (p) =>
                        p.id === patternId
                          ? {
                              ...p,
                              lifecycleState: 'SNOOZED' as const,
                              snoozedUntil,
                              selectedForBatch: false,
                            }
                          : p
                    ),
                  }));
                  showToast(`Snoozed prediction for ${days} days without lowering confidence`);
                }}
                onSuppressPrediction={(patternId, reason) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    personalPatterns: (prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS).map(
                      (p) =>
                        p.id === patternId
                          ? {
                              ...p,
                              lifecycleState: 'SUPPRESSED' as const,
                              suppressed: true,
                              suppressionReason: reason || 'Never Suggest Again selected by user',
                              selectedForBatch: false,
                            }
                          : p
                    ),
                  }));
                  showToast('Pattern permanently suppressed — BlueNote will never suggest this again');
                }}
                onRestorePattern={(patternId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    personalPatterns: (prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS).map(
                      (p) =>
                        p.id === patternId
                          ? {
                              ...p,
                              lifecycleState: 'PRESENTED' as const,
                              suppressed: false,
                              suppressionReason: null,
                              cooldownUntil: null,
                              snoozedUntil: null,
                            }
                          : p
                    ),
                  }));
                  showToast('Pattern re-enabled and restored to Predictive Inbox');
                }}
                onToggleBatchSelect={(patternId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    personalPatterns: (prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS).map(
                      (p) =>
                        p.id === patternId
                          ? { ...p, selectedForBatch: !p.selectedForBatch }
                          : p
                    ),
                  }));
                }}
                onSimulateObservation={(title, category, actionType) => {
                  setWorkspace((prev) => {
                    const current = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const { updatedPatterns, promotedState } = recordUserObservation(
                      current,
                      title,
                      category,
                      actionType
                    );
                    showToast(
                      `Recorded observation for "${title}" → Lifecycle State: ${promotedState}`
                    );
                    return {
                      ...prev,
                      personalPatterns: updatedPatterns,
                    };
                  });
                }}
                onUpdateSafeguards={(updates) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    predictionSafeguards: {
                      ...(prev.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS),
                      ...updates,
                    },
                  }));
                  showToast('Updated Personal Pattern Engine safeguard settings');
                }}
                onApplyExplicitCommand={(cmdText) => {
                  const cleaned = cmdText
                    .replace(/^(stop suggesting|never suggest|don't suggest|do not suggest)\s+/i, '')
                    .trim();
                  if (!cleaned) return;
                  setWorkspace((prev) => {
                    const safeguards = prev.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS;
                    const patterns = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const updatedPatterns = patterns.map((p) =>
                      p.title.toLowerCase().includes(cleaned.toLowerCase())
                        ? {
                            ...p,
                            suppressed: true,
                            lifecycleState: 'SUPPRESSED' as const,
                            suppressionReason: `Explicit user override: "${cmdText}"`,
                          }
                        : p
                    );
                    return {
                      ...prev,
                      personalPatterns: updatedPatterns,
                      predictionSafeguards: {
                        ...safeguards,
                        explicitSuppressions: Array.from(
                          new Set([...safeguards.explicitSuppressions, cleaned])
                        ),
                      },
                    };
                  });
                  showToast(`Explicit override applied: BlueNote will stop suggesting "${cleaned}"`);
                }}
              />
            )}

            {activeSection === 'tasks' && (
              <TasksAndChecklistsView
                workspace={workspace}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTasks={handleDeleteTasks}
                onToggleSubtask={handleToggleSubtask}
                onAddSubtask={handleAddSubtask}
                onStartFocus={(task) => {
                  setFocusTask(task);
                  setFocusModalOpen(true);
                }}
                onAddShoppingItem={(listId, name, quantity, category) => {
                  setWorkspace((prev) => {
                    const currentPatterns = prev.personalPatterns || DEFAULT_PERSONAL_PATTERNS;
                    const { updatedPatterns } = recordUserObservation(
                      currentPatterns,
                      name,
                      category === 'Household' ? 'Household' : 'Shopping',
                      'add_shopping_item'
                    );
                    return {
                      ...prev,
                      personalPatterns: updatedPatterns,
                      shoppingLists: prev.shoppingLists.map((l) =>
                        l.id === listId
                          ? {
                              ...l,
                              items: [
                                ...l.items,
                                {
                                  id: `shop-${Date.now()}`,
                                  name,
                                  quantity,
                                  category,
                                  checked: false,
                                  priority: 'Normal',
                                },
                              ],
                            }
                          : l
                      ),
                    };
                  });
                }}
                onToggleShoppingItem={(listId, itemId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    shoppingLists: prev.shoppingLists.map((l) =>
                      l.id === listId
                        ? {
                            ...l,
                            items: l.items.map((item) =>
                              item.id === itemId ? { ...item, checked: !item.checked } : item
                            ),
                          }
                        : l
                    ),
                  }));
                }}
                onDeleteShoppingItem={(listId, itemId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    shoppingLists: prev.shoppingLists.map((l) =>
                      l.id === listId
                        ? {
                            ...l,
                            items: l.items.filter((item) => item.id !== itemId),
                          }
                        : l
                    ),
                  }));
                  showToast('Removed item from shopping list');
                }}
                onClearCheckedShoppingItems={(listId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    shoppingLists: prev.shoppingLists.map((l) =>
                      l.id === listId
                        ? {
                            ...l,
                            items: l.items.filter((item) => !item.checked),
                          }
                        : l
                    ),
                  }));
                  showToast('Cleared checked shopping items');
                }}
                onAddShoppingList={(name, store) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    shoppingLists: [
                      ...prev.shoppingLists,
                      {
                        id: `slist-${Date.now()}`,
                        name,
                        store,
                        items: [],
                        updatedAt: new Date().toISOString(),
                      },
                    ],
                  }));
                  showToast(`Created checklist "${name}"`);
                }}
                onDeleteShoppingList={(listId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    shoppingLists: prev.shoppingLists.filter((l) => l.id !== listId),
                  }));
                  showToast('Checklist removed');
                }}
                onChangeEnergyMode={(mode) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      energyMode: mode,
                    },
                  }));
                  showToast(`Smart Sort switched to ${mode} mode`);
                }}
              />
            )}

            {activeSection === 'notes' && (
              <NotesEditorView
                workspace={workspace}
                selectedNoteId={selectedNoteId}
                onCreateNote={(tpl) => {
                  const now = new Date().toISOString();
                  const newId = `note-${Date.now()}`;
                  const created: Note = {
                    id: newId,
                    title: tpl ? tpl.name : 'Untitled Smart Note',
                    content: tpl ? tpl.content : '# New Note\n\nStart writing or use AI Summarize...',
                    folderId: workspace.folders[0]?.id || 'fld-work',
                    color: 'white',
                    category: tpl ? tpl.category : 'General',
                    tags: ['Note'],
                    isPinned: false,
                    isFavorite: false,
                    isArchived: false,
                    wordCount: tpl ? tpl.content.split(/\s+/).length : 8,
                    version: 1,
                    history: [],
                    linkedItems: [],
                    createdAt: now,
                    updatedAt: now,
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    notes: [created, ...prev.notes],
                  }));
                  setSelectedNoteId(newId);
                  showToast(`Created "${created.title}"`);
                }}
                onUpdateNote={(noteId, updates, saveVersion) => {
                  const now = new Date().toISOString();
                  setWorkspace((prev) => ({
                    ...prev,
                    notes: prev.notes.map((n) => {
                      if (n.id !== noteId) return n;
                      const nextHistory = saveVersion
                        ? [
                            {
                              id: `ver-${Date.now()}`,
                              timestamp: n.updatedAt,
                              title: n.title,
                              content: n.content,
                              summary: n.summary,
                            },
                            ...n.history,
                          ].slice(0, 15)
                        : n.history;
                      const nextContent = updates.content ?? n.content;
                      return {
                        ...n,
                        ...updates,
                        wordCount: nextContent.trim().split(/\s+/).filter(Boolean).length,
                        version: saveVersion ? n.version + 1 : n.version,
                        history: nextHistory,
                        updatedAt: now,
                      };
                    }),
                  }));
                }}
                onDeleteNote={(noteId) => {
                  const now = new Date().toISOString();
                  setWorkspace((prev) => ({
                    ...prev,
                    notes: prev.notes.map((n) =>
                      n.id === noteId ? { ...n, deletedAt: now } : n
                    ),
                  }));
                  showToast('Moved note to Recycle Bin');
                }}
                onCreateFolder={(folderName) => {
                  const newFolder = {
                    id: `fld-${Date.now()}`,
                    name: folderName,
                    icon: 'Folder',
                    color: '#2563eb',
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    folders: [...prev.folders, newFolder],
                  }));
                  showToast(`Created folder "${folderName}"`);
                }}
                onExtractTasksFromNote={(content) => {
                  handleQuickCapture(content);
                }}
                onSendNoteToProjectsOS={(note) => {
                  const now = new Date().toISOString();
                  const verId = `ver-note-${Date.now()}`;
                  const mdContent = `# ${note.title}\n\n${note.content}`;
                  const metrics = computeDocumentMetrics(mdContent);
                  const classified = autoTagAndClassifyDocument(`${note.title}.md`, mdContent);
                  const currentList = stripLegacyDemoOSProjects(workspace.osProjects);
                  const targetProj =
                    currentList[0] ||
                    createProjectFromTemplate({
                      name: 'Second Brain Workspace',
                      description: 'Synced notes & documents from Second Brain',
                      template: 'Writing Project',
                      color: '#2563eb',
                      icon: 'FolderKanban',
                      tags: ['Second Brain', 'Notes'],
                    });

                  const newDoc = {
                    id: `pdoc-note-${Date.now()}`,
                    projectId: targetProj.id,
                    filename: `${note.title.replace(/[^a-zA-Z0-9._ -]/g, '').trim() || 'Note'}.md`,
                    fileType: 'md' as const,
                    sizeBytes: mdContent.length * 2,
                    uploadedAt: now,
                    modifiedAt: now,
                    processingStatus: 'Ready' as const,
                    pageCount: metrics.pageCount,
                    wordCount: metrics.wordCount,
                    charCount: metrics.charCount,
                    tags: Array.from(new Set([...note.tags, ...classified.tags, 'From Notes'])),
                    aiSummary: note.summary || classified.aiSummary,
                    contentType: classified.contentType,
                    completionState: classified.completionState,
                    originalContent: mdContent,
                    workingContent: mdContent,
                    editedContent: mdContent,
                    finalContent: mdContent,
                    currentStage: 'Original' as const,
                    currentVersionId: verId,
                    versions: [
                      {
                        id: verId,
                        versionNumber: 1,
                        label: 'v1 — Imported from Second Brain Notes',
                        stage: 'Original' as const,
                        content: mdContent,
                        createdAt: now,
                        author: 'User' as const,
                        wordCount: metrics.wordCount,
                        charCount: metrics.charCount,
                      },
                    ],
                  };

                  const updatedProj = {
                    ...targetProj,
                    updatedAt: now,
                    documents: [newDoc, ...targetProj.documents],
                  };
                  const nextList =
                    currentList.length > 0
                      ? [updatedProj, ...currentList.slice(1)]
                      : [updatedProj];

                  try {
                    localStorage.setItem(
                      'bluenote_ai_projects_os_clean_v2',
                      JSON.stringify(nextList)
                    );
                  } catch {
                    // Ignore storage quota
                  }
                  setWorkspace((prev) => ({
                    ...prev,
                    osProjects: nextList,
                  }));
                  setActiveSection('projects-os');
                  showToast(
                    `Sent "${note.title}" to PROJECTS ("${targetProj.name}") as a versioned document!`
                  );
                }}
              />
            )}

            {activeSection === 'projects-os' && (
              <ProjectsOSView
                initialProjects={workspace.osProjects}
                onSyncProjectsToWorkspace={(nextProjects) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    osProjects: nextProjects,
                  }));
                }}
                onCreateGlobalTask={(params) => {
                  handleAddTask({
                    title: params.title,
                    description: params.description,
                    priority: params.priority,
                    status: 'Not Started',
                    dueDate: params.dueDate,
                    estimatedMinutes: 30,
                    actualMinutes: 0,
                    completionPercentage: 0,
                    category: 'Project',
                    tags: ['PROJECTS-OS', 'Synced'],
                    subtasks: params.subChecklist.map((c) => ({
                      id: c.id,
                      title: c.text,
                      completed: c.completed,
                    })),
                    linkedItems: [],
                  });
                }}
                showToast={showToast}
              />
            )}

            {activeSection === 'projects' && (
              <ProjectsAndGoalsView
                workspace={workspace}
                onOpenProjectsOS={() => setActiveSection('projects-os')}
                onCreateProjectFromTemplate={(tpl) => {
                  const now = new Date().toISOString();
                  const deadline = new Date(Date.now() + 21 * 86400000)
                    .toISOString()
                    .split('T')[0];
                  const projId = `proj-${Date.now()}`;
                  const newProj: Project = {
                    id: projId,
                    name: tpl.name,
                    description: tpl.description,
                    deadline,
                    status: 'Active',
                    progress: 0,
                    color: tpl.color,
                    icon: tpl.icon,
                    category: tpl.category,
                    templateUsed: tpl.name,
                    createdAt: now,
                    updatedAt: now,
                  };
                  const templateTasks: Task[] = tpl.defaultTasks.map((dt, idx) => ({
                    id: `task-${Date.now()}-${idx}`,
                    title: dt.title,
                    description: `Auto-generated from ${tpl.name} template`,
                    priority: dt.priority,
                    status: 'Not Started',
                    dueDate: deadline,
                    estimatedMinutes: dt.est,
                    actualMinutes: 0,
                    completionPercentage: 0,
                    projectId: projId,
                    category: tpl.category,
                    tags: [tpl.category, 'Template'],
                    subtasks: [],
                    linkedItems: [],
                    createdAt: now,
                    updatedAt: now,
                  }));
                  setWorkspace((prev) => ({
                    ...prev,
                    projects: [newProj, ...prev.projects],
                    tasks: [...templateTasks, ...prev.tasks],
                  }));
                  showToast(`Created project "${tpl.name}" with ${templateTasks.length} starter tasks`);
                }}
                onCreateCustomProject={(name, description, deadline, category) => {
                  const now = new Date().toISOString();
                  const newProj: Project = {
                    id: `proj-${Date.now()}`,
                    name,
                    description,
                    deadline,
                    status: 'Active',
                    progress: 0,
                    color: '#2563eb',
                    icon: 'FolderKanban',
                    category,
                    createdAt: now,
                    updatedAt: now,
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    projects: [newProj, ...prev.projects],
                  }));
                  showToast(`Project "${name}" created`);
                }}
                onAddGoal={(goal) => {
                  const created: Goal = { ...goal, id: `goal-${Date.now()}` };
                  setWorkspace((prev) => ({
                    ...prev,
                    goals: [created, ...prev.goals],
                  }));
                  showToast(`Added long-term goal "${created.title}"`);
                }}
                onToggleHabit={(habitId) => {
                  const today = new Date().toISOString().split('T')[0];
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: prev.habits.map((h) =>
                      h.id === habitId
                        ? {
                            ...h,
                            completedToday: !h.completedToday,
                            streak: !h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1),
                            historyDates: !h.completedToday
                              ? Array.from(new Set([...h.historyDates, today]))
                              : h.historyDates.filter((d) => d !== today),
                          }
                        : h
                    ),
                  }));
                }}
                onDeleteProject={(projectId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    projects: prev.projects.filter((p) => p.id !== projectId),
                  }));
                  showToast('Project removed');
                }}
                onDeleteGoal={(goalId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    goals: prev.goals.filter((g) => g.id !== goalId),
                  }));
                  showToast('Goal removed');
                }}
                onToggleTask={handleToggleTask}
                onAddProjectTask={(projectId, title, priority) => {
                  const today = new Date().toISOString().split('T')[0];
                  handleAddTask({
                    title,
                    description: 'Added to project checklist',
                    priority,
                    status: 'Not Started',
                    dueDate: today,
                    estimatedMinutes: 30,
                    actualMinutes: 0,
                    completionPercentage: 0,
                    projectId,
                    category: 'Project',
                    tags: ['Project-Task'],
                    subtasks: [],
                    linkedItems: [],
                  });
                }}
                onUpdateProjectProgress={(projectId, progress) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    projects: prev.projects.map((p) =>
                      p.id === projectId
                        ? {
                            ...p,
                            progress,
                            status: progress >= 100 ? 'Completed' : 'Active',
                            updatedAt: new Date().toISOString(),
                          }
                        : p
                    ),
                  }));
                }}
                onUpdateGoalProgress={(goalId, progress) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    goals: prev.goals.map((g) =>
                      g.id === goalId
                        ? {
                            ...g,
                            progress,
                            status: progress >= 100 ? 'Completed' : 'On Track',
                          }
                        : g
                    ),
                  }));
                }}
                onAddHabit={(name, schedule) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: [
                      ...prev.habits,
                      {
                        id: `hab-${Date.now()}`,
                        name,
                        icon: 'Flame',
                        schedule,
                        streak: 0,
                        completedToday: false,
                        historyDates: [],
                        targetPerWeek: schedule === 'Daily' ? 7 : 5,
                        reminderTime: '08:00',
                      },
                    ],
                  }));
                  showToast(`Added habit "${name}"`);
                }}
                onDeleteHabit={(habitId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    habits: prev.habits.filter((h) => h.id !== habitId),
                  }));
                  showToast('Habit removed');
                }}
              />
            )}

            {activeSection === 'calendar' && (
              <CalendarAndPlannerView
                workspace={workspace}
                onAddEvent={(evt) => {
                  const created: CalendarEvent = {
                    ...evt,
                    id: `evt-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    events: [...prev.events, created],
                  }));
                  showToast(`Scheduled "${created.title}" on ${created.date}`);
                }}
                onAddReminder={(rem) => {
                  const created: Reminder = {
                    ...rem,
                    id: `rem-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: [created, ...prev.reminders],
                  }));
                  showToast(`Smart Reminder set for ${created.triggerTime}`);
                }}
                onSnoozeReminder={(id, mins) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: prev.reminders.map((r) =>
                      r.id === id ? { ...r, status: 'Snoozed' } : r
                    ),
                  }));
                  showToast(`Snoozed reminder for ${mins}m`);
                }}
                onCompleteReminder={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: prev.reminders.map((r) =>
                      r.id === id ? { ...r, status: 'Completed' } : r
                    ),
                  }));
                }}
                onDeleteEvent={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    events: prev.events.filter((e) => e.id !== id),
                  }));
                  showToast('Event deleted');
                }}
                onDeleteReminder={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    reminders: prev.reminders.filter((r) => r.id !== id),
                  }));
                  showToast('Reminder deleted');
                }}
                onUpdateTask={handleUpdateTask}
                onAutoGenerateTimeBlocks={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const topTasks = workspace.tasks
                    .filter((t) => !t.deletedAt && t.status !== 'Completed')
                    .slice(0, 2);
                  if (topTasks.length === 0) {
                    showToast('Add open tasks first so AI can schedule focus blocks for them');
                    return;
                  }
                  const generatedBlocks: CalendarEvent[] = topTasks.map((t, idx) => ({
                    id: `evt-ai-${Date.now()}-${idx}`,
                    title: `Focus Block: ${t.title}`,
                    description: `AI Auto-Scheduled Time Block (${t.estimatedMinutes}m)`,
                    date: today,
                    startTime: idx === 0 ? '10:30' : '15:00',
                    endTime: idx === 0 ? '11:30' : '16:00',
                    allDay: false,
                    color: '#0d9488',
                    category: 'Focus Block',
                    tags: ['AI-TimeBlock'],
                    linkedContactIds: [],
                    projectId: t.projectId,
                    createdAt: new Date().toISOString(),
                  }));
                  setWorkspace((prev) => ({
                    ...prev,
                    events: [...prev.events, ...generatedBlocks],
                  }));
                  showToast(`AI scheduled ${generatedBlocks.length} deep work focus blocks for today`);
                }}
              />
            )}

            {(activeSection === 'contacts' ||
              activeSection === 'links' ||
              activeSection === 'files') && (
              <ContactsLinksFilesView
                key={activeSection}
                activeTab={activeSection}
                workspace={workspace}
                onAddContact={(c) => {
                  const now = new Date().toISOString();
                  const created: Contact = {
                    ...c,
                    id: `con-${Date.now()}`,
                    createdAt: now,
                    updatedAt: now,
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    contacts: [created, ...prev.contacts],
                  }));
                  showToast(`Added ${created.firstName} ${created.lastName} to Personal CRM`);
                }}
                onAddLink={(l) => {
                  const created: SavedLink = {
                    ...l,
                    id: `lnk-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    links: [created, ...prev.links],
                  }));
                  showToast(`Saved link "${created.title}"`);
                }}
                onOpenOCRScanner={() =>
                  setBrainDumpModal({ open: true, tab: 'ocr-scanner' })
                }
                onMergeDuplicateContacts={() => {
                  const seen = new Map<string, Contact>();
                  const merged: Contact[] = [];
                  workspace.contacts.forEach((c) => {
                    const key = `${c.firstName.toLowerCase()} ${c.lastName.toLowerCase()}`;
                    if (!seen.has(key)) {
                      seen.set(key, c);
                      merged.push(c);
                    } else {
                      const existing = seen.get(key)!;
                      existing.phones = Array.from(new Set([...existing.phones, ...c.phones]));
                      existing.emails = Array.from(new Set([...existing.emails, ...c.emails]));
                    }
                  });
                  setWorkspace((prev) => ({ ...prev, contacts: merged }));
                  showToast('Scanned CRM & merged duplicate contact records');
                }}
                onDeleteContact={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    contacts: prev.contacts.filter((c) => c.id !== id),
                  }));
                  showToast('Contact removed');
                }}
                onDeleteLink={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    links: prev.links.filter((l) => l.id !== id),
                  }));
                  showToast('Saved link removed');
                }}
                onDeleteFile={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    files: prev.files.filter((f) => f.id !== id),
                  }));
                  showToast('File removed');
                }}
                onUpdateContact={(id, updates) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    contacts: prev.contacts.map((c) =>
                      c.id === id
                        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                        : c
                    ),
                  }));
                }}
                onToggleFavoriteLink={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    links: prev.links.map((l) =>
                      l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
                    ),
                  }));
                }}
              />
            )}

            {(activeSection === 'second-brain' || activeSection === 'search') && (
              <SecondBrainGraphView
                key={activeSection}
                initialTab={activeSection === 'search' ? 'search' : 'graph'}
                workspace={workspace}
                onNavigate={handleNavigate}
                onRebuildGraph={() => {
                  const now = new Date().toISOString();
                  const discovered: KnowledgeEdge[] = [];
                  // Auto-discover real relationships across user's projects, tasks, notes, and contacts
                  workspace.tasks
                    .filter((t) => !t.deletedAt)
                    .forEach((t) => {
                      if (t.projectId) {
                        const proj = workspace.projects.find((p) => p.id === t.projectId);
                        if (proj) {
                          discovered.push({
                            id: `edge-tp-${t.id}-${proj.id}`,
                            sourceType: 'task',
                            sourceId: t.id,
                            sourceTitle: t.title,
                            targetType: 'project',
                            targetId: proj.id,
                            targetTitle: proj.name,
                            relationshipType: 'Part of Project',
                            confidenceScore: 98,
                            createdByAi: true,
                            approvedByUser: true,
                            createdAt: now,
                          });
                        }
                      }
                    });

                  workspace.notes
                    .filter((n) => !n.deletedAt)
                    .forEach((n) => {
                      workspace.projects.forEach((p) => {
                        if (
                          n.title.toLowerCase().includes(p.name.toLowerCase()) ||
                          n.content.toLowerCase().includes(p.name.toLowerCase())
                        ) {
                          discovered.push({
                            id: `edge-np-${n.id}-${p.id}`,
                            sourceType: 'note',
                            sourceId: n.id,
                            sourceTitle: n.title,
                            targetType: 'project',
                            targetId: p.id,
                            targetTitle: p.name,
                            relationshipType: 'References Project',
                            confidenceScore: 92,
                            createdByAi: true,
                            approvedByUser: true,
                            createdAt: now,
                          });
                        }
                      });
                      workspace.contacts.forEach((c) => {
                        const fullName = `${c.firstName} ${c.lastName}`.trim().toLowerCase();
                        if (fullName && n.content.toLowerCase().includes(fullName)) {
                          discovered.push({
                            id: `edge-nc-${n.id}-${c.id}`,
                            sourceType: 'note',
                            sourceId: n.id,
                            sourceTitle: n.title,
                            targetType: 'contact',
                            targetId: c.id,
                            targetTitle: `${c.firstName} ${c.lastName}`.trim(),
                            relationshipType: 'Mentions Contact',
                            confidenceScore: 95,
                            createdByAi: true,
                            approvedByUser: true,
                            createdAt: now,
                          });
                        }
                      });
                    });

                  // Also auto-discover links from PROJECTS OS containers, documents, tasks & relationships
                  (workspace.osProjects || []).forEach((osp) => {
                    osp.documents.forEach((doc) => {
                      discovered.push({
                        id: `edge-osdoc-${doc.id}-${osp.id}`,
                        sourceType: 'file',
                        sourceId: osp.id,
                        sourceTitle: doc.filename,
                        targetType: 'project',
                        targetId: osp.id,
                        targetTitle: `PROJECTS: ${osp.name}`,
                        relationshipType: 'Versioned Document In',
                        confidenceScore: 99,
                        createdByAi: true,
                        approvedByUser: true,
                        createdAt: now,
                      });
                    });
                    osp.tasks.forEach((pt) => {
                      discovered.push({
                        id: `edge-ostask-${pt.id}-${osp.id}`,
                        sourceType: 'task',
                        sourceId: osp.id,
                        sourceTitle: pt.title,
                        targetType: 'project',
                        targetId: osp.id,
                        targetTitle: `PROJECTS: ${osp.name}`,
                        relationshipType: 'Project Deliverable',
                        confidenceScore: 97,
                        createdByAi: true,
                        approvedByUser: true,
                        createdAt: now,
                      });
                    });
                  });

                  setWorkspace((prev) => {
                    const existingIds = new Set(prev.knowledgeGraph.map((e) => e.id));
                    const fresh = discovered.filter((d) => !existingIds.has(d.id));
                    return {
                      ...prev,
                      knowledgeGraph: [...fresh, ...prev.knowledgeGraph],
                    };
                  });
                  showToast(
                    discovered.length > 0
                      ? `Auto-discovered ${discovered.length} Knowledge Graph connection(s)`
                      : 'Scanned workspace — add shared project/contact names across notes & tasks to auto-link'
                  );
                }}
                onRemoveRelationship={(edgeId) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    knowledgeGraph: prev.knowledgeGraph.filter((e) => e.id !== edgeId),
                  }));
                }}
                onAddManualRelationship={(sourceTitle, targetTitle, relType) => {
                  const newEdge: KnowledgeEdge = {
                    id: `edge-${Date.now()}`,
                    sourceType: 'note',
                    sourceId: `manual-${Date.now()}`,
                    sourceTitle,
                    targetType: 'project',
                    targetId: `manual-t-${Date.now()}`,
                    targetTitle,
                    relationshipType: relType,
                    confidenceScore: 100,
                    createdByAi: false,
                    approvedByUser: true,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    knowledgeGraph: [newEdge, ...prev.knowledgeGraph],
                  }));
                  showToast(`Linked "${sourceTitle}" → "${targetTitle}"`);
                }}
                onSaveSearch={(name, query, filterType) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    savedSearches: [
                      ...prev.savedSearches,
                      { id: `ss-${Date.now()}`, name, query, filterType },
                    ],
                  }));
                  showToast(`Saved search filter "${name}"`);
                }}
                onDeleteSavedSearch={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    savedSearches: prev.savedSearches.filter((s) => s.id !== id),
                  }));
                }}
                onAddMemoryFact={(fact) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      learnedMemoryFacts: [...prev.settings.learnedMemoryFacts, fact],
                    },
                  }));
                  showToast('Saved AI memory preference');
                }}
                onRemoveMemoryFact={(idx) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      learnedMemoryFacts: prev.settings.learnedMemoryFacts.filter(
                        (_, i) => i !== idx
                      ),
                    },
                  }));
                }}
              />
            )}

            {activeSection === 'ai-studio' && (
              <AIStudioHubView
                onSaveGeneratedFile={(file) => {
                  const created: WorkspaceFile = {
                    ...file,
                    id: `file-${Date.now()}`,
                    version: 1,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    files: [created, ...prev.files],
                  }));
                  showToast(`Saved "${created.filename}" to Files & OCR Vault`);
                }}
                onSaveTranscriptAsNote={(title, content) => {
                  const now = new Date().toISOString();
                  const newNote: Note = {
                    id: `note-${Date.now()}`,
                    title,
                    content: `# ${title}\n\n${content}`,
                    summary: content.slice(0, 140),
                    folderId: workspace.folders[0]?.id || 'fld-work',
                    color: 'blue',
                    category: 'Voice Transcript',
                    tags: ['Audio-Transcript', 'Gemini-3.5'],
                    isPinned: false,
                    isFavorite: false,
                    isArchived: false,
                    wordCount: content.trim().split(/\s+/).filter(Boolean).length,
                    version: 1,
                    history: [],
                    linkedItems: [],
                    createdAt: now,
                    updatedAt: now,
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    notes: [newNote, ...prev.notes],
                  }));
                  showToast(`Saved transcript "${title}" to Smart Notes`);
                }}
                onSaveLink={(link) => {
                  const created: SavedLink = {
                    ...link,
                    id: `lnk-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                  };
                  setWorkspace((prev) => ({
                    ...prev,
                    links: [created, ...prev.links],
                  }));
                  showToast(`Saved "${created.title}" to Saved Links`);
                }}
                onSendToBrainDump={(rawText) => {
                  handleQuickCapture(rawText);
                }}
                onOpenAIKeysModal={() => setAiKeysModalOpen(true)}
                osProjects={workspace.osProjects || []}
                onSaveToOSProject={(targetId, payload) => {
                  const now = new Date().toISOString();
                  let targetProjectName = '';
                  setWorkspace((prev) => {
                    let list = [...(prev.osProjects || [])];
                    let target =
                      list.find((p) => p.id === targetId && !p.isArchived) ||
                      list.find((p) => !p.isArchived);
                    if (!target) {
                      target = createProjectFromTemplate({
                        name: 'AI Image Creative Workspace',
                        description:
                          'Dedicated 10 GB container for FLUX.1 8K Photos and visual assets',
                        template: 'Custom',
                        color: '#2563eb',
                        icon: 'Sparkles',
                        tags: ['AI-Images', 'FLUX-8K'],
                      });
                      list = [target, ...list];
                    }
                    targetProjectName = target.name;
                    const cleanSlug =
                      payload.title
                        .replace(/[^\w\s-]/g, '')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 5)
                        .join('_') || 'AI_Image_Asset';

                    const updatedList = list.map((p) => {
                      if (p.id !== target!.id) return p;
                      const firstAlbum = p.photoAlbums[0] || {
                        id: `palb-${Date.now()}`,
                        projectId: p.id,
                        title: `${p.name} — Visual Showcase`,
                        subtitle: 'AI Image HD Gallery',
                        layout: 'grid' as const,
                        photos: [],
                        createdAt: now,
                        updatedAt: now,
                      };
                      const newPhoto = {
                        id: `pho-studio-${Date.now()}`,
                        filename: `${cleanSlug}.png`,
                        caption: payload.captionOrLyrics,
                        dataUrl: payload.dataUrl,
                        sizeBytes: 380000,
                        takenAt: now,
                        groupName: 'AI Image Generator',
                        tags: ['FLUX.1-HD', payload.model],
                      };
                      const nextAlbums =
                        p.photoAlbums.length > 0
                          ? p.photoAlbums.map((alb, idx) =>
                              idx === 0
                                ? { ...alb, updatedAt: now, photos: [newPhoto, ...alb.photos] }
                                : alb
                            )
                          : [{ ...firstAlbum, photos: [newPhoto] }];
                      return {
                        ...p,
                        updatedAt: now,
                        photoAlbums: nextAlbums,
                      };
                    });
                    try {
                      localStorage.setItem(
                        'bluenote_ai_projects_os_clean_v2',
                        JSON.stringify(updatedList)
                      );
                    } catch {}
                    return {
                      ...prev,
                      osProjects: updatedList,
                    };
                  });
                  showToast(
                    `Saved ${payload.kind.toUpperCase()} directly to PROJECTS container "${
                      targetProjectName || 'AI Image Creative Workspace'
                    }"!`
                  );
                }}
              />
            )}

            {activeSection === 'ai-chat' && (
              <div className="max-w-5xl mx-auto">
                <AIChatDrawer
                  isOpen={true}
                  isFullPage={true}
                  workspace={workspace}
                  onAddMessage={(msg: AIMessage) => {
                    setWorkspace((prev) => {
                      const firstConv = prev.conversations[0] || {
                        id: 'conv-1',
                        title: 'Second Brain Assistant',
                        agent: msg.agent,
                        messages: [],
                        updatedAt: new Date().toISOString(),
                      };
                      const updatedConv = {
                        ...firstConv,
                        messages: [...firstConv.messages, msg],
                        updatedAt: new Date().toISOString(),
                      };
                      return {
                        ...prev,
                        conversations: [updatedConv, ...prev.conversations.slice(1)],
                      };
                    });
                  }}
                  onExecuteAction={handleExecuteSuggestedAction}
                  onNavigateSource={handleNavigate}
                  onOpenBrainDump={() =>
                    setBrainDumpModal({ open: true, tab: 'brain-dump' })
                  }
                />
              </div>
            )}

            {(activeSection === 'settings' || activeSection === 'help') && (
              <SettingsAndSystemView
                key={activeSection}
                initialSection={activeSection}
                workspace={workspace}
                onUpdateSettings={(updates: Partial<UserSettings>) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, ...updates },
                  }));
                }}
                onToggleAutomation={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    automations: prev.automations.map((a) =>
                      a.id === id ? { ...a, enabled: !a.enabled } : a
                    ),
                  }));
                }}
                onAddAutomation={(name, trigger, action) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    automations: [
                      {
                        id: `auto-${Date.now()}`,
                        name,
                        trigger,
                        action,
                        enabled: true,
                        runsCount: 0,
                      },
                      ...prev.automations,
                    ],
                  }));
                  showToast(`Automation "${name}" enabled`);
                }}
                onDeleteAutomation={(id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    automations: prev.automations.filter((a) => a.id !== id),
                  }));
                  showToast('Automation rule deleted');
                }}
                onExportWorkspace={handleExportWorkspace}
                onImportWorkspace={(jsonText) => {
                  try {
                    const parsed = JSON.parse(jsonText);
                    if (parsed && typeof parsed === 'object') {
                      setWorkspace((prev) =>
                        stripLegacyDemoData({ ...prev, ...parsed })
                      );
                      showToast('Workspace backup restored successfully!');
                    }
                  } catch {
                    showToast('Invalid JSON backup file');
                  }
                }}
                onRestoreDeletedItem={(type, id) => {
                  setWorkspace((prev) => ({
                    ...prev,
                    tasks:
                      type === 'task'
                        ? prev.tasks.map((t) => (t.id === id ? { ...t, deletedAt: null } : t))
                        : prev.tasks,
                    notes:
                      type === 'note'
                        ? prev.notes.map((n) => (n.id === id ? { ...n, deletedAt: null } : n))
                        : prev.notes,
                  }));
                  showToast('Restored item from Recycle Bin');
                }}
                onEmptyRecycleBin={() => {
                  setWorkspace((prev) => ({
                    ...prev,
                    tasks: prev.tasks.filter((t) => !t.deletedAt),
                    notes: prev.notes.filter((n) => !n.deletedAt),
                  }));
                  showToast('Recycle Bin permanently emptied');
                }}
                onResetDemoWorkspace={() => {
                  try {
                    localStorage.removeItem('bluenote_ai_projects_os_v1');
                    localStorage.removeItem('bluenote_ai_projects_os_clean_v2');
                  } catch {
                    // ignore
                  }
                  setWorkspace(initialWorkspace);
                  setOnboardingModalOpen(true);
                  showToast('Workspace cleared — starting fresh onboarding tutorial');
                }}
                onOpenAIKeysModal={() => setAiKeysModalOpen(true)}
              />
            )}
            </BlueNotePageTemplate>
          </main>
        </div>

        {/* Collapsible Right AI Assistant Drawer */}
        <AIChatDrawer
          isOpen={aiDrawerOpen && activeSection !== 'ai-chat'}
          workspace={workspace}
          onClose={() => setAiDrawerOpen(false)}
          onAddMessage={(msg: AIMessage) => {
            setWorkspace((prev) => {
              const firstConv = prev.conversations[0] || {
                id: 'conv-1',
                title: 'Second Brain Assistant',
                agent: msg.agent,
                messages: [],
                updatedAt: new Date().toISOString(),
              };
              const updatedConv = {
                ...firstConv,
                messages: [...firstConv.messages, msg],
                updatedAt: new Date().toISOString(),
              };
              return {
                ...prev,
                conversations: [updatedConv, ...prev.conversations.slice(1)],
              };
            });
          }}
          onExecuteAction={handleExecuteSuggestedAction}
          onNavigateSource={handleNavigate}
          onOpenBrainDump={() => setBrainDumpModal({ open: true, tab: 'brain-dump' })}
        />

        {/* Android WebView & Mobile Slide-Out Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[86vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto z-10 p-4 bn-safe-header">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <BlueNoteLogo size={34} />
                    <div>
                      <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                        Blue<span className="text-blue-600">Note</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Android & Web Executive Suite</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Built-In AI Engine Status Button in Mobile Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAiKeysModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Built-In AI Engine Status</span>
                </button>

                {/* Mobile Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBrainDumpModal({ open: true, tab: 'brain-dump' });
                    }}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Brain Dump
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBrainDumpModal({ open: true, tab: 'ocr-scanner' });
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    OCR Scanner
                  </button>
                </div>

                {/* Mobile 12-Theme Selector */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Workspace Theme ({THEME_OPTIONS.length} Studio Themes)
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setWorkspace((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, theme: t.id },
                          }))
                        }
                        className={`py-1.5 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 border ${
                          activeTheme === t.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
                        <span>{t.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* All 14 Sections */}
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                          active
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                              active ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAndroidModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Android APK</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOnboardingModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Onboarding Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & Themes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile / Android WebView Bottom Navigation Bar */}
        <nav className="md:hidden bn-safe-bottom-nav fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 px-1 py-1.5 grid grid-cols-6 gap-0.5 shadow-lg">
          {[
            { id: 'dashboard' as ActiveSection, label: 'Today', icon: LayoutDashboard },
            { id: 'projects-os' as ActiveSection, label: 'Projects', icon: FolderKanban },
            { id: 'tasks' as ActiveSection, label: 'Tasks', icon: CheckSquare },
            { id: 'notes' as ActiveSection, label: 'Notes', icon: FileText },
          ].map((m) => {
            const Icon = m.icon;
            const active = activeSection === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveSection(m.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-full">{m.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAiKeysModalOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          >
            <Key className="w-4 h-4" />
            <span className="truncate max-w-full">Free AI</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <Menu className="w-4 h-4" />
            <span className="truncate max-w-full">Menu</span>
          </button>
        </nav>

        {/* Free AI & API Keys Setup Popup Modal */}
        <AIKeysAndFreeAIModal
          isOpen={aiKeysModalOpen}
          onClose={() => setAiKeysModalOpen(false)}
          onConfigSaved={(cfg) => {
            setAiProviderLabel(getActiveAIProviderBadge(cfg));
            showToast(`AI Engine updated: ${getActiveAIProviderBadge(cfg)}`);
          }}
        />

        {/* Modals */}
        <BrainDumpModal
          isOpen={brainDumpModal.open}
          initialTab={brainDumpModal.tab}
          workspace={workspace}
          onClose={() => setBrainDumpModal((prev) => ({ ...prev, open: false }))}
          onCommitItems={handleCommitBrainDumpItems}
        />

        <FocusAndPomodoroModal
          isOpen={focusModalOpen}
          task={focusTask}
          activeTasks={workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Completed')}
          onSelectTask={(selected) => setFocusTask(selected)}
          onClose={() => setFocusModalOpen(false)}
          onToggleSubtask={handleToggleSubtask}
          onCompleteTask={(taskId) => {
            handleToggleTask(taskId);
            setFocusModalOpen(false);
            showToast('Focus session task completed!');
          }}
          onLogMinutes={(taskId, minutes) => {
            setWorkspace((prev) => ({
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, actualMinutes: t.actualMinutes + minutes } : t
              ),
            }));
            showToast(`Logged ${minutes}m of focused work`);
          }}
          onSaveScratchpadAsNote={(title, content) => {
            const now = new Date().toISOString();
            const newNote: Note = {
              id: `note-${Date.now()}`,
              title,
              content: `# ${title}\n\n${content}`,
              summary: content.slice(0, 140),
              folderId: workspace.folders[0]?.id || 'fld-work',
              color: 'blue',
              category: 'Focus Session',
              tags: ['Focus-Notes'],
              isPinned: false,
              isFavorite: false,
              isArchived: false,
              wordCount: content.trim().split(/\s+/).filter(Boolean).length,
              version: 1,
              history: [],
              linkedItems: [],
              createdAt: now,
              updatedAt: now,
            };
            setWorkspace((prev) => ({
              ...prev,
              notes: [newNote, ...prev.notes],
            }));
            showToast(`Saved "${title}" to Smart Notes`);
          }}
        />

        <CommandPaletteModal
          isOpen={commandPaletteOpen}
          workspace={workspace}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
          onOpenBrainDump={(tab = 'brain-dump') =>
            setBrainDumpModal({ open: true, tab })
          }
          onOpenFocusMode={() => {
            const firstActive =
              workspace.tasks.find((t) => !t.deletedAt && t.status !== 'Completed') || null;
            setFocusTask(firstActive);
            setFocusModalOpen(true);
          }}
          onQuickCreate={handleQuickCapture}
        />

        <AuthModal
          isOpen={authModalOpen}
          currentUser={currentUser}
          settings={workspace.settings}
          onClose={() => setAuthModalOpen(false)}
          onUpdateLocalProfileName={(name, email) => {
            setWorkspace((prev) => ({
              ...prev,
              settings: { ...prev.settings, name, email },
            }));
            showToast(`Signed in as ${name || 'BlueNote User'} on ${workspace.settings.authDomainAlias || 'BLUENOTE-AI-APP.firebase.com'}`);
          }}
          onUpdateProfileSettings={(updates) => {
            setWorkspace((prev) => ({
              ...prev,
              settings: { ...prev.settings, ...updates },
            }));
            showToast('Updated profile, bio & photograph');
          }}
        />

        <AndroidInstallModal
          isOpen={androidModalOpen}
          onClose={() => setAndroidModalOpen(false)}
        />

        {/* Splash Screen Startup */}
        {showSplash && (
          <SplashScreen
            onComplete={() => {
              setShowSplash(false);
              if (!workspace.settings.onboardingCompleted) {
                setOnboardingModalOpen(true);
              }
            }}
          />
        )}

        {/* First-Time Interactive Onboarding Tutorial Wizard */}
        <OnboardingWizardModal
          isOpen={!showSplash && onboardingModalOpen}
          settings={workspace.settings}
          onChangeTheme={(theme) => {
            setWorkspace((prev) => ({
              ...prev,
              settings: { ...prev.settings, theme },
            }));
          }}
          onClose={() => {
            setOnboardingModalOpen(false);
            setWorkspace((prev) => ({
              ...prev,
              settings: { ...prev.settings, onboardingCompleted: true },
            }));
          }}
          onCompleteOnboarding={({
            name,
            bio,
            avatarUrl,
            theme,
            energyMode,
            aiPersonality,
            starterHabits,
            firstCaptureText,
            predictionStage,
            suggestionBudgetMax,
            firstOSProjectName,
            firstOSProjectTemplate,
            launchSection,
          }) => {
            const today = new Date().toISOString().split('T')[0];

            let createdProj: ReturnType<typeof createProjectFromTemplate> | null = null;
            if (firstOSProjectName && firstOSProjectName.trim()) {
              try {
                createdProj = createProjectFromTemplate({
                  name: firstOSProjectName.trim(),
                  description: `${firstOSProjectTemplate || 'Blank Project'} workspace created during onboarding`,
                  template: firstOSProjectTemplate || 'Blank Project',
                  color: '#2563eb',
                  icon: 'FolderKanban',
                  tags: [],
                });
                localStorage.setItem(
                  'bluenote_ai_projects_os_clean_v2',
                  JSON.stringify([createdProj])
                );
              } catch {
                // ignore quota errors
              }
            }

            setWorkspace((prev) => {
              const createdHabits = starterHabits.map((sh, idx) => ({
                id: `hab-init-${Date.now()}-${idx}`,
                name: sh.name,
                icon: 'Flame',
                schedule: sh.schedule,
                streak: 1,
                completedToday: true,
                historyDates: [today],
                targetPerWeek: sh.targetPerWeek,
                reminderTime: '08:00',
              }));

              return {
                ...prev,
                settings: {
                  ...prev.settings,
                  name,
                  bio: bio ?? prev.settings.bio,
                  avatarUrl: avatarUrl ?? prev.settings.avatarUrl,
                  theme,
                  energyMode,
                  aiPersonality,
                  onboardingCompleted: true,
                },
                predictionSafeguards: {
                  ...(prev.predictionSafeguards || DEFAULT_PREDICTION_SAFEGUARDS),
                  currentStage:
                    predictionStage ??
                    (prev.predictionSafeguards?.currentStage || DEFAULT_PREDICTION_SAFEGUARDS.currentStage),
                  suggestionBudgetMax:
                    suggestionBudgetMax ??
                    (prev.predictionSafeguards?.suggestionBudgetMax ||
                      DEFAULT_PREDICTION_SAFEGUARDS.suggestionBudgetMax),
                },
                habits: createdHabits.length > 0 ? createdHabits : prev.habits,
                osProjects: createdProj ? [createdProj] : prev.osProjects || [],
              };
            });

            if (firstCaptureText) {
              setTimeout(() => handleQuickCapture(firstCaptureText), 120);
            }

            if (launchSection) {
              setActiveSection(launchSection);
            }

            setOnboardingModalOpen(false);
            showToast(`Welcome to BlueNote, ${name}! Your clean workspace is ready.`);
          }}
        />
      </div>
    </div>
  );
}
