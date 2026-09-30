import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Sparkles,
  CheckCircle2,
  Calendar,
  Target,
  Flame,
  FileText,
  CheckSquare,
  Paperclip,
} from 'lucide-react';
import { Goal, Project, WorkspaceState } from '../types/bluenote';
import { PROJECT_TEMPLATES } from '../data/initialWorkspace';

interface ProjectsAndGoalsViewProps {
  workspace: WorkspaceState;
  onCreateProjectFromTemplate: (tpl: (typeof PROJECT_TEMPLATES)[0]) => void;
  onCreateCustomProject: (name: string, description: string, deadline: string, category: string) => void;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onToggleHabit: (habitId: string) => void;
}

export const ProjectsAndGoalsView: React.FC<ProjectsAndGoalsViewProps> = ({
  workspace,
  onCreateProjectFromTemplate,
  onCreateCustomProject,
  onAddGoal,
  onToggleHabit,
}) => {
  const [selectedProjId, setSelectedProjId] = useState<string>(
    workspace.projects[0]?.id || ''
  );
  const [showNewProjForm, setShowNewProjForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  const [goalTitle, setGoalTitle] = useState('');

  const selectedProject =
    workspace.projects.find((p) => p.id === selectedProjId) || workspace.projects[0];

  const projTasks = workspace.tasks.filter(
    (t) => t.projectId === selectedProject?.id && !t.deletedAt
  );
  const projFiles = workspace.files.filter(
    (f) => f.projectId === selectedProject?.id && !f.deletedAt
  );
  const projEvents = workspace.events.filter(
    (e) => e.projectId === selectedProject?.id && !e.deletedAt
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Project Templates */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6 text-blue-600" />
              Projects, Templates, Goals & Habits
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize multi-week initiatives with connected tasks, files, notes, contacts, and long-term goals.
            </p>
          </div>
          <button
            onClick={() => setShowNewProjForm(!showNewProjForm)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Custom Project
          </button>
        </div>

        {showNewProjForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!projName.trim()) return;
              onCreateCustomProject(projName.trim(), projDesc.trim(), projDeadline, 'Work');
              setProjName('');
              setProjDesc('');
              setShowNewProjForm(false);
            }}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-3"
          >
            <input
              type="text"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Project Name..."
              className="md:col-span-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Project Objective / Description..."
              className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            />
            <input
              type="date"
              value={projDeadline}
              onChange={(e) => setProjDeadline(e.target.value)}
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono"
            />
            <button
              type="submit"
              className="md:col-span-1 rounded-xl bg-blue-600 text-white text-xs font-semibold py-2"
            >
              Save
            </button>
          </form>
        )}

        {/* Built-in Templates (Part 3 Requirement) */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            1-Click Smart Project Templates (Auto-creates project + starter tasks)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {PROJECT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onCreateProjectFromTemplate(tpl)}
                className="text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 transition-colors space-y-1"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  + {tpl.name}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Projects Grid + Detailed Project Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {workspace.projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => setSelectedProjId(proj.id)}
              className={`w-full text-left p-5 rounded-2xl border transition-all space-y-3 ${
                selectedProject?.id === proj.id
                  ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {proj.name}
                </span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {proj.progress}%
                </span>
              </div>
              <p className="text-xs text-slate-500">{proj.description}</p>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${proj.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Status: {proj.status}</span>
                <span>Target Deadline: {proj.deadline}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Project Workspace */}
        <div className="lg:col-span-7">
          {selectedProject && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Project Dashboard • {selectedProject.category}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedProject.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedProject.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-blue-600">
                    {selectedProject.progress}%
                  </div>
                  <div className="text-[11px] text-slate-400">Due {selectedProject.deadline}</div>
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

              {/* Connected Project Tasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  Project Tasks ({projTasks.length})
                </h3>
                {projTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {t.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {t.priority} • {t.dueDate}
                    </span>
                  </div>
                ))}
              </div>

              {/* Connected Files & Events */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                    Attached Files & OCR ({projFiles.length})
                  </h4>
                  {projFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                    >
                      📄 {f.displayName}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Project Events ({projEvents.length})
                  </h4>
                  {projEvents.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                    >
                      📅 {e.title} ({e.date})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
            {workspace.goals.map((g) => (
              <div
                key={g.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {g.title}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {g.progress}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{g.description}</p>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!goalTitle.trim()) return;
              onAddGoal({
                title: goalTitle.trim(),
                description: 'Connected to active workspace projects and daily habits',
                targetDate: '2026-12-31',
                progress: 15,
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
            {workspace.habits.map((h) => (
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
                      Schedule: {h.schedule} • Reminder: {h.reminderTime}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-mono font-bold">
                  🔥 {h.streak} day streak
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
