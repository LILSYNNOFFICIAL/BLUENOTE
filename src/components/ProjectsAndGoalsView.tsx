import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Target,
  Flame,
  Calendar,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { Goal, PriorityLevel, Project, WorkspaceState } from '../types/bluenote';
import { PROJECT_TEMPLATES } from '../data/initialWorkspace';

interface ProjectsAndGoalsViewProps {
  workspace: WorkspaceState;
  onCreateProjectFromTemplate: (tpl: (typeof PROJECT_TEMPLATES)[number]) => void;
  onCreateCustomProject: (
    name: string,
    description: string,
    deadline: string,
    category: Project['category']
  ) => void;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onToggleHabit: (habitId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onAddProjectTask?: (projectId: string, title: string, priority: PriorityLevel) => void;
  onUpdateProjectProgress?: (projectId: string, progress: number) => void;
  onUpdateGoalProgress?: (goalId: string, progress: number) => void;
  onAddHabit?: (name: string, schedule: 'Daily' | 'Weekdays') => void;
  onDeleteHabit?: (habitId: string) => void;
}

export const ProjectsAndGoalsView: React.FC<ProjectsAndGoalsViewProps> = ({
  workspace,
  onCreateProjectFromTemplate,
  onCreateCustomProject,
  onAddGoal,
  onToggleHabit,
  onDeleteProject,
  onDeleteGoal,
  onToggleTask,
  onAddProjectTask,
  onUpdateProjectProgress,
  onUpdateGoalProgress,
  onAddHabit,
  onDeleteHabit,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    workspace.projects[0]?.id || ''
  );
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customDeadline, setCustomDeadline] = useState('2026-12-31');
  const [customCat, setCustomCat] = useState<Project['category']>('Work');
  const [goalTitle, setGoalTitle] = useState('');
  const [projTaskTitle, setProjTaskTitle] = useState('');
  const [projTaskPriority, setProjTaskPriority] = useState<PriorityLevel>('High');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitSchedule, setNewHabitSchedule] = useState<'Daily' | 'Weekdays'>('Daily');

  const selectedProject =
    workspace.projects.find((p) => p.id === selectedProjectId) || workspace.projects[0];

  const projTasks = workspace.tasks.filter(
    (t) => !t.deletedAt && t.projectId === selectedProject?.id
  );
  const projFiles = workspace.files.filter((f) => f.projectId === selectedProject?.id);
  const projEvents = workspace.events.filter((e) => e.projectId === selectedProject?.id);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onCreateCustomProject(customName.trim(), customDesc.trim(), customDeadline, customCat);
    setCustomName('');
    setCustomDesc('');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & 1-Click Project Templates */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <FolderKanban className="w-4 h-4" />
              <span>Multi-Step Project Hub & Templates</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Projects, Goals & Habit Tracker
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect tasks, notes, files, contacts, and calendar events under structured projects or start from a 1-click template.
            </p>
          </div>

          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> New Custom Project
          </button>
        </div>

        {showCustomForm && (
          <form
            onSubmit={handleCreateCustom}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Project Name..."
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Goal or outcome description..."
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            />
            <select
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value as Project['category'])}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="Work">Work</option>
              <option value="Home">Home</option>
              <option value="Personal">Personal</option>
              <option value="Finance">Finance</option>
              <option value="Travel">Travel</option>
              <option value="Event">Event</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 text-white text-xs font-semibold py-2"
            >
              Create Project
            </button>
          </form>
        )}

        {/* 1-Click Project Templates */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            1-Click Starter Templates (Auto-Creates Tasks & Milestones)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {PROJECT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => onCreateProjectFromTemplate(tpl)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                  + {tpl.name}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Projects Grid + Detailed Project View */}
      {workspace.projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
          <FolderKanban className="w-8 h-8 text-blue-500 mx-auto" />
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            No active projects yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;New Custom Project&rdquo; above or choose any of the 1-Click Starter Templates to organize tasks, files, and deadlines.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {workspace.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedProject?.id === proj.id
                    ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {proj.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {proj.progress}%
                    </span>
                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{proj.description}</p>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7">
            {selectedProject && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      {selectedProject.category} Project • {selectedProject.status}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedProject.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{selectedProject.description}</p>
                  </div>
                  <div className="text-right space-y-1.5">
                    <div className="text-2xl font-bold font-mono text-blue-600">
                      {selectedProject.progress}%
                    </div>
                    <div className="text-[11px] text-slate-400">Due {selectedProject.deadline}</div>
                    {onUpdateProjectProgress && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProjectProgress(
                              selectedProject.id,
                              Math.max(0, selectedProject.progress - 10)
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          -10%
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProjectProgress(
                              selectedProject.id,
                              Math.min(100, selectedProject.progress + 10)
                            )
                          }
                          className="px-2 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-[10px] font-bold text-blue-600 dark:text-blue-400"
                        >
                          +10%
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateProjectProgress(selectedProject.id, 100)}
                          className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-600"
                        >
                          100%
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedProject.aiSummary && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 dark:text-slate-200">
                      <span className="font-bold">AI Project Summary: </span>
                      {selectedProject.aiSummary}
                    </div>
                  </div>
                )}

                {/* Connected Project Tasks + Inline Add Task */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    Project Tasks ({projTasks.length})
                  </h3>

                  {onAddProjectTask && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!projTaskTitle.trim()) return;
                        onAddProjectTask(selectedProject.id, projTaskTitle.trim(), projTaskPriority);
                        setProjTaskTitle('');
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={projTaskTitle}
                        onChange={(e) => setProjTaskTitle(e.target.value)}
                        placeholder={`Add task to ${selectedProject.name}...`}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
                      />
                      <select
                        value={projTaskPriority}
                        onChange={(e) => setProjTaskPriority(e.target.value as PriorityLevel)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                      >
                        + Task
                      </button>
                    </form>
                  )}

                  {projTasks.length === 0 ? (
                    <p className="text-xs text-slate-400">No tasks linked to this project yet.</p>
                  ) : (
                    projTasks.map((t) => {
                      const done = t.status === 'Completed';
                      return (
                        <div
                          key={t.id}
                          onClick={() => onToggleTask?.(t.id)}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-blue-300"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                done ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={`font-semibold ${
                                done
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {t.priority} • {t.dueDate}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Connected Files & Events */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                      Attached Files & OCR ({projFiles.length})
                    </h4>
                    {projFiles.length === 0 ? (
                      <p className="text-xs text-slate-400">No files attached yet.</p>
                    ) : (
                      projFiles.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                        >
                          📄 {f.displayName}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Project Events ({projEvents.length})
                    </h4>
                    {projEvents.length === 0 ? (
                      <p className="text-xs text-slate-400">No calendar events linked yet.</p>
                    ) : (
                      projEvents.map((e) => (
                        <div
                          key={e.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                        >
                          📅 {e.title} ({e.date})
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Long-Term Goals & Habit Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Long-Term Goals
            </h3>
          </div>
          <div className="space-y-3">
            {workspace.goals.length === 0 ? (
              <p className="text-xs text-slate-400">
                No long-term goals added yet. Add a goal below to track progress.
              </p>
            ) : (
              workspace.goals.map((g) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {g.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        {g.progress}%
                      </span>
                      {onUpdateGoalProgress && (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateGoalProgress(g.id, Math.max(0, g.progress - 10))}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold"
                          >
                            -10%
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGoalProgress(g.id, Math.min(100, g.progress + 10))
                            }
                            className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-bold"
                          >
                            +10%
                          </button>
                        </>
                      )}
                      {onDeleteGoal && (
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(g.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                          title="Delete goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">{g.description}</p>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!goalTitle.trim()) return;
              onAddGoal({
                title: goalTitle.trim(),
                description: 'Connected to active workspace projects and daily habits',
                targetDate: '2026-12-31',
                progress: 10,
                category: 'Personal',
                status: 'On Track',
                linkedProjectIds: [],
                linkedHabitIds: [],
              });
              setGoalTitle('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Add long-term goal (e.g. 'Read 20 Books')..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              + Goal
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Habit Tracker & Streaks
          </h3>
          <div className="space-y-2.5">
            {workspace.habits.length === 0 ? (
              <p className="text-xs text-slate-400">
                No habits tracked yet. Add a daily or weekday habit below to build streaks.
              </p>
            ) : (
              workspace.habits.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onToggleHabit(h.id)}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        h.completedToday ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {h.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Schedule: {h.schedule} • Reminder: {h.reminderTime || 'Anytime'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold">
                      🔥 {h.streak} day streak
                    </span>
                    {onDeleteHabit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHabit(h.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500"
                        title="Delete habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {onAddHabit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newHabitName.trim()) return;
                onAddHabit(newHabitName.trim(), newHabitSchedule);
                setNewHabitName('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Add habit (e.g. 'Deep Work 60m')..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <select
                value={newHabitSchedule}
                onChange={(e) => setNewHabitSchedule(e.target.value as 'Daily' | 'Weekdays')}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
              >
                <option value="Daily">Daily</option>
                <option value="Weekdays">Weekdays</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                + Habit
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
