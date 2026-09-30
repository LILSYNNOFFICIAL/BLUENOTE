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
} from 'lucide-react';
import {
  auth,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onUpdateLocalProfileName: (name: string, email: string) => void;
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
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
      setErrorMsg(
        err?.message || 'Unable to sign in with Google right now. Your workspace continues saving locally.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setErrorMsg(null);
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
      setErrorMsg(
        err?.message || 'GitHub OAuth requires provider setup in Firebase Console. Try Google Sign-In or Email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        onUpdateLocalProfileName(name.trim() || email.split('@')[0], email.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onUpdateLocalProfileName(
          cred.user.displayName || email.split('@')[0],
          cred.user.email || email.trim()
        );
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Authentication failed. Please check your credentials or use Google Sign-in.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">BlueNote Account & Cloud Sync</h2>
              <p className="text-[11px] text-blue-100">
                Encrypted Firestore Cloud Sync & Multi-Device Backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Signed in & Syncing to Cloud
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 truncate">
                    {currentUser.displayName || currentUser.email}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
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
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  Continue with Google (Recommended)
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGithubLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Continue with GitHub
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-[11px] text-slate-400 uppercase font-semibold">
                  Or with Email
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === 'signup' && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2">
                    <UserIcon className="w-4 h-4 text-slate-400" />
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
                  <Mail className="w-4 h-4 text-slate-400" />
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
                  <Lock className="w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
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
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold transition-colors"
                >
                  {mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
