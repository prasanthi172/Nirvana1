import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Download,
  Database,
  CheckCircle2,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, UserRole } from '../context/AuthContext';

export interface AuditLogRecord {
  id: string;
  uid: string;
  userName: string;
  userEmail?: string;
  role: UserRole | 'SYSTEM' | string;
  action: string;
  details: string;
  timestamp: string;
  source: 'Firestore' | 'Server';
}

const VALID_ROLES = ['ADMINISTRATOR', 'MONITORING_OFFICER', 'POLICY_ANALYST', 'VIEWER', 'SYSTEM'] as const;

export async function writeAuditLogToFirestore(params: {
  userName: string;
  role: string;
  action: string;
  details: string;
}) {
  const currentFbUser = auth.currentUser;
  if (!currentFbUser) return null;

  const logId = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const safeUid = currentFbUser.uid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
  const safeUserName = (params.userName || currentFbUser.displayName || 'NIRVANA Official').trim().slice(0, 100);
  const safeRole = VALID_ROLES.includes(params.role as any) ? params.role : 'ADMINISTRATOR';
  const safeAction =
    params.action
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 64) || 'SYSTEM_ACTION';
  const safeDetails = (params.details || 'Action recorded in NIRVANA audit log').trim().slice(0, 300);

  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      uid: safeUid,
      userName: safeUserName,
      role: safeRole,
      action: safeAction,
      details: safeDetails,
      createdAt: serverTimestamp(),
    });
    return logId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return null;
  }
}

export default function AuditLogTable({
  initialServerLogs = [],
}: {
  initialServerLogs?: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    role: string;
    action: string;
    details: string;
    timestamp: string;
  }>;
}) {
  const { user, token } = useAuth();
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);

  const [firestoreLogs, setFirestoreLogs] = useState<AuditLogRecord[]>([]);
  const [serverLogs, setServerLogs] = useState<AuditLogRecord[]>([]);
  const [loadingFirestore, setLoadingFirestore] = useState<boolean>(false);
  const [syncingToFirestore, setSyncingToFirestore] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Search and Filter Controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'Firestore' | 'Server'>('ALL');

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, current => {
      setFbUser(current);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load Server Audit Logs fallback/sync
  const fetchServerLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: AuditLogRecord[] = (data.logs || []).map((l: any) => ({
          id: l.id,
          uid: l.userId || 'SYSTEM',
          userName: l.userName || 'System Official',
          userEmail: l.userEmail,
          role: l.role || 'ADMINISTRATOR',
          action: l.action || 'LOGIN',
          details: l.details || '',
          timestamp: l.timestamp || new Date().toISOString(),
          source: 'Server',
        }));
        setServerLogs(mapped);
      }
    } catch {
      // Ignore network hiccup
    }
  };

  useEffect(() => {
    if (initialServerLogs.length > 0) {
      setServerLogs(
        initialServerLogs.map(l => ({
          id: l.id,
          uid: l.userId || 'SYSTEM',
          userName: l.userName,
          userEmail: l.userEmail,
          role: l.role,
          action: l.action,
          details: l.details,
          timestamp: l.timestamp,
          source: 'Server',
        }))
      );
    } else {
      fetchServerLogs();
    }
  }, [initialServerLogs, token]);

  // Real-time Firestore query on `audit_logs` collection
  useEffect(() => {
    if (!authReady || !fbUser) {
      setFirestoreLogs([]);
      return;
    }

    setLoadingFirestore(true);
    const isBootstrappedAdmin =
      fbUser.emailVerified && fbUser.email === 'prasanthipothireddi728@gmail.com';

    const auditCollectionRef = collection(db, 'audit_logs');
    const q = isBootstrappedAdmin
      ? query(auditCollectionRef, orderBy('createdAt', 'desc'), limit(100))
      : query(auditCollectionRef, where('uid', '==', fbUser.uid), limit(100));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const records: AuditLogRecord[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let isoTime = new Date().toISOString();
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            isoTime = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            isoTime = data.createdAt;
          }
          return {
            id: docSnap.id,
            uid: data.uid || fbUser.uid,
            userName: data.userName || 'Official',
            role: data.role || 'ADMINISTRATOR',
            action: data.action || 'SYSTEM_ACTION',
            details: data.details || '',
            timestamp: isoTime,
            source: 'Firestore',
          };
        });

        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setFirestoreLogs(records);
        setLoadingFirestore(false);
      },
      error => {
        setLoadingFirestore(false);
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      }
    );

    return () => unsubscribe();
  }, [authReady, fbUser]);

  // Connect Firebase Auth & Sync / Seed Audit Log Event to Firestore
  const handleConnectAndSyncFirestore = async () => {
    setSyncingToFirestore(true);
    setStatusBanner(null);
    try {
      let activeFbUser = auth.currentUser;
      if (!activeFbUser) {
        const cred = await signInWithPopup(auth, googleProvider);
        activeFbUser = cred.user;
      }
      if (activeFbUser) {
        await writeAuditLogToFirestore({
          userName: user?.name || activeFbUser.displayName || 'Dr. Rajeshwar Rao',
          role: user?.role || 'ADMINISTRATOR',
          action: 'AUDIT_SYNC',
          details: `Administrator synchronized audit trail with Firestore collection (audit_logs)`,
        });
        setStatusBanner('Connected to Firestore `audit_logs` collection and recorded live verification entry.');
      }
    } catch (err: any) {
      setStatusBanner(err?.message || 'Could not sign in to Firebase Auth popup.');
    } finally {
      setSyncingToFirestore(false);
    }
  };

  const handleRecordSampleFirestoreAction = async () => {
    if (!fbUser) {
      await handleConnectAndSyncFirestore();
      return;
    }
    setSyncingToFirestore(true);
    setStatusBanner(null);
    try {
      await writeAuditLogToFirestore({
        userName: user?.name || fbUser.displayName || 'Dr. Rajeshwar Rao',
        role: user?.role || 'ADMINISTRATOR',
        action: 'VIEW_PROJECT',
        details: 'Administrator executed real-time audit query on Firestore collection /audit_logs',
      });
      setStatusBanner('Recorded new audit log document in Firestore collection `/audit_logs`.');
    } finally {
      setSyncingToFirestore(false);
    }
  };

  // Merge Firestore documents with Server audit records (deduplicating by id)
  const combinedLogs = useMemo(() => {
    const map = new Map<string, AuditLogRecord>();
    firestoreLogs.forEach(item => map.set(item.id, item));
    serverLogs.forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [firestoreLogs, serverLogs]);

  const availableActions = useMemo(() => {
    const set = new Set<string>([
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'VIEW_PROJECT',
      'EXPORT_REPORT',
      'UPLOAD_DATA',
      'CHANGE_USER_ROLE',
      'RETRAIN_MODEL',
    ]);
    combinedLogs.forEach(l => {
      if (l.action) set.add(l.action);
    });
    return ['ALL', ...Array.from(set)];
  }, [combinedLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedLogs.filter(log => {
      const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;
      const matchesSearch =
        !q ||
        log.userName.toLowerCase().includes(q) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
        log.role.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.timestamp.toLowerCase().includes(q);
      return matchesRole && matchesAction && matchesSource && matchesSearch;
    });
  }, [combinedLogs, searchQuery, roleFilter, actionFilter, sourceFilter]);

  const handleExportAuditCsv = () => {
    if (!filteredLogs.length) return;
    const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action Taken', 'Details', 'Storage Source'];
    const rows = filteredLogs.map(l =>
      [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${(l.userName || '').replace(/"/g, '""')}"`,
        `"${l.role}"`,
        `"${l.action}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${l.source}"`,
      ].join(',')
    );
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `nirvana_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 space-y-5">
      {/* Header & Firestore Connection Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList size={18} className="text-blue-400" />
            <h3 className="text-base font-semibold text-white">
              System Activity & Firestore Audit Log Table
            </h3>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-400 tabular-nums">
              {filteredLogs.length} of {combinedLogs.length} events
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Queries the Firestore <span className="font-mono text-slate-300">/audit_logs</span> collection and server telemetry to display a searchable table of system actions including User, Role, Action Taken, and Timestamp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {fbUser ? (
            <button
              type="button"
              onClick={handleRecordSampleFirestoreAction}
              disabled={syncingToFirestore}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <PlusCircle size={13} />
              <span>{syncingToFirestore ? 'Writing to Firestore…' : 'Log Event to Firestore'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectAndSyncFirestore}
              disabled={syncingToFirestore}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Database size={13} />
              <span>{syncingToFirestore ? 'Connecting…' : 'Connect Google Auth for Live Firestore Sync'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchServerLogs}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loadingFirestore ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Download size={13} className="text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Multi-Facet Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by user, role, action taken, details, or timestamp..."
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <Filter size={13} className="text-slate-400 shrink-0 hidden sm:inline" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="MONITORING_OFFICER">Monitoring Officer</option>
            <option value="POLICY_ANALYST">Policy Analyst</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {availableActions.map(act => (
              <option key={act} value={act}>
                {act === 'ALL' ? 'All Actions' : act}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as any)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Sources ({combinedLogs.length})</option>
            <option value="Firestore">Firestore ({firestoreLogs.length})</option>
            <option value="Server">Server ({serverLogs.length})</option>
          </select>
        </div>
      </div>

      {/* Audit Log Data Table */}
      <div className="overflow-x-auto border border-slate-700/80 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300 tabular-nums">
          <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-3 px-4 font-medium">User</th>
              <th className="py-3 px-3 font-medium">Role</th>
              <th className="py-3 px-3 font-medium">Action Taken</th>
              <th className="py-3 px-3 font-medium">Action Details</th>
              <th className="py-3 px-3 font-medium">Source</th>
              <th className="py-3 px-4 font-medium text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No system audit log entries match the current search filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#0f172a]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{log.userName}</div>
                    {log.userEmail && (
                      <div className="text-[11px] font-mono text-slate-400">{log.userEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-blue-400 whitespace-nowrap">
                    {log.role}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-amber-300 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-md">{log.details}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        log.source === 'Firestore' ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {log.source}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
