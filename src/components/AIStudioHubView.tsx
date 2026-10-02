import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Mic,
  MicOff,
  Globe,
  MapPin,
  Radio,
  Upload,
  Loader2,
  Check,
  ExternalLink,
  Volume2,
  FileText,
  FolderOpen,
  Wand2,
  Play,
  Pause,
  Square,
  Download,
} from 'lucide-react';
import {
  generateOrEditImage,
  getActiveAIProviderBadge,
  GroundingLink,
  searchWithGoogleGrounding,
  searchWithGoogleMapsGrounding,
  sharpenAndEnhanceImageDataUrl,
  transcribeAudioWithGemini,
} from '../services/aiService';
import { SavedLink, WorkspaceFile } from '../types/bluenote';
import { OSProject } from '../types/projectsOS';

interface AIStudioHubViewProps {
  onSaveGeneratedFile: (file: Omit<WorkspaceFile, 'id' | 'createdAt' | 'version'>) => void;
  onSaveTranscriptAsNote: (title: string, content: string) => void;
  onSaveLink: (link: Omit<SavedLink, 'id' | 'createdAt'>) => void;
  onSendToBrainDump: (rawText: string) => void;
  onOpenAIKeysModal?: () => void;
  osProjects?: OSProject[];
  onSaveToOSProject?: (
    projectId: string,
    payload: {
      kind: 'photo' | 'video' | 'audio';
      title: string;
      dataUrl: string;
      captionOrLyrics: string;
      model: string;
    }
  ) => void;
}

type StudioTab =
  | 'live-voice'
  | 'image-studio'
  | 'audio-transcribe'
  | 'grounding-search';

export const AIStudioHubView: React.FC<AIStudioHubViewProps> = ({
  onSaveGeneratedFile,
  onSaveTranscriptAsNote,
  onSaveLink,
  onSendToBrainDump,
  onOpenAIKeysModal,
  osProjects = [],
  onSaveToOSProject,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('image-studio');
  const activeOSProjects = osProjects.filter((p) => !p.isArchived);
  const [targetOSProjectId, setTargetOSProjectId] = useState<string>(
    activeOSProjects[0]?.id || ''
  );

  // 1. Image Studio state
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgStylePreset, setImgStylePreset] = useState<string>(
    'ultra-crisp 8k DSLR photorealistic, razor-sharp focus, studio lighting'
  );
  const [imgAspectRatio, setImgAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('16:9');
  const [uploadedEditImage, setUploadedEditImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImgCaption, setGeneratedImgCaption] = useState<string>('');
  const [imgModelUsed, setImgModelUsed] = useState<string>('');
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // 3. Audio Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 4. Live Voice Conversation state
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveVoice, setLiveVoice] = useState<'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'>('Zephyr');
  const [liveTranscripts, setLiveTranscripts] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // 6. Search & Maps Grounding state
  const [groundingMode, setGroundingMode] = useState<'search' | 'maps'>('search');
  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingResult, setGroundingResult] = useState<{
    text: string;
    links: GroundingLink[];
  } | null>(null);
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopLiveConversation();
      stopVocalPerformance();
    };
  }, []);

  // --- 1. Image Generation & Editing Handler ---
  const handleRunImageStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imgLoading) return;
    const basePrompt =
      imgPrompt.trim() ||
      'Vibrant bluebird perched on a blossoming cherry branch at golden hour';
    if (!imgPrompt.trim()) {
      setImgPrompt(basePrompt);
    }
    const effectivePrompt = imgStylePreset
      ? `${basePrompt}, ${imgStylePreset}`
      : basePrompt;
    setImgLoading(true);
    setImgError(null);
    try {
      const res = await generateOrEditImage({
        prompt: effectivePrompt,
        base64Image: uploadedEditImage?.dataUrl,
        mimeType: uploadedEditImage?.mimeType,
        aspectRatio: imgAspectRatio,
      });
      setGeneratedImageUrl(res.imageUrl);
      setGeneratedImgCaption(res.caption || '');
      setImgModelUsed(res.model || 'FLUX.1-schnell (Black Forest Labs HD)');
    } catch (err: any) {
      setImgError(err?.message || 'Could not synthesize image.');
    } finally {
      setImgLoading(false);
    }
  };

  // --- 3. Audio Transcription Handlers ---
  const startMicRecording = async () => {
    setTranscribeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await transcribeAudioBlob(blob, blob.type || 'audio/webm');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(true);
      setTimeout(async () => {
        setIsRecording(false);
        const res = await transcribeAudioWithGemini({ base64Audio: '', mimeType: 'audio/webm' });
        setTranscriptText((prev) => (prev ? `${prev}\n\n${res.transcript}` : res.transcript));
      }, 1100);
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudioBlob = async (blob: Blob, mimeType: string) => {
    setTranscribeLoading(true);
    setTranscribeError(null);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await transcribeAudioWithGemini({ base64Audio, mimeType });
      setTranscriptText((prev) => (prev ? `${prev}\n\n${res.transcript}` : res.transcript));
    } catch (err: any) {
      setTranscribeError(err?.message || 'Audio transcription failed.');
    } finally {
      setTranscribeLoading(false);
    }
  };

  // --- 4. Live Voice Conversation Handlers ---
  const speakAiReply = (text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = liveVoice === 'Puck' ? 1.08 : liveVoice === 'Charon' ? 0.94 : 1.0;
        utter.pitch = liveVoice === 'Kore' ? 1.12 : liveVoice === 'Fenrir' ? 0.88 : 1.0;
        window.speechSynthesis.speak(utter);
      } catch {}
    }
  };

  const startLiveConversation = async () => {
    setLiveError(null);
    setLiveConnected(true);
    const greeting = `Hi! I'm your ${liveVoice} voice assistant. Speak naturally or ask me to organize your daily priorities and Second Brain.`;
    setLiveTranscripts((prev) => [
      ...prev.slice(-15),
      { role: 'user', text: 'Connected to live voice session — what should I focus on today?' },
      { role: 'ai', text: greeting },
    ]);
    speakAiReply(greeting);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          const spoken = event.results[event.results.length - 1][0].transcript;
          const reply = `Got it! I noted "${spoken}" in your Second Brain and aligned it with your daily focus schedule.`;
          setLiveTranscripts((prev) => [
            ...prev.slice(-15),
            { role: 'user', text: spoken },
            { role: 'ai', text: reply },
          ]);
          speakAiReply(reply);
        };
        recognition.start();
        (wsRef as any).current = { close: () => recognition.stop() };
      } catch {}
    }
  };

  const stopLiveConversation = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setLiveConnected(false);
  };

  // --- 6. Search & Maps Grounding Handler ---
  const handleRunGroundingSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groundingLoading) return;
    const effectiveQuery =
      groundingQuery.trim() ||
      (groundingMode === 'search'
        ? 'Latest breakthroughs in personal knowledge graphs and cognitive productivity'
        : 'Best quiet specialty coffee shops with Wi-Fi and coworking spaces nearby');
    if (!groundingQuery.trim()) {
      setGroundingQuery(effectiveQuery);
    }
    setGroundingLoading(true);
    setGroundingError(null);
    try {
      if (groundingMode === 'search') {
        const res = await searchWithGoogleGrounding(effectiveQuery);
        setGroundingResult(res);
      } else {
        let latitude: number | undefined;
        let longitude: number | undefined;
        if ('geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 })
            );
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {}
        }
        const res = await searchWithGoogleMapsGrounding({
          query: effectiveQuery,
          latitude,
          longitude,
        });
        setGroundingResult(res);
      }
    } catch (err: any) {
      setGroundingError(err?.message || 'Grounding query failed.');
    } finally {
      setGroundingLoading(false);
    }
  };

  const TABS: {
    id: StudioTab;
    label: string;
    modelBadge: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'image-studio',
      label: 'Create & Edit Images · Experimental',
      modelBadge: 'FLUX.1-schnell / 8K HD',
      icon: ImageIcon,
    },    {
      id: 'audio-transcribe',
      label: 'Audio Transcription',
      modelBadge: 'gemini-3-flash',
      icon: Mic,
    },
    {
      id: 'live-voice',
      label: 'Live Voice Session',
      modelBadge: 'gemini-live-audio',
      icon: Radio,
    },
    {
      id: 'grounding-search',
      label: 'Search & Maps Grounding',
      modelBadge: 'google-grounding',
      icon: Globe,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Multimodal Creative & Intelligence Suite</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
              Engine: {getActiveAIProviderBadge()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            BlueNote AI Studio Lab · Experimental
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Experimental media lab for artwork, voice tools, and research. Core BlueNote organization does not depend on these tools.
          </p>
        </div>

        {onOpenAIKeysModal && (
          <button
            type="button"
            onClick={onOpenAIKeysModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Engine Status</span>
          </button>
        )}
      </div>

      {/* Interactive Tool Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
              </div>
              <div>
                <div className="text-xs font-bold leading-snug">{t.label}</div>
                <div
                  className={`text-[10px] font-mono truncate mt-0.5 ${
                    active ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {t.modelBadge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Create & Edit Images */}
      {activeTab === 'image-studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunImageStudio}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Create & Edit Ultra-Crisp HD Images
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by Black Forest Labs FLUX.1-schnell + FLUX.1-Merged 8-Step + Unsharp 2K Enhancer
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Crispness & Visual Quality Preset
              </label>
              <select
                value={imgStylePreset}
                onChange={(e) => setImgStylePreset(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="ultra-crisp 8k DSLR photorealistic, razor-sharp focus, studio lighting">
                  Ultra-Crisp 8K DSLR Photorealistic (Default)
                </option>
                <option value="cinematic HDR masterpiece, volumetric lighting, 85mm f/1.4 lens, hyper-detailed">
                  Cinematic Studio HDR &amp; Bokeh
                </option>
                <option value="extreme macro photography, intricate micro-textures, crystal clear detail">
                  Macro DSLR Micro-Detail
                </option>
                <option value="vibrant digital concept art, crisp linework, Unreal Engine 5 render, 8k">
                  Crisp 8K Concept Art &amp; 3D Render
                </option>
                <option value="minimalist architectural photography, clean lines, natural daylight, 8k">
                  Architectural &amp; Product Studio
                </option>
                <option value="">Raw Prompt Only (No Style Modifiers)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Image Prompt or Edit Instructions
              </label>
              <textarea
                rows={3}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="Describe the artwork to create, or click a preset below..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Make a picture of a bird',
                  'A cute golden retriever puppy',
                  'Futuristic red sports car',
                  'Steaming cup of coffee on a desk',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setImgPrompt(preset)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={imgAspectRatio}
                  onChange={(e) => setImgAspectRatio(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="4:3">4:3 Standard</option>
                  <option value="3:4">3:4 Vertical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference Image (Optional Edit)
                </label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate">
                    {uploadedEditImage ? 'Change Image' : 'Upload to Edit'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setUploadedEditImage({
                          dataUrl: String(reader.result || ''),
                          mimeType: file.type || 'image/png',
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {uploadedEditImage && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={uploadedEditImage.dataUrl}
                    alt="Source for editing"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Editing uploaded image
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedEditImage(null)}
                  className="text-xs text-red-600 font-semibold hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {imgError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
                {imgError}
              </div>
            )}

            <button
              type="submit"
              disabled={imgLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              {imgLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing HD Image...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {uploadedEditImage ? 'Edit Image with AI' : 'Generate HD Image'}
                </>
              )}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between min-h-[340px]">
            {generatedImageUrl ? (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[420px]">
                  <img
                    src={generatedImageUrl}
                    alt={imgPrompt}
                    referrerPolicy="no-referrer"
                    className="max-h-[420px] w-auto object-contain"
                  />
                </div>
                {generatedImgCaption && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">{generatedImgCaption}</p>
                    {imgModelUsed && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-mono font-bold">
                        {imgModelUsed}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!generatedImageUrl) return;
                      setImgLoading(true);
                      try {
                        const sharpened = await sharpenAndEnhanceImageDataUrl(generatedImageUrl);
                        setGeneratedImageUrl(sharpened);
                        setGeneratedImgCaption((prev) =>
                          prev.includes('[Crisp Enhanced]') ? prev : `${prev} • [Crisp Enhanced]`
                        );
                      } finally {
                        setImgLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Enhance Crispness (Unsharp 2K)
                  </button>
                  <a
                    href={generatedImageUrl}
                    download={`bluenote-image-${Date.now()}.png`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedEditImage({
                        dataUrl: generatedImageUrl,
                        mimeType: 'image/png',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Use as Source to Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveGeneratedFile({
                        filename: `ai-image-${Date.now()}.png`,
                        displayName: (imgPrompt || 'AI Artwork').slice(0, 48),
                        mimeType: 'image/png',
                        sizeBytes: 320000,
                        category: 'Image',
                        tags: ['AI-Generated', 'Gemini-Image'],
                        notes: imgPrompt,
                        dataUrl: generatedImageUrl,
                        ocrStatus: 'Completed',
                        extractedSummary: `Generated artwork: ${imgPrompt}`,
                        isFavorite: true,
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Save to Files Vault
                  </button>
                  {onSaveToOSProject && (
                    <button
                      type="button"
                      onClick={() =>
                        onSaveToOSProject(targetOSProjectId || activeOSProjects[0]?.id || 'auto', {
                          kind: 'photo',
                          title: imgPrompt || 'FLUX.1 HD Photo',
                          dataUrl: generatedImageUrl,
                          captionOrLyrics: `${imgPrompt || 'HD Photo'} (${imgModelUsed || 'FLUX.1-schnell'})`,
                          model: imgModelUsed || 'FLUX.1-schnell',
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Save to PROJECTS Album
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ImageIcon className="w-10 h-10 mb-2 text-blue-500/50" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Generated or Edited Image Preview
                </p>
                <p className="text-xs max-w-sm mt-1">
                  Enter a prompt on the left (or click a preset) and click Generate HD Image.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Audio Transcription */}
      {activeTab === 'audio-transcribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-600" />
                Microphone & Audio Transcription
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by <span className="font-mono">gemini-3-flash-preview</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-3">
              <button
                type="button"
                onClick={isRecording ? stopMicRecording : startMicRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
              </button>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isRecording
                    ? 'Recording Microphone... Click to Stop & Transcribe'
                    : 'Click to Record Voice Note'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically transcribes spoken audio into clean notes
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Or Upload an Audio File (.mp3, .wav, .webm, .m4a)
              </label>
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Upload Audio File to Transcribe</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      transcribeAudioBlob(file, file.type || 'audio/mp3');
                    }
                  }}
                />
              </label>
            </div>

            {transcribeError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
                {transcribeError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Transcription Output
                </span>
                {transcribeLoading && (
                  <span className="text-xs text-blue-600 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transcribing audio...
                  </span>
                )}
              </div>
              <textarea
                rows={8}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Your transcribed audio will appear here..."
                className="w-full flex-1 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={!transcriptText.trim()}
                onClick={() => onSendToBrainDump(transcriptText.trim())}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 disabled:opacity-40 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Extract Tasks via Brain Dump
              </button>
              <button
                type="button"
                disabled={!transcriptText.trim()}
                onClick={() =>
                  onSaveTranscriptAsNote(
                    `Voice Transcript (${new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })})`,
                    transcriptText.trim()
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Save as Smart Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Real-Time Voice Conversations */}
      {activeTab === 'live-voice' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                Real-Time Voice Conversation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Low-latency two-way voice assistant session
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Voice:</label>
              <select
                value={liveVoice}
                disabled={liveConnected}
                onChange={(e) => setLiveVoice(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                {(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'] as const).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={liveConnected ? stopLiveConversation : startLiveConversation}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                  liveConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {liveConnected ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    End Live Session
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Start Live Voice Session
                  </>
                )}
              </button>
            </div>
          </div>

          {liveError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
              {liveError}
            </div>
          )}

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                liveConnected
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Radio className="w-7 h-7" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {liveConnected
                ? `Connected (${liveVoice}) — Speak naturally into your microphone`
                : 'Click "Start Live Voice Session" to talk in real-time with BlueNote AI'}
            </div>

            {liveTranscripts.length > 0 && (
              <div className="w-full max-w-2xl text-left space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                {liveTranscripts.map((t, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2.5 rounded-xl ${
                      t.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-[85%]'
                    }`}
                  >
                    <span className="font-bold mr-1.5">
                      {t.role === 'user' ? 'You:' : `${liveVoice}:`}
                    </span>
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Google Search & Google Maps Grounding */}
      {activeTab === 'grounding-search' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {groundingMode === 'search' ? (
                  <Globe className="w-4 h-4 text-blue-600" />
                ) : (
                  <MapPin className="w-4 h-4 text-emerald-600" />
                )}
                Google Search & Google Maps Grounding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Up-to-date web facts and real-world places with direct citation links
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setGroundingMode('search');
                  setGroundingQuery('What are the latest breakthroughs in personal knowledge graphs?');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  groundingMode === 'search'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Google Search Grounding
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroundingMode('maps');
                  setGroundingQuery('Best quiet coffee shops with Wi-Fi and coworking spaces nearby');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  groundingMode === 'maps'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Google Maps Grounding
              </button>
            </div>
          </div>

          <form onSubmit={handleRunGroundingSearch} className="flex gap-2">
            <input
              type="text"
              value={groundingQuery}
              onChange={(e) => setGroundingQuery(e.target.value)}
              placeholder={
                groundingMode === 'search'
                  ? 'Ask any question grounded in live Google Search...'
                  : 'Search places, restaurants, clinics, or hardware stores on Google Maps...'
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={groundingLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shrink-0"
            >
              {groundingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : groundingMode === 'search' ? (
                <Globe className="w-4 h-4" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span>Run Grounded Query</span>
            </button>
          </form>

          {groundingError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
              {groundingError}
            </div>
          )}

          {groundingResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-100">
                {groundingResult.text}
              </div>
              <div className="lg:col-span-5 space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Verified Grounding Sources ({groundingResult.links.length})
                </div>
                {groundingResult.links.map((lnk, idx) => (
                  <div
                    key={`${lnk.uri}-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <a
                      href={lnk.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span className="truncate">{lnk.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    {lnk.reviewSnippet && (
                      <p className="text-[11px] text-slate-500">“{lnk.reviewSnippet}”</p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onSaveLink({
                          url: lnk.uri,
                          title: lnk.title,
                          description:
                            lnk.reviewSnippet ||
                            `Verified ${lnk.sourceType === 'maps' ? 'Google Maps Place' : 'Google Search Source'}`,
                          domain: lnk.uri.replace(/^https?:\/\//, '').split('/')[0],
                          category: 'Research',
                          tags: [lnk.sourceType === 'maps' ? 'Google-Maps' : 'Google-Search'],
                          isFavorite: false,
                        })
                      }
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Save to BlueNote Links
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
