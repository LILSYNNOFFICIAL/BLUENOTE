import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  initializeFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Canonical BlueNote Deployment & Firebase Constants:
 * - Application URL (GitHub Pages project site): https://lilsynnofficial.github.io/BLUENOTE/
 * - Firebase Authorized Domain (hostname only, no /BLUENOTE path): lilsynnofficial.github.io
 * - Firebase Project ID: ai-studio-applet-webapp-d45ee
 * - Firebase SDK authDomain: ai-studio-applet-webapp-d45ee.firebaseapp.com
 */
export const BLUENOTE_DEPLOYED_APP_URL = 'https://lilsynnofficial.github.io/BLUENOTE/';
export const BLUENOTE_FIREBASE_AUTHORIZED_DOMAIN = 'lilsynnofficial.github.io';

export function getFirebaseAuthDomain(): string {
  return String(firebaseConfig.authDomain || 'ai-studio-applet-webapp-d45ee.firebaseapp.com').trim();
}

export function getDetectedHostname(): string {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return BLUENOTE_FIREBASE_AUTHORIZED_DOMAIN;
}

export function getDetectedAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    if (window.location.hostname === BLUENOTE_FIREBASE_AUTHORIZED_DOMAIN) {
      return BLUENOTE_DEPLOYED_APP_URL;
    }
    return `${window.location.origin}${window.location.pathname || '/'}`;
  }
  return BLUENOTE_DEPLOYED_APP_URL;
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

export { storageRef, uploadBytesResumable, getDownloadURL, deleteObject };

export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();

/**
 * Connects Gmail for the signed-in user using Firebase Authentication's GoogleAuthProvider
 * and returns a user-scoped OAuth access token via GoogleAuthProvider.credentialFromResult().
 * Requires zero developer credentials or API keys from the user.
 */
export async function authorizeGmailWithFirebaseGoogle(): Promise<{
  email: string;
  accessToken: string | null;
  messagesPreview: { id: string; snippet: string }[];
}> {
  const gmailProvider = new GoogleAuthProvider();
  gmailProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  gmailProvider.setCustomParameters({ prompt: 'consent select_account' });

  const result = await signInWithPopup(auth, gmailProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || null;
  const userEmail = result.user.email || auth.currentUser?.email || '';

  const messagesPreview: { id: string; snippet: string }[] = [];
  if (accessToken) {
    try {
      const listResp = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=3',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (listResp.ok) {
        const listData = await listResp.json();
        const messages: { id: string }[] = Array.isArray(listData?.messages)
          ? listData.messages.slice(0, 3)
          : [];
        for (const msg of messages) {
          const detailResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
              msg.id
            )}?format=metadata`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (detailResp.ok) {
            const detail = await detailResp.json();
            if (detail?.snippet) {
              messagesPreview.push({
                id: msg.id,
                snippet: String(detail.snippet),
              });
            }
          }
        }
      }
    } catch {
      // Token authorized; message preview optional
    }
  }

  return {
    email: userEmail,
    accessToken,
    messagesPreview,
  };
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
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
      console.warn('Firestore is operating in offline/cached mode.');
    }
  }
}
testFirestoreConnection();

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
};
export type { User };
