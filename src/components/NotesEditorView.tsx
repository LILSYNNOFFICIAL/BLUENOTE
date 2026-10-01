import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Pin,
  Star,
  Sparkles,
  History,
  Folder,
  Link2,
  Bold,
  Italic,
  List,
  CheckSquare,
  Code,
  Heading2,
  Trash2,
  Loader2,
  RotateCcw,
  Columns,
  Eye,
  Edit3,
  Download,
  Tag,
  X,
  FolderPlus,
} from 'lucide-react';
import { Note, WorkspaceState } from '../types/bluenote';
import { NOTE_TEMPLATES } from '../data/initialWorkspace';
import { summarizeContent } from '../services/aiService';

interface NotesEditorViewProps {
  workspace: WorkspaceState;
  selectedNoteId?: string;
  onCreateNote: (template?: { name: string; category: string; content: string }) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>, saveVersion?: boolean) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateFolder?: (folderName: string) => void;
  onExtractTasksFromNote?: (content: string) => void;
  onSendNoteToProjectsOS?: (note: Note) => void;
}

const COLOR_STYLES: Record<Note['color'], string> = {
  white: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
  blue: 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
  amber: 'bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  emerald: 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
  rose: 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900',
  violet: 'bg-violet-50/40 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900',
};

export const NotesEditorView: React.FC<NotesEditorViewProps> = ({
  workspace,
  selectedNoteId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateFolder,
  onExtractTasksFromNote,
  onSendNoteToProjectsOS,
}) => {
  const activeNotes = workspace.notes.filter((n) => !n.deletedAt && !n.isArchived);
  const [activeFolderId, setActiveFolderId] = useState<string>('ALL');
  const [currentNoteId, setCurrentNoteId] = useState<string>(
    selectedNoteId || activeNotes[0]?.id || ''
  );
  const [editorMode, setEditorMode] = useState<'write' | 'split' | 'preview'>('split');
  const [showHistory, setShowHistory] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'Short' | 'Medium' | 'Detailed'>('Medium');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);

  React.useEffect(() => {
    if (selectedNoteId) {
      setCurrentNoteId(selectedNoteId);
    }
  }, [selectedNoteId]);

  const filteredNotes = activeNotes.filter((n) =>
    activeFolderId === 'ALL' ? true : n.folderId === activeFolderId
  );

  const currentNote =
    activeNotes.find((n) => n.id === currentNoteId) || filteredNotes[0] || activeNotes[0];

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!currentNote) return;
    const nextContent = `${currentNote.content}\n${prefix}Text${suffix}`;
    onUpdateNote(currentNote.id, {
      content: nextContent,
      wordCount: nextContent.trim().split(/\s+/).filter(Boolean).length,
    });
  };

  const handleGenerateSummary = async () => {
    if (!currentNote) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeContent(currentNote.title, currentNote.content, summaryLength);
      onUpdateNote(currentNote.id, { summary }, true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNote || !newTagInput.trim()) return;
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!currentNote.tags.includes(clean)) {
      onUpdateNote(currentNote.id, { tags: [...currentNote.tags, clean] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!currentNote) return;
    onUpdateNote(currentNote.id, {
      tags: currentNote.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleExportNoteMarkdown = () => {
    if (!currentNote) return;
    const blob = new Blob([`# ${currentNote.title}\n\n${currentNote.content}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentNote.title || 'bluenote').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMarkdownChecklistLine = (lineIndex: number) => {
    if (!currentNote) return;
    const lines = currentNote.content.split('\n');
    const target = lines[lineIndex];
    if (target === undefined) return;
    if (/^\s*-\s*\[\s\]/.test(target)) {
      lines[lineIndex] = target.replace(/^\s*-\s*\[\s\]/, '- [x]');
    } else if (/^\s*-\s*\[[xX]\]/.test(target)) {
      lines[lineIndex] = target.replace(/^\s*-\s*\[[xX]\]/, '- [ ]');
    }
    const nextContent = lines.join('\n');
    onUpdateNote(currentNote.id, {
      content: nextContent,
      wordCount: nextContent.trim().split(/\s+/).filter(Boolean).length,
    });
  };

  const renderMarkdownPreview = (markdown: string) => {
    const lines = markdown.split('\n');
    return (
      <div className="space-y-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                {trimmed.slice(4)}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-base font-extrabold text-slate-900 dark:text-white pt-2">
                {trimmed.slice(3)}
              </h3>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={idx} className="text-lg font-extrabold text-slate-900 dark:text-white pt-2">
                {trimmed.slice(2)}
              </h2>
            );
          }
          if (/^\s*-\s*\[([ xX])\]\s*(.*)/.test(line)) {
            const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)/);
            const checked = match?.[1]?.toLowerCase() === 'x';
            const label = match?.[2] || '';
            return (
              <label
                key={idx}
                className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMarkdownChecklistLine(idx)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={checked ? 'line-through text-slate-400' : 'font-medium'}>
                  {label}
                </span>
              </label>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 text-xs">
                <span className="text-blue-600 font-bold">•</span>
                <span>{trimmed.slice(2)}</span>
              </div>
            );
          }
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-blue-500 pl-3 italic text-xs text-slate-500 dark:text-slate-400"
              >
                {trimmed.slice(2)}
              </blockquote>
            );
          }
          return (
            <p key={idx} className="text-xs leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Sidebar: Folders, Templates & Note List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              My Notes ({filteredNotes.length})
            </h2>
            <button
              onClick={() => onCreateNote()}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>

          {/* Folders Filter + New Folder */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFolderId('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  activeFolderId === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All Folders
              </button>
              {workspace.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                    activeFolderId === f.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Folder className="w-3 h-3" /> {f.name}
                </button>
              ))}
              {onCreateFolder && (
                <button
                  type="button"
                  onClick={() => setShowFolderForm((v) => !v)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center gap-1"
                  title="Create New Folder"
                >
                  <FolderPlus className="w-3 h-3" /> + Folder
                </button>
              )}
            </div>

            {showFolderForm && onCreateFolder && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFolderInput.trim()) return;
                  onCreateFolder(newFolderInput.trim());
                  setNewFolderInput('');
                  setShowFolderForm(false);
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  value={newFolderInput}
                  onChange={(e) => setNewFolderInput(e.target.value)}
                  placeholder="New folder name..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                >
                  Create
                </button>
              </form>
            )}
          </div>

          {/* Smart Templates */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quick Templates (Meeting Mode & Planners)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {NOTE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => onCreateNote(tpl)}
                  className="text-left p-2 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate"
                >
                  + {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No notes in this folder yet
                </p>
                <p className="text-[11px] text-slate-400">
                  Click &ldquo;+ New Note&rdquo; or select a Quick Template above to start writing.
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setCurrentNoteId(note.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    currentNote?.id === note.id
                      ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 shadow-2xs'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {note.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {note.isPinned && <Pin className="w-3 h-3 text-blue-600" />}
                      {note.isFavorite && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {note.summary || note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>
                      {note.wordCount} words • v{note.version}
                    </span>
                    <span>{note.tags.map((t) => `#${t}`).join(' ')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right 8 Columns: Rich Note Editor, Split-Screen Preview, AI Summarizer & Version History */}
      <div className="lg:col-span-8 space-y-4">
        {currentNote ? (
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-5 transition-colors ${
              COLOR_STYLES[currentNote.color]
            }`}
          >
            {/* Editor Top Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={currentNote.folderId}
                  onChange={(e) => onUpdateNote(currentNote.id, { folderId: e.target.value })}
                  className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1"
                >
                  {workspace.folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>

                {/* Note Color Picker */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['white', 'blue', 'amber', 'emerald', 'rose', 'violet'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => onUpdateNote(currentNote.id, { color: col })}
                      className={`w-4 h-4 rounded-full border ${
                        currentNote.color === col ? 'ring-2 ring-blue-600' : 'border-slate-300'
                      }`}
                      style={{
                        backgroundColor:
                          col === 'white'
                            ? '#ffffff'
                            : col === 'blue'
                            ? '#dbeafe'
                            : col === 'amber'
                            ? '#fef3c7'
                            : col === 'emerald'
                            ? '#d1fae5'
                            : col === 'rose'
                            ? '#ffe4e6'
                            : '#ede9fe',
                      }}
                      title={`Note background: ${col}`}
                    />
                  ))}
                </div>

                {/* Write / Split View / Preview Mode Switcher */}
                <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode('write')}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                      editorMode === 'write'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" /> Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('split')}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                      editorMode === 'split'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Columns className="w-3 h-3" /> Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                      editorMode === 'preview'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateNote(currentNote.id, { isPinned: !currentNote.isPinned })}
                  className={`p-1.5 rounded-lg border text-xs ${
                    currentNote.isPinned
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                  title="Pin Note"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onUpdateNote(currentNote.id, { isFavorite: !currentNote.isFavorite })
                  }
                  className={`p-1.5 rounded-lg border text-xs ${
                    currentNote.isFavorite
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                  title="Favorite Note"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleExportNoteMarkdown}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold flex items-center gap-1"
                  title="Download Note as Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" /> .MD
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" /> v{currentNote.version} History
                </button>
                <button
                  onClick={() => onDeleteNote(currentNote.id)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-600"
                  title="Move to Recycle Bin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('## ')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Heading"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- [ ] ')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Checklist Item"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('```\n', '\n```')}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Code Block"
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>

              {/* AI Summarizer & Extract Tasks Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                {onSendNoteToProjectsOS && (
                  <button
                    type="button"
                    onClick={() => onSendNoteToProjectsOS(currentNote)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold flex items-center gap-1"
                    title="Send this Second Brain note into PROJECTS as a 4-stage versioned document"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Send to PROJECTS
                  </button>
                )}
                {onExtractTasksFromNote && (
                  <button
                    type="button"
                    onClick={() => onExtractTasksFromNote(currentNote.content)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1"
                    title="Extract action items from this note"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    Extract Tasks
                  </button>
                )}
                <select
                  value={summaryLength}
                  onChange={(e) =>
                    setSummaryLength(e.target.value as 'Short' | 'Medium' | 'Detailed')
                  }
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                >
                  <option value="Short">Short Summary</option>
                  <option value="Medium">Medium Summary</option>
                  <option value="Detailed">Detailed Summary</option>
                </select>
                <button
                  type="button"
                  disabled={isSummarizing}
                  onClick={handleGenerateSummary}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1"
                >
                  {isSummarizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  AI Summarize
                </button>
              </div>
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => onUpdateNote(currentNote.id, { title: e.target.value })}
              className="w-full text-xl font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
              placeholder="Note Title..."
            />

            {/* Interactive Tags Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {currentNote.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-red-500"
                    title={`Remove tag #${t}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="+ Add tag..."
                  className="w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800 px-2 py-0.5 text-[11px]"
                />
              </form>
            </div>

            {currentNote.summary && (
              <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Summary ({summaryLength})
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {currentNote.summary}
                </p>
              </div>
            )}

            {/* Write / Split-Screen / Preview Editor Body */}
            <div
              className={`grid gap-4 ${
                editorMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {(editorMode === 'write' || editorMode === 'split') && (
                <textarea
                  value={currentNote.content}
                  onChange={(e) => {
                    const text = e.target.value;
                    onUpdateNote(currentNote.id, {
                      content: text,
                      wordCount: text.trim().split(/\s+/).filter(Boolean).length,
                    });
                  }}
                  rows={13}
                  className="w-full rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 p-4 text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Write naturally in Markdown or plain text. BlueNote automatically saves and links entities..."
                />
              )}

              {(editorMode === 'preview' || editorMode === 'split') && (
                <div className="w-full rounded-xl bg-white/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 p-4 overflow-y-auto max-h-[360px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Live Markdown & Interactive Checklist Preview
                  </div>
                  {renderMarkdownPreview(currentNote.content)}
                </div>
              )}
            </div>

            {/* Version History Drawer */}
            {showHistory && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Saved Version History ({currentNote.history.length} previous snapshots)
                  </span>
                  <button
                    onClick={() => onUpdateNote(currentNote.id, {}, true)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Save Version Snapshot Now
                  </button>
                </div>
                {currentNote.history.length > 0 ? (
                  currentNote.history.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {ver.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(ver.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdateNote(currentNote.id, {
                            title: ver.title,
                            content: ver.content,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    Click &ldquo;+ Save Version Snapshot Now&rdquo; or use AI Summarize to preserve a restore point.
                  </p>
                )}
              </div>
            )}

            {/* Related Items in Second Brain */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" /> Related Second Brain Items:
                </span>
                {currentNote.linkedItems.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Auto-linked when shared project or contact names appear
                  </span>
                ) : (
                  currentNote.linkedItems.map((item) => (
                    <span
                      key={item.id}
                      className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      [{item.type}] {item.title}
                    </span>
                  ))
                )}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                ✓ Auto-saved • {currentNote.wordCount} words
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-4">
            <FileText className="w-10 h-10 text-blue-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Your Smart Notes Workspace is Ready
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Create a blank note or start with a structured template for meetings, weekly reviews, or research.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => onCreateNote()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Blank Smart Note
              </button>
              {NOTE_TEMPLATES.slice(0, 3).map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => onCreateNote(tpl)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  + {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
