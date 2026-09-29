import { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Database, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuditLogTable from '../components/AuditLogTable';

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function Admin() {
  const { token } = useAuth();
  const [training, setTraining] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminTelemetry = async () => {
    if (!token) return;
    try {
      const [sysRes, logRes] = await Promise.all([
        fetch('/api/admin/system-status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sysRes.ok) {
        const sysData = await sysRes.json();
        setSystemStatus(sysData);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setAuditLogs(logData.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminTelemetry();
  }, [token]);

  const handleRetrain = async () => {
    if (!token) return;
    setTraining(true);
    setNotice(null);
    try {
      const res = await fetch('/api/ml/retrain', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Retraining failed');
      await fetchAdminTelemetry();
      setNotice({
        type: 'success',
        text: 'ML predictive ensemble (Random Forest, Gradient Boosting & Isolation Forest) retrained and logged in Audit Trail.',
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed to retrain ML models.' });
    } finally {
      setTraining(false);
    }
  };

  const actionTypes = ['ALL', 'LOGIN', 'LOGOUT', 'REGISTER', 'VIEW_PROJECT', 'EXPORT_REPORT', 'UPLOAD_DATA', 'CHANGE_USER_ROLE', 'RETRAIN_MODEL'];

  const filteredLogs = auditLogs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">System Settings, ML Pipeline & Audit Trail</h2>
          <p className="text-slate-400 text-sm">
            Administrator console for ML model status, data quality telemetry, user governance, and immutable system audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/users"
            className="px-3.5 py-2 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Manage Users
          </Link>
          <Link
            to="/data"
            className="px-3.5 py-2 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Dataset Administration
          </Link>
          <button
            type="button"
            onClick={handleRetrain}
            disabled={training}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={training ? 'animate-spin' : ''} />
            {training ? 'Retraining Models…' : 'Retrain ML Pipeline'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            notice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : 'bg-red-950/40 border-red-700/60 text-red-300'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* System Status, Data Quality, and Model Status Cards */}
      {systemStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: System & Auth Status */}
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                System & Security Status
              </h3>
              <span className="text-xs font-semibold text-emerald-400">{systemStatus.status}</span>
            </div>
            <div className="space-y-2 text-xs tabular-nums">
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Monitored Infrastructure Projects</span>
                <span className="text-white font-semibold">{systemStatus.projectsCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Active Registered Users</span>
                <span className="text-white font-semibold">
                  {systemStatus.activeUsersCount} / {systemStatus.totalUsersCount}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Active Bearer Sessions</span>
                <span className="text-blue-400 font-semibold">{systemStatus.activeSessionsCount}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Recorded Audit Events</span>
                <span className="text-white font-semibold">{systemStatus.auditEventsCount}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Data Quality Status */}
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database size={16} className="text-blue-400" />
                Data Quality Status
              </h3>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {systemStatus.dataQuality?.overallQualityScore}% Score
              </span>
            </div>
            <div className="space-y-2 text-xs tabular-nums">
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Active Dataset</span>
                <span className="text-white font-medium truncate max-w-[180px]">
                  {systemStatus.dataQuality?.datasetName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Completeness / Validity</span>
                <span className="text-white font-semibold">
                  {systemStatus.dataQuality?.completeness}% · {systemStatus.dataQuality?.validity}%
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Uniqueness / Consistency</span>
                <span className="text-white font-semibold">
                  {systemStatus.dataQuality?.uniqueness}% · {systemStatus.dataQuality?.consistency}%
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Last Ingestion</span>
                <span className="text-slate-300">
                  {systemStatus.dataQuality?.uploadedAt
                    ? new Date(systemStatus.dataQuality.uploadedAt).toLocaleDateString()
                    : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: ML Model Status */}
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu size={16} className="text-indigo-400" />
                ML Model Ensemble Status
              </h3>
              <span className="text-xs font-semibold text-emerald-400">ONLINE</span>
            </div>
            <div className="space-y-2.5 text-xs tabular-nums">
              {(systemStatus.models || []).map((m: any) => (
                <div key={m.name} className="py-1.5 border-b border-slate-700/60 last:border-0">
                  <div className="flex justify-between text-white font-medium">
                    <span>{m.name}</span>
                    <span className="text-emerald-400">{m.status}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 mt-0.5">
                    <span>{m.metricLabel}</span>
                    <span className="text-blue-400 font-semibold">{m.metricValue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Institutional Audit Log Table (Firestore + Server Telemetry) */}
      <AuditLogTable initialServerLogs={auditLogs} />
    </div>
  );
}
