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
}) => {
  const activeNotes = workspace.notes.filter((n) => !n.deletedAt && !n.isArchived);
  const [activeFolderId, setActiveFolderId] = useState<string>('ALL');
  const [currentNoteId, setCurrentNoteId] = useState<string>(
    selectedNoteId || activeNotes[0]?.id || ''
  );

  React.useEffect(() => {
    if (selectedNoteId) {
      setCurrentNoteId(selectedNoteId);
    }
  }, [selectedNoteId]);
  const [showHistory, setShowHistory] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'Short' | 'Medium' | 'Detailed'>('Medium');
  const [isSummarizing, setIsSummarizing] = useState(false);

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

          {/* Folders Filter */}
          <div className="flex flex-wrap gap-1.5">
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
          </div>

          {/* Smart Templates (Addendum I) */}
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
            {filteredNotes.map((note) => (
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
                    {note.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {note.summary || note.content}
                </p>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                  <span>{note.wordCount} words • v{note.version}</span>
                  <span>{note.tags.map((t) => `#${t}`).join(' ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right 8 Columns: Rich Note Editor, AI Summarizer, Version History & Related Items */}
      <div className="lg:col-span-8 space-y-4">
        {currentNote ? (
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-5 transition-colors ${
              COLOR_STYLES[currentNote.color]
            }`}
          >
            {/* Editor Top Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
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
              </div>

              <div className="flex items-center gap-2">
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

              {/* AI Summarizer Controls (Part 2 Requirement) */}
              <div className="flex items-center gap-1.5">
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

            {/* Title & Content Input (Auto-Saving) */}
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => onUpdateNote(currentNote.id, { title: e.target.value })}
              className="w-full text-xl font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
              placeholder="Note Title..."
            />

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

            {/* Version History Drawer (Part 3 & Part 6) */}
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
                    Click "+ Save Version Snapshot Now" or use AI Summarize to preserve a restore point.
                  </p>
                )}
              </div>
            )}

            {/* Related Items in Second Brain (Addendum O) */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" /> Related Second Brain Items:
                </span>
                {currentNote.linkedItems.map((item) => (
                  <span
                    key={item.id}
                    className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    [{item.type}] {item.title}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                ✓ Auto-saved • {currentNote.wordCount} words
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">Select a note or create a new one to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};
