import React, { useState } from 'react';
import {
  Inbox,
  Sparkles,
  Check,
  Trash2,
  Mic,
  Camera,
  Plus,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { EntityType, InboxItem, WorkspaceState } from '../types/bluenote';

interface UniversalInboxViewProps {
  workspace: WorkspaceState;
  onCaptureToInbox: (rawText: string) => void;
  onApproveInboxItem: (item: InboxItem, overrideCategory?: EntityType) => void;
  onApproveAllInbox: () => void;
  onDeleteInboxItem: (id: string) => void;
  onOpenBrainDump: (tab?: 'brain-dump' | 'ocr-scanner') => void;
}

export const UniversalInboxView: React.FC<UniversalInboxViewProps> = ({
  workspace,
  onCaptureToInbox,
  onApproveInboxItem,
  onApproveAllInbox,
  onDeleteInboxItem,
  onOpenBrainDump,
}) => {
  const [captureInput, setCaptureInput] = useState('');
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, EntityType>>({});

  const pendingItems = workspace.inbox.filter((i) => i.status === 'Pending Review');
  const processedItems = workspace.inbox.filter((i) => i.status === 'Approved');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureInput.trim()) return;
    onCaptureToInbox(captureInput.trim());
    setCaptureInput('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Inbox className="w-4 h-4" />
              <span>Universal Capture & AI Triage</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Universal Inbox ({pendingItems.length})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Drop anything here—notes, voice memos, photos, receipts, business cards, or links. BlueNote AI recommends where each item belongs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBrainDump('brain-dump')}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Mic className="w-4 h-4" /> Voice / Brain Dump
            </button>
            <button
              onClick={() => onOpenBrainDump('ocr-scanner')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Upload Photo / OCR
            </button>
            {pendingItems.length > 0 && (
              <button
                onClick={onApproveAllInbox}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCheck className="w-4 h-4" /> Approve All ({pendingItems.length})
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={captureInput}
            onChange={(e) => setCaptureInput(e.target.value)}
            placeholder='Drop anything into Inbox: "Call dentist next Tuesday at 10am", "Sarah’s email is sarah@design.co", "Buy printer paper"...'
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add to Inbox
          </button>
        </form>
      </div>

      {/* Pending Review List */}
      <div className="space-y-3">
        {pendingItems.map((item) => {
          const currentCategory = categoryOverrides[item.id] || item.detectedCategory;
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                    {item.sourceType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                    {item.confidence}% AI Confidence
                  </span>
                  {item.confidence < 85 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Please confirm category
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.aiSuggestedTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl font-mono">
                  "{item.rawContent}"
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{item.aiExplanation}</span>
                </p>
              </div>

              <div className="flex flex-wrap md:flex-col items-end justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Organize as:</span>
                  <select
                    value={currentCategory}
                    onChange={(e) =>
                      setCategoryOverrides((prev) => ({
                        ...prev,
                        [item.id]: e.target.value as EntityType,
                      }))
                    }
                    className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5"
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                    <option value="event">Calendar Event</option>
                    <option value="contact">Contact</option>
                    <option value="shopping">Shopping List</option>
                    <option value="note">Note</option>
                    <option value="link">Saved Link</option>
                    <option value="project">Project</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApproveInboxItem(item, currentCategory)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve & Organize
                  </button>
                  <button
                    onClick={() => onDeleteInboxItem(item.id)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pendingItems.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Inbox Zero Achieved!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Everything you captured has been organized into Tasks, Notes, Contacts, Calendar Events, and your Second Brain Knowledge Graph.
            </p>
          </div>
        )}
      </div>

      {processedItems.length > 0 && (
        <div className="pt-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recently Organized by AI ({processedItems.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {processedItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {item.aiSuggestedTitle}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 shrink-0 ml-2">
                  ✓ Saved to {item.detectedCategory}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
