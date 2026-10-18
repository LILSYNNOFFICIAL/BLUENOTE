/**
 * BlueNote's public Supabase client adapter.
 *
 * Only the project URL and publishable key belong in this client. Never place
 * a Supabase secret/service-role key in browser or Android assets.
 */
const runtimeEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env || {};
const SUPABASE_URL =
  runtimeEnv.VITE_SUPABASE_URL?.trim() ||
  'https://eemnfovvxlefhsfszzhk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  'sb_publishable_JVc0GXWoQZmpDLYO5b-8vQ_I1c_BI_Z';
const SESSION_KEY = 'bluenote_supabase_session_v1';
const PASSWORD_RECOVERY_KEY = 'bluenote_password_recovery_pending';
const AUTH_REDIRECT_URL = 'https://lilsynnofficial.github.io/BLUENOTE/';

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

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
};
type AuthListener = (user: User | null) => void;
type Provider = {
  providerId: string;
  parameters: Record<string, string>;
  scopes: string[];
  addScope: (scope: string) => void;
  setCustomParameters: (parameters: Record<string, string>) => void;
};

export class SupabaseAuthError extends Error {
  code: string;
  constructor(message: string, code = 'auth/unknown') {
    super(message);
    this.name = 'SupabaseAuthError';
    this.code = code;
  }
}

function toUser(value: any): User {
  const metadata = value?.user_metadata || {};
  const email = typeof value?.email === 'string' ? value.email : null;
  return {
    uid: String(value?.id || value?.sub || ''),
    email,
    displayName: String(metadata.full_name || metadata.name || metadata.display_name || email?.split('@')[0] || '') || null,
    photoURL: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    emailVerified: Boolean(value?.email_confirmed_at || value?.confirmed_at),
    isAnonymous: Boolean(value?.is_anonymous),
    tenantId: value?.tenant_id || null,
    providerData: Array.isArray(value?.app_metadata?.providers)
      ? value.app_metadata.providers.map((providerId: string) => ({
          providerId,
          displayName: null,
          email,
          photoUrl: null,
        }))
      : [],
  };
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.access_token || !parsed?.refresh_token || !parsed?.user?.uid) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

let session: Session | null = readSession();
const listeners = new Set<AuthListener>();
const lastWrittenWorkspace = new Map<string, string>();
const lastSeenWorkspaceVersion = new Map<string, string>();

export const auth: { currentUser: User | null } = {
  currentUser: session?.user || null,
};

export const db = {};
export const googleProvider = createProvider('google');

function createProvider(providerId: string): Provider {
  const provider: Provider = {
    providerId,
    parameters: {},
    scopes: [],
    addScope(scope: string) {
      if (!provider.scopes.includes(scope)) provider.scopes.push(scope);
    },
    setCustomParameters(parameters: Record<string, string>) {
      provider.parameters = { ...provider.parameters, ...parameters };
    },
  };
  return provider;
}

function notifyAuthListeners(): void {
  for (const listener of listeners) listener(auth.currentUser);
}

function saveSession(next: Session | null): void {
  session = next;
  auth.currentUser = next?.user || null;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    if (next) throw new Error('BlueNote could not securely persist the sign-in session on this device.');
  }
  notifyAuthListeners();
}

function authError(message: string, status: number): SupabaseAuthError {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return new SupabaseAuthError('Invalid email or password. Please check your credentials and try again.', 'auth/invalid-credential');
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return new SupabaseAuthError('An account with this email already exists. Switch to Sign In.', 'auth/email-already-in-use');
  }
  if (normalized.includes('email not confirmed')) {
    return new SupabaseAuthError('Please confirm your email address using the link we sent you before signing in.', 'auth/email-not-verified');
  }
  if (normalized.includes('password should be') || normalized.includes('password is too short')) {
    return new SupabaseAuthError('Choose a longer password (at least 6 characters).', 'auth/weak-password');
  }
  if (status === 429) {
    return new SupabaseAuthError('Too many attempts. Please wait a little before trying again.', 'auth/too-many-requests');
  }
  if (normalized.includes('signup is disabled') || normalized.includes('provider is disabled')) {
    return new SupabaseAuthError('Email sign-up is disabled in the BlueNote Supabase Auth settings.', 'auth/operation-not-allowed');
  }
  return new SupabaseAuthError(message || 'The authentication request could not be completed.', 'auth/unknown');
}

async function request(path: string, options: RequestInit = {}, useSession = true): Promise<any> {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  headers.set('Content-Type', 'application/json');
  if (useSession && session?.access_token) {
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
  } else {
    headers.set('Authorization', `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('BlueNote could not reach Supabase. Check your internet connection and try again.');
  }

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    const message = String(body?.msg || body?.message || body?.error_description || body?.error || `Request failed (${response.status})`);
    if (path.startsWith('/auth/v1/')) throw authError(message, response.status);
    throw new Error(message);
  }
  return body;
}

async function getAccessToken(): Promise<string> {
  if (!session) throw new SupabaseAuthError('Sign in to sync this BlueNote workspace.', 'auth/no-current-user');
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session.access_token;
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  }, false);
  const next = makeSession(refreshed);
  saveSession(next);
  return next.access_token;
}

function makeSession(data: any): Session {
  const user = toUser(data?.user || {});
  if (!data?.access_token || !data?.refresh_token || !user.uid) {
    throw new Error('Supabase did not return a complete sign-in session.');
  }
  return {
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token),
    expires_at: Number(data.expires_at || (Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600))),
    user,
  };
}

function decodeJwtPayload(token: string): any {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

export async function getRedirectResult(_auth: typeof auth): Promise<null> {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const claims = decodeJwtPayload(accessToken);
  const user = toUser({
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata || {},
    app_metadata: claims.app_metadata || {},
    email_confirmed_at: claims.email_confirmed_at,
  });
  if (hash.get('type') === 'recovery') {
    try { sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1'); } catch { /* Recovery state is also reflected in the auth hash during initial load. */ }
  } else {
    try { sessionStorage.removeItem(PASSWORD_RECOVERY_KEY); } catch { /* Optional browser storage. */ }
  }
  const expiresIn = Number(hash.get('expires_in') || 3600);
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user,
  });
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  void request('/auth/v1/user', {}, true).then((data) => {
    if (session) saveSession({ ...session, user: toUser(data) });
  }).catch(() => undefined);
  return null;
}

export function onAuthStateChanged(_auth: typeof auth, callback: AuthListener): () => void {
  listeners.add(callback);
  callback(auth.currentUser);
  return () => listeners.delete(callback);
}

export function getFirebaseAuthDomain(): string {
  return 'Supabase Auth';
}
export function getDetectedHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}
export function getDetectedAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : SUPABASE_URL;
}

export async function signInWithEmailAndPassword(_auth: typeof auth, email: string, password: string): Promise<{ user: User }> {
  const data = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  }, false);
  const next = makeSession(data);
  saveSession(next);
  return { user: next.user };
}

export async function createUserWithEmailAndPassword(_auth: typeof auth, email: string, password: string): Promise<{ user: User }> {
  const data = await request(`/auth/v1/signup?redirect_to=${encodeURIComponent(AUTH_REDIRECT_URL)}`, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  }, false);
  if (data?.access_token && data?.refresh_token) {
    const next = makeSession(data);
    saveSession(next);
    return { user: next.user };
  }
  const createdUser = toUser(data?.user || data || {});
  throw new SupabaseAuthError(
    `Account created for ${createdUser.email || email.trim()}. Check your email for the confirmation link, then sign in.`,
    'auth/email-confirmation-required'
  );
}

export async function sendPasswordResetEmail(_auth: typeof auth, email: string): Promise<void> {
  await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(AUTH_REDIRECT_URL)}`, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  }, false);
}

export function isPasswordRecoveryPending(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
}

export async function updatePassword(password: string): Promise<void> {
  const data = await request('/auth/v1/user', {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
  try { sessionStorage.removeItem(PASSWORD_RECOVERY_KEY); } catch { /* Optional browser storage. */ }
  if (session) saveSession({ ...session, user: toUser(data) });
}

export async function updateProfile(user: User, profile: { displayName?: string; photoURL?: string }): Promise<void> {
  const data = await request('/auth/v1/user', {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        full_name: profile.displayName ?? user.displayName,
        avatar_url: profile.photoURL ?? user.photoURL,
      },
    }),
  });
  if (session) saveSession({ ...session, user: toUser(data) });
}

export async function signOut(_auth: typeof auth): Promise<void> {
  try {
    if (session) await request('/auth/v1/logout', { method: 'POST' });
  } finally {
    saveSession(null);
  }
}

export async function signInWithPopup(_auth: typeof auth, provider: Provider): Promise<{ user: User }> {
  return signInWithRedirect(_auth, provider) as unknown as Promise<{ user: User }>;
}

export async function signInWithRedirect(_auth: typeof auth, provider: Provider): Promise<never> {
  if (typeof window === 'undefined') throw new Error('OAuth sign-in is only available in a browser.');
  const redirectTo = window.location.href.split('#')[0];
  const params = new URLSearchParams({
    provider: provider.providerId,
    redirect_to: redirectTo,
  });
  if (provider.scopes.length) params.set('scopes', provider.scopes.join(' '));
  for (const [key, value] of Object.entries(provider.parameters)) params.set(key, value);
  window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`);
  return new Promise<never>(() => undefined);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'list_get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: { userId: string | undefined; email: string | null | undefined };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  console.error('BlueNote sync error', {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email },
  });
}

export function doc(_db: typeof db, collection: string, id: string): { collection: string; id: string } {
  return { collection, id };
}

export async function setDoc(ref: { collection: string; id: string }, payload: Record<string, any>): Promise<void> {
  if (ref.collection !== 'workspaces') throw new Error('Unsupported BlueNote sync collection.');
  const workspace = payload.workspace && typeof payload.workspace === 'object' ? payload.workspace : {};
  const serializedWorkspace = JSON.stringify(workspace);
  const row = {
    user_id: ref.id,
    email: String(payload.email || '').slice(0, 250),
    display_name: String(payload.name || 'BlueNote User').slice(0, 120),
    workspace,
    updated_at: new Date().toISOString(),
  };
  await request('/rest/v1/bluenote_workspaces?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  lastWrittenWorkspace.set(ref.id, serializedWorkspace);
}

export function onSnapshot(
  ref: { collection: string; id: string },
  next: (snapshot: { exists: () => boolean; data: () => any }) => void,
  error?: (error: unknown) => void
): () => void {
  if (ref.collection !== 'workspaces') {
    error?.(new Error('Unsupported BlueNote sync collection.'));
    return () => undefined;
  }
  // Force a fresh first read for every sign-in, including when this account
  // was previously used on this device and remote data changed while signed out.
  lastWrittenWorkspace.delete(ref.id);
  lastSeenWorkspaceVersion.delete(ref.id);
  let active = true;
  let busy = false;
  const poll = async () => {
    if (!active || busy || auth.currentUser?.uid !== ref.id) return;
    busy = true;
    try {
      const rows = await request(`/rest/v1/bluenote_workspaces?user_id=eq.${encodeURIComponent(ref.id)}&select=user_id,email,display_name,workspace,updated_at&limit=1`);
      if (!active) return;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        if (lastSeenWorkspaceVersion.get(ref.id) === '__missing__') return;
        lastSeenWorkspaceVersion.set(ref.id, '__missing__');
        next({ exists: () => false, data: () => null });
        return;
      }
      const version = String(row.updated_at || '');
      if (lastSeenWorkspaceVersion.get(ref.id) === version) return;
      lastSeenWorkspaceVersion.set(ref.id, version);
      const serializedWorkspace = JSON.stringify(row.workspace || {});
      if (lastWrittenWorkspace.get(ref.id) === serializedWorkspace) return;
      next({
        exists: () => true,
        data: () => ({
          uid: row.user_id,
          email: row.email,
          name: row.display_name,
          updatedAt: row.updated_at,
          workspace: row.workspace,
        }),
      });
    } catch (err) {
      if (active) error?.(err);
    } finally {
      busy = false;
    }
  };
  void poll();
  const timer = window.setInterval(() => void poll(), 5000);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

export async function authorizeGmailWithFirebaseGoogle(): Promise<{
  email: string;
  accessToken: string | null;
  messagesPreview: { id: string; snippet: string }[];
}> {
  throw new Error('Gmail connection needs a separately configured Google OAuth integration. BlueNote account sign-in is managed by Supabase.');
}

export { createProvider as GoogleAuthProvider };
