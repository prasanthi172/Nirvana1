import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Shield, User, LogOut, Settings, ChevronDown, CheckCircle2, X, Building2, Mail, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { writeAuditLogToFirestore } from '../components/AuditLogTable';

export type UserRole = 'ADMINISTRATOR' | 'MONITORING_OFFICER' | 'POLICY_ANALYST' | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  lastLoginAt?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: 'Administrator',
  MONITORING_OFFICER: 'Monitoring Officer',
  POLICY_ANALYST: 'Policy Analyst',
  VIEWER: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMINISTRATOR: 'Full system administration, dataset governance, ML pipeline control, user role management, and audit logs.',
  MONITORING_OFFICER: 'Operational project tracking, early warning triage, cost/schedule risk inspection, and executive reporting.',
  POLICY_ANALYST: 'Macro sector & ministry analytics, cross-corridor benchmarking, cost/schedule trends, and ML model insights.',
  VIEWER: 'Read-only access to national infrastructure dashboards, project explorer, project details, and basic analytics.',
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, isDemoQuickLogin?: boolean) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    organization: string;
    role: UserRole;
  }) => Promise<{ ok: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { name: string; organization: string }) => Promise<{ ok: boolean; error?: string }>;
  logAuditAction: (action: string, details: string) => Promise<void>;
  openProfileModal: (tab?: 'profile' | 'settings') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN_KEY = 'nirvana_gov_auth_token_v1';
const STORAGE_USER_KEY = 'nirvana_gov_auth_user_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'profile' | 'settings'>('profile');
  const [editName, setEditName] = useState<string>('');
  const [editOrg, setEditOrg] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Verify token session on mount
  useEffect(() => {
    let active = true;
    async function verifySession() {
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.user) {
            setUser(data.user);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
          }
        } else {
          if (active) {
            setUser(null);
            setToken(null);
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            localStorage.removeItem(STORAGE_USER_KEY);
          }
        }
      } catch {
        // Keep cached user if network hiccup
      } finally {
        if (active) setLoading(false);
      }
    }
    verifySession();
    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string, isDemoQuickLogin = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isDemoQuickLogin }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Authentication failed.' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      return { ok: true, user: data.user };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Network error during login.' };
    }
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      organization: string;
      role: UserRole;
    }) => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Registration failed.' };
        }
        return { ok: true, message: data.message || 'Registration successful. Please login.' };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Network error during registration.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout network error
    } finally {
      setToken(null);
      setUser(null);
      setModalOpen(false);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  }, [token]);

  const updateProfile = useCallback(
    async (payload: { name: string; organization: string }) => {
      if (!token) return { ok: false, error: 'Not authenticated' };
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Failed to update profile' };
        }
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Failed to update profile' };
      }
    },
    [token]
  );

  const logAuditAction = useCallback(
    async (action: string, details: string) => {
      if (user) {
        writeAuditLogToFirestore({
          userName: user.name,
          role: user.role,
          action,
          details,
        }).catch(() => {});
      }
      if (!token) return;
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, details }),
        });
      } catch {
        // Non-blocking audit logging
      }
    },
    [token, user]
  );

  const openProfileModal = useCallback(
    (tab: 'profile' | 'settings' = 'profile') => {
      if (user) {
        setEditName(user.name);
        setEditOrg(user.organization);
      }
      setProfileNotice(null);
      setModalTab(tab);
      setModalOpen(true);
    },
    [user]
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    const res = await updateProfile({ name: editName, organization: editOrg });
    setSavingProfile(false);
    if (res.ok) {
      setProfileNotice('Profile updated and logged in system audit trail.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        logAuditAction,
        openProfileModal,
      }}
    >
      {children}

      {/* User Profile & Settings Modal */}
      {modalOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#0f172a] border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="text-blue-400" size={18} />
                <h3 className="text-base font-semibold text-white">
                  {modalTab === 'profile' ? 'Official User Profile' : 'Account & Session Settings'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-slate-700 bg-[#0f172a]/50 px-6 gap-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setModalTab('profile')}
                className={`py-3 border-b-2 transition-colors ${
                  modalTab === 'profile'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Profile & Clearance
              </button>
              <button
                type="button"
                onClick={() => setModalTab('settings')}
                className={`py-3 border-b-2 transition-colors ${
                  modalTab === 'settings'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Edit Details & Security
              </button>
            </div>

            <div className="p-6">
              {modalTab === 'profile' ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-lg">
                      {user.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{user.name}</div>
                      <div className="text-xs text-blue-400 font-medium">{ROLE_LABELS[user.role]}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                    </div>
                  </div>

                  <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Building2 size={13} /> Organization / Ministry
                      </span>
                      <span className="text-white font-medium text-right">{user.organization}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BadgeCheck size={13} /> Assigned System Role
                      </span>
                      <span className="text-blue-400 font-semibold">{ROLE_LABELS[user.role]} ({user.role})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Mail size={13} /> Official Email
                      </span>
                      <span className="text-slate-200 font-mono">{user.email}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Account Status</span>
                      <span className="text-emerald-400 font-medium">{user.status}</span>
                    </div>
                  </div>

                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3.5 text-xs text-slate-300 leading-relaxed">
                    <div className="text-white font-semibold mb-1">Role Access Clearance</div>
                    {ROLE_DESCRIPTIONS[user.role]}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileNotice && (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      <span>{profileNotice}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Organization / Ministry</label>
                    <input
                      type="text"
                      value={editOrg}
                      onChange={e => setEditOrg(e.target.value)}
                      required
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Assigned Role (Managed by System Administrator)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${ROLE_LABELS[user.role]} (${user.role})`}
                      className="w-full bg-[#0f172a]/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Top-Right User Profile Component (Section 10)
 * Displays User Name, Email, Role, and Dropdown with Profile, Settings, Logout
 */
export function UserProfileDropdown() {
  const { user, logout, openProfileModal } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/welcome');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-3 pl-3 pr-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800/90 border border-slate-700 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600/25 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-xs font-semibold text-white">{user.name}</div>
          <div className="text-[11px] text-blue-400">{ROLE_LABELS[user.role]}</div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 bg-[#0f172a]/90 border-b border-slate-700/80">
              <div className="text-sm font-semibold text-white truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate mt-0.5">{user.email}</div>
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Clearance</span>
                <span className="text-blue-400 font-semibold">{ROLE_LABELS[user.role]}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-1">{user.organization}</div>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openProfileModal('profile');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <User size={14} className="text-blue-400" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (user.role === 'ADMINISTRATOR') {
                    navigate('/admin');
                  } else {
                    openProfileModal('settings');
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <Settings size={14} className="text-slate-400" />
                <span>Settings</span>
              </button>

              <div className="my-1 border-t border-slate-700/70" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors text-left font-medium"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
