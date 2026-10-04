import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  FileText,
  Upload,
  Plus,
  Search,
  Trash2,
  Download,
  Sparkles,
  Check,
  X,
  Tag,
  Pin,
  CheckSquare,
  Square,
  Music,
  Video,
  Image as ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Wand2,
  GitBranch,
  Clock,
  Network,
  Shield,
  HardDrive,
  Code,
  Play,
  Send,
  Layers,
  AlertCircle,
  ExternalLink,
  ListTodo,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  AISandboxProposal,
  OSProject,
  PhotoAlbumTheme,
  ProjectDocument,
  ProjectGeneralFile,
  ProjectMediaItem,
  ProjectOSModuleTab,
  ProjectOSTask,
  ProjectPhotoItem,
  ProjectRelationship,
  ProjectScratchpadNote,
  RelationshipEntityKind,
} from '../types/projectsOS';
import {
  answerProjectQueryLocally,
  autoTagAndClassifyDocument,
  buildProjectManifest,
  buildProjectZipArchiveBlob,
  computeDocumentMetrics,
  computeImagePerceptualHash,
  convertDocumentToProjectTasks,
  detectDocumentDuplicates,
  detectPhotoAlbumDuplicates,
  formatBytes,
  generateStandalonePhotoAlbumHTML,
  mergeProjectDocumentsByTopic,
  organizeProjectDocumentsWithAI,
  searchProjectKnowledge,
} from '../services/projectsOSService';
import { compressImageFileToDataUrl } from '../types/bluenote';
import {
  generateOrEditImage,
  sharpenAndEnhanceImageDataUrl,
} from '../services/aiService';

interface ProjectsOSModulesSubViewProps {
  project: OSProject;
  activeTab: ProjectOSModuleTab;
  onSelectTab: (tab: ProjectOSModuleTab) => void;
  onUpdateProject: (updater: (prev: OSProject) => OSProject) => void;
  onPushTaskToGlobalWorkspace?: (task: ProjectOSTask, projectName: string) => void;
  showToast: (msg: string) => void;
}

export const ProjectsOSModulesSubView: React.FC<ProjectsOSModulesSubViewProps> = ({
  project,
  activeTab,
  onSelectTab,
  onUpdateProject,
  onPushTaskToGlobalWorkspace,
  showToast,
}) => {
  // General Files state
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileNotesDraft, setFileNotesDraft] = useState<Record<string, string>>({});

  // Scratchpad Notes state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteTags, setNoteTags] = useState('Scratchpad, Idea');
  const [noteSearch, setNoteSearch] = useState('');

  // Project Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<ProjectOSTask['priority']>('High');
  const [newTaskDue, setNewTaskDue] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [newChecklistStep, setNewChecklistStep] = useState<Record<string, string>>({});

  // Media state
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  const mediaElementRefs = useRef<Record<string, HTMLMediaElement | null>>({});
  const [mediaPlaybackRate, setMediaPlaybackRate] = useState<Record<string, number>>({});
  const [mediaLoopActive, setMediaLoopActive] = useState<Record<string, boolean>>({});
  const [mediaCurrentTime, setMediaCurrentTime] = useState<Record<string, number>>({});

  // Photo Album state
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(
    project.photoAlbums[0]?.id || ''
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLightboxFullscreen, setIsLightboxFullscreen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [photoGroupFilter, setPhotoGroupFilter] = useState<string>('ALL');
  const [showHtmlAlbumPreview, setShowHtmlAlbumPreview] = useState(false);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
  const slideshowTimerRef = useRef<number | null>(null);
  const [aiPhotoPrompt, setAiPhotoPrompt] = useState('');
  const [aiPhotoGenerating, setAiPhotoGenerating] = useState(false);
  const [enhancingPhotoId, setEnhancingPhotoId] = useState<string | null>(null);

  // AI Workspace state
  const [compareSandboxId, setCompareSandboxId] = useState<string | null>(null);
  const [newWfName, setNewWfName] = useState('');
  const [newWfTrigger, setNewWfTrigger] = useState<'Manual Chain' | 'On Document Upload' | 'On Scratchpad Save'>('Manual Chain');
  const [newWfSteps, setNewWfSteps] = useState('EXTRACT TEXT, DETECT CONTENT TYPE, TAG, REMOVE DUPLICATES, CREATE MARKDOWN DOCUMENT');
  const [aiQuery, setAiQuery] = useState(
    'Show me everything I have written about this album and what still needs to be done.'
  );
  const [aiResponse, setAiResponse] = useState<{
    answerMarkdown: string;
    citedSources: string[];
  } | null>(() =>
    answerProjectQueryLocally(
      project,
      'Show me everything I have written about this album and what still needs to be done.'
    )
  );
  const [customOrganizePrompt, setCustomOrganizePrompt] = useState(
    'Look through all uploaded documents, pull out all song lyrics, group related sections, remove duplicates, and organize everything into a clean markdown file.'
  );
  const [projectMergeTopic, setProjectMergeTopic] = useState(
    'Merge all documents about album release planning, marketing, or production notes'
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('songs about losing someone');
  const [searchMode, setSearchMode] = useState<'exact' | 'semantic'>('semantic');
  const [searchTypeFilter, setSearchTypeFilter] = useState<
    'all' | 'document' | 'note' | 'task' | 'media'
  >('all');
  const [searchTagFilter, setSearchTagFilter] = useState<string>('ALL');

  // Knowledge Graph state
  const [relSourceTitle, setRelSourceTitle] = useState('');
  const [relSourceKind, setRelSourceKind] = useState<RelationshipEntityKind>('document');
  const [relTargetTitle, setRelTargetTitle] = useState('');
  const [relTargetKind, setRelTargetKind] = useState<RelationshipEntityKind>('media');
  const [relLabel, setRelLabel] = useState('LYRICS → DEMO');

  // Timeline state
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const allProjectTags = Array.from(
    new Set([
      ...project.tags,
      ...project.documents.flatMap((d) => d.tags),
      ...project.notes.flatMap((n) => n.tags),
      ...project.tasks.flatMap((t) => t.tags),
    ])
  );

  // ============================================================================
  // 1. GENERAL FILES MODULE
  // ============================================================================
  if (activeTab === 'files') {
    const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list || list.length === 0) return;
      const files: File[] = Array.from(list);
      e.target.value = '';
      const now = new Date().toISOString();

      const created: ProjectGeneralFile[] = [];
      for (const f of files) {
        const ext = (f.name.split('.').pop() || 'FILE').toUpperCase();
        let preview = '';
        if (f.size < 256 * 1024 && /\.(csv|json|txt|md)$/i.test(f.name)) {
          try {
            preview = (await f.text()).slice(0, 1200);
          } catch {
            preview = '';
          }
        }
        created.push({
          id: `pfile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          projectId: project.id,
          filename: f.name,
          fileType: ext,
          mimeType: f.type || 'application/octet-stream',
          sizeBytes: f.size,
          uploadedAt: now,
          processingStatus: 'Ready',
          tags: [ext, 'General File'],
          notes: `Uploaded ${f.name} (${formatBytes(f.size)})`,
          extractedPreview: preview,
        });
      }

      onUpdateProject((prev) => ({
        ...prev,
        updatedAt: now,
        files: [...created, ...prev.files],
        timeline: [
          {
            id: `tl-${Date.now()}`,
            projectId: prev.id,
            timestamp: now,
            category: 'upload',
            title: `Uploaded ${created.length} file(s) to General Files`,
            subtitle: created.map((c) => c.filename).join(', '),
          },
          ...prev.timeline,
        ],
      }));
      showToast(`Added ${created.length} file(s) to Project Files.`);
    };

    return (
      <div className="space-y-5">
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              General Project Files
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supports CSV, XLSX, JSON, ZIP, TXT, MD, DOC, DOCX, PDF, Images, Audio, and Video assets.
            </p>
          </div>
          <div>
            <input
              ref={generalFileInputRef}
              type="file"
              multiple
              onChange={handleGeneralFileUpload}
              className="hidden"
            />
            <button
              onClick={() => generalFileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" /> + Upload Project Files
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-extrabold">
                      {file.fileType}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {file.filename}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatBytes(file.sizeBytes)} • Status: {file.processingStatus}
                  </p>
                </div>
                <button
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      files: prev.files.filter((x) => x.id !== file.id),
                    }))
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {file.extractedPreview && (
                <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {file.extractedPreview}
                </pre>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  File Notes &amp; Context
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fileNotesDraft[file.id] ?? file.notes}
                    onChange={(e) =>
                      setFileNotesDraft((prev) => ({ ...prev, [file.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <button
                    onClick={() => {
                      const updatedNote = fileNotesDraft[file.id] ?? file.notes;
                      onUpdateProject((prev) => ({
                        ...prev,
                        files: prev.files.map((f) =>
                          f.id === file.id ? { ...f, notes: updatedNote } : f
                        ),
                      }));
                      showToast('Saved file note.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))}
          {project.files.length === 0 && (
            <div className="col-span-full p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-500">
              No general files uploaded yet. Click &ldquo;+ Upload Project Files&rdquo; to attach CSVs, archives, spreadsheets, or datasets.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. NOTES / SCRATCHPAD MODULE
  // ============================================================================
  if (activeTab === 'notes') {
    const filteredNotes = project.notes
      .filter((n) => {
        if (!noteSearch.trim()) return true;
        const q = noteSearch.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

    const handleAddScratchpadNote = () => {
      if (!noteBody.trim() && !noteTitle.trim()) return;
      const now = new Date().toISOString();
      const created: ProjectScratchpadNote = {
        id: `pnote-${Date.now()}`,
        projectId: project.id,
        title: noteTitle.trim() || `Quick Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        content: noteBody.trim(),
        isPinned: false,
        tags: noteTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };
      onUpdateProject((prev) => ({
        ...prev,
        updatedAt: now,
        notes: [created, ...prev.notes],
      }));
      setNoteTitle('');
      setNoteBody('');
      showToast('Added note to Project Scratchpad.');
    };

    const handleAIOrganizeScratchpad = (note: ProjectScratchpadNote) => {
      const lines = note.content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const structured = [
        `# ${note.title} (AI Organized Project Notes)`,
        '',
        `### Key Takeaways & Ideas`,
        ...lines.map((l) => `- ${l.replace(/^[-*•]\s*/, '')}`),
        '',
        `### Suggested Next Steps`,
        `- Review and link these notes to relevant project documents`,
        `- Convert action items into Project Tasks`,
      ].join('\n');

      const now = new Date().toISOString();
      onUpdateProject((prev) => ({
        ...prev,
        updatedAt: now,
        notes: prev.notes.map((n) =>
          n.id === note.id
            ? { ...n, content: structured, organizedByAi: true, updatedAt: now }
            : n
        ),
        aiActivity: [
          {
            id: `aiact-${Date.now()}`,
            projectId: prev.id,
            timestamp: now,
            actionTitle: `Transformed scratchpad "${note.title}" into structured notes`,
            details: `Organized ${lines.length} raw thought lines into Markdown sections.`,
            sourceItems: [note.title],
          },
          ...prev.aiActivity,
        ],
      }));
      showToast('AI organized scratchpad note into structured Markdown!');
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-3 h-fit">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Fast Project Scratchpad
          </h3>
          <p className="text-xs text-slate-500">
            Dump raw thoughts, lyrics, or research snippets without worrying about formatting.
          </p>
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title (optional)..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
          />
          <textarea
            rows={6}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Write raw ideas, lyrics, meeting thoughts, or markdown here..."
            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono leading-relaxed"
          />
          <input
            type="text"
            value={noteTags}
            onChange={(e) => setNoteTags(e.target.value)}
            placeholder="Tags (comma separated)..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
          />
          <button
            onClick={handleAddScratchpadNote}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Save to Project Scratchpad
          </button>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search scratchpad notes & tags..."
              className="flex-1 bg-transparent text-xs focus:outline-none"
            />
          </div>

          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {note.isPinned && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                        PINNED
                      </span>
                    )}
                    {note.organizedByAi && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-extrabold">
                        AI ORGANIZED
                      </span>
                    )}
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {note.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAIOrganizeScratchpad(note)}
                    className="px-2.5 py-1 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-300 text-[11px] font-extrabold flex items-center gap-1"
                    title="Turn my scratchpad into organized project notes"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> AI Organize
                  </button>
                  <button
                    onClick={() =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        notes: prev.notes.map((n) =>
                          n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
                        ),
                      }))
                    }
                    className={`p-1.5 rounded-lg ${
                      note.isPinned
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Pin note"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        notes: prev.notes.filter((n) => n.id !== note.id),
                      }))
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <pre className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                {note.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. TASKS & CHECKLISTS MODULE
  // ============================================================================
  if (activeTab === 'tasks') {
    const handleAddTask = () => {
      if (!newTaskTitle.trim()) return;
      const now = new Date().toISOString();
      const created: ProjectOSTask = {
        id: `ptask-${Date.now()}`,
        projectId: project.id,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || 'Project milestone task',
        status: 'Todo',
        priority: newTaskPriority,
        dueDate: newTaskDue,
        tags: [project.name],
        checklist: [],
        createdAt: now,
      };
      onUpdateProject((prev) => ({
        ...prev,
        updatedAt: now,
        tasks: [created, ...prev.tasks],
      }));
      setNewTaskTitle('');
      setNewTaskDesc('');
      showToast('Created project task.');
    };

    return (
      <div className="space-y-5">
        {/* AI Convert Document to Checklist Bar */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-blue-500/25 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Project Tasks &amp; AI Checklist Generator
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Manage project-specific checklists, convert any document into tasks, or push tasks to the main Tasks &amp; Checklists section.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onPushTaskToGlobalWorkspace && project.tasks.some((t) => !t.syncedToGlobalTasks) && (
              <button
                onClick={() => {
                  const unsynced = project.tasks.filter((t) => !t.syncedToGlobalTasks);
                  unsynced.forEach((t) => onPushTaskToGlobalWorkspace(t, project.name));
                  onUpdateProject((prev) => ({
                    ...prev,
                    tasks: prev.tasks.map((t) => ({ ...t, syncedToGlobalTasks: true })),
                  }));
                  showToast(`Synced ${unsynced.length} project task(s) to Global Tasks & Today View!`);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Sync All Open Tasks to Global Tasks
              </button>
            )}
            {project.documents.slice(0, 3).map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  const taskFromDoc = convertDocumentToProjectTasks(
                    project.id,
                    doc.filename,
                    doc.finalContent,
                    doc.id
                  );
                  onUpdateProject((prev) => ({
                    ...prev,
                    tasks: [taskFromDoc, ...prev.tasks],
                  }));
                  showToast(`Converted "${doc.filename}" into a ${taskFromDoc.checklist.length}-step checklist!`);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-500/30 text-xs font-extrabold text-blue-600 dark:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Turn &ldquo;{doc.filename}&rdquo; into Checklist
              </button>
            ))}
          </div>
        </div>

        {/* Create Task Row */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title (e.g., Master tracks, Create promotional assets)..."
            className="md:col-span-4 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
          />
          <input
            type="text"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Details or deliverable notes..."
            className="md:col-span-3 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as ProjectOSTask['priority'])}
            className="md:col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
          >
            <option value="Critical">Critical Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
          <input
            type="date"
            value={newTaskDue}
            onChange={(e) => setNewTaskDue(e.target.value)}
            className="md:col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
          />
          <button
            onClick={handleAddTask}
            className="md:col-span-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        tasks: prev.tasks.map((t) =>
                          t.id === task.id
                            ? { ...t, status: t.status === 'Done' ? 'Todo' : 'Done' }
                            : t
                        ),
                      }))
                    }
                    className="mt-0.5 text-blue-600 dark:text-blue-400"
                  >
                    {task.status === 'Done' ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <h4
                      className={`text-sm font-extrabold ${
                        task.status === 'Done'
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold">
                    {task.priority}
                  </span>
                  {onPushTaskToGlobalWorkspace && (
                    <button
                      onClick={() => {
                        onPushTaskToGlobalWorkspace(task, project.name);
                        onUpdateProject((prev) => ({
                          ...prev,
                          tasks: prev.tasks.map((t) =>
                            t.id === task.id ? { ...t, syncedToGlobalTasks: true } : t
                          ),
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1"
                      title="Also send this task to the global Tasks & Checklists view"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {task.syncedToGlobalTasks ? 'Synced to Tasks' : 'Send to Tasks'}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        tasks: prev.tasks.filter((t) => t.id !== task.id),
                      }))
                    }
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-checklist items */}
              <div className="pl-7 space-y-1.5">
                {task.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          tasks: prev.tasks.map((t) =>
                            t.id === task.id
                              ? {
                                  ...t,
                                  checklist: t.checklist.map((c) =>
                                    c.id === item.id ? { ...c, completed: !c.completed } : c
                                  ),
                                }
                              : t
                          ),
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span className={item.completed ? 'line-through text-slate-400' : ''}>
                      {item.text}
                    </span>
                  </label>
                ))}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newChecklistStep[task.id] || ''}
                    onChange={(e) =>
                      setNewChecklistStep((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    placeholder="+ Add checklist step..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <button
                    onClick={() => {
                      const text = (newChecklistStep[task.id] || '').trim();
                      if (!text) return;
                      onUpdateProject((prev) => ({
                        ...prev,
                        tasks: prev.tasks.map((t) =>
                          t.id === task.id
                            ? {
                                ...t,
                                checklist: [
                                  ...t.checklist,
                                  { id: `chk-${Date.now()}`, text, completed: false },
                                ],
                              }
                            : t
                        ),
                      }));
                      setNewChecklistStep((prev) => ({ ...prev, [task.id]: '' }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. MEDIA WORKSPACE (AUDIO & VIDEO + TRANSCRIPTS)
  // ============================================================================
  if (activeTab === 'media') {
    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list || list.length === 0) return;
      const files: File[] = Array.from(list);
      e.target.value = '';
      const now = new Date().toISOString();

      const items: ProjectMediaItem[] = files.map((f, idx) => {
        const isVideo = f.type.startsWith('video') || /\.(mp4|mov|webm|mkv)$/i.test(f.name);
        const isImage = f.type.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name);
        const mediaType: ProjectMediaItem['mediaType'] = isVideo
          ? 'video'
          : isImage
          ? 'image'
          : 'audio';
        return {
          id: `pmed-${Date.now()}-${idx}`,
          projectId: project.id,
          filename: f.name,
          mediaType,
          mimeType: f.type || 'audio/mpeg',
          sizeBytes: f.size,
          durationSeconds: 180,
          transcriptOrCaptions: `Auto-indexed transcript for ${f.name}. Add spoken lyrics, dialogue, or timestamps here for instant semantic search.`,
          sceneInfo: `${mediaType.toUpperCase()} asset • ${formatBytes(f.size)}`,
          tags: [mediaType.toUpperCase(), 'Studio'],
          dataUrl: URL.createObjectURL(f),
          uploadedAt: now,
        };
      });

      onUpdateProject((prev) => ({
        ...prev,
        media: [...items, ...prev.media],
      }));
      showToast(`Uploaded ${items.length} media recording(s) to Project Media.`);
    };

    const filteredMedia = project.media.filter((m) => {
      if (!mediaSearch.trim()) return true;
      const q = mediaSearch.toLowerCase();
      return (
        m.filename.toLowerCase().includes(q) ||
        m.transcriptOrCaptions.toLowerCase().includes(q) ||
        m.sceneInfo.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    return (
      <div className="space-y-5">
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Audio, Video &amp; Transcript Intelligence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Import and manage project audio &amp; video recordings, search spoken words and transcripts, loop A-B sections, and jump to timestamps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder='Search transcripts (e.g. "hello goodbye")...'
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-64"
              />
              <input
                ref={mediaInputRef}
                type="file"
                multiple
                accept="audio/*,video/*,image/*"
                onChange={handleMediaUpload}
                className="hidden"
              />
              <button
                onClick={() => mediaInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> + Upload Audio / Video
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {item.mediaType === 'video' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <Music className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {item.filename}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {item.mediaType.toUpperCase()} • {formatBytes(item.sizeBytes)} • {item.sceneInfo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      media: prev.media.filter((m) => m.id !== item.id),
                    }))
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pro Media Studio: Waveform Visualizer + Speed (0.5x-2.0x) + A-B Section Loop + Timestamp Insertion */}
              {item.mediaType === 'audio' && (
                <div className="p-3 rounded-2xl bg-slate-950 text-white space-y-2.5 border border-slate-800">
                  {/* Interactive 40-Bar Waveform Visualizer */}
                  <div className="flex items-end gap-1 h-12 px-2 pt-2">
                    {Array.from({ length: 40 }).map((_, bIdx) => {
                      const seed = (item.filename.charCodeAt(bIdx % item.filename.length) + bIdx * 17) % 100;
                      const heightPct = 20 + (seed % 75);
                      const curSec = mediaCurrentTime[item.id] || 0;
                      const durSec = item.durationSeconds || 180;
                      const progressRatio = Math.min(1, curSec / Math.max(1, durSec));
                      const isPlayed = bIdx / 40 <= progressRatio;
                      const inLoopRange =
                        item.loopStartSec !== undefined &&
                        item.loopEndSec !== undefined &&
                        bIdx / 40 >= item.loopStartSec / Math.max(1, durSec) &&
                        bIdx / 40 <= item.loopEndSec / Math.max(1, durSec);
                      return (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            const targetSec = Math.round((bIdx / 40) * durSec);
                            const el = mediaElementRefs.current[item.id];
                            if (el) {
                              el.currentTime = targetSec;
                            }
                            setMediaCurrentTime((prev) => ({ ...prev, [item.id]: targetSec }));
                          }}
                          style={{ height: `${heightPct}%` }}
                          title={`Seek to ${Math.floor(((bIdx / 40) * durSec) / 60)}:${String(
                            Math.floor(((bIdx / 40) * durSec) % 60)
                          ).padStart(2, '0')}`}
                          className={`flex-1 rounded-full transition-all ${
                            inLoopRange
                              ? 'bg-amber-400'
                              : isPlayed
                              ? 'bg-blue-500'
                              : 'bg-slate-700 hover:bg-slate-500'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {item.dataUrl && (
                    <audio
                      ref={(el) => {
                        mediaElementRefs.current[item.id] = el;
                      }}
                      controls
                      src={item.dataUrl}
                      onTimeUpdate={(e) => {
                        const el = e.currentTarget;
                        const cur = el.currentTime;
                        setMediaCurrentTime((prev) => ({ ...prev, [item.id]: cur }));
                        if (
                          mediaLoopActive[item.id] &&
                          item.loopEndSec !== undefined &&
                          cur >= item.loopEndSec
                        ) {
                          el.currentTime = item.loopStartSec || 0;
                        }
                      }}
                      className="w-full h-9"
                    />
                  )}
                </div>
              )}

              {item.dataUrl && item.mediaType === 'video' && (
                <video
                  ref={(el) => {
                    mediaElementRefs.current[item.id] = el;
                  }}
                  controls
                  src={item.dataUrl}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    const cur = el.currentTime;
                    setMediaCurrentTime((prev) => ({ ...prev, [item.id]: cur }));
                    if (
                      mediaLoopActive[item.id] &&
                      item.loopEndSec !== undefined &&
                      cur >= item.loopEndSec
                    ) {
                      el.currentTime = item.loopStartSec || 0;
                    }
                  }}
                  className="w-full max-h-48 rounded-xl bg-black"
                />
              )}

              {/* Playback Speed, A-B Loop Controls & Timestamp Stamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">Speed:</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setMediaPlaybackRate((prev) => ({ ...prev, [item.id]: rate }));
                        const el = mediaElementRefs.current[item.id];
                        if (el) el.playbackRate = rate;
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                        (mediaPlaybackRate[item.id] || 1) === rate
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.floor(mediaCurrentTime[item.id] || 0);
                      onUpdateProject((prev) => ({
                        ...prev,
                        media: prev.media.map((m) =>
                          m.id === item.id ? { ...m, loopStartSec: cur } : m
                        ),
                      }));
                      showToast(`Set Loop Start [A] at ${cur}s`);
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  >
                    [A: {item.loopStartSec ?? 0}s]
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.max(
                        (item.loopStartSec || 0) + 2,
                        Math.floor(mediaCurrentTime[item.id] || 15)
                      );
                      onUpdateProject((prev) => ({
                        ...prev,
                        media: prev.media.map((m) =>
                          m.id === item.id ? { ...m, loopEndSec: cur } : m
                        ),
                      }));
                      showToast(`Set Loop End [B] at ${cur}s`);
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  >
                    [B: {item.loopEndSec ?? 'End'}]
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMediaLoopActive((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className={`px-2 py-0.5 rounded font-bold ${
                      mediaLoopActive[item.id]
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {mediaLoopActive[item.id] ? 'Loop ON' : 'Loop A-B'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sec = Math.floor(mediaCurrentTime[item.id] || 0);
                      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                      const ss = String(sec % 60).padStart(2, '0');
                      const stamp = `[${mm}:${ss}] `;
                      onUpdateProject((prev) => ({
                        ...prev,
                        media: prev.media.map((m) =>
                          m.id === item.id
                            ? { ...m, transcriptOrCaptions: `${m.transcriptOrCaptions}\n${stamp}` }
                            : m
                        ),
                      }));
                      showToast(`Inserted timestamp ${stamp}`);
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold"
                  >
                    + [mm:ss] Stamp
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Searchable Transcript / Vocal Lyrics / Scene Notes
                </label>
                <textarea
                  rows={3}
                  value={item.transcriptOrCaptions}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      media: prev.media.map((m) =>
                        m.id === item.id ? { ...m, transcriptOrCaptions: val } : m
                      ),
                    }));
                  }}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                />
                {/* Clickable [mm:ss] Timestamp Jump Chips */}
                {Array.from(item.transcriptOrCaptions.matchAll(/\[(\d{1,2}):(\d{2})\]/g)).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400">Jump to Timestamp:</span>
                    {Array.from(item.transcriptOrCaptions.matchAll(/\[(\d{1,2}):(\d{2})\]/g)).map(
                      (m, tIdx) => {
                        const mins = parseInt(m[1], 10);
                        const secs = parseInt(m[2], 10);
                        const totalSec = mins * 60 + secs;
                        return (
                          <button
                            key={`${m[0]}-${tIdx}`}
                            type="button"
                            onClick={() => {
                              const el = mediaElementRefs.current[item.id];
                              if (el) {
                                el.currentTime = totalSec;
                                el.play().catch(() => {});
                              }
                              setMediaCurrentTime((prev) => ({ ...prev, [item.id]: totalSec }));
                              showToast(`Jumped to ${m[0]}`);
                            }}
                            className="px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-extrabold"
                          >
                            ▶ {m[0]}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. PHOTO ALBUMS & HTML GALLERY BUILDER (SECTION 22)
  // ============================================================================
  if (activeTab === 'photo-albums') {
    const activeAlbum =
      project.photoAlbums.find((a) => a.id === selectedAlbumId) || project.photoAlbums[0];

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list || list.length === 0 || !activeAlbum) return;
      const files: File[] = Array.from(list);
      e.target.value = '';
      const now = new Date().toISOString();

      const uploadedPhotos: ProjectPhotoItem[] = [];
      for (const f of files) {
        let dataUrl = '';
        try {
          dataUrl = await compressImageFileToDataUrl(f, 900, 0.84);
        } catch {
          dataUrl = URL.createObjectURL(f);
        }
        const perceptualHash = await computeImagePerceptualHash(dataUrl);
        uploadedPhotos.push({
          id: `pho-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          filename: f.name,
          caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          dataUrl,
          sizeBytes: f.size,
          takenAt: now,
          groupName: 'Uploaded Batch',
          tags: ['Photo', 'Gallery'],
          perceptualHash,
        });
      }

      onUpdateProject((prev) => ({
        ...prev,
        photoAlbums: prev.photoAlbums.map((alb) =>
          alb.id === activeAlbum.id
            ? { ...alb, updatedAt: now, photos: [...uploadedPhotos, ...alb.photos] }
            : alb
        ),
        timeline: [
          {
            id: `tl-${Date.now()}`,
            projectId: prev.id,
            timestamp: now,
            category: 'photo',
            title: `Uploaded ${uploadedPhotos.length} photo(s) to "${activeAlbum.title}"`,
            subtitle: 'Generated responsive HTML gallery cards & lightbox previews',
          },
          ...prev.timeline,
        ],
      }));
      showToast(`Added ${uploadedPhotos.length} photo(s) to "${activeAlbum.title}"!`);
    };

    const handleDownloadHTMLAlbum = () => {
      if (!activeAlbum) return;
      const html = generateStandalonePhotoAlbumHTML(activeAlbum);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeAlbum.title.replace(/\s+/g, '_')}_Album.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported standalone HTML photo album "${activeAlbum.title}"!`);
    };

    const handleGenerateAIPhotoIntoAlbum = async () => {
      if (!activeAlbum || aiPhotoGenerating) return;
      const prompt =
        aiPhotoPrompt.trim() ||
        `${project.name} — ultra-crisp 8k DSLR photography, studio lighting, razor-sharp focus`;
      setAiPhotoGenerating(true);
      try {
        const res = await generateOrEditImage({
          prompt: `${prompt}, ultra-crisp 8k DSLR photorealistic, razor-sharp focus`,
          aspectRatio: '16:9',
        });
        const now = new Date().toISOString();
        const perceptualHash = await computeImagePerceptualHash(res.imageUrl);
        const cleanFile =
          prompt
            .replace(/[^\w\s-]/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 5)
            .join('_') || 'FLUX_HD_Photo';
        const newPhoto: ProjectPhotoItem = {
          id: `pho-ai-${Date.now()}`,
          filename: `${cleanFile}.png`,
          caption: `${prompt} (${res.model})`,
          dataUrl: res.imageUrl,
          sizeBytes: 380000,
          takenAt: now,
          groupName: 'AI Studio HD',
          tags: ['FLUX.1-HD', 'AI-Photo', project.name],
          perceptualHash,
        };
        onUpdateProject((prev) => ({
          ...prev,
          updatedAt: now,
          photoAlbums: prev.photoAlbums.map((alb) =>
            alb.id === activeAlbum.id
              ? { ...alb, updatedAt: now, photos: [newPhoto, ...alb.photos] }
              : alb
          ),
          timeline: [
            {
              id: `tl-${Date.now()}`,
              projectId: prev.id,
              timestamp: now,
              category: 'photo',
              title: `Generated Ultra-Crisp AI Photo in "${activeAlbum.title}"`,
              subtitle: `${newPhoto.filename} via ${res.model}`,
            },
            ...prev.timeline,
          ],
        }));
        setAiPhotoPrompt('');
        showToast(`Generated "${newPhoto.filename}" (${res.model}) into "${activeAlbum.title}"!`);
      } catch {
        showToast('Failed to generate AI photo.');
      } finally {
        setAiPhotoGenerating(false);
      }
    };

    const handleSharpenAlbumPhoto = async (photo: ProjectPhotoItem) => {
      if (!activeAlbum || enhancingPhotoId) return;
      setEnhancingPhotoId(photo.id);
      try {
        const sharpenedUrl = await sharpenAndEnhanceImageDataUrl(photo.dataUrl);
        const newHash = await computeImagePerceptualHash(sharpenedUrl);
        onUpdateProject((prev) => ({
          ...prev,
          photoAlbums: prev.photoAlbums.map((a) =>
            a.id === activeAlbum.id
              ? {
                  ...a,
                  photos: a.photos.map((p) =>
                    p.id === photo.id
                      ? {
                          ...p,
                          dataUrl: sharpenedUrl,
                          perceptualHash: newHash,
                          caption: p.caption.includes('[2K Crisp]')
                            ? p.caption
                            : `${p.caption} [2K Crisp]`,
                        }
                      : p
                  ),
                }
              : a
          ),
        }));
        showToast(`Enhanced crispness (Unsharp 2K) for "${photo.filename}"!`);
      } finally {
        setEnhancingPhotoId(null);
      }
    };

    return (
      <div className="space-y-5">
        {/* Top Album Controls */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <select
              value={activeAlbum?.id || ''}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-extrabold"
            >
              {project.photoAlbums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.title} ({alb.photos.length} photos)
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                placeholder="New album name..."
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
              <button
                onClick={() => {
                  if (!newAlbumTitle.trim()) return;
                  const now = new Date().toISOString();
                  const newAlb = {
                    id: `palb-${Date.now()}`,
                    projectId: project.id,
                    title: newAlbumTitle.trim(),
                    subtitle: 'HTML Photo Album',
                    layout: 'grid' as const,
                    photos: [],
                    createdAt: now,
                    updatedAt: now,
                  };
                  onUpdateProject((prev) => ({
                    ...prev,
                    photoAlbums: [...prev.photoAlbums, newAlb],
                  }));
                  setSelectedAlbumId(newAlb.id);
                  setNewAlbumTitle('');
                  showToast(`Created album "${newAlb.title}"`);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                + Album
              </button>
            </div>
          </div>

          {activeAlbum && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Visual Theme Selector (4 Themes) */}
              <select
                value={activeAlbum.theme || 'dark-cinema'}
                onChange={(e) => {
                  const nextTheme = e.target.value as PhotoAlbumTheme;
                  onUpdateProject((prev) => ({
                    ...prev,
                    photoAlbums: prev.photoAlbums.map((a) =>
                      a.id === activeAlbum.id ? { ...a, theme: nextTheme } : a
                    ),
                  }));
                  showToast(`Album theme set to ${nextTheme}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                title="Standalone HTML Album Visual Theme"
              >
                <option value="dark-cinema">Theme: Dark Cinema</option>
                <option value="editorial-white">Theme: Editorial White</option>
                <option value="warm-gallery">Theme: Warm Gallery</option>
                <option value="neon-studio">Theme: Neon Studio</option>
              </select>

              {/* Auto-Play Slideshow Speed Selector */}
              <select
                value={activeAlbum.slideshowIntervalSec || 4}
                onChange={(e) => {
                  const sec = Number(e.target.value) || 4;
                  onUpdateProject((prev) => ({
                    ...prev,
                    photoAlbums: prev.photoAlbums.map((a) =>
                      a.id === activeAlbum.id ? { ...a, slideshowIntervalSec: sec } : a
                    ),
                  }));
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                title="Slideshow Timer Interval"
              >
                <option value={3}>Slideshow: 3s</option>
                <option value={4}>Slideshow: 4s</option>
                <option value={6}>Slideshow: 6s</option>
                <option value={8}>Slideshow: 8s</option>
              </select>

              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      photoAlbums: prev.photoAlbums.map((a) =>
                        a.id === activeAlbum.id ? { ...a, layout: 'grid' } : a
                      ),
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                    activeAlbum.layout === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Modern Grid
                </button>
                <button
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      photoAlbums: prev.photoAlbums.map((a) =>
                        a.id === activeAlbum.id ? { ...a, layout: 'masonry' } : a
                      ),
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                    activeAlbum.layout === 'masonry'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Masonry Layout
                </button>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> + Upload Photos
              </button>
              <button
                onClick={() => {
                  if (!activeAlbum || activeAlbum.photos.length === 0) {
                    showToast('Upload at least 1 photo to start the slideshow.');
                    return;
                  }
                  if (isSlideshowPlaying) {
                    if (slideshowTimerRef.current) {
                      window.clearInterval(slideshowTimerRef.current);
                      slideshowTimerRef.current = null;
                    }
                    setIsSlideshowPlaying(false);
                  } else {
                    if (lightboxIndex === null) setLightboxIndex(0);
                    setIsSlideshowPlaying(true);
                    const intervalMs = (activeAlbum.slideshowIntervalSec || 4) * 1000;
                    if (slideshowTimerRef.current) window.clearInterval(slideshowTimerRef.current);
                    slideshowTimerRef.current = window.setInterval(() => {
                      setLightboxIndex((prev) =>
                        prev === null ? 0 : (prev + 1) % Math.max(1, activeAlbum.photos.length)
                      );
                    }, intervalMs);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
                  isSlideshowPlaying
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                {isSlideshowPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
              </button>
              <button
                onClick={() => setShowHtmlAlbumPreview((v) => !v)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Code className="w-4 h-4" /> {showHtmlAlbumPreview ? 'Hide HTML Preview' : 'Preview HTML Album'}
              </button>
              <button
                onClick={handleDownloadHTMLAlbum}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Export Standalone HTML Album
              </button>
            </div>
          )}
        </div>

        {/* Perceptual Duplicate Photo Detection Banner */}
        {activeAlbum && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 border border-blue-500/25 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 dark:text-blue-300 shrink-0">
              <Sparkles className="w-4 h-4" />
              <span>FLUX.1 8K Photo Generator:</span>
            </div>
            <input
              type="text"
              value={aiPhotoPrompt}
              onChange={(e) => setAiPhotoPrompt(e.target.value)}
              placeholder={`Describe an ultra-crisp photo or cover artwork for "${activeAlbum.title}"...`}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              type="button"
              disabled={aiPhotoGenerating}
              onClick={handleGenerateAIPhotoIntoAlbum}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0"
            >
              {aiPhotoGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating FLUX.1 HD...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate Crisp HD Photo</span>
                </>
              )}
            </button>
          </div>
        )}
        {activeAlbum && detectPhotoAlbumDuplicates(activeAlbum.photos).length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Visual Duplicate Photos Detected ({detectPhotoAlbumDuplicates(activeAlbum.photos).length} duplicate cluster(s) via 8×8 Perceptual Hash)
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {detectPhotoAlbumDuplicates(activeAlbum.photos)
                  .map(
                    (g) =>
                      `${g.primaryFilename} ↔ ${g.duplicatePhotos.map((d) => d.filename).join(', ')} (${g.similarityPercent}% match)`
                  )
                  .join(' • ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const dupGroups = detectPhotoAlbumDuplicates(activeAlbum.photos);
                const removeIds = new Set(
                  dupGroups.flatMap((g) => g.duplicatePhotos.map((p) => p.id))
                );
                onUpdateProject((prev) => ({
                  ...prev,
                  photoAlbums: prev.photoAlbums.map((a) =>
                    a.id === activeAlbum.id
                      ? { ...a, photos: a.photos.filter((p) => !removeIds.has(p.id)) }
                      : a
                  ),
                }));
                showToast(`Removed ${removeIds.size} duplicate photo(s) from "${activeAlbum.title}"!`);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold"
            >
              Deduplicate Album ({detectPhotoAlbumDuplicates(activeAlbum.photos).reduce((acc, g) => acc + g.duplicatePhotos.length, 0)} duplicates)
            </button>
          </div>
        )}

        {/* Group Filter Pills & Live HTML Album Preview */}
        {activeAlbum && (
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', ...Array.from(new Set(activeAlbum.photos.map((p) => p.groupName || 'Portfolio')))].map(
              (grp) => (
                <button
                  key={grp}
                  onClick={() => setPhotoGroupFilter(grp)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    photoGroupFilter === grp
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {grp === 'ALL' ? `All Photos (${activeAlbum.photos.length})` : grp}
                </button>
              )
            )}
          </div>
        )}

        {activeAlbum && showHtmlAlbumPreview && (
          <div className="p-4 rounded-3xl bg-slate-950 border border-indigo-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-mono">
              <span>Live Interactive Standalone HTML Album Preview ({activeAlbum.title}_Album.html)</span>
              <button
                onClick={() => setShowHtmlAlbumPreview(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 text-white"
              >
                Close Preview
              </button>
            </div>
            <iframe
              title="Standalone HTML Photo Album Preview"
              srcDoc={generateStandalonePhotoAlbumHTML(activeAlbum)}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              className="w-full h-[460px] rounded-2xl border border-slate-800 bg-slate-950"
            />
          </div>
        )}

        {/* Gallery Grid / Masonry */}
        {activeAlbum && (
          <div
            className={
              activeAlbum.layout === 'masonry'
                ? 'columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            }
          >
            {activeAlbum.photos
              .filter(
                (p) =>
                  photoGroupFilter === 'ALL' ||
                  (p.groupName || 'Portfolio') === photoGroupFilter
              )
              .map((photo, idx) => (
              <div
                key={photo.id}
                className="break-inside-avoid rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all group"
              >
                <div
                  onClick={() => setLightboxIndex(idx)}
                  className="relative cursor-pointer overflow-hidden bg-slate-950"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                      activeAlbum.layout === 'grid' ? 'h-56' : 'max-h-80'
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-bold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> Open Lightbox
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateProject((prev) => ({
                        ...prev,
                        photoAlbums: prev.photoAlbums.map((a) =>
                          a.id === activeAlbum.id
                            ? {
                                ...a,
                                photos: a.photos.map((p) =>
                                  p.id === photo.id ? { ...p, caption: val } : p
                                ),
                              }
                            : a
                        ),
                      }));
                    }}
                    className="w-full text-xs font-extrabold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate">{photo.filename}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={enhancingPhotoId === photo.id}
                        onClick={() => handleSharpenAlbumPhoto(photo)}
                        className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-sans font-extrabold flex items-center gap-1"
                        title="Apply 3x3 Unsharp Mask & Micro-Contrast Enhancement"
                      >
                        <Sparkles className="w-3 h-3" />
                        {enhancingPhotoId === photo.id ? '...' : '2K Crisp'}
                      </button>
                      <button
                        onClick={() =>
                          onUpdateProject((prev) => ({
                            ...prev,
                            photoAlbums: prev.photoAlbums.map((a) =>
                              a.id === activeAlbum.id
                                ? { ...a, photos: a.photos.filter((p) => p.id !== photo.id) }
                                : a
                            ),
                          }))
                        }
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Viewer Modal */}
        {activeAlbum && lightboxIndex !== null && activeAlbum.photos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-white">
              <span className="font-mono text-xs text-slate-400">
                Photo {lightboxIndex + 1} of {activeAlbum.photos.length} • {activeAlbum.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLightboxFullscreen((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  {isLightboxFullscreen ? 'Standard Fit' : 'Fullscreen Zoom'}
                </button>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4">
              <button
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + activeAlbum.photos.length) % activeAlbum.photos.length
                  )
                }
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <img
                src={activeAlbum.photos[lightboxIndex].dataUrl}
                alt={activeAlbum.photos[lightboxIndex].caption}
                className={`rounded-2xl object-contain transition-all ${
                  isLightboxFullscreen ? 'max-h-[84vh] max-w-[95vw]' : 'max-h-[68vh] max-w-[80vw]'
                }`}
              />
              <button
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % activeAlbum.photos.length)
                }
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center text-white space-y-1">
              <div className="text-base font-extrabold">
                {activeAlbum.photos[lightboxIndex].caption}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {activeAlbum.photos[lightboxIndex].filename}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 6. AI WORKSPACE, SANDBOX MODE & WORKFLOWS (SECTIONS 23-28, 42, 43)
  // ============================================================================
  if (activeTab === 'ai-workspace') {
    const triggerSandboxProposal = (
      title: string,
      actionType: string,
      proposedContent: string,
      sourceDocumentNames: string[],
      sourceSummary: string
    ) => {
      const now = new Date().toISOString();
      const proposal: AISandboxProposal = {
        id: `sbx-${Date.now()}`,
        projectId: project.id,
        title,
        actionType,
        sourceDocumentNames,
        sourceSummary,
        proposedContent,
        status: 'Pending Review',
        createdAt: now,
      };
      onUpdateProject((prev) => ({
        ...prev,
        sandboxProposals: [proposal, ...prev.sandboxProposals],
        aiActivity: [
          {
            id: `aiact-${Date.now()}`,
            projectId: prev.id,
            timestamp: now,
            actionTitle: `Generated AI Sandbox Proposal: "${title}"`,
            details: sourceSummary,
            sourceItems: sourceDocumentNames,
          },
          ...prev.aiActivity,
        ],
      }));
      showToast(`Generated "${title}" in AI Sandbox — review before committing!`);
    };

    const handleCommitSandboxProposal = (prop: AISandboxProposal) => {
      const now = new Date().toISOString();
      const metrics = computeDocumentMetrics(prop.proposedContent);
      const autoMeta = autoTagAndClassifyDocument(prop.title, prop.proposedContent);
      const verId = `ver-${Date.now()}`;
      const newDoc: ProjectDocument = {
        id: `pdoc-${Date.now()}`,
        projectId: project.id,
        filename: prop.title.endsWith('.md') ? prop.title : `${prop.title.replace(/\s+/g, '_')}.md`,
        fileType: 'md',
        sizeBytes: prop.proposedContent.length * 8,
        uploadedAt: now,
        modifiedAt: now,
        processingStatus: 'Ready',
        pageCount: metrics.pageCount,
        wordCount: metrics.wordCount,
        charCount: metrics.charCount,
        tags: [...autoMeta.tags, 'AI-Generated'],
        aiSummary: prop.sourceSummary,
        contentType: autoMeta.contentType,
        completionState: 'Finished',
        originalContent: prop.proposedContent,
        workingContent: prop.proposedContent,
        editedContent: prop.proposedContent,
        finalContent: prop.proposedContent,
        currentStage: 'Final Version',
        currentVersionId: verId,
        sourceReferences: prop.sourceDocumentNames,
        versions: [
          {
            id: verId,
            versionNumber: 1,
            label: `v1 — Approved from AI Sandbox (${prop.actionType})`,
            stage: 'Final Version',
            content: prop.proposedContent,
            createdAt: now,
            author: 'AI Operator',
            wordCount: metrics.wordCount,
            charCount: metrics.charCount,
          },
        ],
      };

      onUpdateProject((prev) => ({
        ...prev,
        documents: [newDoc, ...prev.documents],
        sandboxProposals: prev.sandboxProposals.map((p) =>
          p.id === prop.id ? { ...p, status: 'Committed' } : p
        ),
        timeline: [
          {
            id: `tl-${Date.now()}`,
            projectId: prev.id,
            timestamp: now,
            category: 'ai',
            title: `Approved & saved AI document "${newDoc.filename}"`,
            subtitle: prop.sourceSummary,
          },
          ...prev.timeline,
        ],
      }));
      showToast(`Committed "${newDoc.filename}" to Project Documents!`);
    };

    return (
      <div className="space-y-6">
        {/* ASK THIS PROJECT Command Center */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white border border-blue-500/30 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
                Project-Wide Contextual AI Operator
              </span>
              <h3 className="text-xl font-extrabold mt-1">ASK THIS PROJECT</h3>
              <p className="text-xs text-blue-200/80">
                AI has context across all {project.documents.length} documents, {project.notes.length} notes, {project.tasks.length} tasks, {project.media.length} media recordings, and {project.photoAlbums.length} photo albums.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask anything about this project..."
              className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-xs font-semibold"
            />
            <button
              onClick={() => {
                const res = answerProjectQueryLocally(project, aiQuery);
                setAiResponse(res);
              }}
              className="px-5 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-extrabold flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Ask Project AI
            </button>
          </div>

          {/* Preset Natural Language Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Show me everything I have written about this album and what still needs to be done.',
              'Find all unfinished songs and duplicate versions.',
              'Songs about losing someone',
              'Summarize project progress and open tasks.',
            ].map((sample) => (
              <button
                key={sample}
                onClick={() => {
                  setAiQuery(sample);
                  setAiResponse(answerProjectQueryLocally(project, sample));
                }}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] text-blue-100 font-medium"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>

          {aiResponse && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-blue-400/25 space-y-2">
              <pre className="text-xs font-mono whitespace-pre-wrap text-blue-100 leading-relaxed">
                {aiResponse.answerMarkdown}
              </pre>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-blue-300">
                <span>
                  Provenance Sources: {aiResponse.citedSources.join(', ') || 'Project Index'}
                </span>
                <button
                  onClick={() =>
                    triggerSandboxProposal(
                      'Project_Intelligence_Briefing.md',
                      'Executive Briefing',
                      aiResponse.answerMarkdown,
                      aiResponse.citedSources,
                      `Generated from query: "${aiQuery}"`
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Send Answer to AI Sandbox
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Document AI Lyric & Content Organization Bar (Section 42) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                One-Click AI Project Actions (Non-Destructive Sandbox Pipeline)
              </h4>
              <p className="text-xs text-slate-500">
                AI never overwrites your originals without approval. Every operation outputs to the AI Sandbox below.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customOrganizePrompt}
              onChange={(e) => setCustomOrganizePrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={() => {
                const organized = organizeProjectDocumentsWithAI(
                  project.documents,
                  customOrganizePrompt
                );
                triggerSandboxProposal(
                  organized.title,
                  'Organize Lyrics & Deduplicate',
                  organized.markdownContent,
                  organized.sourceFiles,
                  `Extracted ${organized.sectionsFound} unique sections across ${organized.sourceFiles.length} documents and removed ${organized.duplicatesRemoved} duplicates.`
                );
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" /> Run AI Lyric &amp; Doc Organizer
            </button>
          </div>

          {/* Topic-Focused Multi-Document Merger Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={projectMergeTopic}
              onChange={(e) => setProjectMergeTopic(e.target.value)}
              placeholder="Enter any topic or theme to merge across all uploaded documents..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={() => {
                const merged = mergeProjectDocumentsByTopic(
                  project.documents,
                  projectMergeTopic
                );
                triggerSandboxProposal(
                  merged.title,
                  'Topic-Focused Merge',
                  merged.markdownContent,
                  merged.sourceFiles,
                  `Merged ${merged.sectionsFound} topic-matched sections across ${merged.sourceFiles.length} documents (${merged.duplicatesRemoved} duplicates removed).`
                );
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Layers className="w-4 h-4" /> Merge Documents by Topic
            </button>
          </div>

          {/* 10 Action Buttons from Section 25 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                label: 'Summarize Project',
                run: () => {
                  const res = answerProjectQueryLocally(
                    project,
                    'Show me everything I have written and status summary'
                  );
                  triggerSandboxProposal(
                    'Executive_Project_Summary.md',
                    'Summarize Project',
                    res.answerMarkdown,
                    res.citedSources,
                    'Comprehensive summary of all project documents, tasks, and media.'
                  );
                },
              },
              {
                label: 'Organize Lyrics',
                run: () => {
                  const org = organizeProjectDocumentsWithAI(project.documents);
                  triggerSandboxProposal(
                    org.title,
                    'Organize Lyrics',
                    org.markdownContent,
                    org.sourceFiles,
                    `Grouped ${org.sectionsFound} lyric sections and removed ${org.duplicatesRemoved} duplicates.`
                  );
                },
              },
              {
                label: 'Merge Documents',
                run: () => {
                  const merged = mergeProjectDocumentsByTopic(
                    project.documents,
                    projectMergeTopic
                  );
                  triggerSandboxProposal(
                    merged.title,
                    'Merge Documents',
                    merged.markdownContent,
                    merged.sourceFiles,
                    `Combined ${merged.sectionsFound} sections across ${merged.sourceFiles.length} documents (${merged.duplicatesRemoved} duplicates removed).`
                  );
                },
              },
              {
                label: 'Compare Versions',
                run: () => {
                  onSelectTab('documents');
                  showToast('Opened Documents module — select Compare / Diff Versions.');
                },
              },
              {
                label: 'Extract Tasks',
                run: () => {
                  const doc = project.documents[0];
                  if (!doc) return;
                  const task = convertDocumentToProjectTasks(
                    project.id,
                    doc.filename,
                    doc.finalContent,
                    doc.id
                  );
                  onUpdateProject((prev) => ({
                    ...prev,
                    tasks: [task, ...prev.tasks],
                  }));
                  showToast(`Extracted ${task.checklist.length} checklist steps into Project Tasks!`);
                },
              },
              {
                label: 'Create Checklist',
                run: () => {
                  const allSteps = project.documents.flatMap((d) =>
                    convertDocumentToProjectTasks(project.id, d.filename, d.finalContent, d.id)
                      .checklist
                  );
                  const masterTask: ProjectOSTask = {
                    id: `ptask-master-${Date.now()}`,
                    projectId: project.id,
                    title: `${project.name} — Master AI Release Checklist`,
                    description: `Synthesized across ${project.documents.length} project documents`,
                    status: 'Todo',
                    priority: 'High',
                    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                    tags: ['Master-Checklist', 'AI'],
                    checklist: allSteps.slice(0, 12),
                    createdAt: new Date().toISOString(),
                  };
                  onUpdateProject((prev) => ({
                    ...prev,
                    tasks: [masterTask, ...prev.tasks],
                  }));
                  showToast('Created Master Project Checklist in Tasks!');
                },
              },
              {
                label: 'Find Duplicates',
                run: () => {
                  const dups = detectDocumentDuplicates(project.documents);
                  const body =
                    dups.length > 0
                      ? dups
                          .map(
                            (c) =>
                              `### Similarity ${c.similarityPercent}%\n- Files: ${c.documents
                                .map((d) => d.filename)
                                .join(', ')}\n- Reason: ${c.reason}`
                          )
                          .join('\n\n')
                      : 'No duplicate clusters detected.';
                  triggerSandboxProposal(
                    'Duplicate_Audit_Report.md',
                    'Find Duplicates',
                    `# Duplicate Detection Report\n\n${body}`,
                    project.documents.map((d) => d.filename),
                    `Scanned ${project.documents.length} documents for exact and near-duplicate content.`
                  );
                },
              },
              {
                label: 'Tag Content',
                run: () => {
                  onUpdateProject((prev) => ({
                    ...prev,
                    documents: prev.documents.map((d) => {
                      const auto = autoTagAndClassifyDocument(d.filename, d.finalContent);
                      return {
                        ...d,
                        tags: Array.from(new Set([...d.tags, ...auto.tags])),
                        aiSummary: auto.aiSummary,
                      };
                    }),
                  }));
                  showToast(`Auto-tagged all ${project.documents.length} project documents!`);
                },
              },
              {
                label: 'Build Timeline',
                run: () => {
                  const tlLines = project.timeline.map(
                    (e) => `- **${new Date(e.timestamp).toLocaleDateString()}** [${e.category.toUpperCase()}]: ${e.title} — *${e.subtitle}*`
                  );
                  triggerSandboxProposal(
                    'Project_Chronology_Timeline.md',
                    'Build Timeline',
                    `# ${project.name} — Chronological Timeline\n\n${tlLines.join('\n')}`,
                    project.documents.map((d) => d.filename),
                    `Compiled ${project.timeline.length} timeline milestones.`
                  );
                },
              },
              {
                label: 'Generate Report',
                run: () => {
                  const manifest = buildProjectManifest(project);
                  triggerSandboxProposal(
                    'Project_Audit_Report.md',
                    'Generate Report',
                    `# ${project.name} — Full Project Report\n\n- Documents: ${project.documents.length}\n- Tasks: ${project.tasks.length}\n- Relationships: ${project.relationships.length}\n- Manifest Version: ${manifest.manifestVersion}`,
                    project.documents.map((d) => d.filename),
                    'Generated formal project audit report.'
                  );
                },
              },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.run}
                className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-extrabold transition-colors text-center"
              >
                [ {btn.label.toUpperCase()} ]
              </button>
            ))}
          </div>
        </div>

        {/* AI SANDBOX MODE (Section 28) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            AI Sandbox Mode (Review, Edit &amp; Approve Before Saving)
          </h4>
          {project.sandboxProposals.length === 0 ? (
            <p className="text-xs text-slate-500">
              No pending AI Sandbox drafts. Click any AI action button above to generate a non-destructive draft here.
            </p>
          ) : (
            <div className="space-y-4">
              {project.sandboxProposals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300 text-[10px] font-extrabold">
                        {prop.actionType} • {prop.status}
                      </span>
                      <h5 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {prop.title}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {prop.sourceSummary} • Sources: {prop.sourceDocumentNames.join(', ')}
                      </p>
                    </div>
                    {prop.status === 'Pending Review' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            setCompareSandboxId(compareSandboxId === prop.id ? null : prop.id)
                          }
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs font-bold"
                        >
                          {compareSandboxId === prop.id ? 'Hide Source Diff' : 'Compare with Source'}
                        </button>
                        <button
                          onClick={() => handleCommitSandboxProposal(prop)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve &amp; Save as Document
                        </button>
                        <button
                          onClick={() =>
                            onUpdateProject((prev) => ({
                              ...prev,
                              sandboxProposals: prev.sandboxProposals.filter(
                                (p) => p.id !== prop.id
                              ),
                            }))
                          }
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                  {compareSandboxId === prop.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Original Source ({prop.sourceDocumentNames[0] || 'Project Files'})
                        </div>
                        <pre className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                          {project.documents[0]?.originalContent || 'No source document'}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase text-emerald-500">
                          AI Sandbox Proposed Output (Editable)
                        </div>
                        <textarea
                          rows={8}
                          value={prop.proposedContent}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateProject((prev) => ({
                              ...prev,
                              sandboxProposals: prev.sandboxProposals.map((p) =>
                                p.id === prop.id ? { ...p, proposedContent: val } : p
                              ),
                            }));
                          }}
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      rows={7}
                      value={prop.proposedContent}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateProject((prev) => ({
                          ...prev,
                          sandboxProposals: prev.sandboxProposals.map((p) =>
                            p.id === prop.id ? { ...p, proposedContent: val } : p
                          ),
                        }));
                      }}
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Automated AI Workflows (Section 26 & 27) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-500" />
            Automated AI Workflows &amp; Chained Pipelines
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.workflows.map((wf) => (
              <div
                key={wf.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400">
                      {wf.triggerType}
                    </span>
                    <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {wf.name}
                    </h5>
                  </div>
                  <button
                    onClick={() => {
                      const org = organizeProjectDocumentsWithAI(project.documents);
                      triggerSandboxProposal(
                        org.title,
                        wf.name,
                        org.markdownContent,
                        org.sourceFiles,
                        `Executed workflow "${wf.name}" (${wf.steps.length} steps).`
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Run Pipeline
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {wf.steps.map((step, i) => (
                    <React.Fragment key={step}>
                      <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold">
                        {step}
                      </span>
                      {i < wf.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Create Custom Workflow Pipeline */}
          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2">
            <input
              type="text"
              value={newWfName}
              onChange={(e) => setNewWfName(e.target.value)}
              placeholder="New workflow pipeline name..."
              className="md:col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <select
              value={newWfTrigger}
              onChange={(e) => setNewWfTrigger(e.target.value as any)}
              className="md:col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="Manual Chain">Trigger: Manual Chain</option>
              <option value="On Document Upload">Trigger: On Document Upload</option>
              <option value="On Scratchpad Save">Trigger: On Scratchpad Save</option>
            </select>
            <input
              type="text"
              value={newWfSteps}
              onChange={(e) => setNewWfSteps(e.target.value)}
              placeholder="Comma-separated steps..."
              className="md:col-span-4 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <button
              onClick={() => {
                if (!newWfName.trim()) return;
                const createdWf = {
                  id: `wf-${Date.now()}`,
                  projectId: project.id,
                  name: newWfName.trim(),
                  triggerType: newWfTrigger,
                  enabled: true,
                  steps: newWfSteps
                    .split(',')
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean),
                  runsCount: 0,
                };
                onUpdateProject((prev) => ({
                  ...prev,
                  workflows: [...prev.workflows, createdWf],
                }));
                setNewWfName('');
                showToast(`Created workflow pipeline "${createdWf.name}"`);
              }}
              className="md:col-span-2 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
            >
              + Add Workflow
            </button>
          </div>
        </div>

        {/* AI Activity History Log (Section 29) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-500" />
            AI Activity History &amp; Provenance Log ({project.aiActivity.length})
          </h4>
          <div className="space-y-2">
            {project.aiActivity.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {act.actionTitle}
                  </div>
                  <div className="text-[11px] text-slate-500">{act.details}</div>
                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    Sources: {act.sourceItems.join(', ')}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(act.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 7. EXACT + SEMANTIC SEARCH MODULE (SECTIONS 12 & 13)
  // ============================================================================
  if (activeTab === 'search') {
    const searchHits = searchProjectKnowledge({
      project,
      query: searchQuery,
      mode: searchMode,
      filterType: searchTypeFilter,
      filterTag: searchTagFilter,
    });

    return (
      <div className="space-y-5">
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Exact + AI Semantic Project Search
              </h3>
              <p className="text-xs text-slate-500">
                Search across document contents, lyrics, notes, tasks, and audio/video transcripts.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setSearchMode('exact')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                  searchMode === 'exact'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                EXACT SEARCH
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                  searchMode === 'semantic'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                AI SEMANTIC SEARCH
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "songs about losing someone" or "hello goodbye" or "midnight"...'
              className="md:col-span-6 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
            <select
              value={searchTypeFilter}
              onChange={(e) => setSearchTypeFilter(e.target.value as any)}
              className="md:col-span-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="all">All Content Types</option>
              <option value="document">Documents Only</option>
              <option value="note">Scratchpad Notes</option>
              <option value="task">Tasks &amp; Checklists</option>
              <option value="media">Audio &amp; Video Transcripts</option>
            </select>
            <select
              value={searchTagFilter}
              onChange={(e) => setSearchTagFilter(e.target.value)}
              className="md:col-span-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="ALL">All Tags</option>
              {allProjectTags.map((t) => (
                <option key={t} value={t}>
                  Tag: #{t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {searchHits.map((hit, i) => (
            <div
              key={`${hit.id}-${i}`}
              onClick={() => {
                if (hit.itemType === 'document') onSelectTab('documents');
                if (hit.itemType === 'note') onSelectTab('notes');
                if (hit.itemType === 'task') onSelectTab('tasks');
                if (hit.itemType === 'media') onSelectTab('media');
              }}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/50 cursor-pointer transition-all space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-extrabold">
                    {hit.fileType}
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {hit.title}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{hit.sectionLabel}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    hit.matchMode === 'Semantic Concept Match'
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  {hit.matchMode}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                &ldquo;{hit.matchingLine}&rdquo;
              </p>
              <p className="text-[11px] text-slate-400">Context: {hit.contextSnippet}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 8. PROJECT TIMELINE MODULE (SECTION 30)
  // ============================================================================
  if (activeTab === 'timeline') {
    return (
      <div className="space-y-5">
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Chronological Project Activity &amp; Milestones
            </h3>
            <p className="text-xs text-slate-500">
              Tracks every upload, version diff, AI operation, task completion, and export.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="Log custom milestone..."
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={() => {
                if (!milestoneTitle.trim()) return;
                const now = new Date().toISOString();
                onUpdateProject((prev) => ({
                  ...prev,
                  timeline: [
                    {
                      id: `tl-${Date.now()}`,
                      projectId: prev.id,
                      timestamp: now,
                      category: 'milestone',
                      title: milestoneTitle.trim(),
                      subtitle: 'Logged project milestone',
                    },
                    ...prev.timeline,
                  ],
                }));
                setMilestoneTitle('');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
            >
              + Add Milestone
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {project.timeline.map((ev) => (
            <div
              key={ev.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-extrabold uppercase">
                  {ev.category}
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-slate-500">{ev.subtitle}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 9. KNOWLEDGE GRAPH & CONTENT RELATIONSHIPS (SECTIONS 19 & 31)
  // ============================================================================
  if (activeTab === 'knowledge-graph') {
    return (
      <div className="space-y-5">
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Project Knowledge Graph &amp; Content Relationships
          </h3>
          <p className="text-xs text-slate-500">
            Visualizes how songs, lyrics, audio demos, tasks, photo albums, and AI outputs connect across the workspace.
          </p>

          {/* Interactive Chain Visualization */}
          <div className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max">
              {[
                { stage: 'SONG / CONCEPT', item: project.name },
                { stage: 'LYRICS / DOC', item: project.documents[0]?.filename || 'Document' },
                { stage: 'STUDIO DEMO', item: project.media[0]?.filename || 'Audio Take' },
                { stage: 'MASTER TASK', item: project.tasks[0]?.title || 'Release Checklist' },
                { stage: 'ARTWORK ALBUM', item: project.photoAlbums[0]?.title || 'Cover Art' },
                { stage: 'VIDEO / PROMO', item: project.media[1]?.filename || 'Promo Asset' },
              ].map((node, idx, arr) => (
                <React.Fragment key={node.stage}>
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 min-w-[165px]">
                    <div className="text-[10px] font-mono font-extrabold text-blue-400">
                      {node.stage}
                    </div>
                    <div className="text-xs font-extrabold mt-1 truncate">{node.item}</div>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Interactive SVG Node-Link Knowledge Graph */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <svg viewBox="0 0 800 300" className="w-full h-64">
              {/* Edges from Central Project Hub to Satellite Entities */}
              {[
                { x: 140, y: 75, color: '#3b82f6', label: project.documents[0]?.filename || 'Lyrics.md', kind: 'DOCUMENT' },
                { x: 660, y: 75, color: '#8b5cf6', label: project.media[0]?.filename || 'Demo.wav', kind: 'AUDIO/VIDEO' },
                { x: 140, y: 225, color: '#10b981', label: project.tasks[0]?.title || 'Master Task', kind: 'TASK' },
                { x: 660, y: 225, color: '#f59e0b', label: project.photoAlbums[0]?.title || 'Photo Album', kind: 'HTML ALBUM' },
                { x: 400, y: 255, color: '#ec4899', label: project.notes[0]?.title || 'Scratchpad', kind: 'NOTE' },
              ].map((node, i) => (
                <g key={i}>
                  <line
                    x1={400}
                    y1={140}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.color}
                    strokeWidth="2"
                    strokeDasharray="5,4"
                    opacity="0.7"
                  />
                  <circle cx={node.x} cy={node.y} r="22" fill={node.color} fillOpacity="0.2" stroke={node.color} strokeWidth="2" />
                  <text x={node.x} y={node.y - 28} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    {node.kind}
                  </text>
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                    {node.label.slice(0, 22)}
                  </text>
                </g>
              ))}
              {/* Center Project Hub Node */}
              <circle cx={400} cy={140} r="36" fill="#2563eb" stroke="#93c5fd" strokeWidth="3" />
              <text x={400} y={136} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                PROJECT HUB
              </text>
              <text x={400} y={150} textAnchor="middle" fill="#e0f2fe" fontSize="11" fontWeight="bold">
                {project.name.slice(0, 18)}
              </text>
            </svg>
          </div>

          {/* Add Custom Relationship */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2">
            <input
              type="text"
              value={relSourceTitle}
              onChange={(e) => setRelSourceTitle(e.target.value)}
              placeholder="Source item (e.g., Song_Lyrics.md)..."
              className="md:col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <select
              value={relSourceKind}
              onChange={(e) => setRelSourceKind(e.target.value as RelationshipEntityKind)}
              className="md:col-span-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <option value="document">Document</option>
              <option value="media">Audio/Video</option>
              <option value="task">Task</option>
              <option value="album">Photo Album</option>
              <option value="note">Note</option>
            </select>
            <input
              type="text"
              value={relLabel}
              onChange={(e) => setRelLabel(e.target.value)}
              placeholder="Relation (e.g. LYRICS → DEMO)"
              className="md:col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <input
              type="text"
              value={relTargetTitle}
              onChange={(e) => setRelTargetTitle(e.target.value)}
              placeholder="Target item (e.g., Acoustic_Demo.wav)..."
              className="md:col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              onClick={() => {
                if (!relSourceTitle.trim() || !relTargetTitle.trim()) return;
                const newRel: ProjectRelationship = {
                  id: `rel-${Date.now()}`,
                  projectId: project.id,
                  sourceId: `src-${Date.now()}`,
                  sourceTitle: relSourceTitle.trim(),
                  sourceKind: relSourceKind,
                  targetId: `tgt-${Date.now()}`,
                  targetTitle: relTargetTitle.trim(),
                  targetKind: relTargetKind,
                  label: relLabel.trim() || 'CONNECTED TO',
                  createdByAi: false,
                  createdAt: new Date().toISOString(),
                };
                onUpdateProject((prev) => ({
                  ...prev,
                  relationships: [newRel, ...prev.relationships],
                }));
                setRelSourceTitle('');
                setRelTargetTitle('');
                showToast('Linked content relationship in Knowledge Graph.');
              }}
              className="md:col-span-2 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
            >
              + Link Items
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.relationships.map((rel) => (
            <div
              key={rel.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-extrabold">
                  {rel.label}
                </span>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {rel.sourceTitle} ({rel.sourceKind}) → {rel.targetTitle} ({rel.targetKind})
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    relationships: prev.relationships.filter((r) => r.id !== rel.id),
                  }))
                }
                className="text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 10. SETTINGS, PERMISSIONS, STORAGE & MANIFEST EXPORT (SECTIONS 32-41)
  // ============================================================================
  const docBytes = project.documents.reduce((a, d) => a + d.sizeBytes, 0);
  const mediaBytes = project.media.reduce((a, m) => a + m.sizeBytes, 0);
  const photoBytes = project.photoAlbums.reduce(
    (a, alb) => a + alb.photos.reduce((s, p) => s + p.sizeBytes, 0),
    0
  );
  const fileBytes = project.files.reduce((a, f) => a + f.sizeBytes, 0);
  const totalUsedBytes = docBytes + mediaBytes + photoBytes + fileBytes;
  const manifestObj = buildProjectManifest(project);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Storage Breakdown Card (Section 37) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Project Storage Management (10 GB Quota)
          </h3>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="flex justify-between">
              <span>Documents ({project.documents.length}):</span>
              <span className="font-bold">{formatBytes(docBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Photos ({project.photoAlbums.reduce((a, b) => a + b.photos.length, 0)}):</span>
              <span className="font-bold">{formatBytes(photoBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Audio &amp; Video ({project.media.length}):</span>
              <span className="font-bold">{formatBytes(mediaBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>General Files ({project.files.length}):</span>
              <span className="font-bold">{formatBytes(fileBytes)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-extrabold text-blue-600 dark:text-blue-400">
              <span>Total Used:</span>
              <span>
                {formatBytes(totalUsedBytes)} / {formatBytes(project.quotaBytesMax)}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy, Permissions & Processing Mode (Sections 36 & 39) */}
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Permissions &amp; Local/Cloud AI Processing
          </h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block">
              Project Access Permission
            </label>
            <select
              value={project.permission}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  permission: e.target.value as OSProject['permission'],
                }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="Private">Private (Owner Only)</option>
              <option value="Shared">Shared Workspace</option>
              <option value="Read-only">Read-Only Access</option>
              <option value="Edit">Edit Access</option>
              <option value="Download">Download Enabled</option>
              <option value="Admin">Admin Control</option>
            </select>

            <label className="text-xs font-bold text-slate-500 block pt-2">
              Processing Architecture
            </label>
            <select
              value={project.processingMode}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  processingMode: e.target.value as OSProject['processingMode'],
                }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="Hybrid AI Processing">
                Hybrid Processing (Local Text Indexing + Cloud AI Synthesis)
              </option>
              <option value="Local Processing">
                Strict Local Processing (Zero External Transmission)
              </option>
            </select>
          </div>
        </div>
      </div>

          {/* Export & Backup Center + Machine-Readable Project_Manifest.json (Sections 32, 33, 41) */}
      <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Project Export, Backup &amp; Project_Manifest.json
            </h3>
            <p className="text-xs text-slate-500">
              Export individual documents, multi-document bundles, AI master outputs, standalone HTML photo albums, or full portable JSON archives.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const combined = project.documents
                  .map((d) => `# ${d.filename}\n\n${d.finalContent}`)
                  .join('\n\n---\n\n');
                const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${project.name.replace(/\s+/g, '_')}_All_Documents.md`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Exported all project documents (.MD bundle)!');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-extrabold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export All Docs (.MD)
            </button>
            <button
              onClick={() => {
                const org = organizeProjectDocumentsWithAI(project.documents);
                const blob = new Blob([org.markdownContent], {
                  type: 'text/markdown;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = org.title;
                a.click();
                URL.revokeObjectURL(url);
                showToast(`Exported AI-organized master "${org.title}"!`);
              }}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Export AI Organized Master (.MD)
            </button>
            {project.photoAlbums[0] && (
              <button
                onClick={() => {
                  const html = generateStandalonePhotoAlbumHTML(project.photoAlbums[0]);
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${project.photoAlbums[0].title.replace(/\s+/g, '_')}_Album.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast('Exported Standalone HTML Photo Album!');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Export HTML Photo Album
              </button>
            )}
            <button
              onClick={() => {
                const json = JSON.stringify(manifestObj, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${project.name.replace(/\s+/g, '_')}_Project_Manifest.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Downloaded portable Project_Manifest.json archive!');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Full Project Archive (.JSON)
            </button>
            <button
              onClick={() => {
                const zipBlob = buildProjectZipArchiveBlob(project);
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${project.name.replace(/\s+/g, '_')}_Complete_Archive.zip`;
                a.click();
                URL.revokeObjectURL(url);
                showToast(`Exported complete PKZIP bundle "${project.name.replace(/\s+/g, '_')}_Complete_Archive.zip"!`);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" /> Download Complete Project Bundle (.ZIP)
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-300 font-mono text-[11px] max-h-72 overflow-y-auto">
          {JSON.stringify(manifestObj, null, 2)}
        </pre>
      </div>
    </div>
  );
};
