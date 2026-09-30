import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  CheckSquare,
  FileText,
  Calendar,
  UserPlus,
  Camera,
  Mic,
  FolderKanban,
  ArrowRight,
  X,
  Network,
} from 'lucide-react';
import { ActiveSection, EntityType, WorkspaceState } from '../types/bluenote';
import { semanticWorkspaceSearch } from '../services/aiService';

interface CommandPaletteModalProps {
  isOpen: boolean;
  workspace: WorkspaceState;
  onClose: () => void;
  onNavigate: (section: ActiveSection, itemId?: string) => void;
  onOpenBrainDump: (tab?: 'brain-dump' | 'ocr-scanner') => void;
  onOpenFocusMode: () => void;
  onQuickCreate: (text: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  workspace,
  onClose,
  onNavigate,
  onOpenBrainDump,
  onOpenFocusMode,
  onQuickCreate,
}) => {
  const [query, setQuery] = useState('');

  const searchHits = useMemo(() => {
    if (!query.trim()) return [];
    return semanticWorkspaceSearch(query, workspace, 'all', true).slice(0, 8);
  }, [query, workspace]);

  if (!isOpen) return null;

  const mapTypeToSection = (t: EntityType): ActiveSection => {
    switch (t) {
      case 'task':
      case 'shopping':
        return 'tasks';
      case 'note':
        return 'notes';
      case 'project':
      case 'goal':
      case 'habit':
        return 'projects';
      case 'event':
      case 'reminder':
        return 'calendar';
      case 'contact':
        return 'contacts';
      case 'link':
        return 'links';
      case 'file':
        return 'files';
      default:
        return 'search';
    }
  };

  const quickActions = [
    {
      label: 'Brain Dump — Speak or type everything on your mind',
      icon: Sparkles,
      shortcut: 'B',
      action: () => {
        onClose();
        onOpenBrainDump('brain-dump');
      },
    },
    {
      label: 'OCR Scanner — Upload Handwritten Note, Business Card, or Receipt',
      icon: Camera,
      shortcut: 'U',
      action: () => {
        onClose();
        onOpenBrainDump('ocr-scanner');
      },
    },
    {
      label: 'Start Distraction-Free Focus & Pomodoro Timer',
      icon: CheckSquare,
      shortcut: 'F',
      action: () => {
        onClose();
        onOpenFocusMode();
      },
    },
    {
      label: 'Explore Second Brain Knowledge Graph',
      icon: Network,
      shortcut: 'G',
      action: () => {
        onClose();
        onNavigate('second-brain');
      },
    },
    {
      label: 'Create New Rich Note',
      icon: FileText,
      shortcut: 'N',
      action: () => {
        onClose();
        onNavigate('notes');
      },
    },
    {
      label: 'Open Today’s Calendar & Daily Planner',
      icon: Calendar,
      shortcut: 'C',
      action: () => {
        onClose();
        onNavigate('calendar');
      },
    },
    {
      label: 'Open Contacts & Personal CRM',
      icon: UserPlus,
      shortcut: 'P',
      action: () => {
        onClose();
        onNavigate('contacts');
      },
    },
    {
      label: 'Open Projects & Templates',
      icon: FolderKanban,
      shortcut: 'J',
      action: () => {
        onClose();
        onNavigate('projects');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs pt-20 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && query.trim() && searchHits.length === 0) {
                onQuickCreate(query.trim());
                setQuery('');
                onClose();
              }
            }}
            placeholder='Search anything (e.g. "John insurance", "Home Depot receipt", "dentist") or type to create...'
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {query.trim() && (
            <button
              onClick={() => {
                onQuickCreate(query.trim());
                setQuery('');
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              AI Add
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close Command Palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {query.trim() && (
            <div className="space-y-1.5">
              <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instant Second Brain Results ({searchHits.length})
              </div>
              {searchHits.length > 0 ? (
                searchHits.map((hit) => (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    onClick={() => {
                      onNavigate(mapTypeToSection(hit.type), hit.id);
                      onClose();
                    }}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {hit.type}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {hit.title}
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium">
                          {hit.matchedVia}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{hit.subtitle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))
              ) : (
                <button
                  onClick={() => {
                    onQuickCreate(query.trim());
                    setQuery('');
                    onClose();
                  }}
                  className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Let BlueNote AI classify & save "{query}" automatically
                  </span>
                  <span>Press Enter ↵</span>
                </button>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Commands
            </div>
            {quickActions.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.label}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {cmd.label}
                    </span>
                  </div>
                  <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
                    Ctrl + {cmd.shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
