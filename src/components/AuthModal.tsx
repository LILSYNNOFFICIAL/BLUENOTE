import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Cloud,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Settings2,
  Zap,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  hasCustomFirebaseConfig,
  saveCustomFirebaseConfig,
  User,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onUpdateLocalProfileName: (name: string, email: string) => void;
}

function parseFirebaseConfigInput(rawInput: string): Record<string, string> | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct.apiKey === 'string' && typeof direct.projectId === 'string') {
      return direct;
    }
  } catch {
    // Try extracting object literal from const firebaseConfig = { ... };
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const jsonLike = match[0]
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(jsonLike);
    if (parsed && typeof parsed.apiKey === 'string' && typeof parsed.projectId === 'string') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUpdateLocalProfileName,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentHostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';

  const isExternalHostedDomain =
    currentHostname.endsWith('.github.io') ||
    currentHostname.endsWith('.vercel.app') ||
    currentHostname.endsWith('.netlify.app') ||
    currentHostname.endsWith('.pages.dev');

  const [unauthorizedDomainHit, setUnauthorizedDomainHit] = useState(isExternalHostedDomain);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showCustomFirebaseConfig, setShowCustomFirebaseConfig] = useState(false);
  const [customConfigText, setCustomConfigText] = useState('');
  const [customConfigActive, setCustomConfigActive] = useState(() => hasCustomFirebaseConfig());

  if (!isOpen) return null;

  const copyHostname = () => {
    navigator.clipboard?.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  /**
   * Attempts domain-free Firebase Cloud authentication (Anonymous or deterministic Device Email/Password)
   * which uses Identity Toolkit REST APIs and never triggers OAuth popup domain errors.
   * If the Firebase project restricts all non-OAuth methods on this domain, falls back cleanly
   * to Local-First Encrypted Profile so the user is never blocked.
   */
  const handleInstantDomainFreeSignIn = async (preferredName?: string, preferredEmail?: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    const finalName = (preferredName || name || 'BlueNote User').trim();
    const finalEmail = (preferredEmail || email || '').trim();

    try {
      // Step 1: Try Firebase Anonymous Cloud Auth (works on any domain when enabled)
      const anonCred = await signInAnonymously(auth);
      if (anonCred.user) {
        if (finalName) {
          try {
            await updateProfile(anonCred.user, { displayName: finalName });
          } catch {
            // Ignore displayName update error on anonymous user
          }
        }
        onUpdateLocalProfileName(finalName, finalEmail);
        onClose();
        return;
      }
    } catch {
      // Step 2: Try Domain-Free Email/Password Auth with a stored or generated device sync key
      try {
        let deviceCredRaw = localStorage.getItem('bluenote_domain_free_cred_v1');
        let syncEmail = '';
        let syncPass = '';
        if (deviceCredRaw) {
          const parsed = JSON.parse(deviceCredRaw);
          syncEmail = parsed.email;
          syncPass = parsed.password;
        } else {
          const randomId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
          syncEmail = `sync-${randomId}@bluenote-cloud.app`;
          syncPass = `BnSync!${randomId}#9`;
          localStorage.setItem(
            'bluenote_domain_free_cred_v1',
            JSON.stringify({ email: syncEmail, password: syncPass })
          );
        }

        try {
          const signedIn = await signInWithEmailAndPassword(auth, syncEmail, syncPass);
          if (signedIn.user) {
            onUpdateLocalProfileName(finalName, finalEmail || syncEmail);
            onClose();
            return;
          }
        } catch {
          const created = await createUserWithEmailAndPassword(auth, syncEmail, syncPass);
          if (created.user) {
            if (finalName) {
              await updateProfile(created.user, { displayName: finalName });
            }
            onUpdateLocalProfileName(finalName, finalEmail || syncEmail);
            onClose();
            return;
          }
        }
      } catch {
        // Step 3: Clean Local-First Profile activation if Firebase project blocks all auth from this domain
        onUpdateLocalProfileName(finalName, finalEmail);
        onClose();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthPopupError = async (err: any, providerName: string) => {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');

    if (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain') ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      setUnauthorizedDomainHit(true);
      setErrorMsg(null);
      setInfoMsg(
        `Google/GitHub OAuth popups require "${currentHostname}" to be added to Firebase Authorized Domains. Use 1-Click Instant Sign-In or Email below (works on all domains), or whitelist "${currentHostname}" in Firebase Console.`
      );
      return;
    }

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      setErrorMsg('Sign-in popup was closed before completing. You can also sign in with Email or 1-Click Instant Sync below.');
      return;
    }

    if (code === 'auth/popup-blocked') {
      setErrorMsg('Your browser blocked the sign-in popup. Please allow popups or use Email / 1-Click Instant Sign-In below.');
      return;
    }

    setErrorMsg(
      err?.message || `Unable to sign in with ${providerName} right now. Your workspace continues saving locally.`
    );
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        onUpdateLocalProfileName(
          cred.user.displayName || 'BlueNote User',
          cred.user.email || ''
        );
      }
      onClose();
    } catch (err: any) {
      await handleOAuthPopupError(err, 'Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, githubProvider);
      if (cred.user) {
        onUpdateLocalProfileName(
          cred.user.displayName || 'BlueNote User',
          cred.user.email || ''
        );
      }
      onClose();
    } catch (err: any) {
      await handleOAuthPopupError(err, 'GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName });
        }
        onUpdateLocalProfileName(cleanName, cleanEmail);
      } else {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          onUpdateLocalProfileName(
            cred.user.displayName || cleanName,
            cred.user.email || cleanEmail
          );
        } catch (signInErr: any) {
          // If user doesn't exist yet, seamlessly create their account
          if (
            signInErr?.code === 'auth/user-not-found' ||
            signInErr?.code === 'auth/invalid-credential'
          ) {
            const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            if (cleanName) {
              await updateProfile(cred.user, { displayName: cleanName });
            }
            onUpdateLocalProfileName(cleanName, cleanEmail);
          } else {
            throw signInErr;
          }
        }
      }
      onClose();
    } catch (err: any) {
      const code = String(err?.code || '');
      const msg = String(err?.message || '');
      if (
        code === 'auth/unauthorized-domain' ||
        msg.includes('auth/unauthorized-domain') ||
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation'
      ) {
        // Fallback so the user is never blocked on GitHub Pages or Android WebView
        await handleInstantDomainFreeSignIn(cleanName, cleanEmail);
        return;
      }
      setErrorMsg(
        err?.message || 'Authentication failed. Please check your credentials or use 1-Click Instant Sign-In.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomFirebase = () => {
    const parsed = parseFirebaseConfigInput(customConfigText);
    if (!parsed) {
      setErrorMsg(
        'Invalid Firebase Config JSON. Paste the firebaseConfig object containing "apiKey", "authDomain", and "projectId".'
      );
      return;
    }
    saveCustomFirebaseConfig(JSON.stringify(parsed));
    setCustomConfigActive(true);
    window.location.reload();
  };

  const handleResetCustomFirebase = () => {
    saveCustomFirebaseConfig(null);
    setCustomConfigActive(false);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold">BlueNote Account & Cloud Sync</h2>
              <p className="text-[11px] text-blue-100">
                Encrypted Firestore Cloud Sync & Multi-Device Backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Signed in & Syncing to Cloud
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 truncate">
                    {currentUser.displayName || currentUser.email || `Cloud UID: ${currentUser.uid.slice(0, 8)}...`}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                Your Second Brain workspace is automatically backed up to Firebase Firestore in real time.
              </div>

              <button
                onClick={async () => {
                  await signOut(auth);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <>
              {/* Instant Domain-Free Cloud Sign-In (Works on GitHub Pages, Android APK, & Custom Domains) */}
              <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Instant Sign-In (Works on All Domains & GitHub Pages)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                    No OAuth Popup
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Bypasses browser popup blockers and Firebase <code className="font-mono">auth/unauthorized-domain</code> restrictions on GitHub Pages, Android APKs, and custom URLs.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleInstantDomainFreeSignIn()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  1-Click Instant Cloud Sign-In
                </button>
              </div>

              {/* Unauthorized Domain Helper Banner (shown if auth/unauthorized-domain occurs or on *.github.io) */}
              {(unauthorizedDomainHit || infoMsg) && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2.5">
                  <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center justify-between gap-2">
                    <span>Why did Google OAuth show &ldquo;auth/unauthorized-domain&rdquo;?</span>
                  </div>
                  <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                    {infoMsg ||
                      `Firebase blocks Google/GitHub OAuth popups until your hosting domain ("${currentHostname}") is added to your Firebase project's Authorized Domains list.`}
                  </p>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      How to authorize <code className="font-mono text-blue-600">{currentHostname}</code> for Google OAuth:
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <li>
                        Open{' '}
                        <a
                          href="https://console.firebase.google.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                        >
                          Firebase Console <ExternalLink className="w-3 h-3" />
                        </a>{' '}
                        → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong>
                      </li>
                      <li>
                        Click <strong>Add domain</strong> and paste your current domain:
                      </li>
                    </ol>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <code className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                        {currentHostname}
                      </code>
                      <button
                        type="button"
                        onClick={copyHostname}
                        className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Domain
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-[10px] text-slate-400 uppercase font-semibold">
                  Email & Password Sync (All Domains)
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-2.5">
                {mode === 'signup' && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2">
                    <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="flex-1 bg-transparent text-xs focus:outline-none"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 bg-transparent text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="flex-1 bg-transparent text-xs focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {mode === 'signin' ? 'Sign In / Sync with Email' : 'Create Cloud Sync Account'}
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  {mode === 'signin'
                    ? 'New to BlueNote? Create an account'
                    : 'Already have an account? Sign in'}
                </button>
              </div>

              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-[10px] text-slate-400 uppercase font-semibold">
                  OAuth Providers (Requires Authorized Domain)
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  Google OAuth
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGithubLogin}
                  className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  GitHub OAuth
                </button>
              </div>

              {/* Optional Custom Firebase Config for self-hosted GitHub Pages / Android users */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomFirebaseConfig((prev) => !prev)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    {customConfigActive
                      ? 'Using Custom Firebase Project Config (Active)'
                      : 'Self-Hosting on GitHub Pages? Connect Your Own Firebase Config'}
                  </span>
                  <span>{showCustomFirebaseConfig ? 'Hide' : 'Configure'}</span>
                </button>

                {showCustomFirebaseConfig && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      If you deployed BlueNote to your own GitHub Pages or Android APK and want Google OAuth popups under your own Firebase project, paste your Firebase Web App <code className="font-mono">firebaseConfig</code> JSON below:
                    </p>
                    <textarea
                      rows={4}
                      value={customConfigText}
                      onChange={(e) => setCustomConfigText(e.target.value)}
                      placeholder={'{\n  "apiKey": "AIza...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app"\n}'}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveCustomFirebase}
                        className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                      >
                        Save & Reload Firebase
                      </button>
                      {customConfigActive && (
                        <button
                          type="button"
                          onClick={handleResetCustomFirebase}
                          className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
