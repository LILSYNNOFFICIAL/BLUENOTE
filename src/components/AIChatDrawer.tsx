import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  Bot,
  FileText,
  CheckSquare,
  User,
  Calendar,
  ExternalLink,
  Check,
  Loader2,
  Wand2,
  Globe,
  MapPin,
  Cpu,
} from 'lucide-react';
import {
  ActiveSection,
  AIAgentType,
  AIMessage,
  AIMessageSource,
  EntityType,
  SuggestedAction,
  WorkspaceState,
} from '../types/bluenote';
import { askBlueNoteAI, transcribeAudioWithGemini } from '../services/aiService';

interface AIChatDrawerProps {
  isOpen: boolean;
  isFullPage?: boolean;
  workspace: WorkspaceState;
  onClose?: () => void;
  onAddMessage: (msg: AIMessage) => void;
  onExecuteAction: (action: SuggestedAction) => void;
  onNavigateSource: (section: ActiveSection, itemId: string) => void;
  onOpenBrainDump: () => void;
}

const AI_AGENTS: AIAgentType[] = [
  'Auto',
  'Task Assistant',
  'Note Assistant',
  'Research Assistant',
  'Calendar Assistant',
  'Contact Assistant',
  'File Assistant',
  'Writing Assistant',
  'Planning Assistant',
];

const GEMINI_CHAT_MODELS: {
  id: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
  label: string;
  desc: string;
}[] = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', desc: 'Balanced & General Tasks' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: 'Complex Reasoning & Strategy' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', desc: 'Ultra-Fast Responses' },
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  isFullPage = false,
  workspace,
  onClose,
  onAddMessage,
  onExecuteAction,
  onNavigateSource,
  onOpenBrainDump,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AIAgentType>('Auto');
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'
  >('gemini-3.5-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen && !isFullPage) return null;

  const activeConversation = workspace.conversations[0] || {
    id: 'conv-default',
    title: 'Workspace Assistant',
    agent: 'Auto' as AIAgentType,
    messages: [],
    updatedAt: new Date().toISOString(),
  };

  const mapTypeToSection = (t: EntityType): ActiveSection => {
    switch (t) {
      case 'task':
      case 'shopping':
        return 'tasks';
      case 'note':
        return 'notes';
      case 'project':
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
        return 'dashboard';
    }
  };

  const handleToggleMicTranscription = async () => {
    if (isRecordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = String(reader.result || '');
            try {
              const res = await transcribeAudioWithGemini({
                base64Audio,
                mimeType: audioBlob.type || 'audio/webm',
              });
              if (res.transcript) {
                setInput((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
              }
            } catch (err) {
              console.warn('Transcription error:', err);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim();
    if (!text || isThinking) return;

    const userMsg: AIMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      agent: selectedAgent,
      content: text,
      timestamp: new Date().toISOString(),
    };
    onAddMessage(userMsg);
    if (!customPrompt) setInput('');
    setIsThinking(true);

    try {
      let latLng: { latitude: number; longitude: number } | undefined;
      if (useMapsGrounding && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 })
          );
          latLng = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Proceed without geolocation if user denies
        }
      }

      const history = activeConversation.messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.content,
      }));

      const res = await askBlueNoteAI(text, selectedAgent, workspace, {
        model: selectedModel,
        useSearchGrounding,
        useMapsGrounding,
        latLng,
        history,
      });

      const aiMsg: AIMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        agent: selectedAgent,
        content: res.reply,
        timestamp: new Date().toISOString(),
        sources: res.sources,
        suggestedActions: res.suggestedActions,
        groundingLinks: res.groundingLinks,
        modelUsed: res.modelUsed || selectedModel,
      };
      onAddMessage(aiMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const samplePrompts = [
    'What should I work on today?',
    'Summarize my active tasks and priorities',
    'Help me plan my schedule for this week',
    'Organize my open notes into action items',
    'Draft a new project milestone checklist',
    'Best quiet workspaces near me',
  ];

  const containerClass = isFullPage
    ? 'flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden'
    : 'fixed right-0 top-0 bottom-0 z-40 w-full sm:w-96 md:w-[440px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/15">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">BlueNote Gemini Chatbot</h3>
            <p className="text-[11px] text-blue-100">
              Multi-turn History • Search & Maps Grounding
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenBrainDump}
            className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            title="Open Brain Dump"
          >
            <Wand2 className="w-3 h-3" />
            Brain Dump
          </button>
          {!isFullPage && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Close AI panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role & Model & Grounding Controls */}
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Assistant Role
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AIAgentType)}
              className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              {AI_AGENTS.map((ag) => (
                <option key={ag} value={ag}>
                  {ag === 'Auto' ? '✨ Auto Orchestrator' : ag}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Gemini Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="w-full text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              {GEMINI_CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Maps Grounding Toggles */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10px] font-semibold text-slate-500">Live Grounding:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setUseSearchGrounding((prev) => {
                  const next = !prev;
                  if (next) setUseMapsGrounding(false);
                  return next;
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                useSearchGrounding
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Use Google Search Grounding (gemini-3.5-flash)"
            >
              <Globe className="w-3 h-3" />
              Google Search
            </button>
            <button
              type="button"
              onClick={() => {
                setUseMapsGrounding((prev) => {
                  const next = !prev;
                  if (next) setUseSearchGrounding(false);
                  return next;
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                useMapsGrounding
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Use Google Maps Grounding (gemini-3.5-flash)"
            >
              <MapPin className="w-3 h-3" />
              Google Maps
            </button>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeConversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-700'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" />
                    {msg.agent}
                  </span>
                  {msg.modelUsed && (
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" />
                      {msg.modelUsed}
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-line">{msg.content}</div>

              {/* Google Search & Google Maps Grounding Links */}
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    {msg.groundingLinks[0].sourceType === 'maps' ? (
                      <>
                        <MapPin className="w-3 h-3" /> Verified Google Maps Places
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" /> Verified Google Search Citations
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    {msg.groundingLinks.map((lnk, idx) => (
                      <a
                        key={`${lnk.uri}-${idx}`}
                        href={lnk.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          <span className="truncate">{lnk.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </div>
                        {lnk.reviewSnippet && (
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                            “{lnk.reviewSnippet}”
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Workspace Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400">
                    Workspace Sources Cited ({msg.sources.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src: AIMessageSource) => (
                      <button
                        key={`${src.type}-${src.id}`}
                        onClick={() => onNavigateSource(mapTypeToSection(src.type), src.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        {src.type === 'note' && <FileText className="w-3 h-3 text-blue-600" />}
                        {src.type === 'task' && <CheckSquare className="w-3 h-3 text-emerald-600" />}
                        {src.type === 'contact' && <User className="w-3 h-3 text-indigo-600" />}
                        {src.type === 'event' && <Calendar className="w-3 h-3 text-amber-600" />}
                        <span className="truncate max-w-[170px]">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested 1-Click Conversation Actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Suggested AI Actions
                  </div>
                  <div className="space-y-1">
                    {msg.suggestedActions.map((act) => (
                      <button
                        key={act.id}
                        disabled={act.executed}
                        onClick={() => onExecuteAction(act)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          act.executed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        }`}
                      >
                        <span className="truncate">{act.label}</span>
                        {act.executed ? (
                          <span className="inline-flex items-center gap-1 text-[10px]">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-90">+ Confirm</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>
              {selectedAgent} ({selectedModel}) is thinking
              {useSearchGrounding ? ' with Google Search...' : useMapsGrounding ? ' with Google Maps...' : '...'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box with gemini-3.5-transcribe Microphone Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={
              isRecordingAudio
                ? 'Recording audio for gemini-3.5-transcribe... click mic to finish'
                : isTranscribing
                ? 'Transcribing with gemini-3.5-transcribe...'
                : 'Ask anything or tell BlueNote to save...'
            }
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleToggleMicTranscription}
            className={`p-1.5 rounded-lg transition-colors ${
              isRecordingAudio
                ? 'bg-red-600 text-white animate-pulse'
                : isTranscribing
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-blue-600'
            }`}
            title="Record & Transcribe Audio (gemini-3.5-transcribe)"
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecordingAudio ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            disabled={!input.trim() || isThinking}
            onClick={() => handleSend()}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
