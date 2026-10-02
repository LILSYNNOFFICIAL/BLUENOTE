export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: Array<{
    providerId: string;
    displayName: string | null;
    email: string | null;
    photoUrl: string | null;
  }>;
}

type AuthResult = { user: User };
type AuthListener = (user: User | null) => void;

const localUser: User | null = null;

export const auth = {
  currentUser: localUser,
};

export const db = {};

export const googleProvider = {
  addScope: (_scope: string) => undefined,
  setCustomParameters: (_params: Record<string, string>) => undefined,
};

export const BLUENOTE_DEPLOYED_APP_URL = 'https://lilsynnofficial.github.io/BLUENOTE/';
export const BLUENOTE_FIREBASE_AUTHORIZED_DOMAIN = '';

export function getFirebaseAuthDomain(): string {
  return 'Local-only F-Droid build';
}

export function getDetectedHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}

export function getDetectedAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : BLUENOTE_DEPLOYED_APP_URL;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'list_get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  console.error('Local-only F-Droid build: cloud operation unavailable', {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  });
  throw error instanceof Error ? error : new Error(String(error));
}

export function onAuthStateChanged(_auth: typeof auth, callback: AuthListener): () => void {
  callback(null);
  return () => undefined;
}

export async function getRedirectResult(_auth: typeof auth): Promise<null> {
  return null;
}

export function doc(_db: typeof db, collection: string, id: string) {
  return { collection, id };
}

export async function setDoc(..._args: unknown[]): Promise<void> {
  return undefined;
}

export function onSnapshot(
  _docRef: unknown,
  _next: (snapshot: { exists: () => boolean; data: () => unknown }) => void,
  _error?: (error: unknown) => void
): () => void {
  return () => undefined;
}

function unavailable(): never {
  throw new Error('Cloud accounts and cloud sync are disabled in the F-Droid build. BlueNote remains fully usable locally.');
}

export async function authorizeGmailWithFirebaseGoogle(): Promise<{
  email: string;
  accessToken: string | null;
  messagesPreview: { id: string; snippet: string }[];
}> {
  unavailable();
}

export async function signInWithPopup(..._args: unknown[]): Promise<AuthResult> {
  return unavailable();
}

export async function signInWithRedirect(..._args: unknown[]): Promise<never> {
  return unavailable();
}

export async function createUserWithEmailAndPassword(..._args: unknown[]): Promise<AuthResult> {
  return unavailable();
}

export async function signInWithEmailAndPassword(..._args: unknown[]): Promise<AuthResult> {
  return unavailable();
}

export async function sendPasswordResetEmail(..._args: unknown[]): Promise<void> {
  return unavailable();
}

export async function updateProfile(_user: User, _profile: { displayName?: string }): Promise<void> {
  return undefined;
}

export async function signOut(..._args: unknown[]): Promise<void> {
  return undefined;
}
