import { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle2, AlertTriangle, Search, UserCheck, UserX } from 'lucide-react';
import { useAuth, UserRole, ROLE_LABELS } from '../context/AuthContext';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  lastLoginAt?: string;
}

export default function UserManagement() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!token) return;
    setStatusNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusNotice({ type: 'error', text: data.error || 'Failed to update role.' });
        return;
      }
      setUsers(prev => prev.map(u => (u.id === userId ? data.user : u)));
      setStatusNotice({
        type: 'success',
        text: `Updated role for ${data.user.name} to ${ROLE_LABELS[data.user.role]} and recorded CHANGE_USER_ROLE in Audit Log.`,
      });
    } catch {
      setStatusNotice({ type: 'error', text: 'Network error while updating user role.' });
    }
  };

  const handleToggleStatus = async (u: ManagedUser) => {
    if (!token) return;
    setStatusNotice(null);
    const nextStatus = u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${u.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusNotice({ type: 'error', text: data.error || 'Failed to change user status.' });
        return;
      }
      setUsers(prev => prev.map(item => (item.id === u.id ? data.user : item)));
      setStatusNotice({
        type: 'success',
        text: `Account for ${data.user.name} is now ${data.user.status}.`,
      });
    } catch {
      setStatusNotice({ type: 'error', text: 'Network error while updating account status.' });
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">User & Role Governance (Administrator)</h2>
          <p className="text-slate-400 text-sm">
            View registered NIRVANA officials, manage role clearances, and activate or deactivate accounts.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, organization..."
            className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Registered Users</div>
          <div className="text-2xl font-bold text-white mt-1">{users.length}</div>
        </div>
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4">
          <div className="text-xs text-slate-400">Active Accounts</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4">
          <div className="text-xs text-slate-400">Monitoring Officers</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {users.filter(u => u.role === 'MONITORING_OFFICER').length}
          </div>
        </div>
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4">
          <div className="text-xs text-slate-400">Policy Analysts & Viewers</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {users.filter(u => u.role === 'POLICY_ANALYST' || u.role === 'VIEWER').length}
          </div>
        </div>
      </div>

      {statusNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : 'bg-red-950/40 border-red-700/60 text-red-300'
          }`}
        >
          {statusNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading registered users...</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300 tabular-nums">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 pr-4">Official Name & Email</th>
                <th className="py-3 px-3">Organization / Ministry</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Account Status</th>
                <th className="py-3 px-3">Last Login</th>
                <th className="py-3 pl-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredUsers.map(u => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isSelf && <span className="text-[10px] text-blue-400 font-normal">(You)</span>}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">{u.organization}</td>
                    <td className="py-3.5 px-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="ADMINISTRATOR">Administrator</option>
                        <option value="MONITORING_OFFICER">Monitoring Officer</option>
                        <option value="POLICY_ANALYST">Policy Analyst</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-semibold ${
                          u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <button
                        type="button"
                        disabled={isSelf && u.status === 'ACTIVE'}
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                          u.status === 'ACTIVE'
                            ? 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60'
                            : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <UserX size={13} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
