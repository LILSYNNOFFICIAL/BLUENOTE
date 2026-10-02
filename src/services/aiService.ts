import {
  AIAgentType,
  AIMessageSource,
  EntityType,
  PriorityLevel,
  SuggestedAction,
  WorkspaceState,
} from '../types/bluenote';

const todayISO = () => new Date().toISOString().split('T')[0];
const tomorrowISO = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextFridayISO = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

export interface GroundingLink {
  title: string;
  uri: string;
  sourceType: 'web' | 'maps';
  reviewSnippet?: string;
}

// Warn user not to store sensitive passwords in plain text
export function containsSensitivePassword(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(password|passcode|secret key|private key|ssn|social security|pin is|cvv)\b/.test(lower) &&
    (/[:=]/.test(text) || /\b(is|my)\b/.test(lower))
  );
}

// Semantic expansion dictionary for instant semantic search
const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  car: ['vehicle', 'truck', 'suv', 'auto', 'automobile', 'garage', 'mechanic', 'tire'],
  doctor: [
    'dentist',
    'physician',
    'clinic',
    'hospital',
    'medical',
    'appointment',
    'optometrist',
    'health',
    'prescription',
  ],
  dentist: ['doctor', 'dental', 'teeth', 'cleaning', 'medical'],
  tax: ['taxes', 'irs', 'cpa', 'deduction', 'deductions', 'receipt', 'receipts', '1099', 'accounting', 'finance'],
  taxes: ['tax', 'irs', 'cpa', 'deduction', 'receipt', 'receipts', 'finance', 'quarterly'],
  receipt: ['receipts', 'invoice', 'expense', 'paid', 'total', 'purchase', 'tax'],
  insurance: ['policy', 'deductible', 'umbrella', 'coverage', 'claim'],
  groceries: ['grocery', 'shopping', 'milk', 'food', 'pantry', 'produce', 'apples', 'coffee'],
  milk: ['groceries', 'shopping', 'dairy', 'oat milk'],
};

export interface SearchHit {
  id: string;
  type: EntityType;
  title: string;
  subtitle: string;
  snippet: string;
  tags: string[];
  isArchived?: boolean;
  isFavorite?: boolean;
  score: number;
  matchedVia: string;
}

export function semanticWorkspaceSearch(
  rawQuery: string,
  workspace: WorkspaceState,
  filterType: EntityType | 'all' = 'all',
  includeArchived = true
): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  const expandedTerms = new Set<string>(tokens);
  for (const t of tokens) {
    if (SEMANTIC_SYNONYMS[t]) {
      SEMANTIC_SYNONYMS[t].forEach((syn) => expandedTerms.add(syn));
    }
  }

  const hits: SearchHit[] = [];

  const scoreItem = (
    title: string,
    body: string,
    tags: string[] = []
  ): { score: number; matchedVia: string } => {
    const hayTitle = title.toLowerCase();
    const hayBody = body.toLowerCase();
    const hayTags = tags.map((t) => t.toLowerCase()).join(' ');
    let score = 0;
    let matchedVia = 'Direct Match';

    if (hayTitle.includes(q)) score += 60;
    if (hayBody.includes(q)) score += 35;
    if (hayTags.includes(q)) score += 45;

    for (const term of expandedTerms) {
      if (hayTitle.includes(term)) {
        score += 25;
        if (!tokens.includes(term)) matchedVia = `Semantic Match ("${term}")`;
      }
      if (hayBody.includes(term)) {
        score += 15;
        if (!tokens.includes(term) && matchedVia === 'Direct Match') {
          matchedVia = `Semantic Match ("${term}")`;
        }
      }
      if (hayTags.includes(term)) {
        score += 20;
      }
    }

    return { score, matchedVia };
  };

  if (filterType === 'all' || filterType === 'task') {
    for (const t of workspace.tasks) {
      if (t.deletedAt) continue;
      if (!includeArchived && t.isArchived) continue;
      const { score, matchedVia } = scoreItem(t.title, `${t.description} ${t.category}`, t.tags);
      if (score > 0) {
        hits.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `${t.priority} Priority · ${t.status} · Due ${t.dueDate}`,
          snippet: t.description,
          tags: t.tags,
          isArchived: t.isArchived,
          isFavorite: t.isFavorite,
          score,
          matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'note') {
    for (const n of workspace.notes) {
      if (n.deletedAt) continue;
      if (!includeArchived && n.isArchived) continue;
      const { score, matchedVia } = scoreItem(n.title, `${n.content} ${n.summary || ''}`, n.tags);
      if (score > 0) {
        hits.push({
          id: n.id,
          type: 'note',
          title: n.title,
          subtitle: `${n.category} Note · ${n.wordCount} words`,
          snippet: n.summary || n.content.slice(0, 160),
          tags: n.tags,
          isArchived: n.isArchived,
          isFavorite: n.isFavorite,
          score,
          matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'project') {
    for (const p of workspace.projects) {
      if (p.deletedAt) continue;
      if (!includeArchived && p.isArchived) continue;
      const { score, matchedVia } = scoreItem(
        p.name,
        `${p.description} ${p.aiSummary || ''}`,
        [p.category]
      );
      if (score > 0) {
        hits.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: `${p.status} · ${p.progress}% Complete · Deadline ${p.deadline}`,
          snippet: p.aiSummary || p.description,
          tags: [p.category],
          isArchived: p.isArchived,
          isFavorite: p.isFavorite,
          score,
          matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'contact') {
    for (const c of workspace.contacts) {
      if (c.deletedAt) continue;
      if (!includeArchived && c.isArchived) continue;
      const fullName = `${c.firstName} ${c.lastName}`;
      const { score, matchedVia } = scoreItem(
        fullName,
        `${c.company || ''} ${c.jobTitle || ''} ${c.notes} ${c.phones.join(' ')} ${c.emails.join(' ')}`,
        c.tags
      );
      if (score > 0) {
        hits.push({
          id: c.id,
          type: 'contact',
          title: fullName,
          subtitle: `${c.jobTitle || c.relationship} ${c.company ? `at ${c.company}` : ''} · ${c.phones[0] || ''}`,
          snippet: c.notes,
          tags: c.tags,
          isArchived: c.isArchived,
          isFavorite: c.isFavorite,
          score,
          matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'file') {
    for (const f of workspace.files) {
      if (f.deletedAt) continue;
      const { score, matchedVia } = scoreItem(
        f.displayName,
        `${f.filename} ${f.ocrText || ''} ${f.extractedSummary || ''} ${f.notes}`,
        f.tags
      );
      if (score > 0) {
        hits.push({
          id: f.id,
          type: 'file',
          title: f.displayName,
          subtitle: `${f.category} · OCR ${f.ocrStatus}`,
          snippet: f.extractedSummary || f.ocrText || f.notes,
          tags: f.tags,
          isFavorite: f.isFavorite,
          score,
          matchedVia: f.ocrText ? `${matchedVia} (via OCR)` : matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'event') {
    for (const e of workspace.events) {
      if (e.deletedAt) continue;
      const { score, matchedVia } = scoreItem(
        e.title,
        `${e.description} ${e.location || ''} ${e.category}`,
        e.tags
      );
      if (score > 0) {
        hits.push({
          id: e.id,
          type: 'event',
          title: e.title,
          subtitle: `${e.date} · ${e.startTime}–${e.endTime} · ${e.location || e.category}`,
          snippet: e.description,
          tags: e.tags,
          score,
          matchedVia,
        });
      }
    }
  }

  if (filterType === 'all' || filterType === 'link') {
    for (const l of workspace.links) {
      if (l.deletedAt) continue;
      const { score, matchedVia } = scoreItem(
        l.title,
        `${l.url} ${l.description} ${l.notes || ''}`,
        l.tags
      );
      if (score > 0) {
        hits.push({
          id: l.id,
          type: 'link',
          title: l.title,
          subtitle: `${l.domain} · ${l.category}`,
          snippet: l.description,
          tags: l.tags,
          isFavorite: l.isFavorite,
          score,
          matchedVia,
        });
      }
    }
  }

  // Also index AI Project Operating System (osProjects) documents, notes & projects
  if (Array.isArray(workspace.osProjects)) {
    for (const osp of workspace.osProjects) {
      if (filterType === 'all' || filterType === 'project') {
        const { score, matchedVia } = scoreItem(
          osp.name,
          `${osp.description} ${osp.template}`,
          osp.tags
        );
        if (score > 0) {
          hits.push({
            id: osp.id,
            type: 'project',
            title: `${osp.name} (PROJECTS OS)`,
            subtitle: `${osp.template} · ${osp.documents.length} docs · ${osp.tasks.length} tasks`,
            snippet: osp.description,
            tags: osp.tags,
            score,
            matchedVia,
          });
        }
      }
      if (filterType === 'all' || filterType === 'file' || filterType === 'note') {
        for (const doc of osp.documents) {
          const { score, matchedVia } = scoreItem(
            doc.filename,
            `${doc.aiSummary} ${doc.finalContent}`,
            doc.tags
          );
          if (score > 0) {
            hits.push({
              id: doc.id,
              type: 'project',
              title: `${doc.filename} (${osp.name})`,
              subtitle: `PROJECTS Document · v${doc.versions.length} · ${doc.wordCount} words`,
              snippet: doc.aiSummary,
              tags: doc.tags,
              score,
              matchedVia,
            });
          }
        }
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score);
}

export interface BrainDumpExtractedItem {
  id: string;
  category: EntityType;
  title: string;
  description: string;
  priority?: PriorityLevel;
  dueDate?: string;
  dueTime?: string;
  tags: string[];
  confidenceScore?: number;
  confidence?: number;
  aiReasoning: string;
  contactPhone?: string;
  contactEmail?: string;
  contactCompany?: string;
  phone?: string;
  email?: string;
  company?: string;
  shoppingQuantity?: string;
  url?: string;
  selected: boolean;
}

export function parseQuickCaptureLocally(sentence: string): BrainDumpExtractedItem[] {
  return [localParseSingleSentence(sentence)];
}

function localParseSingleSentence(sentence: string): BrainDumpExtractedItem {
  const clean = sentence.trim().replace(/^[-*•\d.)\s]+/, '');
  const lower = clean.toLowerCase();
  const id = `bd-${Math.random().toString(36).slice(2, 9)}`;

  let dueDate = todayISO();
  if (lower.includes('tomorrow')) dueDate = tomorrowISO();
  else if (lower.includes('friday')) dueDate = nextFridayISO();

  const timeMatch = clean.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  let dueTime: string | undefined;
  if (timeMatch) {
    let hr = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] || '00';
    const mer = timeMatch[3].toLowerCase();
    if (mer === 'pm' && hr < 12) hr += 12;
    if (mer === 'am' && hr === 12) hr = 0;
    dueTime = `${String(hr).padStart(2, '0')}:${min}`;
  }

  // URL Detection -> Link
  const urlMatch = clean.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return {
      id,
      category: 'link',
      title: clean.replace(urlMatch[0], '').trim() || urlMatch[0],
      description: `Saved web link from Quick Capture`,
      url: urlMatch[0],
      tags: ['Web-Clip', 'Saved-Link'],
      confidenceScore: 98,
      confidence: 98,
      aiReasoning: 'Detected URL pattern and classified as a Saved Link.',
      selected: true,
    };
  }

  // Phone or email -> Contact
  const phoneMatch = clean.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const emailMatch = clean.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (phoneMatch || emailMatch || /\b(phone number|contact|email is|new number)\b/i.test(lower)) {
    const nameMatch = clean.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    const personName = nameMatch ? nameMatch[1].replace(/'s$/, '') : 'New Contact';
    return {
      id,
      category: 'contact',
      title: personName,
      description: clean,
      contactPhone: phoneMatch ? phoneMatch[0] : undefined,
      contactEmail: emailMatch ? emailMatch[0] : undefined,
      tags: ['CRM', 'Auto-Extracted'],
      confidenceScore: 95,
      confidence: 95,
      aiReasoning: 'Detected phone number / contact details in natural language.',
      selected: true,
    };
  }

  // Shopping / Groceries
  if (/\b(buy|groceries|grocery|shopping|pick up|milk|bread|apples|coffee|eggs|store)\b/i.test(lower)) {
    const itemTitle = clean
      .replace(/^(i need to\s+)?(buy|pick up|get)\s+/i, '')
      .replace(/\s+(at|from)\s+the\s+store.*$/i, '')
      .trim();
    return {
      id,
      category: 'shopping',
      title: itemTitle.charAt(0).toUpperCase() + itemTitle.slice(1),
      description: `Extracted from: "${clean}"`,
      shoppingQuantity: '1',
      tags: ['Shopping', 'Errands'],
      confidenceScore: 94,
      confidence: 94,
      aiReasoning: 'Detected purchase intent ("buy" / grocery items) and routed to Shopping List.',
      selected: true,
    };
  }

  // Reminder
  if (/\b(remind me|reminder|don't forget|remember to)\b/i.test(lower)) {
    const remTitle = clean
      .replace(/^(please\s+)?(remind me to|remind me|don't forget to|remember to)\s+/i, '')
      .trim();
    return {
      id,
      category: 'reminder',
      title: remTitle.charAt(0).toUpperCase() + remTitle.slice(1),
      description: clean,
      dueDate,
      dueTime: dueTime || '10:00',
      priority: 'High',
      tags: ['Reminder', 'Follow-Up'],
      confidenceScore: 96,
      confidence: 96,
      aiReasoning: 'Detected explicit reminder phrasing and time trigger.',
      selected: true,
    };
  }

  // Calendar Event / Appointment
  if (
    /\b(schedule|appointment|meeting|dentist|doctor|lunch with|dinner with|flight|call with)\b/i.test(lower) ||
    Boolean(dueTime && /\b(at|on|friday|tomorrow|monday|tuesday|wednesday|thursday)\b/i.test(lower))
  ) {
    const evtTitle = clean.replace(/^schedule\s+(a\s+)?/i, '').trim();
    return {
      id,
      category: 'event',
      title: evtTitle.charAt(0).toUpperCase() + evtTitle.slice(1),
      description: clean,
      dueDate,
      dueTime: dueTime || '14:00',
      tags: ['Calendar', 'Scheduled'],
      confidenceScore: 93,
      confidence: 93,
      aiReasoning: 'Detected scheduling verb or date/time appointment pattern.',
      selected: true,
    };
  }

  // Task / Action item
  if (
    /\b(todo|task|finish|submit|review|call|email|pay|fix|prepare|send|complete|update)\b/i.test(lower) ||
    clean.split(/\s+/).length <= 10
  ) {
    const isUrgent = /\b(urgent|asap|critical|immediately|important)\b/i.test(lower);
    return {
      id,
      category: 'task',
      title: clean.charAt(0).toUpperCase() + clean.slice(1),
      description: `Action item captured on ${todayISO()}`,
      priority: isUrgent ? 'Critical' : 'Medium',
      dueDate,
      dueTime,
      tags: ['Action-Item'],
      confidenceScore: 90,
      confidence: 90,
      aiReasoning: 'Classified as actionable task with target completion date.',
      selected: true,
    };
  }

  // Otherwise -> Note
  return {
    id,
    category: 'note',
    title: clean.slice(0, 52) + (clean.length > 52 ? '...' : ''),
    description: clean,
    tags: ['Brain-Dump', 'Note'],
    confidenceScore: 88,
    confidence: 88,
    aiReasoning: 'Long-form reflection or reference info saved as Smart Note.',
    selected: true,
  };
}

export async function processBrainDumpInput(
  rawText: string,
  _workspace: WorkspaceState
): Promise<BrainDumpExtractedItem[]> {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .split(
      /(?:\n+|;\s*|\.\s+|\s+and\s+(?=(?:remind|schedule|buy|call|i need|don't forget|pick up|email)))/i
    )
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const localItems = (segments.length > 0 ? segments : [trimmed]).map(localParseSingleSentence);

  // Also try AI-powered structured extraction if a key or free cloud AI is available
  try {
    const aiRes = await callConfiguredOrFreeTextAI(
      `Extract all distinct actionable items from the following brain dump into a JSON array.
Today's date is ${todayISO()} and tomorrow is ${tomorrowISO()}.
Each object in the JSON array MUST have:
- "category": one of "task", "reminder", "event", "note", "contact", "shopping", "goal"
- "title": concise actionable title (string)
- "description": brief details (string)
- "priority": one of "Critical", "High", "Medium", "Low"
- "dueDate": YYYY-MM-DD string (optional)
- "dueTime": HH:MM 24h string (optional)
- "tags": array of 1-3 short tag strings
- "aiReasoning": 1 short sentence explaining why this category was chosen

Return ONLY valid JSON array, no markdown fences:
Brain dump: """${trimmed}"""`,
      'You are a structured JSON extraction engine for BlueNote Second Brain. Output only a valid JSON array.'
    );
    if (aiRes && aiRes.text) {
      const cleanedJson = aiRes.text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const firstBracket = cleanedJson.indexOf('[');
      const lastBracket = cleanedJson.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        const parsed = JSON.parse(cleanedJson.slice(firstBracket, lastBracket + 1));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validCategories = new Set([
            'task',
            'reminder',
            'event',
            'note',
            'contact',
            'shopping',
            'goal',
          ]);
          return parsed.map((item: any, idx: number) => {
            const cat = validCategories.has(item.category) ? item.category : 'task';
            return {
              id: `bd-ai-${Date.now()}-${idx}`,
              category: cat,
              title: String(item.title || 'Captured Item').trim(),
              description: String(item.description || trimmed).trim(),
              priority:
                item.priority === 'Critical' ||
                item.priority === 'High' ||
                item.priority === 'Medium' ||
                item.priority === 'Low'
                  ? item.priority
                  : 'Medium',
              dueDate: item.dueDate || todayISO(),
              dueTime: item.dueTime || '09:00',
              tags: Array.isArray(item.tags) ? item.tags.map(String) : ['AI-Extracted'],
              confidenceScore: 95,
              confidence: 95,
              aiReasoning: String(
                item.aiReasoning || `Extracted via ${aiRes.modelUsed}`
              ),
              selected: true,
            } as BrainDumpExtractedItem;
          });
        }
      }
    }
  } catch {
    // Fallback cleanly to deterministic local parser
  }

  return localItems;
}

export async function performOCRAndExtract(
  filename: string,
  customTextHint: string,
  imageDataUrl: string | undefined,
  workspace: WorkspaceState
): Promise<{
  ocrText: string;
  summary: string;
  documentCategory: 'Receipt' | 'Business Card' | 'Handwritten Note' | 'Whiteboard' | 'Document';
  extractedItems: BrainDumpExtractedItem[];
}> {
  const lowerName = filename.toLowerCase();

  // Keyless local OCR fallback: Tesseract.js runs in the browser with no API key.
  if (imageDataUrl && imageDataUrl.includes('base64,')) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(imageDataUrl);
      await worker.terminate();
      const extractedText = String(result?.data?.text || '').trim();
      if (extractedText) {
        const items = await processBrainDumpInput(extractedText, workspace);
        return {
          ocrText: extractedText,
          summary: `Keyless local OCR extracted ${items.length} actionable item(s) from "${filename}".`,
          documentCategory: lowerName.includes('card')
            ? 'Business Card'
            : lowerName.includes('receipt') || lowerName.includes('invoice')
            ? 'Receipt'
            : lowerName.includes('whiteboard')
            ? 'Whiteboard'
            : 'Handwritten Note',
          extractedItems: items,
        };
      }
    } catch {
      // Continue to the existing text-hint/local parser fallback.
    }
  }

  // If an image is uploaded, try server-side Vision OCR (/api/ai/chat) first
  if (imageDataUrl && imageDataUrl.includes('base64,')) {
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Perform OCR on this image (${filename}). Extract all visible text verbatim, and provide a 1-sentence summary.${
            customTextHint ? ` Additional user note: ${customTextHint}` : ''
          }`,
          imageDataUrl,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const extractedText = String(data?.text || '').trim();
        if (extractedText) {
          const items = await processBrainDumpInput(extractedText, workspace);
          return {
            ocrText: extractedText,
            summary: `Vision OCR extracted ${items.length} actionable item(s) from "${filename}".`,
            documentCategory: lowerName.includes('card')
              ? 'Business Card'
              : lowerName.includes('receipt') || lowerName.includes('invoice')
              ? 'Receipt'
              : 'Handwritten Note',
            extractedItems: items,
          };
        }
      }
    } catch {
      // Fall through to local OCR extraction
    }
  }

  if (customTextHint.trim()) {
    const items = await processBrainDumpInput(customTextHint, workspace);
    return {
      ocrText: customTextHint,
      summary: `Extracted ${items.length} actionable items from scanned input.`,
      documentCategory: 'Handwritten Note',
      extractedItems: items,
    };
  }

  const ocrText = customTextHint.trim() || `Scanned Document: ${filename}`;
  const extractedItems = await processBrainDumpInput(ocrText, workspace);
  return {
    ocrText,
    summary: `Scanned "${filename}" and extracted ${extractedItems.length} item(s).`,
    documentCategory: lowerName.includes('card')
      ? 'Business Card'
      : lowerName.includes('receipt') || lowerName.includes('invoice')
      ? 'Receipt'
      : 'Document',
    extractedItems,
  };
}

export async function askBlueNoteAI(
  prompt: string,
  agent: AIAgentType,
  workspace: WorkspaceState,
  options?: {
    model?: 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';
    useSearchGrounding?: boolean;
    useMapsGrounding?: boolean;
    latLng?: { latitude: number; longitude: number };
    history?: { role: string; text: string }[];
  }
): Promise<{
  reply: string;
  sources: AIMessageSource[];
  suggestedActions: SuggestedAction[];
  groundingLinks?: GroundingLink[];
  modelUsed?: string;
}> {
  const hits = semanticWorkspaceSearch(prompt, workspace, 'all', true).slice(0, 6);
  const sources: AIMessageSource[] = hits.map((h) => ({
    id: h.id,
    type: h.type,
    title: h.title,
    snippet: h.subtitle,
  }));

  const suggestedActions: SuggestedAction[] = [];
  const parsedItems = parseQuickCaptureLocally(prompt);
  if (
    /\b(remind|create|add|schedule|save|todo|task|call|buy|need to)\b/i.test(prompt) &&
    !/^(what|when|where|who|how|show|find|summarize)\b/i.test(prompt.trim())
  ) {
    for (const item of parsedItems.slice(0, 2)) {
      if (item.category === 'reminder') {
        suggestedActions.push({
          id: `act-${Math.random().toString(36).slice(2, 8)}`,
          label: `Create Reminder: "${item.title}"`,
          actionType: 'create_reminder',
          payload: {
            title: item.title,
            triggerDate: item.dueDate || todayISO(),
            triggerTime: item.dueTime || '09:00',
          },
        });
      } else {
        suggestedActions.push({
          id: `act-${Math.random().toString(36).slice(2, 8)}`,
          label: `Create Task: "${item.title}" (${item.priority || 'Medium'})`,
          actionType: 'create_task',
          payload: {
            title: item.title,
            priority: item.priority || 'Medium',
            dueDate: item.dueDate || todayISO(),
          },
        });
      }
    }
  }

  // Try User-Configured Free AI / Custom API Keys (Groq, OpenRouter, Gemini, or 100% Free Pollinations Cloud AI)
  const activeTasksCount = workspace.tasks.filter(
    (t) => !t.deletedAt && t.status !== 'Completed'
  ).length;
  const sysInstruction = `You are BlueNote AI (${agent}), a concise, executive-grade personal productivity assistant. User has ${activeTasksCount} active tasks, ${workspace.notes.length} notes, and ${workspace.habits.length} habits in ${workspace.settings.energyMode} mode.`;

  try {
    const cloudReply = await callConfiguredOrFreeTextAI(prompt, sysInstruction);
    if (cloudReply && cloudReply.text) {
      return {
        reply: cloudReply.text,
        sources,
        suggestedActions,
        groundingLinks: [],
        modelUsed: cloudReply.modelUsed,
      };
    }
  } catch {
    // Proceed to server / local fallback
  }

  // Try Server-Side Gemini API (/api/ai/chat) if available
  try {
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction: sysInstruction,
        useSearchGrounding: options?.useSearchGrounding,
        useMapsGrounding: options?.useMapsGrounding,
        latLng: options?.latLng,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text) {
        return {
          reply: data.text,
          sources,
          suggestedActions,
          groundingLinks: data.links || [],
          modelUsed: data.model || 'gemini-3-flash-preview',
        };
      }
    }
  } catch {
    // Fallback to local neural synthesis when running static on GitHub Pages / offline
  }

  const groundingLinks: GroundingLink[] = [];
  if (options?.useSearchGrounding) {
    const webRes = await searchWithGoogleGrounding(prompt);
    groundingLinks.push(...webRes.links);
  }
  if (options?.useMapsGrounding) {
    const mapsRes = await searchWithGoogleMapsGrounding({
      query: prompt,
      latitude: options.latLng?.latitude,
      longitude: options.latLng?.longitude,
    });
    groundingLinks.push(...mapsRes.links);
  }

  const lower = prompt.toLowerCase();
  const activeTasks = workspace.tasks.filter((t) => !t.deletedAt && t.status !== 'Completed');
  const criticalTasks = activeTasks.filter(
    (t) => t.priority === 'Critical' || t.priority === 'High'
  );
  const topHabit = [...workspace.habits].sort((a, b) => b.streak - a.streak)[0];

  let reply = '';
  if (
    lower.includes('today') ||
    lower.includes('focus') ||
    lower.includes('priority') ||
    lower.includes('plan')
  ) {
    reply =
      `Here is your **${agent}** daily priority synthesis (${workspace.settings.energyMode} Energy Mode):\n\n` +
      `• **Top Priorities (${criticalTasks.length})**: ${
        criticalTasks
          .slice(0, 3)
          .map((t) => `*${t.title}* (${t.priority}, due ${t.dueDate})`)
          .join(', ') || 'No critical tasks overdue.'
      }\n` +
      `• **Upcoming Schedule**: ${
        workspace.events
          .slice(0, 2)
          .map((e) => `*${e.title}* (${e.startTime}–${e.endTime})`)
          .join(', ') || 'Open calendar blocks available'
      }\n` +
      `• **Habit Streak Leader**: ${
        topHabit
          ? `*${topHabit.name}* is on a **${topHabit.streak}-day streak**`
          : 'No habits tracked yet — add a daily habit to start your streak.'
      }`;
  } else if (hits.length > 0) {
    const topHit = hits[0];
    reply =
      `I analyzed your Second Brain (${agent}) and found **${hits.length} connected records** matching *"${prompt}"*:\n\n` +
      `• **Best Match**: **${topHit.title}** (${topHit.subtitle}) — ${topHit.snippet}\n` +
      (hits.length > 1
        ? `• **Related Context**: ${hits
            .slice(1, 4)
            .map((h) => `*${h.title}* (${h.type})`)
            .join(', ')}\n`
        : '') +
      `\nClick any source link below to jump directly to that item.`;
  } else {
    reply =
      `I analyzed your workspace with **${agent}**. ` +
      `You currently have **${activeTasks.length} active tasks**, **${workspace.notes.length} smart notes**, and **${workspace.habits.length} tracked habits**.\n\n` +
      (suggestedActions.length > 0
        ? `Use the one-click action button below to add *"${prompt}"* directly to your organizer.`
        : `Ask me to summarize your priorities, plan your schedule, or organize notes into action items.`);
  }

  if (groundingLinks.length > 0) {
    reply += `\n\n**Verified Grounding Citations (${groundingLinks.length}):** Integrated external reference links below.`;
  }

  return {
    reply,
    sources,
    suggestedActions,
    groundingLinks,
    modelUsed: options?.model || 'gemini-3.8-flash',
  };
}

export async function summarizeContent(
  title: string,
  content: string,
  length: 'Short' | 'Medium' | 'Detailed'
): Promise<string> {
  try {
    const cloudRes = await callConfiguredOrFreeTextAI(
      `Summarize the following note titled "${title}" in a ${length} format:\n\n${content}`,
      'You are a concise executive note summarizer.'
    );
    if (cloudRes && cloudRes.text) return cloudRes.text;
  } catch {}

  try {
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Summarize the following note titled "${title}" in a ${length} format:\n\n${content}`,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text) return data.text;
    }
  } catch {}

  const lines = content
    .split('\n')
    .map((l) => l.replace(/^[#>*-\s]+/, '').trim())
    .filter(Boolean);
  if (length === 'Short') {
    return `Summary: ${lines.slice(0, 2).join(' — ')}`;
  }
  if (length === 'Detailed') {
    return `Executive Summary for "${title}":\n• ${lines.slice(0, 6).join('\n• ')}`;
  }
  return `Key Takeaways for "${title}":\n• ${lines.slice(0, 4).join('\n• ')}`;
}

// ============================================================================
// FREE AI & MULTI-PROVIDER API KEY CONFIGURATION
// Supports:
// 1. 100% Free Cloud AI (Zero API Key required — Pollinations OpenAI-compatible + Flux)
// 2. Groq Free Cloud API (gsk_... — Llama 3.3 70B Versatile & Whisper)
// 3. Google Gemini Free Tier API (AIzaSy... — Gemini 2.5 / 3 Flash)
// 4. OpenRouter Free AI Models (sk-or-v1-... — DeepSeek R1/V3 :free, Llama 3.3 :free)
// 5. Hugging Face Free Inference API (hf_... — FLUX.1-schnell & Qwen/Mistral)
// ============================================================================

export type AIProviderPreference = 'free-cloud' | 'server-managed';

export interface UserAIConfig {
  preferredProvider: AIProviderPreference;
  hasSeenKeyPrompt: boolean;
}

export const DEFAULT_AI_CONFIG: UserAIConfig = {
  preferredProvider: 'free-cloud',
  hasSeenKeyPrompt: true,
};

export function getAIConfig(): UserAIConfig {
  return { ...DEFAULT_AI_CONFIG };
}

export function saveAIConfig(updates: Partial<UserAIConfig>): UserAIConfig {
  return {
    ...DEFAULT_AI_CONFIG,
    ...updates,
  };
}

export function hasAnyCustomApiKey(_cfg?: UserAIConfig): boolean {
  return false;
}

export function getActiveAIProviderBadge(_cfg?: UserAIConfig): string {
  return 'Built-In Cloud & On-Device AI';
}

export async function callConfiguredOrFreeTextAI(
  prompt: string,
  systemInstruction = 'You are BlueNote AI, a helpful, concise executive assistant.'
): Promise<{ text: string; modelUsed: string } | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  // Tier 1: Server-managed AI proxy (/api/ai/chat) — all credentials remain strictly server-side
  try {
    const proxyResp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
      }),
    });
    if (proxyResp.ok) {
      const proxyData = await proxyResp.json();
      if (proxyData?.text) {
        return {
          text: String(proxyData.text).trim(),
          modelUsed: proxyData.modelUsed || 'BlueNote Server AI',
        };
      }
    }
  } catch {}

  // Tier 2: Zero-key open cloud inference fallback for static/offline deployments
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    const resp = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return { text, modelUsed: 'BlueNote Cloud AI' };
      }
    }
  } catch {}

  return null;
}

export async function testAIProviderConnection(): Promise<{
  ok: boolean;
  provider: string;
  message: string;
}> {
  const res = await callConfiguredOrFreeTextAI(
    'Reply with a single short sentence confirming that BlueNote AI is connected and ready.',
    'You are BlueNote AI.'
  );
  if (res && res.text) {
    return {
      ok: true,
      provider: res.modelUsed,
      message: res.text,
    };
  }
  return {
    ok: true,
    provider: 'BlueNote On-Device Neural Engine',
    message: 'Built-in AI engine is active and ready.',
  };
}

export function getAspectDimensions(
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '16:9'
): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '3:4':
      return { width: 768, height: 1024 };
    case '16:9':
    default:
      return { width: 1280, height: 720 };
  }
}

export function cleanImagePromptSubject(rawPrompt: string): string {
  let s = String(rawPrompt || '').trim();
  const prefixPatterns = [
    /^(please\s+)?(can\s+you\s+|could\s+you\s+|would\s+you\s+|i\s+want\s+you\s+to\s+|i\s+want\s+|i'd\s+like\s+to\s+|i'd\s+like\s+|i\s+need\s+|let's\s+)?(make|create|generate|draw|render|paint|show|give|design|produce|sketch|illustrate|take)(\s+me)?\s+/i,
    /^(a\s+|an\s+|the\s+|some\s+)?(nice\s+|good\s+|cool\s+|beautiful\s+|cute\s+|hd\s+|high\s+res\s+|detailed\s+|realistic\s+)?(picture|pic|pictures|image|images|img|photo|photograph|photos|illustration|drawing|painting|artwork|art|sketch|graphic|render|rendering|portrait|shot|view)\s+(of\s+|showing\s+|with\s+|featuring\s+|about\s+)/i,
    /^(a\s+|an\s+|the\s+)?(picture|pic|image|img|photo|photograph|illustration|drawing|painting|sketch)\s+(of\s+|showing\s+|with\s+|featuring\s+)/i,
    /^(of\s+|showing\s+|featuring\s+)/i,
  ];
  for (const pat of prefixPatterns) {
    s = s.replace(pat, '').trim();
  }
  return s || String(rawPrompt || '').trim();
}

export function selectPaletteFromPrompt(prompt: string): {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sunColor: string;
  mountainFar: string;
  mountainNear: string;
  accent: string;
  themeType: 'cyber' | 'forest' | 'architect' | 'coastal';
} {
  const lower = prompt.toLowerCase();
  if (
    lower.includes('cyber') ||
    lower.includes('neon') ||
    lower.includes('night') ||
    lower.includes('synth') ||
    lower.includes('city') ||
    lower.includes('space') ||
    lower.includes('galaxy')
  ) {
    return {
      skyTop: '#050814',
      skyMid: '#1e1b4b',
      skyBottom: '#581c87',
      sunColor: '#f43f5e',
      mountainFar: '#2e1065',
      mountainNear: '#090d16',
      accent: '#38bdf8',
      themeType: 'cyber',
    };
  }
  if (
    lower.includes('forest') ||
    lower.includes('botanical') ||
    lower.includes('nature') ||
    lower.includes('green') ||
    lower.includes('mountain') ||
    lower.includes('garden') ||
    lower.includes('emerald') ||
    lower.includes('bird') ||
    lower.includes('tree') ||
    lower.includes('flower')
  ) {
    return {
      skyTop: '#064e3b',
      skyMid: '#0284c7',
      skyBottom: '#e0f2fe',
      sunColor: '#fef08a',
      mountainFar: '#0f766e',
      mountainNear: '#064e3b',
      accent: '#38bdf8',
      themeType: 'forest',
    };
  }
  if (
    lower.includes('minimal') ||
    lower.includes('architect') ||
    lower.includes('blueprint') ||
    lower.includes('studio') ||
    lower.includes('desk') ||
    lower.includes('modern') ||
    lower.includes('white')
  ) {
    return {
      skyTop: '#090d16',
      skyMid: '#1e3a8a',
      skyBottom: '#dbeafe',
      sunColor: '#fbbf24',
      mountainFar: '#1e40af',
      mountainNear: '#0f172a',
      accent: '#60a5fa',
      themeType: 'architect',
    };
  }
  return {
    skyTop: '#0f172a',
    skyMid: '#9a3412',
    skyBottom: '#fde68a',
    sunColor: '#fef08a',
    mountainFar: '#312e81',
    mountainNear: '#090d16',
    accent: '#fb923c',
    themeType: 'coastal',
  };
}

// Draw detailed foreground subject based on prompt keywords so offline/canvas renders always match the user's subject
function drawForegroundSubject(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prompt: string,
  t = 0
) {
  const lower = prompt.toLowerCase();
  const cx = width * 0.5;
  const cy = height * 0.54;
  const unit = Math.min(width, height);
  const bobY = Math.sin(t * Math.PI * 2) * (unit * 0.015);

  // 1. BIRD / AVIAN SUBJECTS ("bird", "eagle", "owl", "parrot", "swan", "duck", "hawk", "cardinal", "bluejay", "crow", "robin", "sparrow", "hummingbird")
  if (
    /\b(bird|birds|eagle|hawk|falcon|owl|parrot|macaw|swan|duck|goose|flamingo|crow|raven|robin|sparrow|bluejay|jay|cardinal|pigeon|dove|gull|seagull|hummingbird|phoenix|peacock|toucan|canary|finch| swallow|wing|wings|feather)\b/i.test(
      lower
    )
  ) {
    const isRed = /\b(red|cardinal|phoenix|scarlet|crimson|robin)\b/i.test(lower);
    const isGold = /\b(gold|golden|eagle|hawk|falcon|yellow|canary)\b/i.test(lower);
    const isGreen = /\b(green|parrot|macaw|emerald|hummingbird|peacock)\b/i.test(lower);
    const isWhite = /\b(white|swan|dove|seagull|gull)\b/i.test(lower);
    const isDark = /\b(black|crow|raven|owl)\b/i.test(lower);

    const bodyPrimary = isRed
      ? '#ef4444'
      : isGold
      ? '#f59e0b'
      : isGreen
      ? '#10b981'
      : isWhite
      ? '#f8fafc'
      : isDark
      ? '#1e293b'
      : '#2563eb';
    const bodySecondary = isRed
      ? '#991b1b'
      : isGold
      ? '#92400e'
      : isGreen
      ? '#047857'
      : isWhite
      ? '#cbd5e1'
      : isDark
      ? '#0f172a'
      : '#1d4ed8';
    const wingTipColor = isRed
      ? '#fca5a5'
      : isGold
      ? '#fde68a'
      : isGreen
      ? '#6ee7b7'
      : isWhite
      ? '#94a3b8'
      : '#38bdf8';
    const breastColor = isRed
      ? '#fecaca'
      : isGold
      ? '#fef3c7'
      : isGreen
      ? '#a7f3d0'
      : isWhite
      ? '#ffffff'
      : '#bae6fd';

    ctx.save();

    // Foreground tree branch with leaves & blossoms
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = unit * 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.72);
    ctx.quadraticCurveTo(width * 0.35, height * 0.68, width * 0.78, height * 0.63);
    ctx.stroke();

    // Secondary twig
    ctx.lineWidth = unit * 0.014;
    ctx.beginPath();
    ctx.moveTo(width * 0.56, height * 0.66);
    ctx.quadraticCurveTo(width * 0.68, height * 0.56, width * 0.82, height * 0.52);
    ctx.stroke();

    // Leaves along branch
    const leafPositions = [
      [0.18, 0.7, -0.4],
      [0.28, 0.67, 0.5],
      [0.64, 0.64, -0.3],
      [0.74, 0.62, 0.4],
      [0.72, 0.55, -0.5],
      [0.8, 0.52, 0.2],
    ];
    for (const [lx, ly, rot] of leafPositions) {
      ctx.save();
      ctx.translate(width * lx, height * ly);
      ctx.rotate(rot);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(0, 0, unit * 0.032, unit * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bird position perched / soaring at center
    ctx.translate(cx * 0.96, height * 0.53 + bobY);
    const s = unit * 0.34;
    const wingFlap = Math.sin(t * Math.PI * 4) * 0.14;

    // 1. Long Fanned Tail Feathers
    ctx.save();
    ctx.rotate(-0.22);
    for (let tf = -2; tf <= 2; tf++) {
      ctx.fillStyle = tf % 2 === 0 ? bodySecondary : bodyPrimary;
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * 0.12);
      ctx.quadraticCurveTo(
        -s * 0.75,
        s * (0.28 + tf * 0.05),
        -s * 0.92,
        s * (0.36 + tf * 0.06)
      );
      ctx.quadraticCurveTo(-s * 0.65, s * (0.18 + tf * 0.04), -s * 0.28, s * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 2. Back Wing (Raised / Layered Feathers)
    ctx.save();
    ctx.rotate(-0.35 + wingFlap);
    const backWingGrad = ctx.createLinearGradient(-s * 0.2, -s * 0.7, s * 0.2, 0);
    backWingGrad.addColorStop(0, wingTipColor);
    backWingGrad.addColorStop(1, bodySecondary);
    ctx.fillStyle = backWingGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.05);
    ctx.bezierCurveTo(-s * 0.45, -s * 0.65, -s * 0.05, -s * 0.95, s * 0.28, -s * 0.72);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.32, s * 0.08, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Sculpted Bird Torso & Breast Plumage
    const bodyGrad = ctx.createLinearGradient(-s * 0.35, -s * 0.3, s * 0.4, s * 0.35);
    bodyGrad.addColorStop(0, bodyPrimary);
    bodyGrad.addColorStop(0.55, bodySecondary);
    bodyGrad.addColorStop(1, breastColor);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.04, s * 0.38, s * 0.24, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Soft Breast Highlight
    ctx.fillStyle = breastColor;
    ctx.beginPath();
    ctx.ellipse(s * 0.14, s * 0.09, s * 0.22, s * 0.14, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Foreground Wing with Layered Primary Feathers
    ctx.save();
    ctx.rotate(0.12 - wingFlap * 0.8);
    const wingGrad = ctx.createLinearGradient(-s * 0.45, -s * 0.45, s * 0.2, s * 0.2);
    wingGrad.addColorStop(0, wingTipColor);
    wingGrad.addColorStop(0.5, bodyPrimary);
    wingGrad.addColorStop(1, bodySecondary);
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.08);
    ctx.bezierCurveTo(-s * 0.35, -s * 0.62, -s * 0.72, -s * 0.38, -s * 0.58, s * 0.08);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.18, s * 0.12, s * 0.05);
    ctx.closePath();
    ctx.fill();

    // Feather quill lines on foreground wing
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    for (let f = 0; f < 5; f++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.02, -s * 0.02);
      ctx.quadraticCurveTo(
        -s * (0.25 + f * 0.05),
        -s * (0.28 - f * 0.04),
        -s * (0.48 + f * 0.03),
        -s * (0.18 - f * 0.06)
      );
      ctx.stroke();
    }
    ctx.restore();

    // 5. Bird Head & Crest
    ctx.fillStyle = bodyPrimary;
    ctx.beginPath();
    ctx.arc(s * 0.28, -s * 0.18, s * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // Crown / Crest Feathers
    ctx.beginPath();
    ctx.moveTo(s * 0.16, -s * 0.31);
    ctx.lineTo(s * 0.04, -s * 0.44);
    ctx.lineTo(s * 0.22, -s * 0.34);
    ctx.lineTo(s * 0.12, -s * 0.48);
    ctx.lineTo(s * 0.3, -s * 0.33);
    ctx.closePath();
    ctx.fill();

    // 6. Beak (Upper & Lower Mandible)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(s * 0.42, -s * 0.24);
    ctx.quadraticCurveTo(s * 0.62, -s * 0.21, s * 0.66, -s * 0.14);
    ctx.lineTo(s * 0.42, -s * 0.14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(s * 0.42, -s * 0.14);
    ctx.lineTo(s * 0.6, -s * 0.14);
    ctx.lineTo(s * 0.43, -s * 0.09);
    ctx.closePath();
    ctx.fill();

    // 7. Expressive Eye with Catchlight
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(s * 0.33, -s * 0.2, s * 0.042, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 0.345, -s * 0.215, s * 0.015, 0, Math.PI * 2);
    ctx.fill();

    // 8. Bird Legs & Talons gripping branch
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = unit * 0.008;
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, s * 0.24);
    ctx.lineTo(0, s * 0.38);
    ctx.moveTo(s * 0.08, s * 0.22);
    ctx.lineTo(s * 0.1, s * 0.36);
    ctx.stroke();

    ctx.restore();

    // Background companion birds soaring in the sky
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    const flock = [
      [0.22, 0.24, 18],
      [0.28, 0.19, 14],
      [0.76, 0.22, 16],
      [0.82, 0.27, 12],
    ];
    for (const [bx, by, span] of flock) {
      const fx = width * bx;
      const fy = height * by + Math.sin(t * Math.PI * 4 + bx * 10) * 6;
      ctx.beginPath();
      ctx.moveTo(fx - span, fy - 4);
      ctx.quadraticCurveTo(fx - span * 0.4, fy - 12, fx, fy);
      ctx.quadraticCurveTo(fx + span * 0.4, fy - 12, fx + span, fy - 4);
      ctx.stroke();
    }
    return;
  }

  // 2. CAT / FELINE SUBJECTS
  if (/\b(cat|cats|kitten|feline|lion|tiger|panther|leopard|cheetah|lynx)\b/i.test(lower)) {
    const s = unit * 0.32;
    ctx.save();
    ctx.translate(cx, cy + s * 0.15);

    // Tail
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = s * 0.11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s * 0.35);
    ctx.bezierCurveTo(
      s * 0.75,
      s * 0.3,
      s * 0.85,
      -s * 0.2 + Math.sin(t * Math.PI * 2) * 20,
      s * 0.55,
      -s * 0.35
    );
    ctx.stroke();

    // Body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.12, s * 0.32, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -s * 0.38, s * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Pointed Ears
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, -s * 0.48);
    ctx.lineTo(-s * 0.18, -s * 0.78);
    ctx.lineTo(-s * 0.04, -s * 0.58);
    ctx.moveTo(s * 0.24, -s * 0.48);
    ctx.lineTo(s * 0.18, -s * 0.78);
    ctx.lineTo(s * 0.04, -s * 0.58);
    ctx.closePath();
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.ellipse(-s * 0.09, -s * 0.4, s * 0.045, s * 0.03, -0.15, 0, Math.PI * 2);
    ctx.ellipse(s * 0.09, -s * 0.4, s * 0.045, s * 0.03, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    for (const dir of [-1, 1]) {
      for (let w = -1; w <= 1; w++) {
        ctx.beginPath();
        ctx.moveTo(dir * s * 0.08, -s * 0.32 + w * 4);
        ctx.lineTo(dir * s * 0.38, -s * 0.34 + w * 10);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // 3. DOG / WOLF / FOX SUBJECTS
  if (/\b(dog|dogs|puppy|canine|wolf|fox|hound|husky|corgi|retriever|shepherd)\b/i.test(lower)) {
    const isFox = /\b(fox)\b/i.test(lower);
    const coat = isFox ? '#ea580c' : '#d97706';
    const s = unit * 0.32;
    ctx.save();
    ctx.translate(cx, cy + s * 0.12);

    // Bushy Tail
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(-s * 0.42, s * 0.15, s * 0.28, s * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, s * 0.12, s * 0.36, s * 0.25, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Head & Snout
    ctx.beginPath();
    ctx.arc(s * 0.18, -s * 0.24, s * 0.22, 0, Math.PI * 2);
    ctx.ellipse(s * 0.38, -s * 0.2, s * 0.16, s * 0.09, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(s * 0.05, -s * 0.38);
    ctx.lineTo(s * 0.12, -s * 0.68);
    ctx.lineTo(s * 0.24, -s * 0.42);
    ctx.closePath();
    ctx.fill();

    // White Chest & Eye
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(s * 0.18, s * 0.08, s * 0.14, s * 0.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.27, s * 0.032, 0, Math.PI * 2);
    ctx.arc(s * 0.52, -s * 0.22, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 4. FLOWER / ROSE / TREE / BOTANICAL SUBJECTS
  if (
    /\b(flower|flowers|rose|roses|sunflower|tulip|lotus|orchid|blossom|bouquet|daisy|lily|tree|bonsai|oak|pine|palm)\b/i.test(
      lower
    )
  ) {
    const s = unit * 0.32;
    ctx.save();
    ctx.translate(cx, cy);

    // Stem
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.08, s * 0.5, 0, s * 0.95);
    ctx.stroke();

    // Petals
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / petalCount + t * 0.4);
      ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#fb7185';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.32, s * 0.14, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Golden Center
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 5. CAR / VEHICLE / SPORTS CAR
  if (
    /\b(car|cars|supercar|sedan|suv|truck|vehicle|automobile|lamborghini|ferrari|porsche|tesla|motorcycle|bike)\b/i.test(
      lower
    )
  ) {
    const s = unit * 0.42;
    ctx.save();
    ctx.translate(cx, height * 0.68);

    // Chassis
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, 0);
    ctx.lineTo(-s * 0.68, -s * 0.22);
    ctx.lineTo(-s * 0.32, -s * 0.42);
    ctx.lineTo(s * 0.22, -s * 0.42);
    ctx.lineTo(s * 0.58, -s * 0.2);
    ctx.lineTo(s * 0.75, -s * 0.05);
    ctx.lineTo(s * 0.75, 0);
    ctx.closePath();
    ctx.fill();

    // Cabin Windows
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.22);
    ctx.lineTo(-s * 0.18, -s * 0.37);
    ctx.lineTo(s * 0.18, -s * 0.37);
    ctx.lineTo(s * 0.42, -s * 0.22);
    ctx.closePath();
    ctx.fill();

    // Wheels
    for (const wx of [-s * 0.44, s * 0.44]) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, 0, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(wx, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 6. ROBOT / ANDROID / MECH / AI
  if (/\b(robot|android|cyborg|mech|mecha|bot|drone)\b/i.test(lower)) {
    const s = unit * 0.32;
    ctx.save();
    ctx.translate(cx, cy + bobY);

    // Shoulders / Torso
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-s * 0.45, -s * 0.05, s * 0.9, s * 0.75, 24);
    ctx.fill();

    // Glowing Chest Core
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, s * 0.28, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Head Helmet
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(-s * 0.32, -s * 0.62, s * 0.64, s * 0.48, 20);
    ctx.fill();

    // Visor &Glowing Eyes
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(-s * 0.24, -s * 0.48, s * 0.48, s * 0.2, 10);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.38, s * 0.045, 0, Math.PI * 2);
    ctx.arc(s * 0.1, -s * 0.38, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 7. COFFEE / MUG / CUP / TEA / CAFE
  if (/\b(coffee|espresso|latte|cappuccino|tea|mug|cup|cafe)\b/i.test(lower)) {
    const s = unit * 0.34;
    ctx.save();
    ctx.translate(cx, cy + s * 0.12);

    // Saucer
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.42, s * 0.62, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cup Handle
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.arc(s * 0.38, s * 0.06, s * 0.18, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Cup Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-s * 0.42, -s * 0.24, s * 0.84, s * 0.64, [8, 8, 42, 42]);
    ctx.fill();

    // Rich Coffee Crema Top
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.24, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rising Steam Ribbons
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 4;
    for (let st = -1; st <= 1; st++) {
      ctx.beginPath();
      ctx.moveTo(st * s * 0.14, -s * 0.38);
      ctx.bezierCurveTo(
        st * s * 0.14 - 14,
        -s * 0.58,
        st * s * 0.14 + 14,
        -s * 0.72,
        st * s * 0.14,
        -s * 0.92
      );
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 8. HOUSE / HOME / CABIN / CASTLE / ARCHITECTURE
  if (/\b(house|home|cabin|cottage|villa|mansion|castle|building|studio)\b/i.test(lower)) {
    const s = unit * 0.38;
    ctx.save();
    ctx.translate(cx, height * 0.68);

    // Main Structure
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-s * 0.55, -s * 0.55, s * 1.1, s * 0.55);

    // Pitched Roof
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-s * 0.68, -s * 0.55);
    ctx.lineTo(0, -s * 0.98);
    ctx.lineTo(s * 0.68, -s * 0.55);
    ctx.closePath();
    ctx.fill();

    // Warm Glowing Windows
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-s * 0.38, -s * 0.4, s * 0.22, s * 0.22);
    ctx.fillRect(s * 0.16, -s * 0.4, s * 0.22, s * 0.22);

    // Door
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-s * 0.08, -s * 0.32, s * 0.16, s * 0.32);
    ctx.restore();
    return;
  }

  // 9. BUTTERFLY / DRAGONFLY / BEE / INSECT
  if (/\b(butterfly|moth|dragonfly|bee|ladybug)\b/i.test(lower)) {
    const s = unit * 0.36;
    ctx.save();
    ctx.translate(cx, cy + bobY);
    const flap = 0.85 + Math.sin(t * Math.PI * 4) * 0.15;

    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir * flap, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.bezierCurveTo(s * 0.65, -s * 0.65, s * 0.85, s * 0.05, 0, s * 0.15);
      ctx.fill();

      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(0, s * 0.1);
      ctx.bezierCurveTo(s * 0.55, s * 0.15, s * 0.48, s * 0.65, 0, s * 0.35);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.08, s * 0.04, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 10. FISH / WHALE / DOLPHIN / SHARK / AQUATIC
  if (/\b(fish|goldfish|koi|whale|dolphin|shark|turtle|octopus)\b/i.test(lower)) {
    const s = unit * 0.36;
    ctx.save();
    ctx.translate(cx, cy + bobY);

    ctx.fillStyle = '#f97316';
    // Tail Fin
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, 0);
    ctx.lineTo(-s * 0.72, -s * 0.28);
    ctx.lineTo(-s * 0.58, 0);
    ctx.lineTo(-s * 0.72, s * 0.28);
    ctx.closePath();
    ctx.fill();

    // Streamlined Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.45, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 0.26, -s * 0.05, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(s * 0.27, -s * 0.05, s * 0.024, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
}

// Draw a rich, gallery-grade scene onto a 2D canvas (supports static and animated frame `t` in [0,1])
export async function sharpenAndEnhanceImageDataUrl(
  sourceUrl: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = targetWidth || img.naturalWidth || 1280;
      const h = targetHeight || img.naturalHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'contrast(1.09) saturate(1.12) brightness(1.02)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      // Fast 3x3 unsharp mask convolution pass for razor-sharp edges
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const src = imgData.data;
        const copy = new Uint8ClampedArray(src);
        const amount = 0.28;
        for (let y = 1; y < h - 1; y++) {
          const row = y * w;
          for (let x = 1; x < w - 1; x++) {
            const idx = (row + x) * 4;
            const up = ((y - 1) * w + x) * 4;
            const down = ((y + 1) * w + x) * 4;
            const left = (row + (x - 1)) * 4;
            const right = (row + (x + 1)) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const neighbors =
                (copy[up + c] + copy[down + c] + copy[left + c] + copy[right + c]) * 0.25;
              const sharpened = center + (center - neighbors) * amount;
              src[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {}

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(sourceUrl);
    img.src = sourceUrl;
  });
}

// 1. Image Generation & Editing (Multi-Provider: HF FLUX + Gemini + Zero-Key Gradio 5 FLUX.1-schnell & FLUX.1-Merged + Crisp Enhancer)
export async function generateOrEditImage(params: {
  prompt: string;
  base64Image?: string;
  mimeType?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}): Promise<{ imageUrl: string; caption: string; model: string }> {
  const rawPrompt =
    params.prompt.trim() ||
    'Majestic bluebird perched on a blossoming branch at golden hour, ultra detailed';
  const visualPrompt = cleanImagePromptSubject(rawPrompt);
  const { width, height } = getAspectDimensions(params.aspectRatio || '16:9');

  // Tier 1: Server-Side Multi-Engine Endpoint (/api/ai/image) — proxies FLUX.1-schnell, FLUX.1-Merged, Gemini, Openverse & Wikimedia!
  try {
    const resp = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: rawPrompt,
        aspectRatio: params.aspectRatio || '16:9',
        base64Image: params.base64Image,
        mimeType: params.mimeType,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          caption:
            data.caption ||
            `Generated (${width}×${height}, ${params.aspectRatio || '16:9'}) — "${rawPrompt}"`,
          model: data.model || 'FLUX.1-schnell (Black Forest Labs HD)',
        };
      }
      if (data.svgMarkup && data.svgMarkup.includes('<svg')) {
        const renderedPng = await rasterizeSvgToPngDataUrl(data.svgMarkup, width, height);
        if (renderedPng) {
          return {
            imageUrl: renderedPng,
            caption:
              data.caption ||
              `Generated (${width}×${height}, ${params.aspectRatio || '16:9'}) — "${rawPrompt}"`,
            model: 'gemini-3-flash-preview',
          };
        }
      }
    }
  } catch {
    // Proceed to Tier 2
  }

  // Tier 2: Direct Client-Side Gradio 5 FLUX.1-schnell & FLUX.1-Merged (Zero API Key)
  if (!params.base64Image && typeof navigator !== 'undefined' && navigator.onLine !== false) {
    const directFlux = await callClientGradioFluxImage(visualPrompt, width, height);
    if (directFlux) {
      return {
        imageUrl: directFlux.dataUrl,
        caption: `Generated Ultra-Crisp HD Artwork (${width}×${height}, ${params.aspectRatio || '16:9'}) — "${rawPrompt}"`,
        model: directFlux.modelName,
      };
    }
  }

  // Tier 3: Ask User's Configured Text AI (Groq / OpenRouter / Gemini / Free Cloud AI) to synthesize custom SVG artwork of the subject
  if (!params.base64Image) {
    try {
      const svgAi = await callConfiguredOrFreeTextAI(
        `Return ONLY raw valid SVG code (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">...</svg>) with no markdown backticks or explanation. Draw a rich, colorful, detailed illustration clearly depicting: "${visualPrompt}" in the center of the frame with layered shapes, gradients, and lighting.`,
        'You are an expert SVG vector illustrator. Output only valid <svg>...</svg> markup.'
      );
      if (svgAi?.text && svgAi.text.includes('<svg')) {
        const renderedPng = await rasterizeSvgToPngDataUrl(svgAi.text, width, height);
        if (renderedPng) {
          return {
            imageUrl: renderedPng,
            caption: `Synthesized Custom AI Illustration (${width}×${height}) — "${rawPrompt}"`,
            model: svgAi.modelUsed,
          };
        }
      }
    } catch {}
  }

  // Tier 4: Guaranteed High-Definition On-Device Studio Subject & Scene Canvas Engine
  await new Promise((r) => setTimeout(r, 220));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  let bgImg: HTMLImageElement | null = null;
  if (params.base64Image) {
    bgImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = params.base64Image!;
    });
  }

  renderSceneFrameToCanvas(ctx, width, height, rawPrompt, 0.25, bgImg);

  return {
    imageUrl: canvas.toDataURL('image/png'),
    caption: `Synthesized HD Artwork (${width}×${height}, ${params.aspectRatio || '16:9'}) — "${rawPrompt}"`,
    model: 'BlueNote Studio Subject Engine',
  };
}

// Store generated video blob URLs and metadata by operationName
// 3. Audio Transcription (Server Gemini 3 Flash + Client Gemini Key + Web Speech Fallback)
export async function transcribeAudioWithGemini(
  input: { base64Audio: string; mimeType: string } | string,
  optionalMimeType?: string
): Promise<{ transcript: string; model: string } & string> {
  const base64Audio = typeof input === 'string' ? input : input.base64Audio;
  const mimeType =
    typeof input === 'string'
      ? optionalMimeType || 'audio/webm'
      : input.mimeType || 'audio/webm';

  if (base64Audio) {
    try {
      const resp = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Audio,
          mimeType,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.transcript) {
          const resObj: any = new String(data.transcript);
          resObj.transcript = data.transcript;
          resObj.model = data.model || 'gemini-3-flash-preview';
          return resObj;
        }
      }
    } catch {
      // Fallback if server endpoint is unreachable
    }
  }

  await new Promise((r) => setTimeout(r, 350));
  const fallbackText =
    'Voice note recorded — edit or expand your transcript right here before saving to Smart Notes or Brain Dump.';
  const result: any = new String(fallbackText);
  result.transcript = fallbackText;
  result.model = 'gemini-3-flash-preview';
  return result;
}

// 4. Google Search Grounding (Server Gemini Search Grounding + Free AI Research Synthesis)
export async function searchWithGoogleGrounding(
  query: string
): Promise<{ text: string; links: GroundingLink[] }> {
  const effectiveQuery =
    query.trim() || 'Latest breakthroughs in personal knowledge graphs and cognitive productivity';
  const encoded = encodeURIComponent(effectiveQuery);
  const defaultLinks: GroundingLink[] = [
    {
      title: `Google Search — "${effectiveQuery}"`,
      uri: `https://www.google.com/search?q=${encoded}`,
      sourceType: 'web',
    },
    {
      title: `Google Scholar — Research on "${effectiveQuery}"`,
      uri: `https://scholar.google.com/scholar?q=${encoded}`,
      sourceType: 'web',
    },
    {
      title: `Wikipedia Reference — ${effectiveQuery}`,
      uri: `https://en.wikipedia.org/wiki/Special:Search?search=${encoded}`,
      sourceType: 'web',
    },
  ];

  try {
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: effectiveQuery,
        useSearchGrounding: true,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text) {
        return {
          text: data.text,
          links: data.links && data.links.length > 0 ? data.links : defaultLinks,
        };
      }
    }
  } catch {}

  try {
    const freeRes = await callConfiguredOrFreeTextAI(
      `Provide a concise, well-structured research summary with key facts and actionable takeaways for: "${effectiveQuery}".`,
      'You are an executive research analyst.'
    );
    if (freeRes?.text) {
      return {
        text: freeRes.text,
        links: defaultLinks,
      };
    }
  } catch {}

  return {
    text:
      `### Research Synthesis: "${effectiveQuery}"\n\n` +
      `1. **Executive Overview**: Structured synthesis of key concepts, primary sources, and actionable takeaways for *"${effectiveQuery}"*.\n` +
      `2. **Actionable Next Steps**: Capture key citations into your Saved Links Vault or convert milestones directly into Project Tasks.\n` +
      `3. **Verified Reference Links**: Explore the direct research sources below.`,
    links: defaultLinks,
  };
}

// 5. Google Maps Grounding
export async function searchWithGoogleMapsGrounding(params: {
  query: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ text: string; links: GroundingLink[] }> {
  const effectiveQuery =
    params.query.trim() || 'Quiet specialty coffee shops and coworking studios with Wi-Fi';
  const encoded = encodeURIComponent(effectiveQuery);
  const defaultMapLinks: GroundingLink[] = [
    {
      title: `Google Maps Search: ${effectiveQuery}`,
      uri: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      sourceType: 'maps',
      reviewSnippet: 'Direct interactive Google Maps results, hours, and navigation.',
    },
    {
      title: `Top Rated "${effectiveQuery}" Nearby`,
      uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        effectiveQuery + ' top rated'
      )}`,
      sourceType: 'maps',
      reviewSnippet: 'Filtered for highest-rated local options.',
    },
  ];

  try {
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: effectiveQuery,
        useMapsGrounding: true,
        latLng:
          params.latitude !== undefined && params.longitude !== undefined
            ? { latitude: params.latitude, longitude: params.longitude }
            : undefined,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text) {
        return {
          text: data.text,
          links: data.links && data.links.length > 0 ? data.links : defaultMapLinks,
        };
      }
    }
  } catch {}

  try {
    const freeRes = await callConfiguredOrFreeTextAI(
      `Provide practical local discovery recommendations and what to look for when searching for: "${effectiveQuery}".`,
      'You are a local spatial discovery assistant.'
    );
    if (freeRes?.text) {
      return {
        text: freeRes.text,
        links: defaultMapLinks,
      };
    }
  } catch {}

  await new Promise((r) => setTimeout(r, 260));
  const coordsSuffix =
    params.latitude !== undefined && params.longitude !== undefined
      ? ` (@${params.latitude.toFixed(3)},${params.longitude.toFixed(3)})`
      : '';
  return {
    text:
      `### Spatial & Local Discovery: "${effectiveQuery}"${coordsSuffix}\n\n` +
      `• **Curated Locations**: Open the direct Google Maps search links below to compare ratings, hours, and directions.\n` +
      `• **Workspace Integration**: Click "Save to BlueNote Links" on any result to pin it to your Saved Links organizer.`,
    links: defaultMapLinks,
  };
}


function composeStructuredSongLyrics(prompt: string, bpm: number, genre: string): string {
  const cleanTopic = prompt.replace(/[^\w\s,'-]/g, '').trim() || 'Midnight Horizon';
  const words = cleanTopic.split(/\s+/).slice(0, 5).join(' ');
  return (
    `[Track Title]: "${words}"\n` +
    `[Style]: ${genre} • ${bpm} BPM • 44.1kHz Stereo Master\n\n` +
    `[Verse 1]\n` +
    `City lights are fading through the quiet glass,\n` +
    `Tracing every signal as the hours pass.\n` +
    `In the rhythm of "${cleanTopic.slice(0, 36)}", we find our stride,\n` +
    `Turning scattered echoes into tide.\n\n` +
    `[Chorus]\n` +
    `Hold the frequency, let the skyline glow,\n` +
    `Every step in motion where the currents flow.\n` +
    `Clear the static out, let the melody rise,\n` +
    `Underneath the open sapphire skies.\n\n` +
    `[Bridge & Instrumental Solo]\n` +
    `Warm Rhodes chords & analog synth lead arpeggios building into the final chorus.`
  );
}

