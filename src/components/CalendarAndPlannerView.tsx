import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Bell,
  Plus,
  AlertTriangle,
  Sparkles,
  AlarmClock,
  Check,
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CalendarDays,
} from 'lucide-react';
import { CalendarEvent, Reminder, Task, WorkspaceState } from '../types/bluenote';

interface CalendarAndPlannerViewProps {
  workspace: WorkspaceState;
  onAddEvent: (evt: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onAddReminder: (rem: Omit<Reminder, 'id' | 'createdAt'>) => void;
  onSnoozeReminder: (reminderId: string, minutes: number) => void;
  onCompleteReminder: (reminderId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onDeleteReminder?: (reminderId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onAutoGenerateTimeBlocks?: () => void;
}

export const CalendarAndPlannerView: React.FC<CalendarAndPlannerViewProps> = ({
  workspace,
  onAddEvent,
  onAddReminder,
  onSnoozeReminder,
  onCompleteReminder,
  onDeleteEvent,
  onDeleteReminder,
  onUpdateTask,
  onAutoGenerateTimeBlocks,
}) => {
  const todayISO = new Date().toISOString().split('T')[0];
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'agenda'>('day');
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // New Event Form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:00');
  const [category, setCategory] = useState<CalendarEvent['category']>('Focus Block');
  const [location, setLocation] = useState('');

  // New Reminder Form
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState(todayISO);
  const [remTime, setRemTime] = useState('16:00');
  const [remRepeat, setRemRepeat] = useState<Reminder['repeatRule']>('Once');

  const handleSelectDate = (nextDate: string) => {
    setSelectedDate(nextDate);
    setDate(nextDate);
    setRemDate(nextDate);
  };

  const shiftDate = (days: number) => {
    const base = new Date(`${selectedDate}T12:00:00`);
    base.setDate(base.getDate() + days);
    const iso = base.toISOString().split('T')[0];
    handleSelectDate(iso);
  };

  // Detect overlapping events on the same date
  const conflicts = useMemo(() => {
    const list: string[] = [];
    const evts = workspace.events;
    for (let i = 0; i < evts.length; i++) {
      for (let j = i + 1; j < evts.length; j++) {
        if (evts[i].date === evts[j].date) {
          if (evts[i].startTime < evts[j].endTime && evts[j].startTime < evts[i].endTime) {
            list.push(`"${evts[i].title}" overlaps with "${evts[j].title}" on ${evts[i].date}`);
          }
        }
      }
    }
    return list;
  }, [workspace.events]);

  // Events for the selected date (or all events if none match selectedDate in Day view)
  const dayEvents = useMemo(() => {
    return workspace.events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [workspace.events, selectedDate]);

  // Tasks due on selectedDate
  const dayTasks = useMemo(() => {
    return workspace.tasks.filter(
      (t) => !t.deletedAt && t.status !== 'Completed' && t.status !== 'Archived' && t.dueDate === selectedDate
    );
  }, [workspace.tasks, selectedDate]);

  // 7-day week array around selectedDate
  const weekDays = useMemo(() => {
    const center = new Date(`${selectedDate}T12:00:00`);
    const dayOfWeek = center.getDay(); // 0 = Sun
    const startOfWeek = new Date(center);
    startOfWeek.setDate(center.getDate() - dayOfWeek);

    const days: { dateStr: string; dayShort: string; dayNum: number; isToday: boolean }[] = [];
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayShort: names[d.getDay()],
        dayNum: d.getDate(),
        isToday: dateStr === todayISO,
      });
    }
    return days;
  }, [selectedDate, todayISO]);

  // Month grid cells for selectedDate's month
  const monthCells = useMemo(() => {
    const ref = new Date(`${selectedDate}T12:00:00`);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingBlanks = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: { dateStr: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({ dateStr: `${year}-${mStr}-${dStr}`, dayNum: d });
    }
    return cells;
  }, [selectedDate]);

  const handleAddEvt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddEvent({
      title: title.trim(),
      description: `${category} scheduled in Calendar`,
      date,
      startTime,
      endTime,
      allDay: false,
      location: location.trim() || undefined,
      category,
      tags: [category],
      linkedContactIds: [],
      color:
        category === 'Focus Block'
          ? '#4f46e5'
          : category === 'Meeting'
          ? '#2563eb'
          : category === 'Deadline'
          ? '#dc2626'
          : '#0284c7',
    });
    setTitle('');
    setLocation('');
  };

  const handleTimeBlockTask = (task: Task) => {
    // Pick next available hour slot on selectedDate
    const usedHours = new Set(dayEvents.map((e) => Number(e.startTime.split(':')[0])));
    let startHour = 9;
    while (usedHours.has(startHour) && startHour < 20) {
      startHour++;
    }
    const durationMins = Math.max(30, task.estimatedMinutes || 30);
    const startStr = `${String(startHour).padStart(2, '0')}:00`;
    const endTotalMins = startHour * 60 + durationMins;
    const endH = Math.min(23, Math.floor(endTotalMins / 60));
    const endM = endTotalMins % 60;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    onAddEvent({
      title: `Focus Block: ${task.title}`,
      description: `Time-blocked from task (${task.estimatedMinutes}m)`,
      date: selectedDate,
      startTime: startStr,
      endTime: endStr,
      allDay: false,
      category: 'Focus Block',
      tags: ['Focus-Block'],
      linkedContactIds: [],
      projectId: task.projectId,
      color: '#4f46e5',
    });
    onUpdateTask?.(task.id, { status: 'Scheduled', dueTime: startStr });
  };

  const formattedSelectedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-blue-600" />
              Calendar, Time-Blocking & Smart Reminders
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Day, Week, Month & Agenda planner with AI time-blocking, conflict detection, and flexible snooze reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Navigation Controls */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => shiftDate(viewMode === 'week' ? -7 : viewMode === 'month' ? -30 : -1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                title="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSelectDate(todayISO)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  selectedDate === todayISO
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                Today
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && handleSelectDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 px-1.5 py-0.5 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => shiftDate(viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                title="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {(['day', 'week', 'month', 'agenda'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    viewMode === m
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {onAutoGenerateTimeBlocks && (
              <button
                type="button"
                onClick={onAutoGenerateTimeBlocks}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 text-indigo-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Auto-Block Tasks
              </button>
            )}
          </div>
        </div>

        {/* Conflict Alert Banner */}
        {conflicts.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>AI Conflict Detector: {conflicts.join(' • ')}</span>
            </div>
          </div>
        )}

        {/* Quick Schedule Event / Time-Block Form */}
        <form onSubmit={handleAddEvt} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Schedule event or focus block (e.g. 'Deep Work: Product Spec')..."
            className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
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
            className="md:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs font-mono"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="md:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs font-mono"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location / Room / Link..."
            className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CalendarEvent['category'])}
            className="md:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs font-medium"
          >
            <option value="Focus Block">🎯 Focus Block</option>
            <option value="Meeting">👥 Meeting</option>
            <option value="Appointment">📅 Appointment</option>
            <option value="Deadline">⏰ Deadline</option>
            <option value="Personal">🏠 Personal</option>
            <option value="Birthday">🎂 Birthday</option>
          </select>
          <button
            type="submit"
            className="md:col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Block Time
          </button>
        </form>
      </div>

      {/* Main Split: Calendar View (Left 7 cols) + Smart Reminders Center (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Dynamic View (Day / Week / Month / Agenda) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                {viewMode === 'day' && `Daily Time-Blocking — ${formattedSelectedDate}`}
                {viewMode === 'week' && `7-Day Weekly Planner`}
                {viewMode === 'month' &&
                  new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                {viewMode === 'agenda' && `Chronological Master Agenda (${workspace.events.length} Events)`}
              </h2>
            </div>
            <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Time-Blocking Active
            </span>
          </div>

          {/* VIEW MODE 1: DAY VIEW */}
          {viewMode === 'day' && (
            <div className="space-y-5">
              <div className="space-y-3">
                {dayEvents.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No events scheduled on {selectedDate}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Use the Block Time bar above or click &ldquo;Time-Block&rdquo; on any due task below.
                    </p>
                  </div>
                ) : (
                  dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 border-l-4 flex items-start justify-between gap-4"
                      style={{ borderLeftColor: evt.color || '#2563eb' }}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {evt.startTime} – {evt.endTime}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {evt.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {evt.title}
                        </h3>
                        {evt.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {evt.location}
                          </p>
                        )}
                      </div>
                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(evt.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Unscheduled Tasks Due on Selected Date -> 1-Click Time-Block */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    Tasks Due on {selectedDate} ({dayTasks.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    1-click to convert task into a calendar Focus Block
                  </span>
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No open tasks due on {selectedDate}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {t.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {t.priority} Priority • {t.estimatedMinutes}m est
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTimeBlockTask(t)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" /> Time-Block
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
              {weekDays.map((wd) => {
                const evts = workspace.events
                  .filter((e) => e.date === wd.dateStr)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                const tasksDue = workspace.tasks.filter(
                  (t) => !t.deletedAt && t.status !== 'Completed' && t.dueDate === wd.dateStr
                );
                const isSelected = wd.dateStr === selectedDate;

                return (
                  <div
                    key={wd.dateStr}
                    onClick={() => handleSelectDate(wd.dateStr)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-2 min-h-[170px] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/30'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {wd.dayShort}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          wd.isToday
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {wd.dayNum}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {evts.map((e) => (
                        <div
                          key={e.id}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border-l-2 border border-slate-200/70 dark:border-slate-700 text-[10px]"
                          style={{ borderLeftColor: e.color || '#2563eb' }}
                        >
                          <div className="font-mono font-bold text-blue-600">{e.startTime}</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {e.title}
                          </div>
                        </div>
                      ))}
                      {tasksDue.map((t) => (
                        <div
                          key={t.id}
                          className="p-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-[10px] text-amber-800 dark:text-amber-300 truncate font-medium"
                        >
                          ✓ {t.title}
                        </div>
                      ))}
                      {evts.length === 0 && tasksDue.length === 0 && (
                        <div className="text-[10px] text-slate-400 pt-2 text-center">Open</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell, idx) => {
                  if (!cell.dateStr || !cell.dayNum) {
                    return (
                      <div
                        key={`blank-${idx}`}
                        className="h-20 rounded-xl bg-slate-50/40 dark:bg-slate-900/30 border border-transparent"
                      />
                    );
                  }
                  const evts = workspace.events.filter((e) => e.date === cell.dateStr);
                  const tasksDue = workspace.tasks.filter(
                    (t) => !t.deletedAt && t.status !== 'Completed' && t.dueDate === cell.dateStr
                  );
                  const isSelected = cell.dateStr === selectedDate;
                  const isToday = cell.dateStr === todayISO;

                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => {
                        handleSelectDate(cell.dateStr!);
                        setViewMode('day');
                      }}
                      className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                            isToday
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {(evts.length > 0 || tasksDue.length > 0) && (
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {evts.length + tasksDue.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden w-full">
                        {evts.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="text-[9px] truncate px-1 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium"
                          >
                            {e.startTime} {e.title}
                          </div>
                        ))}
                        {evts.length === 0 && tasksDue.length > 0 && (
                          <div className="text-[9px] truncate px-1 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
                            {tasksDue.length} task(s) due
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 4: AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <div className="space-y-3">
              {workspace.events.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">
                    Your agenda is empty. Schedule an event or focus block above.
                  </p>
                </div>
              ) : (
                [...workspace.events]
                  .sort((a, b) =>
                    a.date !== b.date
                      ? a.date.localeCompare(b.date)
                      : a.startTime.localeCompare(b.startTime)
                  )
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 border-l-4 flex items-start justify-between gap-4"
                      style={{ borderLeftColor: evt.color || '#2563eb' }}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {evt.date}
                          </span>
                          <span className="text-xs font-mono font-bold text-blue-600">
                            {evt.startTime} – {evt.endTime}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {evt.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {evt.title}
                        </h3>
                        {evt.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {evt.location}
                          </p>
                        )}
                      </div>
                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(evt.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Smart Reminders & Follow-Up Center */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Smart Reminders & Follow-Up Alerts
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!remTitle.trim()) return;
                onAddReminder({
                  title: remTitle.trim(),
                  triggerDate: remDate,
                  triggerTime: remTime,
                  repeatRule: remRepeat,
                  status: 'Active',
                  notificationType: 'Both',
                  smartSuggestionReason: `Scheduled (${remRepeat}) from Calendar & Reminder planner`,
                });
                setRemTitle('');
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="New reminder (e.g. 'Pay electricity bill')..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0"
                >
                  + Add
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={remDate}
                  onChange={(e) => setRemDate(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                />
                <input
                  type="time"
                  value={remTime}
                  onChange={(e) => setRemTime(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                />
                <select
                  value={remRepeat}
                  onChange={(e) => setRemRepeat(e.target.value as Reminder['repeatRule'])}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                >
                  <option value="Once">Once</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </form>

            <div className="space-y-2.5">
              {workspace.reminders.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No smart reminders set yet. Add one above to get notified on time.
                </p>
              ) : (
                workspace.reminders.map((rem) => (
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
                      <div className="flex items-center gap-1.5">
                        {rem.status !== 'Completed' && (
                          <button
                            onClick={() => onCompleteReminder(rem.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Done
                          </button>
                        )}
                        {onDeleteReminder && (
                          <button
                            type="button"
                            onClick={() => onDeleteReminder(rem.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Delete reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
