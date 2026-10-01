import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const CUSTOM_FIREBASE_CONFIG_KEY = 'bluenote_custom_firebase_config_v1';

export function getEffectiveFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CUSTOM_FIREBASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.apiKey === 'string' && typeof parsed.projectId === 'string') {
        return {
          ...firebaseConfig,
          ...parsed,
        };
      }
    }
  } catch {
    // Fallback to default firebaseConfig
  }
  return firebaseConfig;
}

export function saveCustomFirebaseConfig(configJson: string | null) {
  if (!configJson || !configJson.trim()) {
    localStorage.removeItem(CUSTOM_FIREBASE_CONFIG_KEY);
    return;
  }
  localStorage.setItem(CUSTOM_FIREBASE_CONFIG_KEY, configJson.trim());
}

export function hasCustomFirebaseConfig(): boolean {
  return Boolean(localStorage.getItem(CUSTOM_FIREBASE_CONFIG_KEY));
}

/**
 * Returns the actual Firebase Authentication domain used by the initialized app.
 * This is intentionally read from the effective Firebase config instead of a
 * user-editable profile label, so the UI cannot imply that changing a label
 * changes Firebase Authentication configuration.
 */
export function getFirebaseAuthDomain(): string {
  return String(getEffectiveFirebaseConfig().authDomain || firebaseConfig.authDomain || '').trim();
}

const activeConfig = getEffectiveFirebaseConfig();
const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. The client is offline.');
    }
  }
}

testFirestoreConnection();

export {
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  onSnapshot
};
export type { User };
