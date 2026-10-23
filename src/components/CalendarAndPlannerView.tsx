import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Bell,
  Plus,
  AlertTriangle,
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'agenda'>('month');
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [eventNote, setEventNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
    if (viewMode === 'month') {
      const day = base.getDate();
      base.setDate(1);
      base.setMonth(base.getMonth() + (days < 0 ? -1 : 1));
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      base.setDate(Math.min(day, lastDay));
    } else {
      base.setDate(base.getDate() + days);
    }
    handleSelectDate(base.toISOString().split('T')[0]);
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
    const query = searchQuery.trim().toLocaleLowerCase();
    return workspace.events
      .filter((e) => e.date === selectedDate && (!query || e.title.toLocaleLowerCase().includes(query) || e.category.toLocaleLowerCase().includes(query) || (e.location || '').toLocaleLowerCase().includes(query)))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [workspace.events, selectedDate, searchQuery]);

  // Tasks due on selectedDate
  const dayTasks = useMemo(() => {
    return workspace.tasks.filter(
      (t) => !t.deletedAt && t.status !== 'Completed' && t.status !== 'Archived' && t.dueDate === selectedDate
    );
  }, [workspace.tasks, selectedDate]);

  // PROJECTS OS Tasks due on selectedDate
  const dayOSProjectTasks = useMemo(() => {
    const list: { id: string; projectName: string; title: string; priority: string; dueDate: string }[] = [];
    (workspace.osProjects || []).forEach((proj) => {
      if (proj.isArchived) return;
      proj.tasks.forEach((t) => {
        if (t.status !== 'Done' && t.dueDate === selectedDate) {
          list.push({
            id: t.id,
            projectName: proj.name,
            title: t.title,
            priority: t.priority,
            dueDate: t.dueDate,
          });
        }
      });
    });
    return list;
  }, [workspace.osProjects, selectedDate]);

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
      description: eventNote.trim() || `${category} scheduled in Calendar`,
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
    setEventNote('');
    setEventEditorOpen(false);
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
    <div className="bn-calendar-reference min-w-0 pb-8">
      <div className="bn-calendar-frame overflow-hidden rounded-[28px] border border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="bn-calendar-topbar flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Calendar &amp; Planner</h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">Your schedule, deadlines, and focus time in one place.</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <input
                aria-label="Search activities"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities"
                className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
              />
            </div>
            <button type="button" onClick={() => { setDate(selectedDate); setEventEditorOpen(true); }} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">New event</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="bn-calendar-workspace grid min-w-0 grid-cols-1 lg:grid-cols-[58px_minmax(0,1fr)_292px]">
          <nav aria-label="Calendar shortcuts" className="hidden flex-col items-center gap-3 border-r border-white/10 bg-black/10 py-5 lg:flex">
            {[
              { label: 'Month view', icon: CalendarDays, mode: 'month' as const },
              { label: 'Week view', icon: Calendar, mode: 'week' as const },
              { label: 'Day view', icon: Clock, mode: 'day' as const },
              { label: 'Agenda view', icon: CheckSquare, mode: 'agenda' as const },
            ].map((item) => {
              const Icon = item.icon;
              return <button key={item.mode} type="button" aria-label={item.label} title={item.label} onClick={() => setViewMode(item.mode)} className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${viewMode === item.mode ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" /></button>;
            })}
            <div className="mt-auto flex flex-col gap-2">
              <button type="button" aria-label="Add reminder" title="Add reminder" onClick={() => document.getElementById('bn-calendar-reminder-title')?.focus()} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white"><Bell className="h-4 w-4" /></button>
            </div>
          </nav>

          <main className="min-w-0 p-3 sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2 className="text-xl font-medium text-slate-100 sm:text-2xl">
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long' })}
                  </h2>
                  <span className="text-lg text-slate-400 sm:text-xl">{new Date(`${selectedDate}T12:00:00`).getFullYear()}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formattedSelectedDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Previous period" onClick={() => shiftDate(viewMode === 'week' ? -7 : viewMode === 'month' ? -30 : -1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-sky-400/60 hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => handleSelectDate(todayISO)} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/60 hover:text-white">Today</button>
                <button type="button" aria-label="Next period" onClick={() => shiftDate(viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-sky-400/60 hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.035] p-1 lg:hidden">
              {(['month', 'week', 'day', 'agenda'] as const).map((mode) => <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${viewMode === mode ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{mode}</button>)}
            </div>

            {conflicts.length > 0 && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Schedule conflict: {conflicts.join(' • ')}</span></div>}

            {viewMode === 'month' && <>
              <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:gap-2 sm:text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-1">{day}</div>)}
              </div>
              <div className="bn-calendar-month-grid grid grid-cols-7 gap-1 sm:gap-2">
                {monthCells.map((cell, idx) => {
                  if (!cell.dateStr || !cell.dayNum) return <div key={`blank-${idx}`} aria-hidden="true" className="min-h-[62px] rounded-xl border border-transparent sm:min-h-[94px] lg:min-h-[112px]" />;
                  const query = searchQuery.trim().toLocaleLowerCase();
                  const evts = workspace.events.filter((e) => e.date === cell.dateStr && (!query || e.title.toLocaleLowerCase().includes(query) || e.category.toLocaleLowerCase().includes(query) || (e.location || '').toLocaleLowerCase().includes(query))).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const tasksDue = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Completed' && t.status !== 'Archived' && t.dueDate === cell.dateStr);
                  const isSelected = cell.dateStr === selectedDate;
                  const isToday = cell.dateStr === todayISO;
                  return <button key={cell.dateStr} type="button" onClick={() => { handleSelectDate(cell.dateStr!); setEventEditorOpen(true); }} aria-label={`${cell.dateStr}, ${evts.length} events`} aria-pressed={isSelected} className={`bn-calendar-day min-w-0 rounded-xl border p-1.5 text-left transition sm:rounded-2xl sm:p-2.5 ${isSelected ? 'border-sky-400 bg-sky-500/20 shadow-[inset_0_0_0_1px_rgba(56,189,248,.12)]' : 'border-white/[0.08] bg-white/[0.035] hover:border-sky-400/40 hover:bg-white/[0.06]'}`}>
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${isToday ? 'bg-sky-500 font-bold text-slate-950' : isSelected ? 'font-bold text-sky-200' : 'text-slate-200'}`}>{cell.dayNum}</span>
                      {(evts.length + tasksDue.length > 0) && <span className="text-[9px] text-slate-500 sm:text-[10px]">{evts.length + tasksDue.length}</span>}
                    </div>
                    <div className="space-y-1">
                      {evts.slice(0, 2).map((evt) => <div key={evt.id} className="truncate rounded px-1 py-0.5 text-[9px] leading-tight text-slate-200 sm:text-[10px]" style={{ backgroundColor: `${evt.color || '#38bdf8'}22`, borderLeft: `2px solid ${evt.color || '#38bdf8'}` }} title={evt.title}>{viewMode === 'month' && <><span className="hidden sm:inline">{evt.startTime} </span>{evt.title}</>}</div>)}
                      {tasksDue.length > 0 && evts.length < 2 && <div className="hidden truncate rounded bg-amber-400/10 px-1 py-0.5 text-[9px] text-amber-200 sm:block">{tasksDue.length} task{tasksDue.length === 1 ? '' : 's'}</div>}
                      {evts.length > 2 && <div className="text-[9px] text-slate-500">+{evts.length - 2} more</div>}
                    </div>
                  </button>;
                })}
              </div>
            </>}

            {viewMode === 'week' && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
              {weekDays.map((day) => {
                const evts = workspace.events.filter((e) => e.date === day.dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return <button key={day.dateStr} type="button" onClick={() => { handleSelectDate(day.dateStr); setViewMode('day'); }} className={`min-h-24 rounded-xl border p-3 text-left transition ${day.dateStr === selectedDate ? 'border-sky-400 bg-sky-500/15' : 'border-white/10 bg-white/[0.035] hover:border-sky-400/40'}`}>
                  <div className="mb-2 flex items-center justify-between"><span className="text-[10px] uppercase text-slate-500">{day.dayShort}</span><span className={`text-sm ${day.isToday ? 'font-bold text-sky-300' : 'text-slate-200'}`}>{day.dayNum}</span></div>
                  {evts.slice(0, 3).map((evt) => <div key={evt.id} className="mb-1 truncate rounded px-1.5 py-1 text-[10px]" style={{ backgroundColor: `${evt.color || '#38bdf8'}22`, borderLeft: `2px solid ${evt.color || '#38bdf8'}` }}>{evt.title}</div>)}
                  {evts.length === 0 && <span className="text-[10px] text-slate-600">No events</span>}
                </button>;
              })}
            </div>}

            {(viewMode === 'day' || viewMode === 'agenda') && <div className="space-y-2">
              {(viewMode === 'agenda' ? [...workspace.events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)) : dayEvents).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><CalendarDays className="mx-auto mb-2 h-7 w-7 text-slate-600" /><p className="text-sm text-slate-400">Nothing scheduled here yet.</p><button type="button" onClick={() => setEventEditorOpen(true)} className="mt-3 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950">Create an event</button></div> :
                (viewMode === 'agenda' ? [...workspace.events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)) : dayEvents).map((evt) => <div key={evt.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
                  <div className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: evt.color || '#38bdf8' }} />
                  <div className="min-w-0 flex-1"><div className="text-[11px] text-slate-400">{evt.date} · {evt.startTime}–{evt.endTime}</div><h3 className="mt-1 truncate text-sm font-semibold text-slate-100">{evt.title}</h3>{evt.location && <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{evt.location}</p>}</div>
                  {onDeleteEvent && <button type="button" aria-label={`Delete ${evt.title}`} onClick={() => onDeleteEvent(evt.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>}
                </div>)}
            </div>}

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-200">Tasks due this day</h3><span className="text-xs text-slate-500">{dayTasks.length + dayOSProjectTasks.length} open</span></div>
              {[...dayTasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, projectName: '', task: t })), ...dayOSProjectTasks.map((t) => ({ ...t, task: undefined }))].length === 0 ? <p className="text-xs text-slate-600">No tasks due on this date.</p> :
                <div className="space-y-2">{dayTasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{task.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{task.priority} priority · {task.estimatedMinutes} min</p></div><button type="button" onClick={() => handleTimeBlockTask(task)} className="shrink-0 rounded-full bg-indigo-500/20 px-3 py-1.5 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-500/30"><Clock className="mr-1 inline h-3 w-3" />Time-block</button></div>)}
                  {dayOSProjectTasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{task.projectName}: {task.title}</p><p className="mt-0.5 text-[10px] text-slate-500">PROJECTS · {task.priority} priority</p></div><button type="button" onClick={() => onAddEvent({ title: `[${task.projectName}] ${task.title}`, description: `Time-blocked from PROJECTS (${task.projectName})`, date: selectedDate, startTime: '14:00', endTime: '15:00', allDay: false, category: 'Focus Block', location: 'PROJECTS Workspace', tags: ['PROJECTS', 'Focus-Block'], linkedContactIds: [], color: '#4f46e5' })} className="shrink-0 rounded-full bg-indigo-500/20 px-3 py-1.5 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-500/30"><Clock className="mr-1 inline h-3 w-3" />Time-block</button></div>)}
                </div>}
            </div>
          </main>

          <aside className="bn-calendar-agenda min-w-0 border-t border-white/10 bg-black/10 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><h2 className="text-base font-semibold text-white">Scheduled</h2><p className="mt-0.5 text-[11px] text-slate-500">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
              <button type="button" aria-label="Add event for selected date" onClick={() => { setDate(selectedDate); setEventEditorOpen(true); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:border-sky-400/40 hover:text-sky-200"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {dayEvents.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center"><Clock className="mx-auto mb-2 h-5 w-5 text-slate-600" /><p className="text-xs text-slate-500">No events scheduled.</p><button type="button" onClick={() => { setDate(selectedDate); setEventEditorOpen(true); }} className="mt-2 text-xs font-semibold text-sky-300 hover:text-sky-200">+ Add an event</button></div> :
                dayEvents.map((evt) => <article key={evt.id} className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.045]">
                  <div className="h-1.5" style={{ backgroundColor: evt.color || '#38bdf8' }} />
                  <div className="p-3"><p className="text-[10px] font-semibold text-slate-400">{evt.startTime}</p><h3 className="mt-1 text-sm font-semibold text-slate-100">{evt.title}</h3><p className="mt-1 text-[11px] text-slate-400">{evt.category}</p>{evt.location && <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3" />{evt.location}</p>}<div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[10px] text-slate-500"><span>{evt.startTime}–{evt.endTime}</span>{onDeleteEvent && <button type="button" onClick={() => onDeleteEvent(evt.id)} className="font-medium text-slate-400 hover:text-rose-300">Delete</button>}</div></div>
                </article>)}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Bell className="h-4 w-4 text-amber-300" />Reminders</h3><span className="text-[10px] text-slate-500">{workspace.reminders.filter((r) => r.status !== 'Completed').length} active</span></div>
              <form onSubmit={(e) => { e.preventDefault(); if (!remTitle.trim()) return; onAddReminder({ title: remTitle.trim(), triggerDate: remDate, triggerTime: remTime, repeatRule: remRepeat, status: 'Active', notificationType: 'Both', smartSuggestionReason: `Scheduled (${remRepeat}) from Calendar & Reminder planner` }); setRemTitle(''); }} className="space-y-2">
                <input id="bn-calendar-reminder-title" value={remTitle} onChange={(e) => setRemTitle(e.target.value)} placeholder="Add a reminder…" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-sky-400/50" />
                <div className="grid grid-cols-2 gap-2"><input aria-label="Reminder date" type="date" value={remDate} onChange={(e) => setRemDate(e.target.value)} className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-200" /><input aria-label="Reminder time" type="time" value={remTime} onChange={(e) => setRemTime(e.target.value)} className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-200" /></div>
                <div className="flex gap-2"><select aria-label="Reminder repeat" value={remRepeat} onChange={(e) => setRemRepeat(e.target.value as Reminder['repeatRule'])} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-200"><option value="Once">Once</option><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option></select><button type="submit" className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400">Add</button></div>
              </form>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {workspace.reminders.map((rem) => <div key={rem.id} className={`rounded-lg border p-3 ${rem.status === 'Completed' ? 'border-white/5 bg-white/[0.02] opacity-60' : 'border-amber-300/10 bg-amber-300/[0.04]'}`}>
                  <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="break-words text-xs font-medium text-slate-200">{rem.title}</p><p className="mt-1 text-[10px] text-slate-500">{rem.triggerDate} · {rem.triggerTime} · {rem.repeatRule}</p></div>
                    <div className="flex shrink-0 gap-1">{rem.status !== 'Completed' && <button type="button" aria-label={`Complete ${rem.title}`} onClick={() => onCompleteReminder(rem.id)} className="rounded-md p-1 text-emerald-300 hover:bg-emerald-400/10"><Check className="h-3.5 w-3.5" /></button>}{onDeleteReminder && <button type="button" aria-label={`Delete reminder ${rem.title}`} onClick={() => onDeleteReminder(rem.id)} className="rounded-md p-1 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
                  </div>
                  {rem.status !== 'Completed' && <div className="mt-2 flex flex-wrap gap-1">{[[5, '5m'], [15, '15m'], [30, '30m'], [60, '1h'], [1440, 'Tomorrow']].map(([mins, label]) => <button key={label} type="button" onClick={() => onSnoozeReminder(rem.id, Number(mins))} className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-slate-400 hover:border-sky-400/40 hover:text-sky-200">{label}</button>)}</div>}
                </div>)}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {eventEditorOpen && <div className="bn-calendar-modal fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setEventEditorOpen(false); }}>
        <form onSubmit={handleAddEvt} className="bn-calendar-editor w-full max-w-lg rounded-t-3xl border border-white/10 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:rounded-3xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">Calendar event</p><h2 className="mt-1 text-xl font-semibold">Plan something</h2><p className="mt-1 text-xs text-slate-400">Choose a time, add details, and save it to your calendar.</p></div><button type="button" aria-label="Close event editor" onClick={() => setEventEditorOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">×</button></div>
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Event title</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Project planning" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-400/60" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Date</span><input type="date" value={date} onChange={(e) => { setDate(e.target.value); if (e.target.value) handleSelectDate(e.target.value); }} className="w-full rounded-xl border border-white/10 bg-slate-800 px-3.5 py-3 text-sm text-white outline-none focus:border-sky-400/60" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Start time</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-800 px-3 py-3 text-sm text-white" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">End time</span><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-800 px-3 py-3 text-sm text-white" /></label></div>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Category</span><select value={category} onChange={(e) => setCategory(e.target.value as CalendarEvent['category'])} className="w-full rounded-xl border border-white/10 bg-slate-800 px-3.5 py-3 text-sm text-white"><option value="Meeting">Meeting</option><option value="Appointment">Appointment</option><option value="Focus Block">Focus Block</option><option value="Deadline">Deadline</option><option value="Personal">Personal</option><option value="Birthday">Birthday</option></select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Location or meeting link</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-400/60" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Notes</span><textarea value={eventNote} onChange={(e) => setEventNote(e.target.value)} rows={2} placeholder="Add context or a reminder…" className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-400/60" /></label>
          </div>
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => setEventEditorOpen(false)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400">Save event</button></div>
        </form>
      </div>}
    </div>
  );
};
