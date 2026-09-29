import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { ShieldCheck, LogIn, LogOut, UserCheck, X, Building2, BadgeCheck } from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';

export interface OfficialUserProfile {
  uid: string;
  displayName: string;
  ministry: string;
  designation: string;
}

interface AuthContextValue {
  user: User | null;
  profile: OfficialUserProfile | null;
  authReady: boolean;
  isModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithGoogle: (registrationOverrides?: {
    displayName?: string;
    ministry?: string;
    designation?: string;
  }) => Promise<void>;
  saveProfile: (input: {
    displayName: string;
    ministry: string;
    designation: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const MINISTRIES = [
  'Ministry of Statistics & Programme Implementation (MoSPI)',
  'Ministry of Road Transport & Highways (MoRTH)',
  'Ministry of Railways',
  'Ministry of Power',
  'Ministry of Petroleum & Natural Gas',
  'Ministry of Coal',
  'Ministry of Housing & Urban Affairs',
];

function sanitizeField(val: string, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OfficialUserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${currentUser.uid}`;
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: currentUser.uid,
            displayName: data.displayName || currentUser.displayName || 'Ministry Official',
            ministry: data.ministry || MINISTRIES[0],
            designation: data.designation || 'Senior Infrastructure Analyst',
          });
        } else {
          const defaultProfile: OfficialUserProfile = {
            uid: currentUser.uid,
            displayName: sanitizeField(currentUser.displayName || 'Ministry Official', 100, 'Ministry Official'),
            ministry: MINISTRIES[0],
            designation: 'Senior Infrastructure Analyst',
          };

          const batch = writeBatch(db);
          batch.set(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            displayName: defaultProfile.displayName,
            ministry: defaultProfile.ministry,
            designation: defaultProfile.designation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          if (currentUser.email) {
            batch.set(doc(db, 'users', currentUser.uid, 'private', 'info'), {
              uid: currentUser.uid,
              email: sanitizeField(currentUser.email, 254, 'official@nirvana.gov.in'),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          await batch.commit();
          setProfile(defaultProfile);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (registrationOverrides?: {
    displayName?: string;
    ministry?: string;
    designation?: string;
  }) => {
    const cred = await signInWithPopup(auth, googleProvider);
    const signedInUser = cred.user;
    if (registrationOverrides && signedInUser) {
      const displayName = sanitizeField(
        registrationOverrides.displayName || signedInUser.displayName || 'Ministry Official',
        100,
        'Ministry Official'
      );
      const ministry = sanitizeField(registrationOverrides.ministry || MINISTRIES[0], 120, MINISTRIES[0]);
      const designation = sanitizeField(
        registrationOverrides.designation || 'Senior Infrastructure Analyst',
        120,
        'Senior Infrastructure Analyst'
      );

      const userRef = doc(db, 'users', signedInUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, {
            displayName,
            ministry,
            designation,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(userRef, {
            uid: signedInUser.uid,
            displayName,
            ministry,
            designation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        setProfile({ uid: signedInUser.uid, displayName, ministry, designation });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${signedInUser.uid}`);
      }
    }
  };

  const saveProfile = async (input: {
    displayName: string;
    ministry: string;
    designation: string;
  }) => {
    if (!user) return;
    const displayName = sanitizeField(input.displayName, 100, 'Ministry Official');
    const ministry = sanitizeField(input.ministry, 120, MINISTRIES[0]);
    const designation = sanitizeField(input.designation, 120, 'Senior Infrastructure Analyst');

    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        displayName,
        ministry,
        designation,
        updatedAt: serverTimestamp(),
      });
      setProfile({
        uid: user.uid,
        displayName,
        ministry,
        designation,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        isModalOpen,
        openAuthModal: () => setIsModalOpen(true),
        closeAuthModal: () => setIsModalOpen(false),
        signInWithGoogle,
        saveProfile,
        signOut,
      }}
    >
      {children}
      <AuthModal />
    </AuthContext.Provider>
  );
}

export function HeaderAuthControls() {
  const { user, profile, openAuthModal, signOut } = useAuth();

  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
      >
        <LogIn size={13} />
        Login / Register
      </button>
    );
  }

  const initials = (profile?.displayName || user.displayName || 'MO')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={openAuthModal}
        className="flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-left transition-colors"
        title="View or update Official Registration Profile"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
          {initials}
        </div>
        <div className="hidden md:block">
          <div className="text-[11px] font-semibold text-white leading-tight max-w-[130px] truncate">
            {profile?.displayName || user.displayName || 'Official'}
          </div>
          <div className="text-[9px] text-emerald-400 leading-tight truncate max-w-[130px]">
            {profile?.designation || 'Verified Official'}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={signOut}
        title="Sign Out"
        className="p-1.5 bg-[#0f172a] hover:bg-red-950/50 border border-slate-700 hover:border-red-800/60 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}

export default function AuthModal() {
  const {
    user,
    profile,
    isModalOpen,
    closeAuthModal,
    signInWithGoogle,
    saveProfile,
    signOut,
  } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [ministry, setMinistry] = useState(MINISTRIES[0]);
  const [designation, setDesignation] = useState('Joint Secretary / Project Director');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setMinistry(profile.ministry);
      setDesignation(profile.designation);
    }
  }, [profile]);

  if (!isModalOpen) return null;

  const handleGoogleAction = async () => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (tab === 'register') {
        await signInWithGoogle({
          displayName: displayName || undefined,
          ministry,
          designation,
        });
        setStatusMessage('Official account registered and synced with Firestore.');
      } else {
        await signInWithGoogle();
        setStatusMessage('Authenticated successfully with Google Sign-In.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await saveProfile({ displayName, ministry, designation });
      setStatusMessage('Official workspace profile updated in Firestore.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {user ? 'Official Account & Ministry Profile' : 'NIRVANA Official Authentication'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Firebase Authentication &amp; Zero-Trust Firestore Profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!user ? (
            <>
              {/* Login / Register Mode Switcher */}
              <div className="grid grid-cols-2 bg-[#0f172a] p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    tab === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    tab === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register Official
                </button>
              </div>

              {tab === 'register' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Official Full Name (max 100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="e.g., Dr. R. K. Sharma"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Line Ministry / Department
                    </label>
                    <select
                      value={ministry}
                      onChange={e => setMinistry(e.target.value)}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {MINISTRIES.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Functional Designation (max 120 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g., Joint Secretary / Senior Risk Analyst"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleAction}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <LogIn size={15} />
                {busy
                  ? 'Connecting to Google Auth…'
                  : tab === 'register'
                  ? 'Register & Continue with Google'
                  : 'Sign In with Google Account'}
              </button>

              <div className="bg-[#0f172a]/80 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed">
                Uses verified Google OAuth popup authentication (<code className="text-slate-300">signInWithPopup</code>) and isolates PII in Firestore under hardened zero-trust security rules.
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UserCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {profile?.displayName || user.displayName}
                    </span>
                    <BadgeCheck size={14} className="text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Official Display Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    <Building2 size={12} className="inline mr-1 text-blue-400" />
                    Line Ministry / Department
                  </label>
                  <select
                    value={ministry}
                    onChange={e => setMinistry(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {MINISTRIES.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Official Designation
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {busy ? 'Saving…' : 'Save Official Profile'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    closeAuthModal();
                  }}
                  className="py-2 px-3.5 bg-[#0f172a] hover:bg-red-950/60 border border-slate-700 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            </form>
          )}

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
              {statusMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs break-words">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
