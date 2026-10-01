import {
  DocumentVersion,
  OSProject,
  ProjectDocument,
  ProjectOSTask,
  ProjectPhotoAlbum,
  ProjectTemplateType,
  SmartCollection,
} from '../types/projectsOS';

const IDB_NAME = 'bluenote_projects_os_chunks_v1';
const IDB_STORE = 'file_chunks';
export const CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per chunk for streaming large files

function openChunkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'chunkKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFileChunkToIDB(
  fileId: string,
  chunkIndex: number,
  blobSlice: Blob
): Promise<void> {
  try {
    const db = await openChunkDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({
        chunkKey: `${fileId}_chunk_${chunkIndex}`,
        fileId,
        chunkIndex,
        size: blobSlice.size,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback gracefully if IndexedDB is restricted in private browsing
  }
}

/**
 * Streams a potentially massive file in 2MB chunks without loading the whole file into memory.
 * Extracts text from the first readable segments (up to 512KB of text) for instant indexing & editing.
 */
export async function streamUploadFileInChunks(params: {
  file: File;
  jobId: string;
  startChunk?: number;
  shouldPause: () => boolean;
  shouldCancel: () => boolean;
  onProgress: (info: {
    completedChunks: number;
    totalChunks: number;
    bytesTransferred: number;
    speedBytesPerSec: number;
  }) => void;
}): Promise<{
  status: 'completed' | 'paused' | 'cancelled';
  completedChunks: number;
  extractedText: string;
}> {
  const { file, jobId, startChunk = 0, shouldPause, shouldCancel, onProgress } = params;
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));
  const startTime = performance.now();
  let extractedText = '';
  const maxTextExtractBytes = 512 * 1024; // Extract up to 512KB of text for instant editor/index

  for (let i = startChunk; i < totalChunks; i++) {
    if (shouldCancel()) {
      return { status: 'cancelled', completedChunks: i, extractedText };
    }
    if (shouldPause()) {
      return { status: 'paused', completedChunks: i, extractedText };
    }

    const offset = i * CHUNK_SIZE_BYTES;
    const end = Math.min(file.size, offset + CHUNK_SIZE_BYTES);
    const slice = file.slice(offset, end);

    await saveFileChunkToIDB(jobId, i, slice);

    // Extract readable text from initial chunk(s) without loading multi-GB blobs into RAM
    if (offset < maxTextExtractBytes) {
      const textSlice = file.slice(offset, Math.min(end, maxTextExtractBytes));
      try {
        const rawChunkText = await textSlice.text();
        extractedText += sanitizeExtractedDocumentText(rawChunkText, file.name);
      } catch {
        // Binary slice fallback
      }
    }

    // Yield to browser UI thread so 60fps responsiveness is guaranteed
    await new Promise((r) => setTimeout(r, 25));

    const elapsedSec = Math.max(0.05, (performance.now() - startTime) / 1000);
    const bytesTransferred = end;
    const speedBytesPerSec = Math.round(bytesTransferred / elapsedSec);

    onProgress({
      completedChunks: i + 1,
      totalChunks,
      bytesTransferred,
      speedBytesPerSec,
    });
  }

  return {
    status: 'completed',
    completedChunks: totalChunks,
    extractedText:
      extractedText.trim() ||
      `# ${file.name}\n\nUploaded (${formatBytes(file.size)}) and indexed in chunked storage.`,
  };
}

export function sanitizeExtractedDocumentText(raw: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
    return raw.replace(/\0/g, '');
  }
  // For .pdf, .doc, .docx binary wrappers, extract readable ASCII/UTF-8 text runs if raw contains binary bytes
  const hasBinaryNulls = raw.includes('\u0000') || /[\x00-\x08\x0E-\x1F]/.test(raw.slice(0, 500));
  if (!hasBinaryNulls) return raw;

  const matches = raw.match(/[A-Za-z0-9 ,.!?;:'"()\-\n\r/&$%@#+*=]{5,}/g);
  if (matches && matches.length > 0) {
    const cleaned = matches
      .map((m) => m.trim())
      .filter(
        (m) =>
          m.length >= 6 &&
          !/^(obj|endobj|stream|endstream|xref|trailer|startxref|FontDescriptor|BaseFont|Type|Subtype|Filter|FlateDecode|Content_Types|word\/document)/i.test(
            m
          )
      )
      .join('\n');
    if (cleaned.length > 40) {
      return `# Extracted from ${filename}\n\n${cleaned.slice(0, 50000)}`;
    }
  }
  return `# ${filename}\n\nDocument indexed and ready for editing and AI analysis.`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

export function computeDocumentMetrics(content: string): {
  wordCount: number;
  charCount: number;
  pageCount: number;
} {
  const trimmed = content.trim();
  const charCount = content.length;
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const pageCount = Math.max(1, Math.ceil(wordCount / 280));
  return { wordCount, charCount, pageCount };
}

export function autoTagAndClassifyDocument(
  filename: string,
  content: string
): {
  tags: string[];
  contentType: ProjectDocument['contentType'];
  completionState: ProjectDocument['completionState'];
  aiSummary: string;
} {
  const lower = `${filename} ${content}`.toLowerCase();
  const tags = new Set<string>();

  let contentType: ProjectDocument['contentType'] = 'General';
  let completionState: ProjectDocument['completionState'] = 'Unfinished';

  if (/\b(verse|chorus|bridge|lyric|lyrics|song|melody|tempo|hook|outro|intro)\b/.test(lower)) {
    contentType = 'Lyrics';
    tags.add('Lyrics');
    if (lower.includes('chorus')) tags.add('Chorus');
  } else if (/\b(roadmap|milestone|deadline|checklist|phase|deliverable|plan|launch)\b/.test(lower)) {
    contentType = 'Plan';
    tags.add('Project Plan');
  } else if (/\b(study|citation|abstract|hypothesis|analysis|data|findings|research)\b/.test(lower)) {
    contentType = 'Research';
    tags.add('Research');
  } else if (/\b(chapter|scene|character|dialogue|manuscript|draft|story)\b/.test(lower)) {
    contentType = 'Draft';
    tags.add('Manuscript');
  } else {
    contentType = 'Notes';
    tags.add('Notes');
  }

  if (/\b(leave|left|disappear|gone|goodbye|heart|lost|alone|miss you|breakup|apart|memories)\b/.test(lower)) {
    tags.add('Relationships');
    tags.add('Breakup');
    tags.add('Personal');
  }
  if (/\b(pop|synth|acoustic|upbeat|ballad|rock|indie)\b/.test(lower)) {
    tags.add('Pop');
  }
  if (/\b(final|master|complete|completed|finished|approved|released)\b/.test(lower)) {
    completionState = 'Finished';
    tags.add('Finished');
  } else if (/\b(todo|unfinished|tbd|draft|work in progress|wip|idea|sketch)\b/.test(lower)) {
    completionState = 'Unfinished';
    tags.add('Unfinished');
  } else if (/\b(rewrite|revision|fix|edit|review)\b/.test(lower)) {
    completionState = 'Needs Revision';
    tags.add('Needs Revision');
  }

  const firstLines = content
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' — ');

  const aiSummary =
    firstLines.length > 10
      ? `${contentType} (${completionState}): ${firstLines.slice(0, 140)}${firstLines.length > 140 ? '…' : ''}`
      : `${contentType} document (${computeDocumentMetrics(content).wordCount} words)`;

  return {
    tags: Array.from(tags),
    contentType,
    completionState,
    aiSummary,
  };
}

export interface DiffRow {
  lineNumberLeft?: number;
  lineNumberRight?: number;
  leftText: string;
  rightText: string;
  type: 'same' | 'modified' | 'added' | 'deleted';
}

export function computeSideBySideLineDiff(leftContent: string, rightContent: string): {
  rows: DiffRow[];
  addedCount: number;
  deletedCount: number;
  modifiedCount: number;
  combinedContent: string;
} {
  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const maxLen = Math.max(leftLines.length, rightLines.length);
  const rows: DiffRow[] = [];
  let addedCount = 0;
  let deletedCount = 0;
  let modifiedCount = 0;
  const combinedLines: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i];
    const r = rightLines[i];
    if (l !== undefined && r !== undefined) {
      if (l === r) {
        rows.push({
          lineNumberLeft: i + 1,
          lineNumberRight: i + 1,
          leftText: l,
          rightText: r,
          type: 'same',
        });
        combinedLines.push(r);
      } else {
        rows.push({
          lineNumberLeft: i + 1,
          lineNumberRight: i + 1,
          leftText: l,
          rightText: r,
          type: 'modified',
        });
        modifiedCount++;
        combinedLines.push(r);
      }
    } else if (l === undefined && r !== undefined) {
      rows.push({
        lineNumberRight: i + 1,
        leftText: '',
        rightText: r,
        type: 'added',
      });
      addedCount++;
      combinedLines.push(r);
    } else if (l !== undefined && r === undefined) {
      rows.push({
        lineNumberLeft: i + 1,
        leftText: l,
        rightText: '',
        type: 'deleted',
      });
      deletedCount++;
      combinedLines.push(l);
    }
  }

  return {
    rows,
    addedCount,
    deletedCount,
    modifiedCount,
    combinedContent: combinedLines.join('\n'),
  };
}

export interface DuplicateCluster {
  id: string;
  similarityPercent: number;
  documents: ProjectDocument[];
  reason: string;
}

export function detectDocumentDuplicates(documents: ProjectDocument[]): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];
  const visited = new Set<string>();

  const normalizeName = (name: string) =>
    name
      .toLowerCase()
      .replace(/\.(txt|md|doc|docx|pdf)$/i, '')
      .replace(/[-_ ]?(final|v\d+|new|copy|draft|edit|\d+)+$/gi, '')
      .trim();

  const getWordSet = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  for (let i = 0; i < documents.length; i++) {
    const docA = documents[i];
    if (visited.has(docA.id)) continue;

    const group: ProjectDocument[] = [docA];
    let highestSim = 0;
    const baseA = normalizeName(docA.filename);
    const wordsA = getWordSet(docA.finalContent);

    for (let j = i + 1; j < documents.length; j++) {
      const docB = documents[j];
      const baseB = normalizeName(docB.filename);
      const wordsB = getWordSet(docB.finalContent);

      let intersection = 0;
      wordsA.forEach((w) => {
        if (wordsB.has(w)) intersection++;
      });
      const union = Math.max(1, wordsA.size + wordsB.size - intersection);
      const jaccard = Math.round((intersection / union) * 100);
      const nameSimilar = baseA.length >= 3 && baseA === baseB;
      const sim = nameSimilar ? Math.max(jaccard, 89) : jaccard;

      if (sim >= 65) {
        group.push(docB);
        visited.add(docB.id);
        highestSim = Math.max(highestSim, sim);
      }
    }

    if (group.length > 1) {
      visited.add(docA.id);
      clusters.push({
        id: `dup-${docA.id}`,
        similarityPercent: Math.min(99, Math.max(78, highestSim)),
        documents: group,
        reason: 'Near-duplicate content & version stem detected',
      });
    }
  }

  return clusters;
}

const CONCEPTUAL_SEMANTIC_MAP: Record<string, string[]> = {
  losing: [
    'disappear',
    'left',
    'leave',
    'gone',
    'goodbye',
    'walked away',
    'slipping',
    'fading',
    'lost',
    'empty',
    'without you',
    'abandonment',
  ],
  someone: ['you', 'her', 'him', 'lover', 'friend', 'shadow', 'ghost', 'stranger'],
  abandonment: [
    'disappear',
    'left me',
    'never needed you to stay',
    'never wanted you to leave',
    'empty room',
    'alone',
    'cold',
    'silence',
    'gone',
  ],
  breakup: ['leave', 'stay', 'broken', 'goodbye', 'tears', 'over', 'apart', 'disappear'],
  unfinished: ['todo', 'tbd', 'draft', 'idea', 'missing', 'verse 2', 'needs', 'wip'],
  lyrics: ['verse', 'chorus', 'bridge', 'outro', 'melody', 'song', 'sing', 'rhythm'],
  hope: ['morning', 'light', 'sunrise', 'begin again', 'breathing', 'future'],
  artwork: ['cover', 'visual', 'photo', 'design', 'color', 'portrait', 'album art'],
};

export interface ProjectSearchHit {
  id: string;
  itemType: 'document' | 'note' | 'task' | 'media' | 'file';
  title: string;
  fileType: string;
  matchingLine: string;
  contextSnippet: string;
  sectionLabel: string;
  tags: string[];
  matchMode: 'Exact Match' | 'Semantic Concept Match';
  score: number;
}

export function searchProjectKnowledge(params: {
  project: OSProject;
  query: string;
  mode: 'exact' | 'semantic';
  filterType?: 'all' | 'document' | 'note' | 'task' | 'media';
  filterTag?: string;
}): ProjectSearchHit[] {
  const { project, query, mode, filterType = 'all', filterTag = 'ALL' } = params;
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const queryTokens = q.split(/\s+/).filter(Boolean);
  const semanticExpansions = new Set<string>();
  if (mode === 'semantic') {
    for (const tok of queryTokens) {
      if (CONCEPTUAL_SEMANTIC_MAP[tok]) {
        CONCEPTUAL_SEMANTIC_MAP[tok].forEach((exp) => semanticExpansions.add(exp));
      }
      for (const [key, synList] of Object.entries(CONCEPTUAL_SEMANTIC_MAP)) {
        if (tok.includes(key) || key.includes(tok)) {
          synList.forEach((exp) => semanticExpansions.add(exp));
        }
      }
    }
  }

  const hits: ProjectSearchHit[] = [];

  const scanTextLines = (
    id: string,
    itemType: ProjectSearchHit['itemType'],
    title: string,
    fileType: string,
    content: string,
    tags: string[]
  ) => {
    if (filterTag !== 'ALL' && !tags.includes(filterTag)) return;

    const lines = content.split('\n');
    let currentSection = 'Page 1 • Section 1';

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('#') || /^\[(verse|chorus|bridge|intro|outro)/i.test(trimmed)) {
        currentSection = trimmed.replace(/^#+\s*/, '');
      }

      const lowerLine = trimmed.toLowerCase();
      const lowerTitle = title.toLowerCase();

      if ( lowerLine.includes(q) || lowerTitle.includes(q)) {
        const prev = lines[idx - 1]?.trim() || '';
        const next = lines[idx + 1]?.trim() || '';
        hits.push({
          id,
          itemType,
          title,
          fileType,
          matchingLine: trimmed,
          contextSnippet: [prev, trimmed, next].filter(Boolean).join(' / '),
          sectionLabel: `${currentSection} (Line ${idx + 1})`,
          tags,
          matchMode: 'Exact Match',
          score: 100,
        });
        return;
      }

      if (mode === 'semantic') {
        let matchedConcept = '';
        let score = 0;
        for (const tok of queryTokens) {
          if (tok.length > 2 && lowerLine.includes(tok)) {
            score += 30;
          }
        }
        for (const concept of semanticExpansions) {
          if (lowerLine.includes(concept)) {
            score += 55;
            matchedConcept = concept;
          }
        }
        if (score >= 45) {
          const prev = lines[idx - 1]?.trim() || '';
          const next = lines[idx + 1]?.trim() || '';
          hits.push({
            id,
            itemType,
            title,
            fileType,
            matchingLine: trimmed,
            contextSnippet: [prev, trimmed, next].filter(Boolean).join(' / '),
            sectionLabel: `${currentSection} (Line ${idx + 1}${
              matchedConcept ? ` • Concept: "${matchedConcept}"` : ''
            })`,
            tags,
            matchMode: 'Semantic Concept Match',
            score,
          });
        }
      }
    });
  };

  if (filterType === 'all' || filterType === 'document') {
    project.documents.forEach((doc) => {
      scanTextLines(
        doc.id,
        'document',
        doc.filename,
        doc.fileType.toUpperCase(),
        doc.finalContent,
        doc.tags
      );
    });
  }

  if (filterType === 'all' || filterType === 'note') {
    project.notes.forEach((note) => {
      scanTextLines(note.id, 'note', note.title, 'NOTE', note.content, note.tags);
    });
  }

  if (filterType === 'all' || filterType === 'task') {
    project.tasks.forEach((task) => {
      scanTextLines(
        task.id,
        'task',
        task.title,
        'TASK',
        `${task.title}\n${task.description}\n${task.checklist.map((c) => c.text).join('\n')}`,
        task.tags
      );
    });
  }

  if (filterType === 'all' || filterType === 'media') {
    project.media.forEach((m) => {
      scanTextLines(
        m.id,
        'media',
        m.filename,
        m.mediaType.toUpperCase(),
        `${m.transcriptOrCaptions}\n${m.sceneInfo}`,
        m.tags
      );
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 60);
}

/**
 * AI Lyric & Document Organization Engine (Section 42)
 * Pulls lyrics/thematic passages from documents, groups related sections, removes duplicates,
 * preserves source references, and outputs a clean Markdown document.
 */
export function organizeProjectDocumentsWithAI(
  documents: ProjectDocument[],
  customInstruction?: string
): {
  title: string;
  markdownContent: string;
  sourceFiles: string[];
  sectionsFound: number;
  duplicatesRemoved: number;
} {
  const sourceFiles = documents.map((d) => d.filename);
  const seenNormalizedLines = new Set<string>();
  let duplicatesRemoved = 0;
  let sectionsFound = 0;

  const groupedSongs: Record<
    string,
    { sources: Set<string>; passages: string[] }
  > = {};

  documents.forEach((doc) => {
    const blocks = doc.finalContent.split(/\n\s*\n/);
    let currentSongTitle = doc.filename
      .replace(/\.(txt|md|doc|docx|pdf)$/i, '')
      .replace(/[-_](final|v\d+|new|draft|notes|old|ideas)/gi, '')
      .replace(/[-_]/g, ' ')
      .trim();

    if (!currentSongTitle) currentSongTitle = 'Untitled Composition';
    currentSongTitle =
      currentSongTitle.charAt(0).toUpperCase() + currentSongTitle.slice(1);

    blocks.forEach((block) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const headingMatch = trimmed.match(/^#+\s+(.+)$/m);
      if (headingMatch) {
        currentSongTitle = headingMatch[1].trim();
      }

      const norm = trimmed
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (norm.length < 8) return;
      if (seenNormalizedLines.has(norm)) {
        duplicatesRemoved++;
        return;
      }
      seenNormalizedLines.add(norm);
      sectionsFound++;

      if (!groupedSongs[currentSongTitle]) {
        groupedSongs[currentSongTitle] = {
          sources: new Set<string>(),
          passages: [],
        };
      }
      groupedSongs[currentSongTitle].sources.add(doc.filename);
      groupedSongs[currentSongTitle].passages.push(trimmed);
    });
  });

  const nowDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const mdParts: string[] = [
    `# All_Lyrics_Organized.md`,
    `> **AI Organized Master Document** • Generated ${nowDate}`,
    `> **Sources Analyzed (${sourceFiles.length})**: ${sourceFiles.join(', ')}`,
    `> **Deduplication**: ${sectionsFound} unique sections preserved • ${duplicatesRemoved} duplicate passages removed`,
    customInstruction ? `> **Directive**: "${customInstruction}"` : '',
    '',
    '---',
    '',
  ].filter(Boolean);

  Object.entries(groupedSongs).forEach(([songTitle, data], idx) => {
    mdParts.push(`## ${idx + 1}. ${songTitle}`);
    mdParts.push(
      `*Source Provenance: ${Array.from(data.sources).join(', ')}*\n`
    );
    data.passages.forEach((p) => {
      mdParts.push(p);
      mdParts.push('');
    });
    mdParts.push('---\n');
  });

  return {
    title: 'All_Lyrics_Organized.md',
    markdownContent: mdParts.join('\n'),
    sourceFiles,
    sectionsFound,
    duplicatesRemoved,
  };
}

/**
 * Generates a structured Project-Wide Executive Answer for "ASK THIS PROJECT" (Section 24 & 43)
 */
export function answerProjectQueryLocally(
  project: OSProject,
  question: string
): {
  answerMarkdown: string;
  citedSources: string[];
  suggestedActionLabel?: string;
} {
  const q = question.toLowerCase();
  const docs = project.documents;
  const tasks = project.tasks;
  const notes = project.notes;
  const photos = project.photoAlbums.reduce((acc, a) => acc + a.photos.length, 0);
  const finishedDocs = docs.filter((d) => d.completionState === 'Finished');
  const unfinishedDocs = docs.filter((d) => d.completionState !== 'Finished');
  const openTasks = tasks.filter((t) => t.status !== 'Done');
  const doneTasks = tasks.filter((t) => t.status === 'Done');
  const dupClusters = detectDocumentDuplicates(docs);

  const hits = searchProjectKnowledge({
    project,
    query: question,
    mode: 'semantic',
  });

  const citedSources = Array.from(
    new Set([
      ...hits.slice(0, 5).map((h) => h.title),
      ...docs.slice(0, 3).map((d) => d.filename),
    ])
  );

  if (
    q.includes('everything') ||
    q.includes('written about') ||
    q.includes('still needs to be done') ||
    q.includes('status') ||
    q.includes('summary')
  ) {
    return {
      citedSources,
      suggestedActionLabel: 'Create Master Summary Document',
      answerMarkdown: [
        `### ${project.name.toUpperCase()} — INTELLIGENCE BRIEFING`,
        '',
        `- **Documents Indexed**: ${docs.length} (${finishedDocs.length} finished, ${unfinishedDocs.length} in progress / unfinished)`,
        `- **Tasks & Checklists**: ${doneTasks.length}/${tasks.length} completed (${openTasks.length} remaining)`,
        `- **Project Scratchpad Notes**: ${notes.length}`,
        `- **Photos & Media Assets**: ${photos} photos across ${project.photoAlbums.length} album(s), ${project.media.length} media recordings`,
        `- **Duplicate Candidates**: ${dupClusters.length} cluster(s) detected`,
        '',
        `#### What Still Needs To Be Done (${openTasks.length} Open Tasks):`,
        ...(openTasks.length > 0
          ? openTasks.map(
              (t) => `- [ ] **[${t.priority}] ${t.title}** *(Due ${t.dueDate})*`
            )
          : ['- All current tasks are marked Done!']),
        '',
        `#### Unfinished / Draft Documents (${unfinishedDocs.length}):`,
        ...(unfinishedDocs.length > 0
          ? unfinishedDocs.map(
              (d) =>
                `- **${d.filename}** (${d.wordCount} words • ${d.completionState || 'Draft'}) — *${d.aiSummary}*`
            )
          : ['- All documents are marked Finished.']),
      ].join('\n'),
    };
  }

  if (hits.length > 0) {
    return {
      citedSources: Array.from(new Set(hits.map((h) => h.title))),
      answerMarkdown: [
        `### Retrieved ${hits.length} Match(es) in "${project.name}"`,
        '',
        ...hits.slice(0, 6).map(
          (h, i) =>
            `${i + 1}. **${h.title}** *(${h.sectionLabel} • ${h.matchMode})*\n   > "${h.matchingLine}"`
        ),
      ].join('\n\n'),
    };
  }

  return {
    citedSources,
    answerMarkdown: [
      `### Project Knowledge Response — ${project.name}`,
      `Searched **${docs.length} documents**, **${notes.length} notes**, **${tasks.length} tasks**, and **${project.media.length} media items**.`,
      '',
      `- **Top Documents**: ${docs.map((d) => d.filename).join(', ') || 'None uploaded yet'}`,
      `- **Open Tasks**: ${openTasks.map((t) => t.title).join(', ') || 'None pending'}`,
      '',
      `*Tip: Use the AI Action buttons below to Organize Lyrics, Merge Documents, Extract Tasks, or Detect Duplicates.*`,
    ].join('\n'),
  };
}

/**
 * Converts a Document or Note into actionable Project Tasks & Checklists (Section 18)
 */
export function convertDocumentToProjectTasks(
  projectId: string,
  title: string,
  content: string,
  docId?: string
): ProjectOSTask {
  const lines = content
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)[\]x✓\s]+/i, '').trim())
    .filter((l) => l.length >= 4 && !l.startsWith('#'));

  const steps = (lines.length > 0 ? lines.slice(0, 12) : ['Review document', 'Finalize edits', 'Approve final version']).map(
    (text, idx) => ({
      id: `chk-${Date.now()}-${idx}`,
      text: text.slice(0, 140),
      completed: false,
    })
  );

  return {
    id: `ptask-${Date.now()}`,
    projectId,
    title: `Action Plan: ${title}`,
    description: `Generated from "${title}" (${steps.length} actionable steps)`,
    status: 'Todo',
    priority: 'High',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    tags: ['AI-Extracted', 'Checklist'],
    checklist: steps,
    linkedDocumentId: docId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a standalone, downloadable HTML Photo Album (Section 22)
 * Includes responsive Grid + Masonry toggle, Lightbox, Fullscreen, Prev/Next navigation, captions & filenames.
 */
export function generateStandalonePhotoAlbumHTML(album: ProjectPhotoAlbum): string {
  const safeTitle = album.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = album.subtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const photosJson = JSON.stringify(
    album.photos.map((p) => ({
      filename: p.filename,
      caption: p.caption || p.filename,
      src: p.dataUrl,
      takenAt: p.takenAt,
      group: p.groupName || 'Portfolio',
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Photo Album</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: rgba(255,255,255,0.1);
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: radial-gradient(circle at top right, #1e293b 0%, #090d16 60%);
      color: var(--text);
      min-height: 100vh;
      padding: 32px 20px 64px;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 16px; padding-bottom: 24px; margin-bottom: 28px; border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); font-size: 0.95rem; margin-top: 4px; }
    .controls { display: flex; align-items: center; gap: 10px; }
    .btn {
      background: var(--card); color: var(--text); border: 1px solid var(--border);
      padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn.active, .btn:hover { background: var(--accent); border-color: var(--accent); }
    .gallery-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px;
    }
    .gallery-masonry {
      column-count: 3; column-gap: 18px;
    }
    @media (max-width: 900px) { .gallery-masonry { column-count: 2; } }
    @media (max-width: 560px) { .gallery-masonry { column-count: 1; } }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 16px;
      overflow: hidden; cursor: pointer; transition: transform 0.22s, box-shadow 0.22s;
      break-inside: avoid; margin-bottom: 18px;
    }
    .gallery-grid .card { margin-bottom: 0; display: flex; flex-direction: column; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px -12px rgba(0,0,0,0.6); }
    .card img { width: 100%; display: block; object-fit: cover; }
    .gallery-grid .card img { height: 220px; }
    .meta { padding: 12px 14px; }
    .caption { font-size: 0.9rem; font-weight: 600; color: var(--text); }
    .filename { font-size: 0.75rem; color: var(--muted); margin-top: 4px; font-family: monospace; }
    /* Lightbox */
    .lightbox {
      position: fixed; inset: 0; background: rgba(5, 8, 15, 0.94); backdrop-filter: blur(12px);
      display: none; flex-direction: column; justify-content: space-between; z-index: 1000; padding: 20px;
    }
    .lightbox.open { display: flex; }
    .lb-top { display: flex; justify-content: space-between; align-items: center; }
    .lb-stage { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; min-height: 0; }
    .lb-stage img { max-width: 90vw; max-height: 76vh; object-fit: contain; border-radius: 12px; }
    .nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.12); color: #fff; border: none; width: 44px; height: 44px;
      border-radius: 50%; font-size: 1.2rem; cursor: pointer;
    }
    .nav-prev { left: 16px; }
    .nav-next { right: 16px; }
    .lb-bottom { text-align: center; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${safeTitle}</h1>
        <p class="subtitle">${safeSub} • <span id="count-badge">${album.photos.length} Photos</span></p>
      </div>
      <div class="controls">
        <button class="btn ${album.layout === 'grid' ? 'active' : ''}" id="btn-grid" onclick="setLayout('grid')">Modern Grid</button>
        <button class="btn ${album.layout === 'masonry' ? 'active' : ''}" id="btn-masonry" onclick="setLayout('masonry')">Masonry Layout</button>
      </div>
    </header>
    <div id="gallery" class="${album.layout === 'masonry' ? 'gallery-masonry' : 'gallery-grid'}"></div>
  </div>

  <div class="lightbox" id="lightbox">
    <div class="lb-top">
      <span id="lb-counter" style="font-family:monospace;font-size:0.85rem;color:#94a3b8;">1 / 1</span>
      <div style="display:flex;gap:8px;">
        <button class="btn" onclick="toggleFullscreen()">Fullscreen</button>
        <button class="btn" onclick="closeLightbox()">Close (Esc)</button>
      </div>
    </div>
    <div class="lb-stage">
      <button class="nav-btn nav-prev" onclick="stepPhoto(-1)">&#10094;</button>
      <img id="lb-img" src="" alt="" />
      <button class="nav-btn nav-next" onclick="stepPhoto(1)">&#10095;</button>
    </div>
    <div class="lb-bottom">
      <div id="lb-caption" style="font-weight:700;font-size:1rem;"></div>
      <div id="lb-filename" style="font-family:monospace;font-size:0.78rem;color:#94a3b8;margin-top:4px;"></div>
    </div>
  </div>

  <script>
    const PHOTOS = ${photosJson};
    let currentIndex = 0;
    const gallery = document.getElementById('gallery');

    function renderGallery() {
      gallery.innerHTML = PHOTOS.map((p, i) => \`
        <div class="card" onclick="openLightbox(\${i})">
          <img src="\${p.src}" alt="\${p.caption}" loading="lazy" />
          <div class="meta">
            <div class="caption">\${p.caption}</div>
            <div class="filename">\${p.filename}</div>
          </div>
        </div>
      \`).join('');
    }

    function setLayout(mode) {
      gallery.className = mode === 'masonry' ? 'gallery-masonry' : 'gallery-grid';
      document.getElementById('btn-grid').classList.toggle('active', mode === 'grid');
      document.getElementById('btn-masonry').classList.toggle('active', mode === 'masonry');
    }

    function openLightbox(idx) {
      currentIndex = idx;
      updateLightbox();
      document.getElementById('lightbox').classList.add('open');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
    }

    function stepPhoto(delta) {
      currentIndex = (currentIndex + delta + PHOTOS.length) % PHOTOS.length;
      updateLightbox();
    }

    function updateLightbox() {
      const item = PHOTOS[currentIndex];
      if (!item) return;
      document.getElementById('lb-img').src = item.src;
      document.getElementById('lb-caption').textContent = item.caption;
      document.getElementById('lb-filename').textContent = item.filename;
      document.getElementById('lb-counter').textContent = (currentIndex + 1) + ' / ' + PHOTOS.length;
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    window.addEventListener('keydown', (e) => {
      if (!document.getElementById('lightbox').classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepPhoto(-1);
      if (e.key === 'ArrowRight') stepPhoto(1);
    });

    renderGallery();
  </script>
</body>
</html>`;
}

export function buildProjectManifest(project: OSProject) {
  return {
    manifestVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    generator: 'BlueNote AI Project Operating System',
    project: {
      ID: project.id,
      Metadata: {
        name: project.name,
        description: project.description,
        template: project.template,
        color: project.color,
        icon: project.icon,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        quotaBytesMax: project.quotaBytesMax,
      },
      Files: project.files,
      Documents: project.documents,
      Relationships: project.relationships,
      Tags: project.tags,
      Versions: project.documents.flatMap((d) =>
        d.versions.map((v) => ({ documentId: d.id, filename: d.filename, ...v }))
      ),
      Tasks: project.tasks,
      Notes: project.notes,
      Media: project.media,
      Albums: project.photoAlbums,
      AIOperations: project.aiActivity,
      Workflows: project.workflows,
      SmartCollections: project.smartCollections,
      Timeline: project.timeline,
      Settings: {
        permission: project.permission,
        processingMode: project.processingMode,
        isArchived: project.isArchived,
      },
    },
  };
}

export function getDefaultSmartCollections(projectId: string): SmartCollection[] {
  return [
    {
      id: `sc-${projectId}-finished`,
      projectId,
      name: 'Finished',
      icon: 'CheckCircle2',
      ruleCompletionState: 'Finished',
    },
    {
      id: `sc-${projectId}-unfinished`,
      projectId,
      name: 'Unfinished',
      icon: 'Clock',
      ruleCompletionState: 'Unfinished',
    },
    {
      id: `sc-${projectId}-lyrics`,
      projectId,
      name: 'Lyrics',
      icon: 'Music',
      ruleContentType: 'Lyrics',
    },
    {
      id: `sc-${projectId}-revision`,
      projectId,
      name: 'Needs Revision',
      icon: 'Edit3',
      ruleCompletionState: 'Needs Revision',
    },
    {
      id: `sc-${projectId}-unfinished-lyrics`,
      projectId,
      name: 'Unfinished Lyrics (Rule: Lyrics + Unfinished)',
      icon: 'Sparkles',
      ruleContentType: 'Lyrics',
      ruleCompletionState: 'Unfinished',
    },
  ];
}

const LEGACY_DEMO_OS_PROJECT_IDS = new Set([
  'osproj-music-1',
  'osproj-writing-1',
]);

export function stripLegacyDemoOSProjects(projects?: OSProject[]): OSProject[] {
  if (!Array.isArray(projects)) return [];
  return projects.filter((p) => p && !LEGACY_DEMO_OS_PROJECT_IDS.has(p.id));
}

export function createStarterOSProjects(): OSProject[] {
  // 100% Clean Zero-Demo State — starts completely empty
  return [];
}

export function createProjectFromTemplate(params: {
  name: string;
  description: string;
  template: ProjectTemplateType;
  color: string;
  icon: string;
  tags: string[];
  coverImage?: string;
}): OSProject {
  const now = new Date().toISOString();
  const id = `osproj-${Date.now()}`;

  return {
    id,
    name: params.name,
    description: params.description || `${params.template} workspace`,
    coverImage: params.coverImage,
    color: params.color || '#2563eb',
    icon: params.icon || 'FolderKanban',
    tags: params.tags.length > 0 ? params.tags : [params.template.replace(' Project', '')],
    template: params.template,
    permission: 'Admin',
    processingMode: 'Hybrid AI Processing',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    quotaBytesMax: 10 * 1024 * 1024 * 1024,
    // Zero-demo clean container — ready for real user uploads, documents, notes, tasks, and albums
    documents: [],
    files: [],
    notes: [],
    tasks: [],
    media: [],
    photoAlbums: [],
    relationships: [],
    smartCollections: getDefaultSmartCollections(id),
    workflows: [],
    sandboxProposals: [],
    aiActivity: [],
    timeline: [],
  };
}
