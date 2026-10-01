import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  Mail,
  Lock,
  User as UserIcon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  Globe,
  FileText,
  Briefcase,
  Info,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  getFirebaseAuthDomain,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from '../firebase';
import { UserSettings, compressImageFileToDataUrl } from '../types/bluenote';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  settings?: UserSettings;
  onClose: () => void;
  onUpdateLocalProfileName: (name: string, email: string) => void;
  onUpdateProfileSettings?: (updates: Partial<UserSettings>) => void;
}

const BIO_QUICK_TEMPLATES = [
  'Founder & systems thinker building a calm, high-output Second Brain.',
  'Product architect focused on deep work, clear priorities, and zero inbox clutter.',
  'Creative strategist balancing ambitious projects with mindful daily routines.',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  settings,
  onClose,
  onUpdateLocalProfileName,
  onUpdateProfileSettings,
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState(settings?.email || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(settings?.name || '');
  const [roleTitle, setRoleTitle] = useState(settings?.roleTitle || '');
  const [bio, setBio] = useState(settings?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(settings?.avatarUrl || '');
  const [authDomainAlias, setAuthDomainAlias] = useState(getFirebaseAuthDomain());
  const [showDomainInfo, setShowDomainInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser?.displayName || settings?.name || '');
      setEmail(currentUser?.email || settings?.email || '');
      setRoleTitle(settings?.roleTitle || '');
      setBio(settings?.bio || '');
      setAvatarUrl(settings?.avatarUrl || currentUser?.photoURL || '');
      setAuthDomainAlias(getFirebaseAuthDomain());
      setError(null);
    }
  }, [isOpen, currentUser, settings]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }
    setPhotoUploading(true);
    setError(null);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, 256, 0.85);
      setAvatarUrl(compressedDataUrl);
      if (onUpdateProfileSettings) {
        onUpdateProfileSettings({ avatarUrl: compressedDataUrl });
      }
    } catch (err: any) {
      setError(err?.message || 'Could not process photograph.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const syncProfileFields = (targetName: string, targetEmail: string) => {
    onUpdateLocalProfileName(targetName, targetEmail);
    if (onUpdateProfileSettings) {
      onUpdateProfileSettings({
        name: targetName,
        email: targetEmail,
        roleTitle: roleTitle.trim(),
        bio: bio.trim(),
        avatarUrl,
        authDomainAlias: getFirebaseAuthDomain(),
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const finalName =
          displayName.trim() || result.user.displayName || 'BlueNote User';
        const finalEmail = result.user.email || email.trim();
        const finalAvatar = avatarUrl || result.user.photoURL || '';
        onUpdateLocalProfileName(finalName, finalEmail);
        if (onUpdateProfileSettings) {
          onUpdateProfileSettings({
            name: finalName,
            email: finalEmail,
            roleTitle: roleTitle.trim(),
            bio: bio.trim(),
            avatarUrl: finalAvatar,
            authDomainAlias: getFirebaseAuthDomain(),
          });
        }
      }
      onClose();
    } catch (err: any) {
      setError(
        err?.message?.includes('popup-closed-by-user')
          ? 'Sign-in popup was closed before completing.'
          : err?.message || 'Google Sign-In could not complete in this preview frame.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const finalName =
          displayName.trim() || email.split('@')[0] || 'BlueNote User';
        await updateProfile(cred.user, {
          displayName: finalName,
        });
        syncProfileFields(finalName, cred.user.email || email.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const finalName =
          displayName.trim() ||
          cred.user.displayName ||
          cred.user.email?.split('@')[0] ||
          'BlueNote User';
        syncProfileFields(finalName, cred.user.email || email.trim());
      }
      onClose();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        // Fallback: save profile directly into BlueNote workspace if Email/Password provider is disabled in Firebase console
        const fallbackName =
          displayName.trim() || email.split('@')[0] || 'BlueNote User';
        syncProfileFields(fallbackName, email.trim() || 'user@bluenote.local');
        onClose();
        return;
      }
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this site';
      setError(
        code === 'auth/unauthorized-domain'
          ? `Firebase rejected ${hostname}. Add ${hostname} to Firebase Console → Authentication → Settings → Authorized domains, then reload BlueNote.`
          : err?.message || 'Authentication failed. Check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileOnly = () => {
    const finalName =
      displayName.trim() ||
      currentUser?.displayName ||
      email.split('@')[0] ||
      'BlueNote User';
    const finalEmail =
      email.trim() || currentUser?.email || 'user@bluenote.local';
    syncProfileFields(finalName, finalEmail);
    onClose();
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error signing out');
    } finally {
      setLoading(false);
    }
  };

  const initials = (displayName || email || 'BN')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bn-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-5 py-4 text-white flex items-center justify-between border-b border-blue-500/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 shrink-0">
              <Cloud className="w-5 h-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/25 text-blue-200 border border-blue-400/30">
                  {authDomainAlias}
                </span>
                <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Identity
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight truncate mt-0.5">
                {currentUser
                  ? 'Executive Profile, Bio & Cloud Sync'
                  : mode === 'signup'
                  ? 'Create a BlueNote account'
                  : 'Sign in to BlueNote'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Domain Identity Banner & Info Toggle */}
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Active App Domain:{' '}
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {authDomainAlias}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainInfo((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1 shrink-0"
              >
                <Info className="w-3 h-3" />
                {showDomainInfo ? 'Hide Domain Settings' : 'Configure Domain'}
              </button>
            </div>

            {showDomainInfo && (
              <div className="pt-2 border-t border-blue-500/20 space-y-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Firebase Authentication Domain
                  </label>
                  <input
                    type="text"
                    value={authDomainAlias}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-1 leading-relaxed">
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    Why did Google Popup show &quot;ai-studio-applet-webapp-d45ee.firebaseapp.com&quot;?
                  </p>
                  <p>
                    1. <strong>Direct Sign-Up Below (Recommended)</strong>: Creating your account with Email, Password, Bio &amp; Photo right in this modal uses <strong>{authDomainAlias}</strong> directly without opening the raw GCP popup.
                  </p>
                  <p>
                    2. <strong>Google OAuth Popup</strong>: Google&apos;s external popup displays the underlying provisioned Firebase project host (<code className="font-mono">ai-studio-applet-webapp-d45ee.firebaseapp.com</code>) where <code className="font-mono">/__/auth/handler</code> is hosted. Firebase Authentication still requires the site hostname to be listed in Firebase Console → Authentication → Settings → Authorized domains.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Photograph Upload + Bio Studio (Available during Sign-Up AND when Signed In) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar Preview + Upload Trigger */}
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || 'Profile Photograph'}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center border-2 border-blue-400/40 shadow-md">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-2 border-white dark:border-slate-900 transition-transform hover:scale-105"
                  title="Upload Photograph"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {photoUploading
                      ? 'Processing Photo...'
                      : avatarUrl
                      ? 'Change Photograph'
                      : 'Upload Photograph'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        onUpdateProfileSettings?.({ avatarUrl: '' });
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Upload a JPG, PNG, or WebP portrait. Auto-cropped &amp; optimized for instant cloud sync.
                </p>
              </div>
            </div>

            {/* Name & Role/Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-blue-500" /> Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Jordan Vance"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-blue-500" /> Role / Title
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g., Founder & Product Architect"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bio Input */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-blue-500" /> Personal Bio &amp; Focus Mantra
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {bio.length}/280
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio, executive mission, or current focus..."
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-semibold text-slate-400">Quick Bio:</span>
                {BIO_QUICK_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBio(tpl)}
                    className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-300 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    Template {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Connected to {authDomainAlias}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {currentUser.displayName || displayName || 'BlueNote User'} •{' '}
                    {currentUser.email}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Real-time Cloud Sync active for your tasks, notes, bio &amp; photograph
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveProfileOnly}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Bio, Photo &amp; Profile
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Switch Tabs: Sign Up vs Sign In */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Account (Sign Up)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'signin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Direct Email + Password Sign Up / Sign In */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (6+ chars)"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-sm"
                >
                  {loading
                    ? 'Authenticating...'
                    : mode === 'signup'
                    ? `Create Account`
                    : `Sign In`}
                </button>
              </form>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  or single sign-on
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 dark:text-blue-600" />
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfileOnly}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Bio &amp; Photo Locally
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
