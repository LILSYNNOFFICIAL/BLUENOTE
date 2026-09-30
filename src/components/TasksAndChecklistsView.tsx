import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Sparkles,
  Play,
  Trash2,
  Archive,
  Clock,
  Link2,
  AlertTriangle,
  ShoppingBag,
  Columns,
  List,
  CheckCircle2,
  Circle,
  Repeat,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  PriorityLevel,
  Task,
  TaskStatus,
  WorkspaceState,
} from '../types/bluenote';

interface TasksAndChecklistsViewProps {
  workspace: WorkspaceState;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTasks: (taskIds: string[]) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onStartFocus: (task: Task) => void;
  onAddShoppingItem: (listId: string, name: string, quantity: string, category: any) => void;
  onToggleShoppingItem: (listId: string, itemId: string) => void;
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Someday: 5,
};

const STATUS_COLUMNS: TaskStatus[] = [
  'Not Started',
  'In Progress',
  'Waiting',
  'Scheduled',
  'Completed',
];

export const TasksAndChecklistsView: React.FC<TasksAndChecklistsViewProps> = ({
  workspace,
  onAddTask,
  onUpdateTask,
  onDeleteTasks,
  onToggleSubtask,
  onAddSubtask,
  onStartFocus,
  onAddShoppingItem,
  onToggleShoppingItem,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'shopping'>('list');
  const [sortBy, setSortBy] = useState<'ai' | 'priority' | 'dueDate' | 'estimated'>('ai');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>('task-1');

  // New Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newProjectId, setNewProjectId] = useState('');
  const [newEstMinutes, setNewEstMinutes] = useState(30);
  const [newRepeat, setNewRepeat] = useState<Task['repeatRule']>('None');
  const [subtaskDraft, setSubtaskDraft] = useState('');

  // New Shopping Item
  const [shopItemName, setShopItemName] = useState('');
  const [shopItemQty, setShopItemQty] = useState('1');

  const activeTasks = useMemo(() => {
    let list = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Archived');
    if (filterPriority !== 'ALL') {
      list = list.filter((t) => t.priority === filterPriority);
    }
    return [...list].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      if (sortBy === 'priority' || sortBy === 'ai') {
        const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (diff !== 0) return diff;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
      return a.estimatedMinutes - b.estimatedMinutes;
    });
  }, [workspace.tasks, filterPriority, sortBy]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      description: '',
      priority: newPriority,
      status: 'Not Started',
      dueDate: newDueDate,
      estimatedMinutes: newEstMinutes,
      actualMinutes: 0,
      completionPercentage: 0,
      projectId: newProjectId || undefined,
      category: 'Work',
      tags: [newPriority === 'Critical' ? 'Urgent' : 'Task'],
      subtasks: [],
      repeatRule: newRepeat,
      aiReasoning: `AI prioritized as ${newPriority} based on due date (${newDueDate}) and workload.`,
      linkedItems: [],
    });
    setNewTitle('');
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = () => {
    selectedTaskIds.forEach((id) =>
      onUpdateTask(id, { status: 'Completed', completionPercentage: 100 })
    );
    setSelectedTaskIds([]);
  };

  const handleBulkArchive = () => {
    selectedTaskIds.forEach((id) => onUpdateTask(id, { status: 'Archived' }));
    setSelectedTaskIds([]);
  };

  const handleBulkDelete = () => {
    onDeleteTasks(selectedTaskIds);
    setSelectedTaskIds([]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-blue-600" />
              Tasks, Subtasks & Shopping Lists
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-prioritized tasks with subtasks, dependencies, recurring schedules, Kanban board, and smart checklists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" /> List View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Status Board
              </button>
              <button
                onClick={() => setViewMode('shopping')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'shopping'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Shopping & Checklists
              </button>
            </div>
          </div>
        </div>

        {/* Create Task Bar */}
        {viewMode !== 'shopping' && (
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new task (e.g. 'Prepare tax receipts for CPA')..."
              className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-medium"
            >
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
              <option value="Someday">Someday</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
            />
            <select
              value={newRepeat}
              onChange={(e) => setNewRepeat(e.target.value as Task['repeatRule'])}
              className="md:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs"
              title="Recurring Schedule"
            >
              <option value="None">Once</option>
              <option value="Daily">Daily</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <button
              type="submit"
              className="md:col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>
        )}

        {/* Filter & Bulk Action Bar */}
        {viewMode !== 'shopping' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Sort by:</span>
              {(
                [
                  ['ai', '✨ AI Recommended Order'],
                  ['priority', 'Priority'],
                  ['dueDate', 'Due Date'],
                  ['estimated', 'Estimated Time'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === k
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {selectedTaskIds.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-slate-700">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {selectedTaskIds.length} Selected:
                </span>
                <button
                  onClick={handleBulkComplete}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Complete
                </button>
                <button
                  onClick={handleBulkArchive}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" /> Archive
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {activeTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const blockerTask = task.dependsOnTaskId
              ? workspace.tasks.find((t) => t.id === task.dependsOnTaskId)
              : undefined;
            const isBlocked = blockerTask && blockerTask.status !== 'Completed';

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={() => toggleSelectTask(task.id)}
                    className="mt-1.5 rounded border-slate-300 text-blue-600"
                    title="Select for bulk action"
                  />

                  <button
                    onClick={() =>
                      onUpdateTask(task.id, {
                        status: task.status === 'Completed' ? 'Not Started' : 'Completed',
                        completionPercentage: task.status === 'Completed' ? 0 : 100,
                      })
                    }
                    className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {task.status === 'Completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className={`text-sm font-bold text-left hover:text-blue-600 transition-colors ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </button>

                      <select
                        value={task.priority}
                        onChange={(e) =>
                          onUpdateTask(task.id, { priority: e.target.value as PriorityLevel })
                        }
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Someday">Someday</option>
                      </select>

                      <select
                        value={task.status}
                        onChange={(e) =>
                          onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                        }
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {STATUS_COLUMNS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {task.dueDate} ({task.estimatedMinutes}m est)
                      </span>

                      {task.repeatRule && task.repeatRule !== 'None' && (
                        <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                          <Repeat className="w-3 h-3" /> {task.repeatRule}
                        </span>
                      )}
                    </div>

                    {isBlocked && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Waiting on dependency: "{blockerTask.title}"
                      </div>
                    )}

                    {task.aiReasoning && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{task.aiReasoning}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onStartFocus(task)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Focus
                    </button>
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Subtasks & Linked Items */}
                {isExpanded && (
                  <div className="pl-9 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {task.description}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                      </div>
                      {task.subtasks.map((sub) => (
                        <label
                          key={sub.id}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => onToggleSubtask(task.id, sub.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className={sub.completed ? 'line-through text-slate-400' : ''}>
                            {sub.title}
                          </span>
                        </label>
                      ))}

                      <div className="flex gap-2 pt-1 max-w-md">
                        <input
                          type="text"
                          value={subtaskDraft}
                          onChange={(e) => setSubtaskDraft(e.target.value)}
                          placeholder="Add subtask step..."
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!subtaskDraft.trim()) return;
                            onAddSubtask(task.id, subtaskDraft.trim());
                            setSubtaskDraft('');
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold"
                        >
                          + Step
                        </button>
                      </div>
                    </div>

                    {task.linkedItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Connected in Second Brain:
                        </span>
                        {task.linkedItems.map((ref) => (
                          <span
                            key={ref.id}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-medium"
                          >
                            {ref.type}: {ref.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: KANBAN STATUS BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((statusCol) => {
            const colTasks = activeTasks.filter((t) => t.status === statusCol);
            return (
              <div
                key={statusCol}
                className="bg-slate-100/80 dark:bg-slate-900/70 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {statusCol}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-blue-600">{task.priority}</span>
                        <span>{task.dueDate}</span>
                      </div>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                        }
                        className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1"
                      >
                        {STATUS_COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            Move to: {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: SHOPPING LISTS & CHECKLISTS */}
      {viewMode === 'shopping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspace.shoppingLists.map((list) => (
            <div
              key={list.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {list.name}
                  </h3>
                  <p className="text-xs text-slate-500">Store: {list.store}</p>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-600">
                  {list.items.filter((i) => i.checked).length}/{list.items.length} Checked
                </span>
              </div>

              <div className="space-y-2">
                {list.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => onToggleShoppingItem(list.id, item.id)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span
                        className={`text-xs font-semibold ${
                          item.checked
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-400">({item.quantity})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isRecurring && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                          Recurring
                        </span>
                      )}
                      {item.estimatedPrice && (
                        <span className="text-xs font-mono text-slate-500">
                          ${item.estimatedPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!shopItemName.trim()) return;
                  onAddShoppingItem(list.id, shopItemName.trim(), shopItemQty, 'Produce');
                  setShopItemName('');
                }}
                className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
              >
                <input
                  type="text"
                  value={shopItemName}
                  onChange={(e) => setShopItemName(e.target.value)}
                  placeholder="Add item to list..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={shopItemQty}
                  onChange={(e) => setShopItemQty(e.target.value)}
                  placeholder="Qty"
                  className="w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  + Add
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
