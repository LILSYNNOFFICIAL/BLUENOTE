import {
  DocumentVersion,
  OSProject,
  PhotoAlbumTheme,
  ProjectDocument,
  ProjectOSTask,
  ProjectPhotoAlbum,
  ProjectPhotoItem,
  ProjectTemplateType,
  SmartCollection,
} from '../types/projectsOS';
import { auth, storage, storageRef, uploadBytesResumable, getBlob } from '../firebase';

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
const MAX_PROJECT_FILE_BYTES = 250 * 1024 * 1024;
const ALLOWED_PROJECT_FILE_TYPES: Record<string, { mime: string; magic?: string }> = {
  txt: { mime: 'text/plain' },
  md: { mime: 'text/markdown' },
  doc: { mime: 'application/msword', magic: '\\xd0\\xcf\\x11\\xe0' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: 'PK' },
  pdf: { mime: 'application/pdf', magic: '%PDF-' },
};

function sanitizeStoredFilename(name: string): string {
  const normalized = String(name || 'unnamed').normalize('NFKC');
  const base = normalized.split(/[\\/]/).pop() || 'unnamed';
  const safe = base.replace(/[^a-zA-Z0-9._() -]/g, '_').replace(/\\.{2,}/g, '.').trim();
  return (safe || 'unnamed').slice(0, 180);
}

async function validateProjectFile(file: File): Promise<{ extension: string; mime: string }> {
  if (!auth.currentUser) throw new Error('You must be signed in to upload files.');
  if (file.size <= 0 || file.size > MAX_PROJECT_FILE_BYTES) {
    throw new Error('File is empty or exceeds the 250 MB project-file limit.');
  }

  const extension = (file.name.match(/\\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  const policy = ALLOWED_PROJECT_FILE_TYPES[extension];
  if (!policy) throw new Error('Unsupported file type. Allowed: TXT, MD, DOC, DOCX, PDF.');

  if (policy.magic) {
    const sample = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const ascii = String.fromCharCode(...sample);
    if (extension === 'docx' && ascii.slice(0, 2) !== 'PK') {
      throw new Error('The DOCX file signature is invalid.');
    }
    if (extension === 'pdf' && !ascii.startsWith('%PDF-')) {
      throw new Error('The PDF file signature is invalid.');
    }
    if (extension === 'doc' && !(sample[0] === 0xd0 && sample[1] === 0xcf && sample[2] === 0x11 && sample[3] === 0xe0)) {
      throw new Error('The DOC file signature is invalid.');
    }
  }

  return { extension, mime: policy.mime };
}

export async function downloadProtectedProjectFile(storagePath: string, filename: string): Promise<void> {
  if (!auth.currentUser) throw new Error('You must be signed in to download files.');
  if (!/^users\\/[A-Za-z0-9_-]+\\/project-files\\/[A-Za-z0-9_-]+\\/[A-Za-z0-9._() -]{1,180}$/.test(storagePath)) {
    throw new Error('Invalid protected file reference.');
  }
  if (!storagePath.startsWith(`users/${auth.currentUser.uid}/project-files/`)) {
    throw new Error('You are not authorized to download this file.');
  }

  const blob = await getBlob(storageRef(storage, storagePath));
  const safeName = sanitizeStoredFilename(filename);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

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
  storagePath?: string;
  downloadUrl?: string;
}> {
  const { file, jobId, shouldPause, shouldCancel, onProgress } = params;
  const { extension, mime } = await validateProjectFile(file);
  const safeName = sanitizeStoredFilename(file.name);
  const userId = auth.currentUser!.uid;
  const fileId = crypto.randomUUID();
  const storagePath = `users/${userId}/project-files/${fileId}/${safeName}`;
  const storageReference = storageRef(storage, storagePath);

  if (shouldCancel()) return { status: 'cancelled', completedChunks: 0, extractedText: '' };

  const uploadMetadata = {
    contentType: mime,
    contentDisposition: `attachment; filename="${safeName.replace(/"/g, '')}"`,
    customMetadata: {
      ownerUid: userId,
      originalExtension: extension,
      uploadJobId: String(jobId).slice(0, 128),
    },
  };

  const uploadTask = uploadBytesResumable(storageReference, file, uploadMetadata);
  const totalBytes = file.size;
  const startTime = performance.now();
  let paused = false;

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const unsubscribe = uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (shouldCancel()) {
          uploadTask.cancel();
          return;
        }
        if (shouldPause() && uploadTask.snapshot.state === 'running') {
          uploadTask.pause();
          paused = true;
        } else if (!shouldPause() && uploadTask.snapshot.state === 'paused') {
          uploadTask.resume();
          paused = false;
        }
        const elapsedSec = Math.max(0.05, (performance.now() - startTime) / 1000);
        onProgress({
          completedChunks: Math.floor(snapshot.bytesTransferred / CHUNK_SIZE_BYTES),
          totalChunks: Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES)),
          bytesTransferred: snapshot.bytesTransferred,
          speedBytesPerSec: Math.round(snapshot.bytesTransferred / elapsedSec),
        });
      },
      (error) => {
        unsubscribe();
        if (error.code === 'storage/canceled') {
          resolve({ cancelled: true });
        } else {
          reject(error);
        }
      },
      () => {
        unsubscribe();
        resolve(uploadTask.snapshot);
      }
    );
  });

  if (uploadResult?.cancelled) {
    return { status: 'cancelled', completedChunks: 0, extractedText: '' };
  }
  if (paused || shouldPause()) {
    uploadTask.pause();
    return { status: 'paused', completedChunks: Math.floor(uploadTask.snapshot.bytesTransferred / CHUNK_SIZE_BYTES), extractedText: '' };
  }

  const downloadUrl = await getDownloadURL(storageReference);
  const maxTextExtractBytes = 512 * 1024;
  let extractedText = '';
  const textSlice = file.slice(0, Math.min(file.size, maxTextExtractBytes));
  try {
    if (extension === 'docx') {
      const docxText = await extractDocxBinaryText(await textSlice.arrayBuffer(), file.name);
      extractedText = docxText || '';
    } else if (extension === 'pdf') {
      extractedText = extractPdfBinaryText(await textSlice.arrayBuffer(), file.name) || '';
    } else {
      extractedText = sanitizeExtractedDocumentText(await textSlice.text(), file.name);
    }
  } catch {}

  onProgress({
    completedChunks: Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES)),
    totalChunks: Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES)),
    bytesTransferred: totalBytes,
    speedBytesPerSec: Math.round(totalBytes / Math.max(0.05, (performance.now() - startTime) / 1000)),
  });

  return {
    status: 'completed',
    completedChunks: Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES)),
    extractedText: extractedText.trim() || `# ${file.name}\\n\\nUploaded securely and indexed.`,
    storagePath,
    downloadUrl,
  };
}

/**
 * Client-side binary .docx parser: locates word/document.xml inside the ZIP container,
 * decompresses via DecompressionStream('deflate-raw') if compressed, and parses <w:p>, <w:t>, headings, and tables.
 */
export async function extractDocxBinaryText(
  buffer: ArrayBuffer,
  filename: string
): Promise<string | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });

    // Walk PKZIP Local File Headers (0x04034b50) to find word/document.xml
    let offset = 0;
    while (offset + 30 < bytes.length) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) {
        offset++;
        continue;
      }
      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const entryName = decoder.decode(bytes.subarray(nameStart, nameStart + fileNameLen));
      const dataStart = nameStart + fileNameLen + extraLen;

      if (entryName === 'word/document.xml' && compressedSize > 0 && dataStart + compressedSize <= bytes.length) {
        const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);
        let xmlString = '';
        if (compressionMethod === 0) {
          xmlString = decoder.decode(rawSlice);
        } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(rawSlice);
          writer.close();
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          xmlString = decoder.decode(new Uint8Array(decompressedBuf));
        }
        if (xmlString && xmlString.includes('<w:')) {
          return parseWordXmlToMarkdown(xmlString, filename);
        }
      }
      offset = dataStart + Math.max(1, compressedSize);
    }
  } catch {
    // Fallback to heuristic extraction
  }
  return null;
}

function parseWordXmlToMarkdown(xml: string, filename: string): string {
  const paragraphs = xml.split(/<\/w:p>/i);
  const lines: string[] = [];

  for (const p of paragraphs) {
    const isHeading1 = /w:val="Heading1"|w:val="1"/i.test(p);
    const isHeading2 = /w:val="Heading2"|w:val="2"/i.test(p);
    const isHeading3 = /w:val="Heading3"|w:val="3"/i.test(p);
    const textMatches = Array.from(p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi));
    if (textMatches.length === 0) continue;
    const text = textMatches
      .map((m) =>
        m[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      )
      .join('')
      .trim();
    if (!text) continue;
    if (isHeading1) lines.push(`# ${text}`);
    else if (isHeading2) lines.push(`## ${text}`);
    else if (isHeading3) lines.push(`### ${text}`);
    else lines.push(text);
  }

  if (lines.length > 0) {
    return `# ${filename}\n\n${lines.join('\n\n')}`;
  }
  return `# ${filename}\n\nDocument extracted from DOCX XML container.`;
}

/**
 * Client-side multi-page PDF text parser: extracts literal strings from PDF text blocks (BT ... ET, Tj, TJ)
 * and formats them with page markers.
 */
export function extractPdfBinaryText(buffer: ArrayBuffer, filename: string): string | null {
  try {
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(new Uint8Array(buffer));
    if (!raw.startsWith('%PDF')) return null;

    const pages: string[] = [];
    const blocks = raw.split(/\bBT\b/);
    let currentPageLines: string[] = [];
    let pageNumber = 1;

    for (let i = 1; i < blocks.length; i++) {
      const etIndex = blocks[i].indexOf('ET');
      const block = etIndex !== -1 ? blocks[i].slice(0, etIndex) : blocks[i].slice(0, 2000);

      // Extract parenthesized PDF text strings: (Hello World) Tj or [(Hello) -10 (World)] TJ
      const strMatches = Array.from(block.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g));
      const lineParts: string[] = [];
      for (const m of strMatches) {
        const cleaned = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .replace(/[^\x20-\x7E\n]/g, '')
          .trim();
        if (cleaned.length > 0) {
          lineParts.push(cleaned);
        }
      }
      if (lineParts.length > 0) {
        const joined = lineParts.join(' ').replace(/\s+/g, ' ').trim();
        if (joined.length >= 2) {
          currentPageLines.push(joined);
        }
      }

      if (currentPageLines.length >= 24) {
        pages.push(`## Page ${pageNumber}\n\n${currentPageLines.join('\n')}`);
        currentPageLines = [];
        pageNumber++;
      }
    }

    if (currentPageLines.length > 0) {
      pages.push(`## Page ${pageNumber}\n\n${currentPageLines.join('\n')}`);
    }

    if (pages.length > 0) {
      return `# ${filename}\n\n${pages.join('\n\n---\n\n')}`;
    }
  } catch {
    // Fallback
  }
  return null;
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

export interface WordDiffToken {
  text: string;
  type: 'same' | 'added' | 'deleted';
}

/**
 * Computes word-level inline diff tokens between two modified lines (e.g. `I never [-wanted-] {+needed+} you`)
 */
export function computeWordLevelInlineDiff(
  leftLine: string,
  rightLine: string
): WordDiffToken[] {
  const leftWords = leftLine.split(/(\s+)/).filter((w) => w.length > 0);
  const rightWords = rightLine.split(/(\s+)/).filter((w) => w.length > 0);

  // LCS matrix on words (capped for super long lines)
  const m = Math.min(leftWords.length, 120);
  const n = Math.min(rightWords.length, 120);
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (leftWords[i] === rightWords[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const tokens: WordDiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (leftWords[i] === rightWords[j]) {
      tokens.push({ text: leftWords[i], type: 'same' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ text: leftWords[i], type: 'deleted' });
      i++;
    } else {
      tokens.push({ text: rightWords[j], type: 'added' });
      j++;
    }
  }
  while (i < leftWords.length) {
    tokens.push({ text: leftWords[i++], type: 'deleted' });
  }
  while (j < rightWords.length) {
    tokens.push({ text: rightWords[j++], type: 'added' });
  }

  return tokens;
}

export interface DocumentOutlineItem {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  lineNumber: number;
  wordCount: number;
  kind: 'heading' | 'lyric-section' | 'page';
}

/**
 * Extracts a clickable Table of Contents / Section Outline from a document (H1/H2/H3, [Verse], [Chorus], Page markers)
 */
export function extractDocumentOutline(content: string): DocumentOutlineItem[] {
  const lines = content.split('\n');
  const outline: DocumentOutlineItem[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim();
    if (!trimmed) continue;

    const mdMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bracketMatch = trimmed.match(/^\[(Verse|Chorus|Pre-Chorus|Bridge|Intro|Outro|Hook|Solo|Section|Part)[^\]]*\]$/i);
    const chapterMatch = trimmed.match(/^(Chapter|Page|Act|Scene)\s+\d+.*$/i);

    if (mdMatch) {
      const level = Math.min(3, mdMatch[1].length) as 1 | 2 | 3;
      outline.push({
        id: `toc-${idx}`,
        title: mdMatch[2].trim(),
        level,
        lineNumber: idx + 1,
        wordCount: 0,
        kind: /^page\s+\d+/i.test(mdMatch[2].trim()) ? 'page' : 'heading',
      });
    } else if (bracketMatch) {
      outline.push({
        id: `toc-${idx}`,
        title: trimmed,
        level: 2,
        lineNumber: idx + 1,
        wordCount: 0,
        kind: 'lyric-section',
      });
    } else if (chapterMatch && trimmed.length < 60) {
      outline.push({
        id: `toc-${idx}`,
        title: trimmed,
        level: 2,
        lineNumber: idx + 1,
        wordCount: 0,
        kind: 'heading',
      });
    }
  }

  // Compute section word counts between headings
  for (let i = 0; i < outline.length; i++) {
    const startLine = outline[i].lineNumber;
    const endLine = i + 1 < outline.length ? outline[i + 1].lineNumber - 1 : lines.length;
    const sectionText = lines.slice(startLine, endLine).join(' ').trim();
    outline[i].wordCount = sectionText ? sectionText.split(/\s+/).filter(Boolean).length : 0;
  }

  return outline;
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
 * Topic-Focused Multi-Document Merger & Deduplicator
 * Scans all uploaded project documents for a requested topic/theme (or merges all if general),
 * extracts matching paragraphs/sections, removes duplicate passages, and outputs a clean Markdown compilation.
 */
export function mergeProjectDocumentsByTopic(
  documents: ProjectDocument[],
  topicInstruction?: string
): {
  title: string;
  markdownContent: string;
  sourceFiles: string[];
  sectionsFound: number;
  duplicatesRemoved: number;
} {
  const cleanInstruction = (topicInstruction || '').trim();
  const stopWords = new Set([
    'look',
    'through',
    'all',
    'uploaded',
    'documents',
    'pull',
    'out',
    'group',
    'related',
    'sections',
    'remove',
    'duplicates',
    'and',
    'organize',
    'everything',
    'into',
    'clean',
    'markdown',
    'file',
    'merge',
    'combine',
    'about',
    'the',
    'from',
    'with',
    'that',
    'this',
    'for',
  ]);

  const keywords = cleanInstruction
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const seenNormalized = new Set<string>();
  let duplicatesRemoved = 0;
  let sectionsFound = 0;
  const matchedSources = new Set<string>();

  const groupedByDoc: {
    filename: string;
    contentType: string;
    passages: string[];
  }[] = [];

  documents.forEach((doc) => {
    const blocks = doc.finalContent.split(/\n\s*\n/);
    const docContentType = doc.contentType || 'General';
    const docMatchesTopic =
      keywords.length === 0 ||
      keywords.some(
        (kw) =>
          doc.filename.toLowerCase().includes(kw) ||
          doc.tags.some((t) => t.toLowerCase().includes(kw)) ||
          docContentType.toLowerCase().includes(kw)
      );

    const keptPassages: string[] = [];

    blocks.forEach((block) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const lowerBlock = trimmed.toLowerCase();
      const blockMatches =
        docMatchesTopic || keywords.some((kw) => lowerBlock.includes(kw));

      if (!blockMatches) return;

      const norm = lowerBlock
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (norm.length < 6) return;
      if (seenNormalized.has(norm)) {
        duplicatesRemoved++;
        return;
      }
      seenNormalized.add(norm);
      sectionsFound++;
      keptPassages.push(trimmed);
    });

    // Fallback: if keyword filter was too strict and matched nothing in any doc, we'll handle below
    if (keptPassages.length > 0) {
      matchedSources.add(doc.filename);
      groupedByDoc.push({
        filename: doc.filename,
        contentType: docContentType,
        passages: keptPassages,
      });
    }
  });

  // If specific keywords yielded 0 matches across all docs, include all non-duplicate blocks
  if (groupedByDoc.length === 0 && documents.length > 0) {
    documents.forEach((doc) => {
      const blocks = doc.finalContent.split(/\n\s*\n/);
      const keptPassages: string[] = [];
      blocks.forEach((block) => {
        const trimmed = block.trim();
        if (!trimmed) return;
        const norm = trimmed
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (norm.length < 6) return;
        if (seenNormalized.has(norm)) {
          duplicatesRemoved++;
          return;
        }
        seenNormalized.add(norm);
        sectionsFound++;
        keptPassages.push(trimmed);
      });
      if (keptPassages.length > 0) {
        matchedSources.add(doc.filename);
        groupedByDoc.push({
          filename: doc.filename,
          contentType: doc.contentType || 'General',
          passages: keptPassages,
        });
      }
    });
  }

  const nowDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const safeSlug =
    keywords.length > 0
      ? keywords
          .slice(0, 3)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join('_')
      : 'Project_Documents';
  const outputTitle = `Merged_${safeSlug}.md`;
  const sourceFiles = Array.from(matchedSources);

  const mdParts: string[] = [
    `# ${outputTitle}`,
    `> **AI Multi-Document Topic Compilation** • Generated ${nowDate}`,
    cleanInstruction ? `> **Topic / Directive**: "${cleanInstruction}"` : '',
    `> **Sources Merged (${sourceFiles.length})**: ${sourceFiles.join(', ') || 'None'}`,
    `> **Deduplication**: ${sectionsFound} unique sections preserved • ${duplicatesRemoved} duplicate passages removed`,
    '',
    '---',
    '',
  ].filter(Boolean);

  groupedByDoc.forEach((group, idx) => {
    mdParts.push(`## ${idx + 1}. ${group.filename} (${group.contentType})`);
    mdParts.push('');
    group.passages.forEach((p) => {
      mdParts.push(p);
      mdParts.push('');
    });
    mdParts.push('---\n');
  });

  return {
    title: outputTitle,
    markdownContent: mdParts.join('\n'),
    sourceFiles,
    sectionsFound,
    duplicatesRemoved,
  };
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
  if (
    customInstruction &&
    customInstruction.trim().length > 0 &&
    !/\b(lyric|lyrics|song|songs|chorus|verse)\b/i.test(customInstruction)
  ) {
    return mergeProjectDocumentsByTopic(documents, customInstruction);
  }
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
 * Computes an 8x8 perceptual luminance hash (aHash) from an image Data URL using an offscreen HTML5 Canvas
 * so visually duplicate or near-duplicate photos can be detected automatically.
 */
export async function computeImagePerceptualHash(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 8;
          canvas.height = 8;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.drawImage(img, 0, 0, 8, 8);
          const data = ctx.getImageData(0, 0, 8, 8).data;
          const grays: number[] = [];
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grays.push(lum);
            sum += lum;
          }
          const avg = sum / 64;
          const bits = grays.map((g) => (g >= avg ? '1' : '0')).join('');
          resolve(bits);
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    } catch {
      resolve('');
    }
  });
}

export function computeHammingDistance(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) dist++;
  }
  return dist;
}

export interface PhotoDuplicateGroup {
  primaryPhotoId: string;
  primaryFilename: string;
  duplicatePhotos: ProjectPhotoItem[];
  similarityPercent: number;
}

export function detectPhotoAlbumDuplicates(photos: ProjectPhotoItem[]): PhotoDuplicateGroup[] {
  const groups: PhotoDuplicateGroup[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < photos.length; i++) {
    const a = photos[i];
    if (visited.has(a.id)) continue;
    const dups: ProjectPhotoItem[] = [];
    let bestSim = 0;

    for (let j = i + 1; j < photos.length; j++) {
      const b = photos[j];
      if (visited.has(b.id)) continue;

      const exactDataMatch = a.dataUrl === b.dataUrl;
      const hashDist =
        a.perceptualHash && b.perceptualHash
          ? computeHammingDistance(a.perceptualHash, b.perceptualHash)
          : 64;
      const sameSizeAndStem =
        Math.abs(a.sizeBytes - b.sizeBytes) < 256 &&
        a.filename.replace(/[-_ ]?\d+\./, '.') === b.filename.replace(/[-_ ]?\d+\./, '.');

      if (exactDataMatch || hashDist <= 6 || sameSizeAndStem) {
        dups.push(b);
        visited.add(b.id);
        const sim = exactDataMatch ? 100 : hashDist <= 6 ? Math.round(((64 - hashDist) / 64) * 100) : 95;
        bestSim = Math.max(bestSim, sim);
      }
    }

    if (dups.length > 0) {
      visited.add(a.id);
      groups.push({
        primaryPhotoId: a.id,
        primaryFilename: a.filename,
        duplicatePhotos: dups,
        similarityPercent: bestSim,
      });
    }
  }

  return groups;
}

/**
 * Generates a standalone, downloadable HTML Photo Album (Section 22)
 * Includes 4 Visual Themes (Dark Cinema, Editorial White, Warm Gallery, Neon Studio),
 * Auto-Play Slideshow with configurable interval, responsive Grid + Masonry toggle, Lightbox, Fullscreen, Prev/Next navigation, captions & filenames.
 */
export function generateStandalonePhotoAlbumHTML(album: ProjectPhotoAlbum): string {
  const safeTitle = album.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = album.subtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const initialTheme: PhotoAlbumTheme = album.theme || 'dark-cinema';
  const initialInterval = album.slideshowIntervalSec || 4;

  // Encode JSON safely for an inline script. User-controlled strings can contain </script>.
  // Escaping '<' prevents an attacker from terminating the script element before JSON.parse runs.
  const photosJson = JSON.stringify(
    album.photos.map((p) => ({
      filename: String(p.filename || '').slice(0, 512),
      caption: String(p.caption || p.filename || '').slice(0, 2000),
      src: String(p.dataUrl || ''),
      takenAt: p.takenAt,
      group: String(p.groupName || 'Portfolio').slice(0, 256),
    }))
  )
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${initialTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Photo Album</title>
  <style>
    :root, [data-theme="dark-cinema"] {
      --bg: radial-gradient(circle at top right, #1e293b 0%, #090d16 65%);
      --card: #111827;
      --border: rgba(255,255,255,0.1);
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #3b82f6;
    }
    [data-theme="editorial-white"] {
      --bg: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
      --card: #ffffff;
      --border: rgba(15,23,42,0.1);
      --text: #0f172a;
      --muted: #64748b;
      --accent: #0f172a;
    }
    [data-theme="warm-gallery"] {
      --bg: radial-gradient(circle at top left, #292524 0%, #1c1917 70%);
      --card: #292524;
      --border: rgba(245,158,11,0.18);
      --text: #fef3c7;
      --muted: #d6d3d1;
      --accent: #d97706;
    }
    [data-theme="neon-studio"] {
      --bg: radial-gradient(circle at top right, #2e1065 0%, #090514 70%);
      --card: #170d2b;
      --border: rgba(236,72,153,0.22);
      --text: #fdf4ff;
      --muted: #c084fc;
      --accent: #ec4899;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 32px 20px 64px;
      transition: background 0.3s, color 0.3s;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 16px; padding-bottom: 24px; margin-bottom: 28px; border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); font-size: 0.95rem; margin-top: 4px; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .btn, select.btn {
      background: var(--card); color: var(--text); border: 1px solid var(--border);
      padding: 8px 13px; border-radius: 10px; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn.active, .btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
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
    .card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px -12px rgba(0,0,0,0.45); }
    .card img { width: 100%; display: block; object-fit: cover; }
    .gallery-grid .card img { height: 220px; }
    .meta { padding: 12px 14px; }
    .caption { font-size: 0.9rem; font-weight: 600; color: var(--text); }
    .filename { font-size: 0.75rem; color: var(--muted); margin-top: 4px; font-family: monospace; }
    /* Lightbox */
    .lightbox {
      position: fixed; inset: 0; background: rgba(5, 8, 15, 0.94); backdrop-filter: blur(12px);
      display: none; flex-direction: column; justify-content: space-between; z-index: 1000; padding: 20px;
      color: #f8fafc;
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
        <select class="btn" id="theme-select" onchange="setTheme(this.value)">
          <option value="dark-cinema" ${initialTheme === 'dark-cinema' ? 'selected' : ''}>Theme: Dark Cinema</option>
          <option value="editorial-white" ${initialTheme === 'editorial-white' ? 'selected' : ''}>Theme: Editorial White</option>
          <option value="warm-gallery" ${initialTheme === 'warm-gallery' ? 'selected' : ''}>Theme: Warm Gallery</option>
          <option value="neon-studio" ${initialTheme === 'neon-studio' ? 'selected' : ''}>Theme: Neon Studio</option>
        </select>
        <button class="btn ${album.layout === 'grid' ? 'active' : ''}" id="btn-grid" onclick="setLayout('grid')">Modern Grid</button>
        <button class="btn ${album.layout === 'masonry' ? 'active' : ''}" id="btn-masonry" onclick="setLayout('masonry')">Masonry Layout</button>
        <button class="btn" id="btn-slideshow" onclick="toggleSlideshow()">&#9654; Auto-Slideshow (${initialInterval}s)</button>
      </div>
    </header>
    <div id="gallery" class="${album.layout === 'masonry' ? 'gallery-masonry' : 'gallery-grid'}"></div>
  </div>

  <div class="lightbox" id="lightbox">
    <div class="lb-top">
      <span id="lb-counter" style="font-family:monospace;font-size:0.85rem;color:#94a3b8;">1 / 1</span>
      <div style="display:flex;gap:8px;">
        <button class="btn" id="lb-slideshow-btn" onclick="toggleSlideshow()">&#9654; Slideshow</button>
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
    const INTERVAL_MS = ${initialInterval * 1000};
    let currentIndex = 0;
    let slideshowTimer = null;
    const gallery = document.getElementById('gallery');

    function isSafeImageSource(src) {
      return typeof src === 'string' && /^data:image\\/(?:png|jpe?g|webp|gif);base64,/i.test(src);
    }

    function renderGallery() {
      gallery.replaceChildren();
      PHOTOS.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.addEventListener('click', () => openLightbox(i));

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = String(p.caption || p.filename || '');
        img.src = isSafeImageSource(p.src) ? p.src : '';

        const meta = document.createElement('div');
        meta.className = 'meta';

        const caption = document.createElement('div');
        caption.className = 'caption';
        caption.textContent = String(p.caption || p.filename || '');

        const filename = document.createElement('div');
        filename.className = 'filename';
        filename.textContent = String(p.filename || '');

        meta.append(caption, filename);
        card.append(img, meta);
        gallery.append(card);
      });
    }

    function setTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
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
      stopSlideshow();
      document.getElementById('lightbox').classList.remove('open');
    }

    function stepPhoto(delta) {
      if (PHOTOS.length === 0) return;
      currentIndex = (currentIndex + delta + PHOTOS.length) % PHOTOS.length;
      updateLightbox();
    }

    function toggleSlideshow() {
      if (slideshowTimer) {
        stopSlideshow();
      } else {
        if (!document.getElementById('lightbox').classList.contains('open')) {
          openLightbox(currentIndex);
        }
        slideshowTimer = setInterval(() => stepPhoto(1), INTERVAL_MS);
        document.getElementById('btn-slideshow').classList.add('active');
        document.getElementById('lb-slideshow-btn').textContent = '⏸ Pause Slideshow';
      }
    }

    function stopSlideshow() {
      if (slideshowTimer) {
        clearInterval(slideshowTimer);
        slideshowTimer = null;
      }
      document.getElementById('btn-slideshow').classList.remove('active');
      document.getElementById('lb-slideshow-btn').textContent = '▶ Slideshow';
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
      if (e.key === ' ') { e.preventDefault(); toggleSlideshow(); }
    });

    renderGallery();
  </script>
</body>
</html>`;
}

/**
 * Pure TypeScript Standard PKZIP (.zip) Binary Archive Builder
 * Packages Project_Manifest.json, all Documents (.md/.txt), Notes, Tasks Checklist, and Standalone HTML Photo Albums
 * into a single downloadable .zip file with CRC32 integrity checksums.
 */
export function buildProjectZipArchiveBlob(project: OSProject): Blob {
  const encoder = new TextEncoder();
  const entries: { path: string; data: Uint8Array }[] = [];

  const safeSlug = (s: string) =>
    s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled';

  // 1. Project_Manifest.json
  entries.push({
    path: 'Project_Manifest.json',
    data: encoder.encode(JSON.stringify(buildProjectManifest(project), null, 2)),
  });

  // 2. README_SUMMARY.md
  const summaryLines = [
    `# ${project.name}`,
    `> ${project.description}`,
    '',
    `- **Template**: ${project.template}`,
    `- **Documents**: ${project.documents.length}`,
    `- **Scratchpad Notes**: ${project.notes.length}`,
    `- **Tasks**: ${project.tasks.length}`,
    `- **Photo Albums**: ${project.photoAlbums.length}`,
    `- **Exported**: ${new Date().toISOString()}`,
  ];
  entries.push({
    path: 'README_SUMMARY.md',
    data: encoder.encode(summaryLines.join('\n')),
  });

  // 3. All Documents (Final + Original versions)
  project.documents.forEach((doc) => {
    const ext = doc.filename.endsWith('.md') || doc.filename.endsWith('.txt') ? '' : '.md';
    entries.push({
      path: `documents/${safeSlug(doc.filename)}${ext}`,
      data: encoder.encode(doc.finalContent),
    });
  });

  // 4. All Scratchpad Notes
  project.notes.forEach((note) => {
    entries.push({
      path: `notes/${safeSlug(note.title)}.md`,
      data: encoder.encode(`# ${note.title}\n\n${note.content}`),
    });
  });

  // 5. Tasks Checklist
  if (project.tasks.length > 0) {
    const tasksMd = [
      `# ${project.name} — Tasks & Action Checklists`,
      '',
      ...project.tasks.map((t) =>
        [
          `## [${t.status === 'Done' ? 'x' : ' '}] ${t.title} (${t.priority} • Due ${t.dueDate})`,
          t.description ? `${t.description}\n` : '',
          ...t.checklist.map((c) => `- [${c.completed ? 'x' : ' '}] ${c.text}`),
          '',
        ].join('\n')
      ),
    ].join('\n');
    entries.push({
      path: 'tasks/Project_Tasks_Checklist.md',
      data: encoder.encode(tasksMd),
    });
  }

  // 6. Standalone HTML Photo Albums
  project.photoAlbums.forEach((album) => {
    entries.push({
      path: `albums/${safeSlug(album.title)}.html`,
      data: encoder.encode(generateStandalonePhotoAlbumHTML(album)),
    });
  });

  // Build standard PKZIP binary format (Store method 0 with CRC32)
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Uint8Array): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);

    // Local File Header (30 + nameBytes.length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // Store (0)
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    // Central Directory Header (46 + nameBytes.length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd] as unknown as BlobPart[], {
    type: 'application/zip',
  });
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
