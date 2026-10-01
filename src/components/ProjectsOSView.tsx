import React, { useState, useEffect, useRef } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Archive,
  RotateCcw,
  Copy,
  Trash2,
  Edit3,
  FileText,
  Image as ImageIcon,
  ListTodo,
  Sparkles,
  Clock,
  ArrowLeft,
  Upload,
  GitMerge,
  Network,
  Settings,
  Music,
  Video,
  FolderOpen,
  Check,
  X,
  HardDrive,
  Download,
} from 'lucide-react';
import {
  OSProject,
  ProjectDocument,
  ProjectOSModuleTab,
  ProjectOSTask,
  ProjectTemplateType,
} from '../types/projectsOS';
import {
  convertDocumentToProjectTasks,
  createProjectFromTemplate,
  createStarterOSProjects,
  formatBytes,
  stripLegacyDemoOSProjects,
} from '../services/projectsOSService';
import { ProjectsOSDocumentsSubView } from './ProjectsOSDocumentsSubView';
import { ProjectsOSModulesSubView } from './ProjectsOSModulesSubView';
import { compressImageFileToDataUrl } from '../types/bluenote';

const STORAGE_KEY = 'bluenote_ai_projects_os_clean_v2';

interface ProjectsOSViewProps {
  initialProjects?: OSProject[];
  onSyncProjectsToWorkspace?: (projects: OSProject[]) => void;
  onCreateGlobalTask?: (params: {
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    dueDate: string;
    subChecklist: { id: string; text: string; completed: boolean }[];
  }) => void;
  showToast: (msg: string) => void;
}

export const ProjectsOSView: React.FC<ProjectsOSViewProps> = ({
  initialProjects,
  onSyncProjectsToWorkspace,
  onCreateGlobalTask,
  showToast,
}) => {
  const [projects, setProjects] = useState<OSProject[]>(() => {
    try {
      localStorage.removeItem('bluenote_ai_projects_os_v1');
    } catch {
      // ignore
    }
    if (Array.isArray(initialProjects) && initialProjects.length > 0) {
      return stripLegacyDemoOSProjects(initialProjects);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return stripLegacyDemoOSProjects(parsed);
      }
    } catch {
      // Fallback to clean empty projects
    }
    return createStarterOSProjects();
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectOSModuleTab>('overview');

  // Home screen filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'active' | 'recent-opened' | 'recent-modified' | 'archived'
  >('active');
  const [sortBy, setSortBy] = useState<'modified' | 'opened' | 'name' | 'docs'>('modified');

  // Create Project Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjTemplate, setNewProjTemplate] =
    useState<ProjectTemplateType>('Blank Project');
  const [newProjColor, setNewProjColor] = useState('#2563eb');
  const [newProjTags, setNewProjTags] = useState('');
  const [newProjCover, setNewProjCover] = useState<string | undefined>(undefined);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const importManifestInputRef = useRef<HTMLInputElement | null>(null);

  // Rename Project inline state
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Ignore quota errors on large local snapshots
    }
    onSyncProjectsToWorkspace?.(projects);
  }, [projects]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const updateActiveProject = (updater: (prev: OSProject) => OSProject) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? updater(p) : p))
    );
  };

  const handleOpenProject = (proj: OSProject, initialTab: ProjectOSModuleTab = 'overview') => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === proj.id ? { ...p, lastOpenedAt: now } : p))
    );
    setActiveProjectId(proj.id);
    setActiveTab(initialTab);
  };

  const handleCreateProject = () => {
    if (!newProjName.trim()) {
      showToast('Please enter a project name.');
      return;
    }
    const created = createProjectFromTemplate({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      template: newProjTemplate,
      color: newProjColor,
      icon: 'FolderKanban',
      tags: newProjTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      coverImage: newProjCover,
    });
    setProjects((prev) => [created, ...prev]);
    setIsCreateModalOpen(false);
    setNewProjName('');
    setNewProjDesc('');
    setNewProjCover(undefined);
    setActiveProjectId(created.id);
    setActiveTab('overview');
    showToast(`Created project "${created.name}"!`);
  };

  const handleDuplicateProject = (proj: OSProject) => {
    const now = new Date().toISOString();
    const copy: OSProject = {
      ...JSON.parse(JSON.stringify(proj)),
      id: `osproj-${Date.now()}`,
      name: `${proj.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };
    setProjects((prev) => [copy, ...prev]);
    showToast(`Duplicated "${proj.name}"!`);
  };

  const handleImportManifest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const p = parsed.project;
      if (!p || !p.Metadata) {
        showToast('Invalid Project_Manifest.json file.');
        return;
      }
      const now = new Date().toISOString();
      const imported: OSProject = {
        id: `osproj-imp-${Date.now()}`,
        name: `${p.Metadata.name || 'Imported Project'} (Restored)`,
        description: p.Metadata.description || 'Restored from Project_Manifest.json',
        color: p.Metadata.color || '#2563eb',
        icon: p.Metadata.icon || 'FolderKanban',
        tags: Array.isArray(p.Tags) ? p.Tags : ['Restored'],
        template: p.Metadata.template || 'Custom',
        permission: p.Settings?.permission || 'Admin',
        processingMode: p.Settings?.processingMode || 'Hybrid AI Processing',
        isArchived: false,
        createdAt: p.Metadata.createdAt || now,
        updatedAt: now,
        lastOpenedAt: now,
        quotaBytesMax: p.Metadata.quotaBytesMax || 10 * 1024 * 1024 * 1024,
        documents: Array.isArray(p.Documents) ? p.Documents : [],
        files: Array.isArray(p.Files) ? p.Files : [],
        notes: Array.isArray(p.Notes) ? p.Notes : [],
        tasks: Array.isArray(p.Tasks) ? p.Tasks : [],
        media: Array.isArray(p.Media) ? p.Media : [],
        photoAlbums: Array.isArray(p.Albums) ? p.Albums : [],
        relationships: Array.isArray(p.Relationships) ? p.Relationships : [],
        smartCollections: Array.isArray(p.SmartCollections) ? p.SmartCollections : [],
        workflows: Array.isArray(p.Workflows) ? p.Workflows : [],
        sandboxProposals: [],
        aiActivity: Array.isArray(p.AIOperations) ? p.AIOperations : [],
        timeline: Array.isArray(p.Timeline) ? p.Timeline : [],
      };
      setProjects((prev) => [imported, ...prev]);
      showToast(`Restored project "${imported.name}" from manifest!`);
    } catch {
      showToast('Failed to parse Project_Manifest.json.');
    }
  };

  // ============================================================================
  // ACTIVE PROJECT WORKSPACE VIEW
  // ============================================================================
  if (activeProject) {
    const totalPhotos = activeProject.photoAlbums.reduce(
      (acc, a) => acc + a.photos.length,
      0
    );
    const openTasks = activeProject.tasks.filter((t) => t.status !== 'Done');
    const docBytes = activeProject.documents.reduce((a, d) => a + d.sizeBytes, 0);
    const mediaBytes = activeProject.media.reduce((a, m) => a + m.sizeBytes, 0);
    const photoBytes = activeProject.photoAlbums.reduce(
      (a, alb) => a + alb.photos.reduce((s, p) => s + p.sizeBytes, 0),
      0
    );
    const fileBytes = activeProject.files.reduce((a, f) => a + f.sizeBytes, 0);
    const usedBytes = docBytes + mediaBytes + photoBytes + fileBytes;

    const navTabs: { id: ProjectOSModuleTab; label: string; badge?: number }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'documents', label: 'Documents', badge: activeProject.documents.length },
      { id: 'files', label: 'Files', badge: activeProject.files.length },
      { id: 'notes', label: 'Notes', badge: activeProject.notes.length },
      { id: 'tasks', label: 'Tasks', badge: activeProject.tasks.length },
      { id: 'media', label: 'Media', badge: activeProject.media.length },
      { id: 'photo-albums', label: 'Photo Albums', badge: totalPhotos },
      { id: 'ai-workspace', label: 'AI Workspace' },
      { id: 'search', label: 'Search' },
      { id: 'timeline', label: 'Timeline', badge: activeProject.timeline.length },
      { id: 'knowledge-graph', label: 'Knowledge Graph', badge: activeProject.relationships.length },
      { id: 'settings', label: 'Settings' },
    ];

    return (
      <div className="space-y-5">
        {/* Top Project Workspace Header */}
        <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveProjectId(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> All Projects
              </button>
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-sm"
                style={{ backgroundColor: activeProject.color || '#2563eb' }}
              >
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {activeProject.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                    {activeProject.template}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                    {formatBytes(usedBytes)} / 10 GB Quota
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeProject.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('ai-workspace')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> ASK THIS PROJECT
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Upload Documents (10 GB)
              </button>
            </div>
          </div>

          {/* 12-Module Horizontal Workspace Navigation Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
            {navTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      activeTab === t.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* MODULE 1: OVERVIEW DASHBOARD (SECTION 4) */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Actions Bar */}
            <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-2">
                Quick Actions:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '[ UPLOAD ]', tab: 'documents' as ProjectOSModuleTab },
                  { label: '[ NEW DOCUMENT ]', tab: 'documents' as ProjectOSModuleTab },
                  { label: '[ NEW NOTE ]', tab: 'notes' as ProjectOSModuleTab },
                  { label: '[ NEW TASK ]', tab: 'tasks' as ProjectOSModuleTab },
                  { label: '[ ASK AI ]', tab: 'ai-workspace' as ProjectOSModuleTab },
                  { label: '[ MERGE DOCUMENTS ]', tab: 'documents' as ProjectOSModuleTab },
                  { label: '[ PHOTO ALBUM ]', tab: 'photo-albums' as ProjectOSModuleTab },
                ].map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => setActiveTab(qa.tab)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-mono font-extrabold transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Documents', value: activeProject.documents.length, tab: 'documents' as ProjectOSModuleTab },
                { label: 'Open Tasks', value: openTasks.length, tab: 'tasks' as ProjectOSModuleTab },
                { label: 'Photos', value: totalPhotos, tab: 'photo-albums' as ProjectOSModuleTab },
                { label: 'Audio / Video', value: activeProject.media.length, tab: 'media' as ProjectOSModuleTab },
                { label: 'Scratchpad Notes', value: activeProject.notes.length, tab: 'notes' as ProjectOSModuleTab },
                { label: 'Knowledge Links', value: activeProject.relationships.length, tab: 'knowledge-graph' as ProjectOSModuleTab },
              ].map((stat) => (
                <div
                  key={stat.label}
                  onClick={() => setActiveTab(stat.tab)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Overview Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Recent Documents & Versions */}
              <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Recent Documents &amp; Versions
                  </h3>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    Open Library →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {activeProject.documents.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No documents uploaded yet. Upload `.txt`, `.md`, `.doc`, `.docx`, or `.pdf` files up to 10 GB.
                      </p>
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
                      >
                        + Upload or Create Document
                      </button>
                    </div>
                  ) : (
                    activeProject.documents.slice(0, 4).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setActiveTab('documents')}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 cursor-pointer hover:border-blue-500/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {doc.filename}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                            v{doc.versions.length} • {doc.currentStage}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {doc.aiSummary}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Open Tasks & Upcoming Deadlines */}
              <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-emerald-500" />
                    Open Tasks &amp; Deadlines
                  </h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    All Tasks →
                  </button>
                </div>
                <div className="space-y-2">
                  {activeProject.tasks.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No tasks yet. Create a checklist or convert a document into tasks with AI.
                      </p>
                      <button
                        onClick={() => setActiveTab('tasks')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold"
                      >
                        + Add Project Task
                      </button>
                    </div>
                  ) : (
                    activeProject.tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setActiveTab('tasks')}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div>
                          <div
                            className={`text-xs font-extrabold ${
                              task.status === 'Done'
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Due {task.dueDate} • {task.checklist.filter((c) => c.completed).length}/
                            {task.checklist.length} steps
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold">
                          {task.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI Activity & Important Scratchpad Notes */}
              <div className="lg:col-span-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Recent AI Operations
                </h3>
                <div className="space-y-2">
                  {activeProject.aiActivity.length === 0 && activeProject.notes.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No AI operations or scratchpad notes yet.
                      </p>
                      <button
                        onClick={() => setActiveTab('ai-workspace')}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-extrabold"
                      >
                        Open AI Workspace
                      </button>
                    </div>
                  ) : (
                    <>
                      {activeProject.aiActivity.slice(0, 3).map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-1"
                        >
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {act.actionTitle}
                          </div>
                          <p className="text-[11px] text-slate-500">{act.details}</p>
                        </div>
                      ))}
                      {activeProject.notes.slice(0, 2).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => setActiveTab('notes')}
                          className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 cursor-pointer"
                        >
                          <div className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
                            Pinned Scratchpad Note
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {n.title}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {n.content}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: DOCUMENTS (SECTIONS 5-16) */}
        {activeTab === 'documents' && (
          <ProjectsOSDocumentsSubView
            project={activeProject}
            onUpdateProject={updateActiveProject}
            onConvertDocToTasks={(doc: ProjectDocument) => {
              const createdTask = convertDocumentToProjectTasks(
                activeProject.id,
                doc.filename,
                doc.finalContent,
                doc.id
              );
              updateActiveProject((prev) => ({
                ...prev,
                tasks: [createdTask, ...prev.tasks],
              }));
              setActiveTab('tasks');
              showToast(`Converted "${doc.filename}" into a Project Task checklist!`);
            }}
            showToast={showToast}
          />
        )}

        {/* MODULES 3-12: FILES, NOTES, TASKS, MEDIA, PHOTO ALBUMS, AI WORKSPACE, SEARCH, TIMELINE, KNOWLEDGE GRAPH, SETTINGS */}
        {activeTab !== 'overview' && activeTab !== 'documents' && (
          <ProjectsOSModulesSubView
            project={activeProject}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onUpdateProject={updateActiveProject}
            onPushTaskToGlobalWorkspace={(task: ProjectOSTask, projectName: string) => {
              if (onCreateGlobalTask) {
                onCreateGlobalTask({
                  title: `[${projectName}] ${task.title}`,
                  description: task.description,
                  priority: task.priority,
                  dueDate: task.dueDate,
                  subChecklist: task.checklist,
                });
              }
              showToast(`Synced "${task.title}" to Global Tasks & Checklists!`);
            }}
            showToast={showToast}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // PROJECTS HOME SCREEN (SECTION 1)
  // ============================================================================
  const filteredProjects = projects
    .filter((p) => {
      if (filterMode === 'archived') return p.isArchived;
      if (p.isArchived) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.template.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (filterMode === 'recent-opened' || sortBy === 'opened') {
        return new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime();
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'docs') return b.documents.length - a.documents.length;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Projects OS Hero Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white border border-blue-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-extrabold uppercase tracking-widest text-blue-300">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Project Operating System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              PROJECTS WORKSPACE
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl">
              Complete container for documents (10 GB chunked uploads), version history &amp; visual diffs, multi-document merge, semantic search, smart collections, audio/video transcripts, standalone HTML photo albums, knowledge graphs, and non-destructive AI workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={importManifestInputRef}
              type="file"
              accept=".json"
              onChange={handleImportManifest}
              className="hidden"
            />
            <button
              onClick={() => importManifestInputRef.current?.click()}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-extrabold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Restore Manifest (.JSON)
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" /> [ + NEW PROJECT ]
            </button>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, tag, or template..."
            className="w-full bg-transparent text-xs font-semibold focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'active', label: 'Active Projects' },
              { id: 'recent-opened', label: 'Recently Opened' },
              { id: 'recent-modified', label: 'Recently Modified' },
              { id: 'archived', label: 'Archived' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                filterMode === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="modified">Sort: Last Modified</option>
            <option value="opened">Sort: Recently Opened</option>
            <option value="name">Sort: Alphabetical</option>
            <option value="docs">Sort: Document Count</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid or Clean Zero-Demo Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {searchQuery.trim()
                ? 'No Projects Match Your Search'
                : filterMode === 'archived'
                ? 'No Archived Projects'
                : 'Zero Demo Clutter — Your Projects Workspace is Clean & Ready'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create your first isolated AI Project Workspace to upload up to 10 GB of chunked documents, track non-destructive version diffs, merge files, build standalone HTML photo albums, and run AI sandbox workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> [ + NEW PROJECT ]
            </button>
            <button
              onClick={() => importManifestInputRef.current?.click()}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Restore Project_Manifest.json
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProjects.map((proj) => {
          const photoCount = proj.photoAlbums.reduce((a, b) => a + b.photos.length, 0);
          return (
            <div
              key={proj.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Top Color Banner / Cover */}
                <div
                  className="h-24 p-4 flex items-start justify-between text-white relative"
                  style={{
                    background: proj.coverImage
                      ? `linear-gradient(to bottom, rgba(15,23,42,0.45), rgba(15,23,42,0.85)), url(${proj.coverImage}) center/cover`
                      : `linear-gradient(135deg, ${proj.color || '#2563eb'}, #1e1b4b)`,
                  }}
                >
                  <span className="px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider">
                    {proj.template}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRenamingProjectId(proj.id);
                        setRenameText(proj.name);
                      }}
                      className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white"
                      title="Rename project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateProject(proj)}
                      className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white"
                      title="Duplicate project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setProjects((prev) =>
                          prev.map((p) =>
                            p.id === proj.id ? { ...p, isArchived: !p.isArchived } : p
                          )
                        )
                      }
                      className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white"
                      title={proj.isArchived ? 'Restore project' : 'Archive project'}
                    >
                      {proj.isArchived ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setProjects((prev) => prev.filter((p) => p.id !== proj.id))
                      }
                      className="p-1.5 rounded-lg bg-black/30 hover:bg-rose-600 text-white"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {renamingProjectId === proj.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-extrabold"
                      />
                      <button
                        onClick={() => {
                          if (renameText.trim()) {
                            setProjects((prev) =>
                              prev.map((p) =>
                                p.id === proj.id
                                  ? { ...p, name: renameText.trim(), updatedAt: new Date().toISOString() }
                                  : p
                              )
                            );
                          }
                          setRenamingProjectId(null);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingProjectId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {proj.name}
                    </h3>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {proj.description}
                  </p>

                  {/* Counts matching spec */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-center">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {proj.documents.length}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">documents</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-center">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {photoCount}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">photos</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-center">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {proj.tasks.length}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">tasks</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {proj.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Modified {new Date(proj.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleOpenProject(proj, 'overview')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm"
                >
                  [ OPEN PROJECT ]
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* CREATE PROJECT MODAL (SECTION 2) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Create New AI Project Workspace
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g., My Music, Writing Manuscript, Q4 Product Launch..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe the goals, documents, media, and deliverables..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Project Template
                  </label>
                  <select
                    value={newProjTemplate}
                    onChange={(e) =>
                      setNewProjTemplate(e.target.value as ProjectTemplateType)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
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

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Project Accent Color
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[
                      '#2563eb',
                      '#7c3aed',
                      '#059669',
                      '#e11d48',
                      '#d97706',
                      '#0891b2',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewProjColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${
                          newProjColor === c
                            ? 'border-slate-900 dark:border-white scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newProjTags}
                    onChange={(e) => setNewProjTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Cover Image (Optional)
                  </label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await compressImageFileToDataUrl(f, 800, 0.82);
                      setNewProjCover(url);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {newProjCover ? 'Cover Image Attached ✓' : 'Upload Cover Image'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold"
              >
                Create Project Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
