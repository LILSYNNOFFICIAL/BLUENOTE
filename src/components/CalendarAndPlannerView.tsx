import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Bell,
  Sparkles,
  Video,
  MapPin,
  AlertTriangle,
  AlarmClock,
  Check,
} from 'lucide-react';
import { CalendarEvent, Reminder, WorkspaceState } from '../types/bluenote';

interface CalendarAndPlannerViewProps {
  workspace: WorkspaceState;
  onAddEvent: (evt: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onAddReminder: (rem: Omit<Reminder, 'id' | 'createdAt'>) => void;
  onSnoozeReminder: (id: string, minutes: number) => void;
  onCompleteReminder: (id: string) => void;
  onAutoGenerateTimeBlocks: () => void;
}

export const CalendarAndPlannerView: React.FC<CalendarAndPlannerViewProps> = ({
  workspace,
  onAddEvent,
  onAddReminder,
  onSnoozeReminder,
  onCompleteReminder,
  onAutoGenerateTimeBlocks,
}) => {
  const [viewTab, setViewTab] = useState<'today' | 'week' | 'month' | 'reminders'>('today');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [category, setCategory] = useState<CalendarEvent['category']>('Meeting');

  const [remTitle, setRemTitle] = useState('');
  const [remTime, setRemTime] = useState('09:00');

  const sortedEvents = [...workspace.events]
    .filter((e) => !e.deletedAt)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

  // Detect scheduling conflicts (Part 3 Requirement)
  const hasConflict = (evt: CalendarEvent) => {
    return sortedEvents.some(
      (other) =>
        other.id !== evt.id &&
        other.date === evt.date &&
        evt.startTime < other.endTime &&
        evt.endTime > other.startTime
    );
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddEvent({
      title: title.trim(),
      description: 'Scheduled via BlueNote Calendar',
      date,
      startTime,
      endTime,
      allDay: false,
      color: category === 'Focus Block' ? '#2563eb' : category === 'Meeting' ? '#4f46e5' : '#0d9488',
      category,
      tags: [category],
      linkedContactIds: [],
    });
    setTitle('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-blue-600" />
              Calendar, Time-Blocking & Smart Reminders
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily, weekly, and monthly views with AI time-blocking, conflict detection, and smart reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAutoGenerateTimeBlocks}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> AI Time-Block Today
            </button>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {(
                [
                  ['today', 'Daily Planner'],
                  ['week', 'Weekly Agenda'],
                  ['month', 'Monthly Overview'],
                  ['reminders', 'Reminders'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewTab === tab
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add Event Form */}
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event or Focus Block Title..."
            className="md:col-span-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
          />
          <button
            type="submit"
            className="md:col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Schedule
          </button>
        </form>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Schedule / Time Blocks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {viewTab === 'today'
                  ? 'Today’s Time-Blocked Schedule'
                  : viewTab === 'week'
                  ? '7-Day Weekly Planner'
                  : 'Monthly Milestones & Events'}
              </h2>
              <span className="text-xs text-slate-400">
                Timezone: {workspace.settings.timezone}
              </span>
            </div>

            <div className="space-y-3">
              {sortedEvents.map((evt) => {
                const conflict = hasConflict(evt);
                return (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{ borderLeftColor: evt.color || '#2563eb' }}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-600">
                          {evt.date} • {evt.startTime}–{evt.endTime}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {evt.category}
                        </span>
                        {conflict && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Time Overlap Detected
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-slate-500">{evt.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {evt.location}
                          </span>
                        )}
                        {evt.meetingUrl && (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Video className="w-3 h-3" /> Video Link Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Smart Reminders & AI Calendar Suggestions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Smart Reminders ({workspace.reminders.filter((r) => r.status === 'Active').length})
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!remTitle.trim()) return;
                onAddReminder({
                  title: remTitle.trim(),
                  triggerDate: date,
                  triggerTime: remTime,
                  repeatRule: 'Once',
                  status: 'Active',
                  notificationType: 'Both',
                  smartSuggestionReason: 'Created from Calendar & Reminder planner',
                });
                setRemTitle('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={remTitle}
                onChange={(e) => setRemTitle(e.target.value)}
                placeholder="New reminder..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <input
                type="time"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                + Add
              </button>
            </form>

            <div className="space-y-2.5">
              {workspace.reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    rem.status === 'Completed'
                      ? 'bg-slate-50 dark:bg-slate-900 opacity-60 border-slate-200 dark:border-slate-800'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {rem.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {rem.triggerDate} at {rem.triggerTime} ({rem.repeatRule})
                      </div>
                    </div>
                    {rem.status !== 'Completed' && (
                      <button
                        onClick={() => onCompleteReminder(rem.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Done
                      </button>
                    )}
                  </div>

                  {rem.smartSuggestionReason && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                      {rem.smartSuggestionReason}
                    </p>
                  )}

                  {rem.status !== 'Completed' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <AlarmClock className="w-3 h-3 text-amber-600" />
                      <span className="text-[10px] text-slate-500">Snooze:</span>
                      {[
                        [5, '5m'],
                        [15, '15m'],
                        [30, '30m'],
                        [60, '1h'],
                        [1440, 'Tomorrow'],
                      ].map(([m, label]) => (
                        <button
                          key={label}
                          onClick={() => onSnoozeReminder(rem.id, Number(m))}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium hover:border-blue-400"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
