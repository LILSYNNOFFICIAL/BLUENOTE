import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'window', {
  value: {
    location: { hostname: 'lilsynnofficial.github.io', href: 'https://lilsynnofficial.github.io/BLUENOTE/pr-24/?preview=1#stale', hash: '#stale', pathname: '/BLUENOTE/pr-24/', search: '?preview=1' },
    history: { replaceState: () => undefined },
    setInterval: () => 1,
    clearInterval: () => undefined,
  },
  configurable: true,
});

const calls: Array<{ url: string; init: RequestInit }> = [];
let rejectPasswordSignIn = false;
const remoteWorkspace = {
  user_id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  workspace: { tasks: [{ id: 'remote-task' }] },
  updated_at: '2026-10-18T00:00:00.000Z',
};

globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = String(input);
  calls.push({ url, init });
  if (url.includes('/auth/v1/signup')) {
    return new Response(JSON.stringify({ user: { id: 'new-user', email: 'new@example.com' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.includes('/auth/v1/token?grant_type=password')) {
    if (rejectPasswordSignIn) {
      return new Response(JSON.stringify({ msg: 'Invalid login credentials' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-123', email: 'test@example.com', email_confirmed_at: '2026-10-18T00:00:00Z' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (url.includes('/auth/v1/recover')) {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (url.includes('/rest/v1/bluenote_workspaces?on_conflict=user_id')) {
    return new Response(null, { status: 204 });
  }
  if (url.includes('/rest/v1/bluenote_workspaces?user_id=eq.user-123')) {
    return new Response(JSON.stringify([remoteWorkspace]), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ message: 'Unexpected test request: ' + url }), {
    status: 500, headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

const client = await import('./supabaseClient');

test('registration handles confirmation-required accounts without inventing a session', async () => {
  await assert.rejects(
    client.createUserWithEmailAndPassword(client.auth, 'new@example.com', 'a-strong-test-password'),
    (error: unknown) => (error as { code?: string }).code === 'auth/email-confirmation-required',
  );
  const call = calls.find(({ url }) => url.includes('/auth/v1/signup'));
  assert.ok(call, 'registration request was sent');
  assert.match(call.url, /redirect_to=https%3A%2F%2Flilsynnofficial\.github\.io%2FBLUENOTE%2Fpr-24%2F/);
  assert.equal(client.auth.currentUser, null);
});

test('email sign-in persists a session and notifies auth listeners', async () => {
  const changes: Array<string | null> = [];
  const unsubscribe = client.onAuthStateChanged(client.auth, (user) => changes.push(user?.uid ?? null));
  const result = await client.signInWithEmailAndPassword(client.auth, 'test@example.com', 'a-strong-test-password');
  assert.equal(result.user.uid, 'user-123');
  assert.equal(client.auth.currentUser?.email, 'test@example.com');
  assert.ok(changes.includes('user-123'));
  unsubscribe();
});

test('invalid credentials map to a stable user-facing error', async () => {
  rejectPasswordSignIn = true;
  try {
    await assert.rejects(
      client.signInWithEmailAndPassword(client.auth, 'test@example.com', 'wrong-password'),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, 'auth/invalid-credential');
        assert.match((error as Error).message, /Invalid email or password/);
        return true;
      },
    );
  } finally {
    rejectPasswordSignIn = false;
  }
});

test('workspace upsert is authenticated and scoped to the active user', async () => {
  await client.setDoc(client.doc(client.db, 'workspaces', 'user-123'), {
    uid: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    workspace: { tasks: [{ id: 'local-task' }] },
  });
  const call = calls.find(({ url }) => url.includes('/rest/v1/bluenote_workspaces?on_conflict=user_id'));
  assert.ok(call);
  const headers = new Headers(call.init.headers);
  assert.equal(headers.get('Authorization'), 'Bearer test-access-token');
  assert.equal(headers.get('apikey'), 'sb_publishable_JVc0GXWoQZmpDLYO5b-8vQ_I1c_BI_Z');
  const row = JSON.parse(String(call.init.body));
  assert.equal(row.user_id, 'user-123');
  assert.deepEqual(row.workspace, { tasks: [{ id: 'local-task' }] });
});

test('password recovery uses the configured BlueNote app callback', async () => {
  await client.sendPasswordResetEmail(client.auth, 'test@example.com');
  const call = calls.find(({ url }) => url.includes('/auth/v1/recover'));
  assert.ok(call);
  assert.match(call.url, /redirect_to=https%3A%2F%2Flilsynnofficial\.github\.io%2FBLUENOTE%2Fpr-24%2F/);
});

test('workspace listener can load a remote account snapshot', async () => {
  let stop: () => void = () => undefined;
  const received = new Promise<{ exists: () => boolean; data: () => any }>((resolve, reject) => {
    stop = client.onSnapshot(
      client.doc(client.db, 'workspaces', 'user-123'),
      (snapshot) => { stop(); resolve(snapshot); },
      (error) => { stop(); reject(error); },
    );
  });
  const snapshot = await Promise.race([
    received,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('workspace read timed out')), 1500)),
  ]);
  assert.equal(snapshot.exists(), true);
  assert.equal(snapshot.data().uid, 'user-123');
  assert.deepEqual(snapshot.data().workspace, { tasks: [{ id: 'remote-task' }] });
});
