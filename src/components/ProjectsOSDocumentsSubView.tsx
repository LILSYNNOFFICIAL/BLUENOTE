import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Search,
  Trash2,
  Download,
  Copy,
  GitCompare,
  GitMerge,
  Sparkles,
  Check,
  X,
  Pause,
  Play,
  RotateCcw,
  Tag,
  History,
  Edit3,
  Eye,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ListTodo,
  FolderOpen,
} from 'lucide-react';
import {
  DocumentVersion,
  OSProject,
  ProjectDocument,
  UploadQueueJob,
} from '../types/projectsOS';
import {
  autoTagAndClassifyDocument,
  computeDocumentMetrics,
  computeSideBySideLineDiff,
  computeWordLevelInlineDiff,
  detectDocumentDuplicates,
  extractDocumentOutline,
  formatBytes,
  organizeProjectDocumentsWithAI,
  streamUploadFileInChunks,
  downloadProtectedProjectFile,
} from '../services/projectsOSService';

interface ProjectsOSDocumentsSubViewProps {
  project: OSProject;
  onUpdateProject: (updater: (prev: OSProject) => OSProject) => void;
  onConvertDocToTasks: (doc: ProjectDocument) => void;
  showToast: (msg: string) => void;
}

export const ProjectsOSDocumentsSubView: React.FC<ProjectsOSDocumentsSubViewProps> = ({
  project,
  onUpdateProject,
  onConvertDocToTasks,
  showToast,
}) => {
  const [subMode, setSubMode] = useState<'library' | 'editor' | 'compare' | 'merge'>('library');
  const [selectedDocId, setSelectedDocId] = useState<string>(
    project.documents[0]?.id || ''
  );
  const [checkedDocIds, setCheckedDocIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'size' | 'words'>('modified');

  // Chunked Upload Queue state
  const [uploadJobs, setUploadJobs] = useState<UploadQueueJob[]>([]);
  const pauseFlagsRef = useRef<Record<string, boolean>>({});
  const cancelFlagsRef = useRef<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Document Editor state
  const [editorText, setEditorText] = useState('');
  const [editorStage, setEditorStage] =
    useState<ProjectDocument['currentStage']>('Edited Version');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [docTagInputs, setDocTagInputs] = useState<Record<string, string>>({});
  const [dismissedDupClusterIds, setDismissedDupClusterIds] = useState<string[]>([]);
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<string>('');
  const [newColState, setNewColState] = useState<string>('');
  const [showSectionReorder, setShowSectionReorder] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'split' | 'preview'>('split');
  const [showTocOutline, setShowTocOutline] = useState(true);
  const [diffDisplayMode, setDiffDisplayMode] = useState<'side-by-side' | 'word-inline'>('word-inline');
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Version Diff / Compare state
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');

  // Merge Documents state
  const [mergeDocOrder, setMergeDocOrder] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState('Merged_Master_Document.md');
  const [mergeSeparator, setMergeSeparator] = useState('\n\n---\n\n');
  const [mergeIncludeHeadings, setMergeIncludeHeadings] = useState(true);
  const [mergeRemoveDuplicates, setMergeRemoveDuplicates] = useState(true);

  const selectedDoc =
    project.documents.find((d) => d.id === selectedDocId) || project.documents[0];

  const openDocumentInEditor = (doc: ProjectDocument) => {
    setSelectedDocId(doc.id);
    setEditorText(doc.finalContent);
    setEditorStage(doc.currentStage);
    setUndoStack([]);
    setRedoStack([]);
    if (doc.versions.length >= 2) {
      setLeftVersionId(doc.versions[doc.versions.length - 2].id);
      setRightVersionId(doc.versions[doc.versions.length - 1].id);
    } else if (doc.versions[0]) {
      setLeftVersionId(doc.versions[0].id);
      setRightVersionId(doc.versions[0].id);
    }
    setSubMode('editor');
  };

  // Start Chunked & Resumable Uploads
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    e.target.value = '';

    const initialJobs: UploadQueueJob[] = files.map((f, idx) => ({
      id: `upjob-${Date.now()}-${idx}`,
      projectId: project.id,
      filename: f.name,
      fileSize: f.size,
      bytesTransferred: 0,
      totalChunks: Math.max(1, Math.ceil(f.size / (2 * 1024 * 1024))),
      completedChunks: 0,
      status: 'uploading',
      speedBytesPerSec: 42 * 1024 * 1024,
      fileRef: f,
    }));

    setUploadJobs((prev) => [...initialJobs, ...prev]);

    for (const job of initialJobs) {
      if (!job.fileRef) continue;
      await runChunkedJob(job, 0);
    }
  };

  const runChunkedJob = async (job: UploadQueueJob, startChunkIndex: number) => {
    if (!job.fileRef) return;
    pauseFlagsRef.current[job.id] = false;
    cancelFlagsRef.current[job.id] = false;

    setUploadJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: 'uploading' } : j))
    );

    const res = await streamUploadFileInChunks({
      file: job.fileRef,
      jobId: job.id,
      startChunk: startChunkIndex,
      shouldPause: () => Boolean(pauseFlagsRef.current[job.id]),
      shouldCancel: () => Boolean(cancelFlagsRef.current[job.id]),
      onProgress: (info) => {
        setUploadJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  completedChunks: info.completedChunks,
                  totalChunks: info.totalChunks,
                  bytesTransferred: info.bytesTransferred,
                  speedBytesPerSec: info.speedBytesPerSec,
                }
              : j
          )
        );
      },
    });

    if (res.status === 'paused') {
      setUploadJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: 'paused', completedChunks: res.completedChunks }
            : j
        )
      );
      showToast(`Upload paused for "${job.filename}" — completed chunks preserved.`);
      return;
    }

    if (res.status === 'cancelled') {
      setUploadJobs((prev) => prev.filter((j) => j.id !== job.id));
      showToast(`Upload cancelled for "${job.filename}".`);
      return;
    }

    // Completed: create document & run automated ingest workflow
    const now = new Date().toISOString();
    const ext = (job.filename.split('.').pop()?.toLowerCase() || 'txt') as ProjectDocument['fileType'];
    const validExt: ProjectDocument['fileType'] = ['txt', 'md', 'doc', 'docx', 'pdf'].includes(ext)
      ? ext
      : 'txt';
    const metrics = computeDocumentMetrics(res.extractedText);
    const autoMeta = autoTagAndClassifyDocument(job.filename, res.extractedText);
    const verId = `ver-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    const newDoc: ProjectDocument = {
      id: `pdoc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: project.id,
      filename: job.filename,
      fileType: validExt,
      sizeBytes: job.fileSize,
      uploadedAt: now,
      modifiedAt: now,
      processingStatus: 'Ready',
      pageCount: metrics.pageCount,
      wordCount: metrics.wordCount,
      charCount: metrics.charCount,
      tags: autoMeta.tags,
      aiSummary: autoMeta.aiSummary,
      contentType: autoMeta.contentType,
      completionState: autoMeta.completionState,
      originalContent: res.extractedText,
      workingContent: res.extractedText,
      editedContent: res.extractedText,
      finalContent: res.extractedText,
      currentStage: 'Original',
      currentVersionId: verId,
      chunkStoredInIdb: false,
      storagePath: res.storagePath,
      versions: [
        {
          id: verId,
          versionNumber: 1,
          label: 'v1 — Original upload',
          stage: 'Original',
          content: res.extractedText,
          createdAt: now,
          author: 'User',
          wordCount: metrics.wordCount,
          charCount: metrics.charCount,
        },
      ],
    };

    onUpdateProject((prev) => ({
      ...prev,
      updatedAt: now,
      documents: [newDoc, ...prev.documents],
      aiActivity: [
        {
          id: `aiact-${Date.now()}`,
          projectId: prev.id,
          timestamp: now,
          actionTitle: `Auto-indexed & tagged "${job.filename}"`,
          details: `Extracted ${metrics.wordCount} words, assigned tags [${autoMeta.tags.join(', ')}], and verified chunk integrity.`,
          sourceItems: [job.filename],
          outputDocumentId: newDoc.id,
        },
        ...prev.aiActivity,
      ],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          projectId: prev.id,
          timestamp: now,
          category: 'upload',
          title: `Uploaded & indexed "${job.filename}" (${formatBytes(job.fileSize)})`,
          subtitle: `Auto-tagged as ${autoMeta.contentType} • ${autoMeta.completionState}`,
        },
        ...prev.timeline,
      ],
    }));

    setUploadJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j))
    );
    showToast(`Uploaded & indexed "${job.filename}"`);
  };

  const handleCreateBlankDocument = () => {
    const now = new Date().toISOString();
    const verId = `ver-${Date.now()}`;
    const body = `# Untitled Document\n\nWrite or paste content here...`;
    const newDoc: ProjectDocument = {
      id: `pdoc-${Date.now()}`,
      projectId: project.id,
      filename: `New_Document_${project.documents.length + 1}.md`,
      fileType: 'md',
      sizeBytes: 1024,
      uploadedAt: now,
      modifiedAt: now,
      processingStatus: 'Ready',
      pageCount: 1,
      wordCount: 7,
      charCount: body.length,
      tags: ['Notes', 'Unfinished'],
      aiSummary: 'New markdown document created in workspace.',
      contentType: 'Notes',
      completionState: 'Unfinished',
      originalContent: body,
      workingContent: body,
      editedContent: body,
      finalContent: body,
      currentStage: 'Working Version',
      currentVersionId: verId,
      versions: [
        {
          id: verId,
          versionNumber: 1,
          label: 'v1 — Initial creation',
          stage: 'Original',
          content: body,
          createdAt: now,
          author: 'User',
          wordCount: 7,
          charCount: body.length,
        },
      ],
    };

    onUpdateProject((prev) => ({
      ...prev,
      updatedAt: now,
      documents: [newDoc, ...prev.documents],
    }));
    openDocumentInEditor(newDoc);
  };

  const handleSaveDocumentVersion = (
    customLabel?: string,
    customContent?: string,
    author: 'User' | 'AI Operator' = 'User'
  ) => {
    if (!selectedDoc) return;
    const contentToSave = customContent ?? editorText;
    const now = new Date().toISOString();
    const metrics = computeDocumentMetrics(contentToSave);
    const autoMeta = autoTagAndClassifyDocument(selectedDoc.filename, contentToSave);
    const nextVerNum = selectedDoc.versions.length + 1;
    const verId = `ver-${Date.now()}`;
    const newVer: DocumentVersion = {
      id: verId,
      versionNumber: nextVerNum,
      label:
        customLabel ||
        `v${nextVerNum} — ${author === 'AI Operator' ? 'AI organized' : 'Manual edit'}`,
      stage: editorStage,
      content: contentToSave,
      createdAt: now,
      author,
      wordCount: metrics.wordCount,
      charCount: metrics.charCount,
    };

    onUpdateProject((prev) => ({
      ...prev,
      updatedAt: now,
      documents: prev.documents.map((d) =>
        d.id === selectedDoc.id
          ? {
              ...d,
              modifiedAt: now,
              wordCount: metrics.wordCount,
              charCount: metrics.charCount,
              pageCount: metrics.pageCount,
              tags: Array.from(new Set([...d.tags, ...autoMeta.tags])),
              aiSummary: autoMeta.aiSummary,
              workingContent:
                editorStage === 'Working Version' ? contentToSave : d.workingContent,
              editedContent:
                editorStage === 'Edited Version' ? contentToSave : d.editedContent,
              finalContent: contentToSave,
              currentStage: editorStage,
              currentVersionId: verId,
              versions: [...d.versions, newVer],
            }
          : d
      ),
      timeline: [
        {
          id: `tl-${Date.now()}`,
          projectId: prev.id,
          timestamp: now,
          category: 'version',
          title: `Saved ${newVer.label} of "${selectedDoc.filename}"`,
          subtitle: `Original v1 preserved • ${metrics.wordCount} words`,
        },
        ...prev.timeline,
      ],
    }));
    showToast(`Saved ${newVer.label} (Original v1 safely preserved)`);
  };

  const handleDownloadDocument = (
    doc: ProjectDocument,
    format: 'txt' | 'md' | 'adoc' | 'docx' | 'pdf'
  ) => {
    const baseName = doc.filename.replace(/\.[a-z0-9]+$/i, '');
    let outContent = doc.finalContent;
    let mime = 'text/plain;charset=utf-8';
    let ext = format;

    if (format === 'adoc') {
      outContent = `= ${baseName}\n:Author: BlueNote Project OS\n\n` +
        doc.finalContent.replace(/^# /gm, '= ').replace(/^## /gm, '== ');
    } else if (format === 'pdf') {
      const printWin = window.open('', '_blank', 'width=850,height=900');
      if (printWin) {
        printWin.document.write(
          `<html><head><title>${doc.filename}</title><style>body{font-family:system-ui,sans-serif;padding:40px;line-height:1.6;max-width:760px;margin:0 auto;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h1>${doc.filename}</h1><pre>${doc.finalContent.replace(/</g, '&lt;')}</pre><script>window.print();</script></body></html>`
        );
        printWin.document.close();
        return;
      }
    }

    const blob = new Blob([outContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${baseName}.${ext}"`);
  };

  // Filter documents by Smart Collection & Search
  const filteredDocuments = project.documents
    .filter((doc) => {
      if (activeCollectionId !== 'ALL') {
        const col = project.smartCollections.find((c) => c.id === activeCollectionId);
        if (col) {
          if (col.ruleContentType && doc.contentType !== col.ruleContentType) return false;
          if (col.ruleCompletionState && doc.completionState !== col.ruleCompletionState)
            return false;
          if (col.ruleTag && !doc.tags.includes(col.ruleTag)) return false;
        }
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        doc.filename.toLowerCase().includes(q) ||
        doc.finalContent.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
      if (sortBy === 'words') return b.wordCount - a.wordCount;
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    });

  const duplicateClusters = detectDocumentDuplicates(project.documents).filter(
    (c) => !dismissedDupClusterIds.includes(c.id)
  );

  // Active Upload Queue summary metrics
  const activeUploads = uploadJobs.filter(
    (j) => j.status === 'uploading' || j.status === 'paused'
  );
  const totalQueueBytes = uploadJobs.reduce((acc, j) => acc + j.fileSize, 0);
  const transferredQueueBytes = uploadJobs.reduce((acc, j) => acc + j.bytesTransferred, 0);
  const overallQueuePercent =
    totalQueueBytes > 0 ? Math.min(100, Math.round((transferredQueueBytes / totalQueueBytes) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Sub-Navigation Bar for DOCUMENTS Module */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'library' as const, label: `Document Library (${project.documents.length})`, icon: FolderOpen },
            { id: 'editor' as const, label: 'Document Editor & Versions', icon: Edit3 },
            { id: 'compare' as const, label: 'Compare / Diff Versions', icon: GitCompare },
            { id: 'merge' as const, label: 'MERGE DOCUMENTS', icon: GitMerge },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'merge' && mergeDocOrder.length === 0) {
                    setMergeDocOrder(
                      checkedDocIds.length >= 2
                        ? checkedDocIds
                        : project.documents.map((d) => d.id)
                    );
                  }
                  if (tab.id === 'editor' && selectedDoc && !editorText) {
                    openDocumentInEditor(selectedDoc);
                    return;
                  }
                  setSubMode(tab.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  subMode === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.doc,.docx,.pdf"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Documents (.txt, .md, .docx, .pdf)</span>
          </button>
          <button
            type="button"
            onClick={handleCreateBlankDocument}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>
        </div>
      </div>

      {/* CHUNKED & RESUMABLE LARGE FILE UPLOAD MONITOR (Section 6 & 39) */}
      {uploadJobs.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl border border-blue-500/30 p-4 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                Chunked Streaming Upload Queue ({uploadJobs.filter((j) => j.status === 'completed').length} of {uploadJobs.length} files)
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                {formatBytes(transferredQueueBytes)} / {formatBytes(totalQueueBytes)} •{' '}
                {activeUploads[0]
                  ? `Speed: ${formatBytes(activeUploads[0].speedBytesPerSec)}/s`
                  : 'All chunks verified in IndexedDB'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-extrabold text-blue-300">
                {overallQueuePercent}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setUploadJobs((prev) => prev.filter((j) => j.status !== 'completed'))
                }
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
              >
                Clear Completed
              </button>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${overallQueuePercent}%` }}
            />
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {uploadJobs.map((job) => (
              <div
                key={job.id}
                className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{job.filename}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Status: {job.status.toUpperCase()} • Chunk {job.completedChunks}/{job.totalChunks} ({formatBytes(job.bytesTransferred)} / {formatBytes(job.fileSize)})
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {job.status === 'uploading' && (
                    <button
                      type="button"
                      onClick={() => {
                        pauseFlagsRef.current[job.id] = true;
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" /> PAUSE
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => runChunkedJob(job, job.completedChunks)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> RESUME
                    </button>
                  )}
                  {job.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        cancelFlagsRef.current[job.id] = true;
                        setUploadJobs((prev) => prev.filter((j) => j.id !== job.id));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold"
                    >
                      CANCEL
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DUPLICATE DETECTION BANNER (Section 16) */}
      {subMode === 'library' && duplicateClusters.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Possible Duplicate Versions Detected ({duplicateClusters[0].similarityPercent}% Similarity)
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                {duplicateClusters[0].documents.map((d) => d.filename).join(' • ')}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const first = duplicateClusters[0].documents[0];
                openDocumentInEditor(first);
                setSubMode('compare');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
            >
              COMPARE
            </button>
            <button
              type="button"
              onClick={() => {
                setMergeDocOrder(duplicateClusters[0].documents.map((d) => d.id));
                setSubMode('merge');
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              MERGE
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedDupClusterIds((prev) => [...prev, duplicateClusters[0].id]);
                showToast('Marked files to keep separate.');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold"
            >
              KEEP SEPARATE
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 1: DOCUMENT LIBRARY + SMART COLLECTIONS (Sections 7, 14, 15)
          ===================================================================== */}
      {subMode === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Smart Collections Sidebar */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-4 h-fit">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Smart Collections
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dynamic rule-based document views
              </p>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveCollectionId('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                  activeCollectionId === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Documents</span>
                <span className="font-mono text-[10px]">{project.documents.length}</span>
              </button>
              {project.smartCollections.map((sc) => {
                const count = project.documents.filter((d) => {
                  if (sc.ruleContentType && d.contentType !== sc.ruleContentType) return false;
                  if (sc.ruleCompletionState && d.completionState !== sc.ruleCompletionState)
                    return false;
                  return true;
                }).length;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveCollectionId(sc.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left ${
                      activeCollectionId === sc.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate pr-2">{sc.name}</span>
                    <span className="font-mono text-[10px] shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => setShowNewCollectionForm((v) => !v)}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Smart Collection Rule</span>
              </button>

              {showNewCollectionForm && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Collection name (e.g. Potential Singles)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="">Content Type: ANY</option>
                    <option value="Lyrics">Content Type = Lyrics</option>
                    <option value="Plan">Content Type = Plan</option>
                    <option value="Research">Content Type = Research</option>
                    <option value="Draft">Content Type = Draft</option>
                    <option value="Notes">Content Type = Notes</option>
                  </select>
                  <select
                    value={newColState}
                    onChange={(e) => setNewColState(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="">Status: ANY</option>
                    <option value="Unfinished">Status = Unfinished</option>
                    <option value="Finished">Status = Finished</option>
                    <option value="Needs Revision">Status = Needs Revision</option>
                    <option value="Released">Status = Released</option>
                    <option value="Idea">Status = Idea</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newColName.trim()) return;
                      const createdCol = {
                        id: `sc-${Date.now()}`,
                        projectId: project.id,
                        name: newColName.trim(),
                        icon: 'Sparkles',
                        ruleContentType: newColType || undefined,
                        ruleCompletionState: newColState || undefined,
                      };
                      onUpdateProject((prev) => ({
                        ...prev,
                        smartCollections: [...prev.smartCollections, createdCol],
                      }));
                      setActiveCollectionId(createdCol.id);
                      setNewColName('');
                      setShowNewCollectionForm(false);
                      showToast(`Created Smart Collection "${createdCol.name}"`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                  >
                    Save Rule Collection
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const organized = organizeProjectDocumentsWithAI(project.documents);
                  const now = new Date().toISOString();
                  const verId = `ver-ai-${Date.now()}`;
                  const metrics = computeDocumentMetrics(organized.markdownContent);
                  const masterDoc: ProjectDocument = {
                    id: `pdoc-org-${Date.now()}`,
                    projectId: project.id,
                    filename: organized.title,
                    fileType: 'md',
                    sizeBytes: organized.markdownContent.length * 8,
                    uploadedAt: now,
                    modifiedAt: now,
                    processingStatus: 'Ready',
                    pageCount: metrics.pageCount,
                    wordCount: metrics.wordCount,
                    charCount: metrics.charCount,
                    tags: ['Lyrics', 'AI-Organized', 'Finished'],
                    aiSummary: `Compiled from ${organized.sourceFiles.length} files (${organized.sectionsFound} sections, ${organized.duplicatesRemoved} duplicates removed).`,
                    contentType: 'Lyrics',
                    completionState: 'Finished',
                    originalContent: organized.markdownContent,
                    workingContent: organized.markdownContent,
                    editedContent: organized.markdownContent,
                    finalContent: organized.markdownContent,
                    currentStage: 'Final Version',
                    currentVersionId: verId,
                    sourceReferences: organized.sourceFiles,
                    versions: [
                      {
                        id: verId,
                        versionNumber: 1,
                        label: 'v1 — AI organized compilation',
                        stage: 'Final Version',
                        content: organized.markdownContent,
                        createdAt: now,
                        author: 'AI Operator',
                        wordCount: metrics.wordCount,
                        charCount: metrics.charCount,
                      },
                    ],
                  };
                  onUpdateProject((prev) => ({
                    ...prev,
                    documents: [masterDoc, ...prev.documents],
                    aiActivity: [
                      {
                        id: `aiact-${Date.now()}`,
                        projectId: prev.id,
                        timestamp: now,
                        actionTitle: `Created ${organized.title} from ${organized.sourceFiles.length} documents`,
                        details: `Grouped ${organized.sectionsFound} sections and removed ${organized.duplicatesRemoved} duplicate passages.`,
                        sourceItems: organized.sourceFiles,
                        outputDocumentId: masterDoc.id,
                      },
                      ...prev.aiActivity,
                    ],
                  }));
                  openDocumentInEditor(masterDoc);
                  showToast(`AI created "${organized.title}" and opened it in Editor!`);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Organize All Lyrics / Docs</span>
              </button>
            </div>
          </div>

          {/* Right Document Library Table/Grid */}
          <div className="lg:col-span-9 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter documents by filename, content, or tag..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="modified">Sort: Recently Modified</option>
                  <option value="name">Sort: Filename (A-Z)</option>
                  <option value="size">Sort: File Size</option>
                  <option value="words">Sort: Word Count</option>
                </select>
                {checkedDocIds.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMergeDocOrder(checkedDocIds);
                      setSubMode('merge');
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Merge Selected ({checkedDocIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const isChecked = checkedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:border-blue-500/50 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setCheckedDocIds((prev) =>
                              prev.includes(doc.id)
                                ? prev.filter((id) => id !== doc.id)
                                : [...prev, doc.id]
                            )
                          }
                          className="mt-1 h-4 w-4 rounded text-blue-600"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {renamingDocId === doc.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (renameValue.trim()) {
                                    onUpdateProject((prev) => ({
                                      ...prev,
                                      documents: prev.documents.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, filename: renameValue.trim() }
                                          : d
                                      ),
                                    }));
                                  }
                                  setRenamingDocId(null);
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="px-2 py-1 rounded border border-blue-500 text-xs font-bold bg-white dark:bg-slate-800"
                                />
                                <button
                                  type="submit"
                                  className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-bold"
                                >
                                  Save
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDocumentInEditor(doc)}
                                className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left truncate"
                              >
                                {doc.filename}
                              </button>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold uppercase">
                              .{doc.fileType}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              {doc.processingStatus}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                              v{doc.versions.length} ({doc.currentStage})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {doc.aiSummary}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 mt-1.5">
                            <span>Size: {formatBytes(doc.sizeBytes)}</span>
                            <span>•</span>
                            <span>{doc.pageCount} page(s)</span>
                            <span>•</span>
                            <span>{doc.wordCount} words</span>
                            <span>•</span>
                            <span>{doc.charCount} chars</span>
                            <span>•</span>
                            <span>
                              Modified {new Date(doc.modifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDocumentInEditor(doc)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Open / Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openDocumentInEditor(doc);
                            setSubMode('compare');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1"
                          title="Compare Document Versions"
                        >
                          <GitCompare className="w-3.5 h-3.5" /> Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => onConvertDocToTasks(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1"
                          title="Convert Document into Project Checklist & Tasks"
                        >
                          <ListTodo className="w-3.5 h-3.5" /> → Tasks
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingDocId(doc.id);
                            setRenameValue(doc.filename);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (doc.storagePath) {
                                await downloadProtectedProjectFile(doc.storagePath, doc.filename);
                                showToast(`Downloaded "${doc.filename}"`);
                              } else {
                                handleDownloadDocument(doc, doc.fileType === 'md' ? 'md' : 'txt');
                              }
                            } catch (error) {
                              showToast(error instanceof Error ? error.message : 'Secure download failed.');
                            }
                          }}
                          title={doc.storagePath ? 'Download original securely' : 'Export document'}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copyId = `pdoc-copy-${Date.now()}`;
                            const now = new Date().toISOString();
                            onUpdateProject((prev) => ({
                              ...prev,
                              documents: [
                                {
                                  ...doc,
                                  id: copyId,
                                  filename: `Copy_of_${doc.filename}`,
                                  modifiedAt: now,
                                },
                                ...prev.documents,
                              ],
                            }));
                            showToast(`Duplicated "${doc.filename}"`);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Duplicate Document"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateProject((prev) => ({
                              ...prev,
                              documents: prev.documents.filter((d) => d.id !== doc.id),
                            }));
                            showToast(`Removed "${doc.filename}"`);
                          }}
                          className="p-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tags & Auto-Tagging Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {doc.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProject((prev) => ({
                                ...prev,
                                documents: prev.documents.map((d) =>
                                  d.id === doc.id
                                    ? { ...d, tags: d.tags.filter((x) => x !== t) }
                                    : d
                                ),
                              }))
                            }
                            className="text-slate-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const auto = autoTagAndClassifyDocument(doc.filename, doc.finalContent);
                          onUpdateProject((prev) => ({
                            ...prev,
                            documents: prev.documents.map((d) =>
                              d.id === doc.id
                                ? {
                                    ...d,
                                    tags: Array.from(new Set([...d.tags, ...auto.tags])),
                                    aiSummary: auto.aiSummary,
                                  }
                                : d
                            ),
                          }));
                          showToast(`AI Auto-Tagged "${doc.filename}"`);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> AI Auto-Tag
                      </button>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (docTagInputs[doc.id] || '').trim();
                          if (!val) return;
                          onUpdateProject((prev) => ({
                            ...prev,
                            documents: prev.documents.map((d) =>
                              d.id === doc.id
                                ? { ...d, tags: Array.from(new Set([...d.tags, val])) }
                                : d
                            ),
                          }));
                          setDocTagInputs((prev) => ({ ...prev, [doc.id]: '' }));
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={docTagInputs[doc.id] || ''}
                          onChange={(e) =>
                            setDocTagInputs((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          placeholder="+ tag..."
                          className="w-20 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: DOCUMENT EDITOR & VERSION HISTORY (Sections 8, 9, 37)
          ===================================================================== */}
      {subMode === 'editor' && selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4">
            {/* Non-destructive 4-stage pipeline indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedDoc.filename}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Non-Destructive Pipeline: Original v1 upload is permanently preserved
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    'Original',
                    'Working Version',
                    'Edited Version',
                    'Final Version',
                  ] as const
                ).map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => {
                      setEditorStage(stg);
                      if (stg === 'Original') setEditorText(selectedDoc.originalContent);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      editorStage === stg
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Toolbar: Undo, Redo, Headings, Find & Replace, Export */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={undoStack.length === 0}
                  onClick={() => {
                    const prev = undoStack[undoStack.length - 1];
                    if (prev !== undefined) {
                      setRedoStack((r) => [...r, editorText]);
                      setEditorText(prev);
                      setUndoStack((u) => u.slice(0, -1));
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  disabled={redoStack.length === 0}
                  onClick={() => {
                    const next = redoStack[redoStack.length - 1];
                    if (next !== undefined) {
                      setUndoStack((u) => [...u, editorText]);
                      setEditorText(next);
                      setRedoStack((r) => r.slice(0, -1));
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  Redo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUndoStack((u) => [...u, editorText]);
                    setEditorText((t) => `# Section Heading\n\n` + t);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  + Heading
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUndoStack((u) => [...u, editorText]);
                    setEditorText((t) => t + `\n\n[Verse]\nNew verse lines...\n\n[Chorus]\nNew chorus hook...`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  + Verse/Chorus
                </button>
                <button
                  type="button"
                  onClick={() => setShowSectionReorder((v) => !v)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Reorder Sections ({editorText.split(/\n\s*\n/).filter(Boolean).length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowTocOutline((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                    showTocOutline
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  TOC Outline ({extractDocumentOutline(editorText).length})
                </button>
                <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5">
                  {(
                    [
                      { id: 'edit', label: 'Edit' },
                      { id: 'split', label: 'Split Preview' },
                      { id: 'preview', label: 'Reader' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditorViewMode(m.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        editorViewMode === m.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUndoStack((u) => [...u, editorText]);
                    const aiCleaned = editorText
                      .split('\n')
                      .map((l) => l.trimEnd())
                      .join('\n')
                      .replace(/\n{3,}/g, '\n\n');
                    setEditorText(aiCleaned);
                    handleSaveDocumentVersion(
                      `v${selectedDoc.versions.length + 1} — AI organized & formatted`,
                      aiCleaned,
                      'AI Operator'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> AI Clean &amp; Format
                </button>
              </div>

              {/* Find & Replace */}
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Find..."
                  className="w-28 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace..."
                  className="w-28 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!findQuery) return;
                    setUndoStack((u) => [...u, editorText]);
                    const updated = editorText.split(findQuery).join(replaceQuery);
                    setEditorText(updated);
                    showToast(`Replaced occurrences of "${findQuery}"`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                >
                  Replace All
                </button>
              </div>
            </div>

            {showSectionReorder && (
              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  Section Manipulation &amp; Stanza Reordering
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {editorText
                    .split(/\n\s*\n/)
                    .filter(Boolean)
                    .map((sec, idx, arr) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono truncate flex-1">
                          {idx + 1}. {sec.split('\n')[0]}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const blocks = editorText.split(/\n\s*\n/).filter(Boolean);
                              [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
                              setUndoStack((u) => [...u, editorText]);
                              setEditorText(blocks.join('\n\n'));
                            }}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => {
                              const blocks = editorText.split(/\n\s*\n/).filter(Boolean);
                              [blocks[idx + 1], blocks[idx]] = [blocks[idx], blocks[idx + 1]];
                              setUndoStack((u) => [...u, editorText]);
                              setEditorText(blocks.join('\n\n'));
                            }}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Interactive Table of Contents Outline + Split-Screen Live Markdown Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {showTocOutline && (
                <div className="md:col-span-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 max-h-[430px] overflow-y-auto">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Outline / Sections</span>
                    <span className="font-mono">{extractDocumentOutline(editorText).length}</span>
                  </div>
                  {extractDocumentOutline(editorText).length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Add <code className="font-mono"># Heading</code> or <code className="font-mono">[Chorus]</code> markers to populate clickable outline jumps.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {extractDocumentOutline(editorText).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const lines = editorText.split('\n');
                            const charOffset = lines
                              .slice(0, Math.max(0, item.lineNumber - 1))
                              .join('\n').length;
                            if (editorTextareaRef.current) {
                              editorTextareaRef.current.focus();
                              editorTextareaRef.current.setSelectionRange(charOffset, charOffset);
                            }
                            showToast(`Jumped to "${item.title}" (Line ${item.lineNumber})`);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center justify-between gap-2 text-xs ${
                            item.level === 1
                              ? 'font-extrabold text-slate-900 dark:text-white'
                              : item.level === 2
                              ? 'pl-4 font-semibold text-slate-700 dark:text-slate-300'
                              : 'pl-6 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            L{item.lineNumber} • {item.wordCount}w
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`${
                  showTocOutline ? 'md:col-span-9' : 'md:col-span-12'
                } grid grid-cols-1 ${
                  editorViewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
                } gap-3`}
              >
                {(editorViewMode === 'edit' || editorViewMode === 'split') && (
                  <textarea
                    ref={editorTextareaRef}
                    rows={18}
                    value={editorText}
                    onChange={(e) => {
                      setUndoStack((u) => [...u.slice(-20), editorText]);
                      setEditorText(e.target.value);
                    }}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                )}

                {(editorViewMode === 'split' || editorViewMode === 'preview') && (
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 max-h-[430px] overflow-y-auto space-y-2.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1.5">
                      <span>Live Formatted Preview</span>
                      <span className="font-mono">
                        {computeDocumentMetrics(editorText).wordCount} words • {computeDocumentMetrics(editorText).pageCount} page(s)
                      </span>
                    </div>
                    <div className="space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      {editorText.split('\n').map((line, lIdx) => {
                        const t = line.trim();
                        if (!t) return <div key={lIdx} className="h-2" />;
                        if (t.startsWith('# ')) {
                          return (
                            <h2
                              key={lIdx}
                              className="text-base font-extrabold text-slate-900 dark:text-white pt-2 border-b border-slate-200/60 dark:border-slate-800 pb-1"
                            >
                              {t.slice(2)}
                            </h2>
                          );
                        }
                        if (t.startsWith('## ')) {
                          return (
                            <h3
                              key={lIdx}
                              className="text-sm font-bold text-blue-600 dark:text-blue-400 pt-1.5"
                            >
                              {t.slice(3)}
                            </h3>
                          );
                        }
                        if (t.startsWith('### ')) {
                          return (
                            <h4
                              key={lIdx}
                              className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 pt-1"
                            >
                              {t.slice(4)}
                            </h4>
                          );
                        }
                        if (/^\[.+\]$/.test(t)) {
                          return (
                            <div
                              key={lIdx}
                              className="inline-block px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-mono text-[11px] font-bold mt-2"
                            >
                              {t}
                            </div>
                          );
                        }
                        if (t.startsWith('> ')) {
                          return (
                            <blockquote
                              key={lIdx}
                              className="pl-3 border-l-2 border-blue-500 italic text-slate-500 dark:text-slate-400"
                            >
                              {t.slice(2)}
                            </blockquote>
                          );
                        }
                        return (
                          <p key={lIdx} className="whitespace-pre-wrap">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Export Format:</span>
                {(['md', 'txt', 'adoc', 'docx', 'pdf'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleDownloadDocument(selectedDoc, fmt)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-[11px] font-mono font-bold uppercase transition-colors"
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSaveDocumentVersion()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Save New Version (v{selectedDoc.versions.length + 1})
              </button>
            </div>
          </div>

          {/* Right Column: Document Version History (Section 9) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-500" />
                  Version History ({selectedDoc.versions.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  View, compare, restore, or download any snapshot
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubMode('compare')}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold"
              >
                Compare Diff
              </button>
            </div>

            <div className="space-y-2.5">
              {[...selectedDoc.versions].reverse().map((ver) => (
                <div
                  key={ver.id}
                  className={`p-3 rounded-xl border space-y-2 ${
                    selectedDoc.currentVersionId === ver.id
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {ver.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {ver.stage}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {ver.wordCount} words • {ver.author} •{' '}
                    {new Date(ver.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditorText(ver.content)}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                    >
                      VIEW
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeftVersionId(selectedDoc.versions[0]?.id || ver.id);
                        setRightVersionId(ver.id);
                        setSubMode('compare');
                      }}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                    >
                      COMPARE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorText(ver.content);
                        handleSaveDocumentVersion(
                          `v${selectedDoc.versions.length + 1} — Restored from v${ver.versionNumber}`,
                          ver.content,
                          'User'
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold"
                    >
                      RESTORE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([ver.content], {
                          type: 'text/plain;charset=utf-8',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `v${ver.versionNumber}_${selectedDoc.filename}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(`Downloaded ${ver.label}`);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold"
                    >
                      DOWNLOAD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 3: DOCUMENT COMPARISON / VISUAL DIFF (Section 10)
          ===================================================================== */}
      {subMode === 'compare' && selectedDoc && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-5">
          {(() => {
            const leftVer =
              selectedDoc.versions.find((v) => v.id === leftVersionId) ||
              selectedDoc.versions[0];
            const rightVer =
              selectedDoc.versions.find((v) => v.id === rightVersionId) ||
              selectedDoc.versions[selectedDoc.versions.length - 1];
            const diff = computeSideBySideLineDiff(
              leftVer?.content || '',
              rightVer?.content || ''
            );

            return (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <GitCompare className="w-5 h-5 text-blue-600" />
                      Document Version Comparison — {selectedDoc.filename}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      +{diff.addedCount} added lines • ~{diff.modifiedCount} modified lines • -{diff.deletedCount} deleted lines
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => setDiffDisplayMode('word-inline')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          diffDisplayMode === 'word-inline'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Word-Level Inline Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffDisplayMode('side-by-side')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          diffDisplayMode === 'side-by-side'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Side-by-Side Lines
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rightVer) return;
                        setEditorText(rightVer.content);
                        handleSaveDocumentVersion(
                          `v${selectedDoc.versions.length + 1} — Accepted ${rightVer.label}`,
                          rightVer.content
                        );
                        setSubMode('editor');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Accept Version (Right)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!leftVer) return;
                        setEditorText(leftVer.content);
                        handleSaveDocumentVersion(
                          `v${selectedDoc.versions.length + 1} — Restored ${leftVer.label}`,
                          leftVer.content
                        );
                        setSubMode('editor');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                    >
                      Restore Version (Left)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorText(diff.combinedContent);
                        handleSaveDocumentVersion(
                          `v${selectedDoc.versions.length + 1} — Combined v${leftVer?.versionNumber} + v${rightVer?.versionNumber}`,
                          diff.combinedContent
                        );
                        setSubMode('editor');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                    >
                      Create Combined Version
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">
                      Left Version
                    </label>
                    <select
                      value={leftVer?.id || ''}
                      onChange={(e) => setLeftVersionId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      {selectedDoc.versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} ({v.wordCount} words)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">
                      Right Version
                    </label>
                    <select
                      value={rightVer?.id || ''}
                      onChange={(e) => setRightVersionId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      {selectedDoc.versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} ({v.wordCount} words)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-mono text-xs">
                  {diff.rows.map((row, idx) => {
                    const wordTokens =
                      diffDisplayMode === 'word-inline' && row.type === 'modified'
                        ? computeWordLevelInlineDiff(row.leftText, row.rightText)
                        : null;

                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-2 border-b border-slate-100 dark:border-slate-800/70 ${
                          row.type === 'modified'
                            ? 'bg-amber-500/10'
                            : row.type === 'added'
                            ? 'bg-emerald-500/10'
                            : row.type === 'deleted'
                            ? 'bg-red-500/10'
                            : ''
                        }`}
                      >
                        <div className="p-2.5 border-r border-slate-200 dark:border-slate-800 whitespace-pre-wrap break-words">
                          <span className="text-slate-400 mr-2 select-none">
                            {row.lineNumberLeft ?? ' '}
                          </span>
                          {wordTokens ? (
                            <span>
                              {wordTokens
                                .filter((t) => t.type !== 'added')
                                .map((tok, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={
                                      tok.type === 'deleted'
                                        ? 'px-1 py-0.5 rounded bg-red-500/20 line-through text-red-600 dark:text-red-300 font-bold'
                                        : ''
                                    }
                                  >
                                    {tok.text}
                                  </span>
                                ))}
                            </span>
                          ) : (
                            <span
                              className={
                                row.type === 'deleted' || row.type === 'modified'
                                  ? 'line-through text-red-600 dark:text-red-400'
                                  : ''
                              }
                            >
                              {row.leftText}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 whitespace-pre-wrap break-words">
                          <span className="text-slate-400 mr-2 select-none">
                            {row.lineNumberRight ?? ' '}
                          </span>
                          {wordTokens ? (
                            <span>
                              {wordTokens
                                .filter((t) => t.type !== 'deleted')
                                .map((tok, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={
                                      tok.type === 'added'
                                        ? 'px-1 py-0.5 rounded bg-emerald-500/25 text-emerald-700 dark:text-emerald-200 font-extrabold'
                                        : ''
                                    }
                                  >
                                    {tok.text}
                                  </span>
                                ))}
                            </span>
                          ) : (
                            <span
                              className={
                                row.type === 'added' || row.type === 'modified'
                                  ? 'font-bold text-emerald-700 dark:text-emerald-300'
                                  : ''
                              }
                            >
                              {row.rightText}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* =====================================================================
          MODE 4: MERGE DOCUMENTS STUDIO (Section 11)
          ===================================================================== */}
      {subMode === 'merge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              MERGE DOCUMENTS
            </h3>
            <p className="text-xs text-slate-500">
              Reorder documents, strip duplicates, and combine into a new master document while keeping all originals untouched.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Merged Document Filename
              </label>
              <input
                type="text"
                value={mergeTitle}
                onChange={(e) => setMergeTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeIncludeHeadings}
                  onChange={(e) => setMergeIncludeHeadings(e.target.checked)}
                />
                <span>Include Document Section Headings</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeRemoveDuplicates}
                  onChange={(e) => setMergeRemoveDuplicates(e.target.checked)}
                />
                <span>Auto-Detect &amp; Remove Duplicate Paragraphs</span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500">
                Document Order ({mergeDocOrder.length} selected)
              </div>
              {project.documents.map((doc) => {
                const idx = mergeDocOrder.indexOf(doc.id);
                const included = idx !== -1;
                return (
                  <div
                    key={doc.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      included
                        ? 'border-blue-500/40 bg-blue-500/5'
                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 truncate cursor-pointer">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() =>
                          setMergeDocOrder((prev) =>
                            included ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                          )
                        }
                      />
                      <span className="font-bold truncate">{doc.filename}</span>
                    </label>
                    {included && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (idx <= 0) return;
                            const next = [...mergeDocOrder];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setMergeDocOrder(next);
                          }}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (idx >= mergeDocOrder.length - 1) return;
                            const next = [...mergeDocOrder];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            setMergeDocOrder(next);
                          }}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4">
            {(() => {
              const docsToMerge = mergeDocOrder
                .map((id) => project.documents.find((d) => d.id === id))
                .filter(Boolean) as ProjectDocument[];
              const seenParas = new Set<string>();
              const combinedParts = docsToMerge.map((d) => {
                const paras = d.finalContent
                  .split(/\n\s*\n/)
                  .filter((p) => {
                    if (!mergeRemoveDuplicates) return true;
                    const norm = p.trim().toLowerCase();
                    if (seenParas.has(norm)) return false;
                    seenParas.add(norm);
                    return true;
                  })
                  .join('\n\n');
                return mergeIncludeHeadings ? `## ${d.filename}\n\n${paras}` : paras;
              });
              const previewText = combinedParts.join(mergeSeparator);

              return (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Live Merged Preview ({docsToMerge.length} source files untouched)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date().toISOString();
                        const verId = `ver-merge-${Date.now()}`;
                        const metrics = computeDocumentMetrics(previewText);
                        const newDoc: ProjectDocument = {
                          id: `pdoc-merged-${Date.now()}`,
                          projectId: project.id,
                          filename: mergeTitle.trim() || 'Merged_Master.md',
                          fileType: 'md',
                          sizeBytes: previewText.length * 8,
                          uploadedAt: now,
                          modifiedAt: now,
                          processingStatus: 'Ready',
                          pageCount: metrics.pageCount,
                          wordCount: metrics.wordCount,
                          charCount: metrics.charCount,
                          tags: ['Merged', 'Finished'],
                          aiSummary: `Merged from ${docsToMerge.map((d) => d.filename).join(', ')}`,
                          contentType: 'General',
                          completionState: 'Finished',
                          originalContent: previewText,
                          workingContent: previewText,
                          editedContent: previewText,
                          finalContent: previewText,
                          currentStage: 'Final Version',
                          currentVersionId: verId,
                          sourceReferences: docsToMerge.map((d) => d.filename),
                          versions: [
                            {
                              id: verId,
                              versionNumber: 1,
                              label: `v1 — Merged from ${docsToMerge.length} documents`,
                              stage: 'Final Version',
                              content: previewText,
                              createdAt: now,
                              author: 'User',
                              wordCount: metrics.wordCount,
                              charCount: metrics.charCount,
                            },
                          ],
                        };
                        onUpdateProject((prev) => ({
                          ...prev,
                          documents: [newDoc, ...prev.documents],
                        }));
                        openDocumentInEditor(newDoc);
                        showToast(`Merged ${docsToMerge.length} documents into "${newDoc.filename}"`);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Create Merged Document &amp; Edit
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                    {previewText || 'Select at least 2 documents on the left to preview merge.'}
                  </pre>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
