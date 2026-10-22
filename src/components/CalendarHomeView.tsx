import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, CheckSquare, Calendar as CalendarIcon, FolderKanban, FileText, ScanText, Mic, Clock3 } from 'lucide-react';
import type { ActiveSection, CalendarEvent, Task, WorkspaceState } from '../types/bluenote';

type CreateKind = 'event' | 'task';
interface CalendarHomeViewProps {
  workspace: WorkspaceState;
  onNavigate: (section: ActiveSection, itemId?: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onOpenBrainDump: (tab?: 'brain-dump' | 'ocr-scanner') => void;
}

const iso = (d: Date) => {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return local.toISOString().slice(0, 10);
};
const shift = (date: string, days: number) => {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const CalendarHomeView: React.FC<CalendarHomeViewProps> = ({
  workspace, onNavigate, onToggleTask, onAddTask, onAddEvent, onOpenBrainDump,
}) => {
  const today = iso(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [panelOpen, setPanelOpen] = useState(false);
  const [kind, setKind] = useState<CreateKind>('event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [category, setCategory] = useState<CalendarEvent['category']>('Focus Block');
  const [priority, setPriority] = useState<Task['priority']>('Medium');

  const week = useMemo(() => {
    const anchor = new Date(selectedDate + 'T12:00:00');
    const startOfWeek = new Date(anchor);
    startOfWeek.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return { date: iso(d), day: d.toLocaleDateString(undefined, { weekday: 'short' }), number: d.getDate() };
    });
  }, [selectedDate]);

  const events = useMemo(() => workspace.events.filter(e => !e.deletedAt && e.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime)), [workspace.events, selectedDate]);
  const tasks = useMemo(() => workspace.tasks.filter(t => !t.deletedAt && t.status !== 'Archived' && t.dueDate === selectedDate).sort((a,b) => (a.dueTime || '').localeCompare(b.dueTime || '')), [workspace.tasks, selectedDate]);
  const allDayItems = useMemo(() => workspace.events.filter(e => !e.deletedAt && e.date >= week[0].date && e.date <= week[6].date), [workspace.events, week]);
  const weekTasks = useMemo(() => workspace.tasks.filter(t => !t.deletedAt && t.status !== 'Archived' && t.status !== 'Completed' && t.dueDate >= week[0].date && t.dueDate <= week[6].date), [workspace.tasks, week]);
  const weekProjectTasks = useMemo(() => (workspace.osProjects || []).filter(p => !p.isArchived).flatMap(p => p.tasks.filter(t => t.status !== 'Done' && t.dueDate >= week[0].date && t.dueDate <= week[6].date).map(t => ({ ...t, projectName: p.name }))), [workspace.osProjects, week]);
  const dayProjectTasks = useMemo(() => (workspace.osProjects || []).filter(p => !p.isArchived).flatMap(p => p.tasks.filter(t => t.status !== 'Done' && t.dueDate === selectedDate).map(t => ({ ...t, projectName: p.name }))), [workspace.osProjects, selectedDate]);
  const monthDays = useMemo(() => {
    const anchor = new Date(selectedDate + 'T12:00:00');
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return { date: iso(d), day: d.toLocaleDateString(undefined, { weekday: 'short' }), number: d.getDate(), inMonth: d.getMonth() === anchor.getMonth() };
    });
  }, [selectedDate]);
  const selectedLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const openCreate = (nextKind: CreateKind) => {
    setKind(nextKind); setDate(selectedDate); setTitle(''); setPanelOpen(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === 'event') {
      onAddEvent({
        title: title.trim(), description: '', date, startTime: start, endTime: end, allDay: false,
        category, tags: [category], linkedContactIds: [],
        color: category === 'Deadline' ? '#dc2626' : category === 'Meeting' ? '#7c3aed' : '#2563eb',
      });
    } else {
      onAddTask({
        title: title.trim(), description: '', priority, status: 'Not Started', dueDate: date, dueTime: start,
        estimatedMinutes: 30, actualMinutes: 0, completionPercentage: 0, category: 'Personal',
        tags: ['Calendar'], subtasks: [], linkedItems: [],
      });
    }
    setPanelOpen(false); setTitle('');
  };

  return (
    <div className="bn-calendar-home">
      <header className="bn-calendar-home-header">
        <div>
          <div className="bn-calendar-eyebrow"><CalendarDays size={15}/> YOUR TIME, IN ONE PLACE</div>
          <h1>Calendar</h1>
          <p>Plan your week. Keep tasks, deadlines, and projects in view.</p>
        </div>
        <div className="bn-calendar-header-actions">
          <button type="button" className="bn-calendar-quiet" onClick={() => onOpenBrainDump('ocr-scanner')}><ScanText size={16}/> Scan</button>
          <button type="button" className="bn-calendar-quiet" onClick={() => onOpenBrainDump('brain-dump')}><Mic size={16}/> Capture</button>
          <button type="button" className="bn-calendar-primary" onClick={() => openCreate('event')}><Plus size={17}/> Add to calendar</button>
        </div>
      </header>

      <section className="bn-calendar-layout">
        <div className="bn-calendar-main">
          <div className="bn-week-toolbar">
            <div><h2>{new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined,{month:'long', year:'numeric'})}</h2><span>{viewMode === 'week' ? 'Week view' : 'Month view'}</span></div>
            <div className="bn-calendar-view-switch" role="group" aria-label="Calendar view"><button type="button" className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Week</button><button type="button" className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Month</button></div>
            <div className="bn-week-controls">
              <button type="button" onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); if (viewMode === 'week') d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1); setSelectedDate(iso(d)); }} aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}><ChevronLeft size={17}/></button>
              <button type="button" onClick={() => setSelectedDate(today)}>Today</button>
              <button type="button" onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); if (viewMode === 'week') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1); setSelectedDate(iso(d)); }} aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}><ChevronRight size={17}/></button>
            </div>
          </div>
          <div className={viewMode === 'week' ? 'bn-week-grid' : 'bn-month-grid'} role="group" aria-label="Choose a day">
            {(viewMode === 'week' ? week : monthDays).map(day => {
              const dayEvents = allDayItems.filter(e => e.date === day.date);
              const dayTasks = weekTasks.filter(t => t.dueDate === day.date);
              const dayProjects = weekProjectTasks.filter(t => t.dueDate === day.date);
              return <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className={'bn-week-day' + (selectedDate === day.date ? ' is-selected' : '') + (day.date === today ? ' is-today' : '') + ('inMonth' in day && !day.inMonth ? ' is-outside-month' : '')}>
                <span className="bn-week-day-name">{day.day}</span><span className="bn-week-day-number">{day.number}</span>
                <span className="bn-week-dots">{dayEvents.slice(0,3).map(e => <i key={e.id} style={{background:e.color || '#2563eb'}}/>)}{dayTasks.slice(0,3).map(t => <i key={t.id} className="task-dot"/>)}</span>
                <span className="bn-week-count">{dayEvents.length + dayTasks.length + dayProjects.length ? `${dayEvents.length + dayTasks.length + dayProjects.length} planned` : '—'}</span>
              </button>;
            })}
          </div>
          <div className="bn-calendar-day-heading">
            <div><span className="bn-calendar-eyebrow">DAILY PLAN</span><h2>{selectedLabel}</h2></div>
            <div className="bn-day-add-actions"><button type="button" onClick={() => openCreate('task')}><Plus size={14}/> Task</button><button type="button" onClick={() => openCreate('event')}><Plus size={14}/> Event</button></div>
          </div>
          <div className="bn-agenda-list">
            {events.length === 0 && tasks.length === 0 && dayProjectTasks.length === 0 && <div className="bn-calendar-empty"><CalendarDays size={24}/><strong>Your day is clear</strong><span>Add an event or schedule a task for this date.</span><button type="button" onClick={() => openCreate('event')}>Plan something</button></div>}
            {events.map(event => <article className="bn-agenda-item" key={event.id}><span className="bn-agenda-time">{event.startTime}<small>{event.endTime}</small></span><span className="bn-agenda-color" style={{background:event.color || '#2563eb'}}/><div className="bn-agenda-copy"><strong>{event.title}</strong><span>{event.category}{event.location ? ' · ' + event.location : ''}</span></div><button type="button" className="bn-agenda-open" onClick={() => onNavigate('calendar',event.id)} aria-label={'Open ' + event.title}>↗</button></article>)}
            {dayProjectTasks.map(task => <article className="bn-agenda-item bn-agenda-task" key={task.id}><span className="bn-agenda-time">Project<small>Due today</small></span><span className="bn-agenda-color task-color"/><div className="bn-agenda-copy"><strong>{task.title}</strong><span>{task.projectName} · Project task</span></div><button type="button" className="bn-agenda-open" onClick={() => onNavigate('projects-os',task.projectId)} aria-label={'Open project task ' + task.title}>↗</button></article>)}
            {tasks.map(task => <article className={'bn-agenda-item bn-agenda-task' + (task.status === 'Completed' ? ' is-complete' : '')} key={task.id}><button type="button" className="bn-task-check" onClick={() => onToggleTask(task.id)} aria-label={'Complete ' + task.title}><CheckSquare size={17}/></button><span className="bn-agenda-time">{task.dueTime || 'Any time'}<small>{task.estimatedMinutes} min</small></span><span className="bn-agenda-color task-color"/><div className="bn-agenda-copy"><strong>{task.title}</strong><span>{task.priority} priority{task.projectId ? ' · Project linked' : ' · Task'}</span></div><button type="button" className="bn-agenda-open" onClick={() => onNavigate('tasks',task.id)} aria-label={'Open ' + task.title}>↗</button></article>)}
          </div>
        </div>

        <aside className="bn-calendar-side">
          <div className="bn-calendar-side-top"><div><span className="bn-calendar-eyebrow">UP NEXT</span><h2>{selectedDate === today ? 'Today’s agenda' : 'Day overview'}</h2></div><span className="bn-agenda-total">{events.length + tasks.length + dayProjectTasks.length}</span></div>
          <div className="bn-calendar-stats"><div><strong>{events.length}</strong><span>Events</span></div><div><strong>{tasks.filter(t=>t.status!=='Completed').length}</strong><span>Open tasks</span></div><div><strong>{workspace.reminders.filter(r=>r.triggerDate===selectedDate && r.status==='Active').length}</strong><span>Reminders</span></div></div>
          <div className="bn-calendar-side-section"><h3>Scheduled</h3>{events.length ? events.map(e=><button type="button" className="bn-side-event" key={e.id} onClick={()=>onNavigate('calendar',e.id)}><i style={{background:e.color || '#2563eb'}}/><span><strong>{e.title}</strong><small>{e.startTime}–{e.endTime}</small></span></button>) : <p className="bn-calendar-muted">Nothing scheduled yet.</p>}</div>
          <div className="bn-calendar-side-section"><h3>Tasks due</h3>{tasks.length ? tasks.map(t=><button type="button" className="bn-side-event" key={t.id} onClick={()=>onNavigate('tasks',t.id)}><i className="task-dot"/><span><strong>{t.title}</strong><small>{t.dueTime || 'No time set'} · {t.priority}</small></span></button>) : <p className="bn-calendar-muted">No tasks due on this day.</p>}</div>
          <div className="bn-calendar-side-section bn-calendar-shortcuts"><h3>Workspace</h3><button type="button" onClick={()=>onNavigate('projects-os')}><FolderKanban size={16}/> Projects OS <span>{workspace.osProjects?.filter(p=>!p.isArchived).length || 0}</span></button><button type="button" onClick={()=>onNavigate('notes')}><FileText size={16}/> Notes <span>{workspace.notes.filter(n=>!n.deletedAt).length}</span></button><button type="button" onClick={()=>onNavigate('calendar')}><Clock3 size={16}/> Full planner <span>↗</span></button></div>
        </aside>
      </section>

      {panelOpen && <div className="bn-calendar-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}><section className="bn-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="bn-calendar-modal-title"><header><div><span className="bn-calendar-eyebrow">QUICK SCHEDULE</span><h2 id="bn-calendar-modal-title">{kind === 'event' ? 'Add an event' : 'Schedule a task'}</h2></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close"><X size={18}/></button></header><div className="bn-calendar-kind-tabs"><button type="button" className={kind==='event'?'active':''} onClick={()=>setKind('event')}><CalendarIcon size={15}/> Event</button><button type="button" className={kind==='task'?'active':''} onClick={()=>setKind('task')}><CheckSquare size={15}/> Task</button></div><form onSubmit={submit}><label>What needs to get done?<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={kind==='event'?'e.g. Dentist appointment':'e.g. Finish project outline'} required/></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><div className="bn-calendar-form-row"><label>Start time<input type="time" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>End time{kind==='event' ? <input type="time" value={end} onChange={e=>setEnd(e.target.value)} required/> : <select value={priority} onChange={e=>setPriority(e.target.value as Task['priority'])}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option><option>Someday</option></select>}</label></div>{kind==='event' && <label>Type<select value={category} onChange={e=>setCategory(e.target.value as CalendarEvent['category'])}><option>Focus Block</option><option>Meeting</option><option>Appointment</option><option>Deadline</option><option>Personal</option><option>Birthday</option></select></label>}<footer><button type="button" className="bn-calendar-quiet" onClick={()=>setPanelOpen(false)}>Cancel</button><button type="submit" className="bn-calendar-primary"><Plus size={16}/> Save to calendar</button></footer></form></section></div>}
    </div>
  );
};
