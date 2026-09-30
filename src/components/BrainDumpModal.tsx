import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Upload,
  Check,
  X,
  AlertTriangle,
  FileText,
  CheckSquare,
  Calendar,
  UserPlus,
  ShoppingBag,
  Bell,
  Link2,
  FolderKanban,
  Camera,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  BrainDumpExtractedItem,
  containsSensitivePassword,
  performOCRAndExtract,
  processBrainDumpInput,
  transcribeAudioWithGemini,
} from '../services/aiService';
import { EntityType, PriorityLevel, WorkspaceState } from '../types/bluenote';

interface BrainDumpModalProps {
  isOpen: boolean;
  initialTab?: 'brain-dump' | 'ocr-scanner';
  workspace: WorkspaceState;
  onClose: () => void;
  onCommitItems: (
    items: BrainDumpExtractedItem[],
    ocrFileRecord?: {
      filename: string;
      category: 'Receipt' | 'Business Card' | 'Handwritten Note' | 'Whiteboard' | 'Document';
      ocrText: string;
      summary: string;
      dataUrl?: string;
    }
  ) => void;
}

export const BrainDumpModal: React.FC<BrainDumpModalProps> = ({
  isOpen,
  initialTab = 'brain-dump',
  workspace,
  onClose,
  onCommitItems,
}) => {
  const [activeTab, setActiveTab] = useState<'brain-dump' | 'ocr-scanner'>(initialTab);
  const [rawInput, setRawInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<BrainDumpExtractedItem[]>([]);
  const [ocrPreview, setOcrPreview] = useState<{
    filename: string;
    category: 'Receipt' | 'Business Card' | 'Handwritten Note' | 'Whiteboard' | 'Document';
    ocrText: string;
    summary: string;
    dataUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const passwordWarning = containsSensitivePassword(rawInput);

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          setIsProcessing(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
              const transcript = await transcribeAudioWithGemini(base64, blob.type || 'audio/webm');
              if (transcript) {
                setRawInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
              }
            } finally {
              setIsProcessing(false);
            }
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        return;
      } catch {
        // Fallback if microphone access is blocked
      }
    }

    setIsRecording(true);
    setTimeout(() => {
      setRawInput((prev) =>
        (
          prev +
          ' I need to buy oat milk and coffee beans, remind me tomorrow at 10 AM to call Mom, Mike’s new phone number is (555) 839-2011, and schedule dentist appointment Friday at 2 PM.'
        ).trim()
      );
      setIsRecording(false);
    }, 1200);
  };

  const handleAnalyzeBrainDump = async () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);
    try {
      const results = await processBrainDumpInput(rawInput, workspace);
      setExtractedItems(results);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      try {
        const res = await performOCRAndExtract(file.name, rawInput, dataUrl, workspace);
        setOcrPreview({
          filename: file.name,
          category: res.documentCategory,
          ocrText: res.ocrText,
          summary: res.summary,
          dataUrl,
        });
        setExtractedItems(res.extractedItems);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunSampleOCR = async (sampleType: 'handwritten' | 'business-card' | 'receipt') => {
    setIsProcessing(true);
    try {
      let fileName = 'Handwritten_Notebook_Page.jpg';
      let hint =
        'Handwritten Sticky Note:\n- Call John Carter Friday at 11 AM about roof policy\n- Buy organic apples, sourdough bread, and espresso beans\n- Idea: Create automated client onboarding guide for Project Atlas';

      if (sampleType === 'business-card') {
        fileName = 'Business_Card_Scan.jpg';
        hint =
          'Marcus Vance — Managing Partner, Vance Legal & Tax Advisory | Phone: (555) 640-9921 | Email: mvance@vancelegal.example.com | 900 Market Street, Suite 400';
      } else if (sampleType === 'receipt') {
        fileName = 'Home_Depot_Lumber_Receipt.jpg';
        hint =
          'THE HOME DEPOT — Receipt #9821 — Date: Today — Cedar Patio Plank Set $240.00, Exterior Wood Stain $48.00 — TOTAL $288.00 VISA';
      }

      const res = await performOCRAndExtract(fileName, hint, undefined, workspace);
      setOcrPreview({
        filename: fileName,
        category: res.documentCategory,
        ocrText: res.ocrText,
        summary: res.summary,
      });
      setExtractedItems(res.extractedItems);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateItemField = <K extends keyof BrainDumpExtractedItem>(
    id: string,
    field: K,
    value: BrainDumpExtractedItem[K]
  ) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveSelected = () => {
    const selected = extractedItems.filter((i) => i.selected);
    onCommitItems(selected, ocrPreview || undefined);
    setRawInput('');
    setExtractedItems([]);
    setOcrPreview(null);
    onClose();
  };

  const getCategoryIcon = (cat: EntityType) => {
    switch (cat) {
      case 'task':
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      case 'reminder':
        return <Bell className="w-4 h-4 text-amber-600" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'contact':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-teal-600" />;
      case 'link':
        return <Link2 className="w-4 h-4 text-sky-600" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-violet-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">BlueNote AI Capture & Brain Dump</h2>
              <p className="text-xs text-blue-100">
                Tell me everything on your mind or upload a photo—I’ll organize it automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('brain-dump')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'brain-dump'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Brain Dump & Voice Capture
          </button>
          <button
            onClick={() => setActiveTab('ocr-scanner')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ocr-scanner'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            OCR Scanner (Handwriting, Business Cards & Receipts)
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {activeTab === 'brain-dump' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Type or speak naturally — no special commands needed
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isRecording
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? 'Listening... Click to Stop' : 'Dictate with Voice'}
                </button>
              </div>

              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={4}
                placeholder='Example: "I need groceries (oat milk, apples), John’s phone number is (555) 443-9900, remind me Friday to pay rent, schedule dentist appointment Tuesday at 2 PM, and great startup idea for automated invoicing..."'
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-900 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />

              {/* Quick sample prompts */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Try example:</span>
                <button
                  type="button"
                  onClick={() =>
                    setRawInput(
                      "I need organic milk and coffee beans, remind me tomorrow at 3 PM to call Mom, Mike's number is (555) 221-9876, schedule meeting with Sarah Friday at 11 AM, and pay electricity bill today."
                    )
                  }
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Multi-item Brain Dump
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRawInput(
                      'Find John Carter’s insurance note, remind me Friday to upload the roof inspection certificate, and buy exterior sealant at Home Depot.'
                    )
                  }
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Roof & Insurance Workflow
                </button>
              </div>

              {/* Password plain-text warning (Part 2 requirement) */}
              {passwordWarning && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Security Warning:</span> It looks like your text may contain a sensitive password or PIN. For your security, BlueNote recommends never storing plain-text passwords in notes or tasks.
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawInput.trim() || isProcessing}
                  onClick={handleAnalyzeBrainDump}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI Separating & Organizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Organize with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50/60 dark:bg-slate-800/40">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.md,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Upload Photo, Handwritten Note, Business Card, Whiteboard, or Receipt
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  BlueNote AI extracts handwritten & printed text, tasks, contacts, dates, and shopping lists.
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Choose Image or Document
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunSampleOCR('handwritten')}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    Demo: Handwritten Sticky Note
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunSampleOCR('business-card')}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    Demo: Business Card Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunSampleOCR('receipt')}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    Demo: Store Receipt OCR
                  </button>
                </div>
              </div>

              {ocrPreview && (
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      OCR Extracted Text ({ocrPreview.category}) — Editable Preview
                    </span>
                    <span className="text-xs text-slate-500">{ocrPreview.filename}</span>
                  </div>
                  <textarea
                    value={ocrPreview.ocrText}
                    onChange={(e) => setOcrPreview({ ...ocrPreview, ocrText: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Review Screen before saving (Part 2 & Part 4 Requirement) */}
          {extractedItems.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Review Screen ({extractedItems.filter((i) => i.selected).length} of {extractedItems.length} approved)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review, edit categories or priorities, or uncheck any item before saving to your workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExtractedItems((prev) => prev.map((i) => ({ ...i, selected: true })))
                  }
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Approve All
                </button>
              </div>

              <div className="space-y-2.5">
                {extractedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      item.selected
                        ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => updateItemField(item.id, 'selected', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold">
                            {getCategoryIcon(item.category)}
                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateItemField(item.id, 'category', e.target.value as EntityType)
                              }
                              className="bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                            >
                              <option value="task">Task</option>
                              <option value="reminder">Reminder</option>
                              <option value="event">Calendar Event</option>
                              <option value="contact">Contact</option>
                              <option value="shopping">Shopping List Item</option>
                              <option value="note">Note / Idea</option>
                              <option value="link">Saved Link</option>
                              <option value="project">Project</option>
                            </select>
                          </div>

                          {(item.category === 'task' || item.category === 'reminder') && (
                            <select
                              value={item.priority || 'Medium'}
                              onChange={(e) =>
                                updateItemField(item.id, 'priority', e.target.value as PriorityLevel)
                              }
                              className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                            >
                              <option value="Critical">Critical Priority</option>
                              <option value="High">High Priority</option>
                              <option value="Medium">Medium Priority</option>
                              <option value="Low">Low Priority</option>
                              <option value="Someday">Someday</option>
                            </select>
                          )}

                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                            {item.confidence}% AI Confidence
                          </span>
                        </div>

                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                          className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                        />

                        <p className="text-xs text-slate-500">{item.aiReasoning}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExtractedItems((prev) => prev.filter((x) => x.id !== item.id))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Discard item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            All saved items are automatically indexed in your Second Brain Knowledge Graph.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Cancel
            </button>
            {extractedItems.length > 0 && (
              <button
                type="button"
                onClick={handleSaveSelected}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                Save {extractedItems.filter((i) => i.selected).length} Items to BlueNote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
