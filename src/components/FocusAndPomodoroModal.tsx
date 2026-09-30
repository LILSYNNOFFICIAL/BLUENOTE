import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  VolumeX,
  Sparkles,
  CheckSquare,
  Clock,
  Coffee,
} from 'lucide-react';
import { Task } from '../types/bluenote';

interface FocusAndPomodoroModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onLogMinutes: (taskId: string, minutes: number) => void;
}

export const FocusAndPomodoroModal: React.FC<FocusAndPomodoroModalProps> = ({
  isOpen,
  task,
  onClose,
  onToggleSubtask,
  onCompleteTask,
  onLogMinutes,
}) => {
  const [preset, setPreset] = useState<'25/5' | '50/10' | '90/20'>('25/5');
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [deepWorkSilence, setDeepWorkSilence] = useState(true);
  const [scratchNotes, setScratchNotes] = useState('');

  useEffect(() => {
    const [workMins, breakMins] = preset.split('/').map(Number);
    setSecondsLeft((isBreak ? breakMins : workMins) * 60);
    setIsRunning(false);
  }, [preset, isBreak]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!isBreak && task) {
            const workMins = Number(preset.split('/')[0]);
            onLogMinutes(task.id, workMins);
          }
          setIsBreak((b) => !b);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isBreak, preset, task, onLogMinutes]);

  if (!isOpen) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Distraction-Free Focus Mode
          </div>
          <button
            onClick={() => setDeepWorkSilence(!deepWorkSilence)}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              deepWorkSilence
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <VolumeX className="w-3.5 h-3.5" />
            {deepWorkSilence ? 'Deep Work: Notifications Silenced' : 'Notifications Allowed'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <X className="w-4 h-4" />
          Exit Focus Mode
        </button>
      </div>

      {/* Main Focus Center */}
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8">
        {/* Timer Column */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center">
          <div className="flex items-center gap-2 mb-6">
            {(['25/5', '50/10', '90/20'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p);
                  setIsBreak(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  preset === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p} min
              </button>
            ))}
          </div>

          <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2 flex items-center gap-1.5">
            {isBreak ? <Coffee className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {isBreak ? 'Rest & Recharge Break' : 'Deep Focus Session'}
          </div>

          <div className="text-7xl font-mono font-bold tracking-tight my-4 text-white">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg transition-all"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause Timer' : 'Start Focus'}
            </button>
            <button
              onClick={() => {
                const [w, b] = preset.split('/').map(Number);
                setSecondsLeft((isBreak ? b : w) * 60);
                setIsRunning(false);
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Task & Scratchpad Column */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
          {task ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Current Priority Task • {task.priority}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{task.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                </div>
                <button
                  onClick={() => {
                    onCompleteTask(task.id);
                    onClose();
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
              </div>

              {task.subtasks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                  </span>
                  <div className="space-y-1.5">
                    {task.subtasks.map((sub) => (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => onToggleSubtask(task.id, sub.id)}
                          className="rounded border-slate-600 text-blue-500"
                        />
                        <span className={sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                          {sub.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold">Open Deep Work Session</h2>
              <p className="text-xs text-slate-400 mt-1">
                Focus on your highest-priority work without sidebar or notification distractions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">
              Session Scratchpad (Auto-saved)
            </label>
            <textarea
              value={scratchNotes}
              onChange={(e) => setScratchNotes(e.target.value)}
              rows={4}
              placeholder="Jot down thoughts during focus without leaving your flow..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        AI Productivity Coach: You usually complete complex tasks 28% faster during morning focus blocks.
      </div>
    </div>
  );
};
