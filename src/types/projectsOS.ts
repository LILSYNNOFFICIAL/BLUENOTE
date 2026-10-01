export type ProjectOSModuleTab =
  | 'overview'
  | 'documents'
  | 'files'
  | 'notes'
  | 'tasks'
  | 'media'
  | 'photo-albums'
  | 'ai-workspace'
  | 'search'
  | 'timeline'
  | 'knowledge-graph'
  | 'settings';

export type ProjectProcessingStatus =
  | 'Uploading'
  | 'Uploaded'
  | 'Processing'
  | 'Extracting'
  | 'Indexing'
  | 'Ready'
  | 'AI Processing'
  | 'Exporting'
  | 'Failed';

export type ProjectPermissionLevel =
  | 'Private'
  | 'Shared'
  | 'Read-only'
  | 'Edit'
  | 'Download'
  | 'Admin';

export type ProjectTemplateType =
  | 'Blank Project'
  | 'Writing Project'
  | 'Music Project'
  | 'Research Project'
  | 'Photo Project'
  | 'Business Project'
  | 'Custom';

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  label: string; // e.g., "v1 — Original upload", "v2 — AI rewrite", "v3 — Manual edit", "v4 — AI organized"
  stage: 'Original' | 'Working Version' | 'Edited Version' | 'Final Version';
  content: string;
  createdAt: string;
  author: 'User' | 'AI Operator';
  notes?: string;
  wordCount: number;
  charCount: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  filename: string;
  fileType: 'txt' | 'md' | 'doc' | 'docx' | 'pdf';
  sizeBytes: number;
  uploadedAt: string;
  modifiedAt: string;
  processingStatus: ProjectProcessingStatus;
  pageCount: number;
  wordCount: number;
  charCount: number;
  tags: string[];
  aiSummary: string;
  contentType?: 'Lyrics' | 'Notes' | 'Plan' | 'Research' | 'Draft' | 'General';
  completionState?: 'Finished' | 'Unfinished' | 'Needs Revision' | 'Released' | 'Idea';
  // 4-stage non-destructive pipeline
  originalContent: string;
  workingContent: string;
  editedContent: string;
  finalContent: string;
  currentStage: 'Original' | 'Working Version' | 'Edited Version' | 'Final Version';
  versions: DocumentVersion[];
  currentVersionId: string;
  chunkStoredInIdb?: boolean;
  sourceReferences?: string[];
}

export interface ProjectGeneralFile {
  id: string;
  projectId: string;
  filename: string;
  fileType: string; // CSV, XLSX, JSON, ZIP, TXT, MD, DOC, DOCX, PDF, IMAGE, AUDIO, VIDEO
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  processingStatus: ProjectProcessingStatus;
  tags: string[];
  notes: string;
  dataUrl?: string;
  extractedPreview?: string;
}

export interface ProjectScratchpadNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  organizedByAi?: boolean;
}

export interface ProjectOSTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  dueDate: string;
  tags: string[];
  checklist: { id: string; text: string; completed: boolean }[];
  linkedDocumentId?: string;
  syncedToGlobalTasks?: boolean;
  createdAt: string;
}

export interface ProjectMediaItem {
  id: string;
  projectId: string;
  filename: string;
  mediaType: 'audio' | 'video' | 'image';
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  dimensions?: string;
  transcriptOrCaptions: string;
  sceneInfo: string;
  tags: string[];
  dataUrl?: string;
  loopStartSec?: number;
  loopEndSec?: number;
  uploadedAt: string;
}

export type PhotoAlbumTheme =
  | 'dark-cinema'
  | 'editorial-white'
  | 'warm-gallery'
  | 'neon-studio';

export interface ProjectPhotoItem {
  id: string;
  filename: string;
  caption: string;
  dataUrl: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  takenAt: string;
  groupName?: string;
  tags: string[];
  perceptualHash?: string;
  isDuplicateCandidate?: boolean;
}

export interface ProjectPhotoAlbum {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  layout: 'grid' | 'masonry';
  theme?: PhotoAlbumTheme;
  slideshowIntervalSec?: number;
  photos: ProjectPhotoItem[];
  createdAt: string;
  updatedAt: string;
}

export type RelationshipEntityKind =
  | 'document'
  | 'file'
  | 'note'
  | 'task'
  | 'media'
  | 'album'
  | 'ai-result'
  | 'concept';

export interface ProjectRelationship {
  id: string;
  projectId: string;
  sourceId: string;
  sourceTitle: string;
  sourceKind: RelationshipEntityKind;
  targetId: string;
  targetTitle: string;
  targetKind: RelationshipEntityKind;
  label: string; // e.g. "SONG → LYRICS", "LYRICS → DEMO", "DEMO → FINAL MASTER"
  createdByAi: boolean;
  createdAt: string;
}

export interface SmartCollection {
  id: string;
  projectId: string;
  name: string;
  icon: string;
  ruleContentType?: string; // e.g. 'Lyrics' | 'ANY'
  ruleCompletionState?: string; // e.g. 'Unfinished' | 'Finished' | 'Needs Revision' | 'ANY'
  ruleTag?: string;
}

export interface ProjectAIWorkflow {
  id: string;
  projectId: string;
  name: string;
  triggerType: 'Manual Chain' | 'On Document Upload' | 'On Scratchpad Save';
  enabled: boolean;
  steps: string[];
  lastRunAt?: string;
  runsCount: number;
}

export interface AISandboxProposal {
  id: string;
  projectId: string;
  title: string;
  actionType: string;
  sourceDocumentNames: string[];
  sourceSummary: string;
  proposedContent: string;
  status: 'Pending Review' | 'Committed' | 'Discarded';
  createdAt: string;
}

export interface ProjectAIActivity {
  id: string;
  projectId: string;
  timestamp: string;
  actionTitle: string;
  details: string;
  sourceItems: string[];
  outputDocumentId?: string;
}

export interface ProjectTimelineEvent {
  id: string;
  projectId: string;
  timestamp: string;
  category:
    | 'upload'
    | 'document'
    | 'version'
    | 'ai'
    | 'task'
    | 'photo'
    | 'export'
    | 'milestone';
  title: string;
  subtitle: string;
}

export interface UploadQueueJob {
  id: string;
  projectId: string;
  filename: string;
  fileSize: number;
  bytesTransferred: number;
  totalChunks: number;
  completedChunks: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  speedBytesPerSec: number;
  errorMessage?: string;
  fileRef?: File;
}

export interface OSProject {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  color: string;
  icon: string;
  tags: string[];
  template: ProjectTemplateType;
  permission: ProjectPermissionLevel;
  processingMode: 'Local Processing' | 'Hybrid AI Processing';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  quotaBytesMax: number; // Default 10 GB (10 * 1024 * 1024 * 1024)
  documents: ProjectDocument[];
  files: ProjectGeneralFile[];
  notes: ProjectScratchpadNote[];
  tasks: ProjectOSTask[];
  media: ProjectMediaItem[];
  photoAlbums: ProjectPhotoAlbum[];
  relationships: ProjectRelationship[];
  smartCollections: SmartCollection[];
  workflows: ProjectAIWorkflow[];
  sandboxProposals: AISandboxProposal[];
  aiActivity: ProjectAIActivity[];
  timeline: ProjectTimelineEvent[];
}
