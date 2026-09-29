import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Activity,
  AlertTriangle,
  Users,
  Database,
  Cpu,
  BellRing,
  Scale,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ProjectHealthCard from '../components/ProjectHealthCard';
import SubSectorAnomalyHeatmap from '../components/SubSectorAnomalyHeatmap';
import { generateAndDownloadDashboardPdf } from '../utils/pdfReportGenerator';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token, logAuditAction } = useAuth();
  const [data, setData] = useState<any>(null);
  const [adminSummary, setAdminSummary] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMINISTRATOR' && token) {
      Promise.all([
        fetch('/api/admin/system-status', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ])
        .then(([sys, logs]) => {
          setAdminSummary({
            system: sys,
            recentLogs: (logs?.logs || []).slice(0, 4),
          });
        })
        .catch(() => {});
    }
  }, [user, token]);

  if (!data) return <div className="p-8 text-center text-slate-400">Loading infrastructure intelligence...</div>;

  const riskData = data.riskDistribution || [
    { name: 'Low', value: 45, color: '#22c55e' },
    { name: 'Moderate', value: 35, color: '#eab308' },
    { name: 'High', value: 18, color: '#f97316' },
    { name: 'Critical', value: 6, color: '#ef4444' },
  ];

  const sectorData = data.sectorBreakdown || [
    { name: 'Roads', cost: 12500, revised: 14200 },
    { name: 'Railways', cost: 18400, revised: 21000 },
    { name: 'Power', cost: 9200, revised: 10500 },
    { name: 'Petroleum', cost: 13900, revised: 15300 },
  ];

  const allProjects: any[] = data.projects || data.projectHealth?.watchlist || [];
  const attentionProjects = [...allProjects]
    .filter(p => p.overall_risk_score >= 50 || p.cost_overrun_pct > 25)
    .sort((a, b) => b.overall_risk_score - a.overall_risk_score)
    .slice(0, 5);

  const ministryCount = new Set(allProjects.map(p => p.ministry)).size;
  const isViewer = user?.role === 'VIEWER';

  const handleExportBrief = async () => {
    await generateAndDownloadDashboardPdf();
    await logAuditAction('EXPORT_REPORT', 'Generated Executive Brief PDF from Dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Header & Role Greeting */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-400 mb-1">
            {user?.role === 'ADMINISTRATOR'
              ? 'System Administration'
              : user?.role === 'MONITORING_OFFICER'
              ? 'Welcome back, Monitoring Officer'
              : user?.role === 'POLICY_ANALYST'
              ? 'Welcome back, Policy Analyst'
              : 'Welcome to NIRVANA'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {user ? `${user.name} · ${ROLE_LABELS[user.role]} Dashboard` : 'Executive Overview'}
          </h2>
          <p className="text-slate-400 text-sm">
            {user?.organization
              ? `${user.organization} — National Infrastructure Risk & Vision Analytics Network`
              : 'From project data to predictive risk intelligence.'}
          </p>
        </div>

        {!isViewer && (
          <button
            type="button"
            onClick={handleExportBrief}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <FileTextIcon />
            Generate Executive Brief
          </button>
        )}
      </div>

      {/* =====================================================================
          ROLE-PERSONALIZED BRIEFING PANEL (Section 13)
         ===================================================================== */}
      {user?.role === 'MONITORING_OFFICER' && (
        <div className="bg-[#1e293b] border border-blue-800/60 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <BellRing size={17} className="text-amber-400" />
                Welcome back, Monitoring Officer — Operational Action Briefing
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Projects requiring immediate attention, high-risk corridors, early warnings, and recent milestone updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/warnings"
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>Early Warnings ({data.criticalEarlyWarnings})</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/projects"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Inspect All Projects
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Projects Requiring Attention</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{data.highRiskProjects}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Risk Score ≥ 50 / 100</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Critical Early Warnings</div>
              <div className="text-xl font-bold text-red-400 mt-1">{data.criticalEarlyWarnings}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Multi-factor escalation alerts</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Cost-Escalated Projects</div>
              <div className="text-xl font-bold text-white mt-1">{data.projectsWithCostOverrun}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Revised cost &gt; original sanction</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Schedule-Slipped Corridors</div>
              <div className="text-xl font-bold text-white mt-1">{data.projectsWithTimeOverrun}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mean delay: {data.projectHealth?.avgDelayDays || 0} days</div>
            </div>
          </div>

          {attentionProjects.length > 0 && (
            <div className="overflow-x-auto pt-1">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Priority Projects Requiring Immediate Officer Review
              </div>
              <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-1.5 pr-3">Code</th>
                    <th className="py-1.5 px-3">Project Name</th>
                    <th className="py-1.5 px-3">Sector</th>
                    <th className="py-1.5 px-3 text-right">Cost Overrun</th>
                    <th className="py-1.5 px-3 text-right">Physical Progress</th>
                    <th className="py-1.5 pl-3 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attentionProjects.map(p => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3 font-mono text-blue-400">{p.id}</td>
                      <td className="py-2 px-3 text-white font-medium">{p.name}</td>
                      <td className="py-2 px-3 text-slate-400">{p.sector}</td>
                      <td className="py-2 px-3 text-right text-amber-400">+{p.cost_overrun_pct}%</td>
                      <td className="py-2 px-3 text-right">{p.physical_progress}%</td>
                      <td className="py-2 pl-3 text-right font-bold text-red-400">{p.overall_risk_score} / 100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {user?.role === 'POLICY_ANALYST' && (
        <div className="bg-[#1e293b] border border-indigo-800/60 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Scale size={17} className="text-indigo-400" />
                Welcome back, Policy Analyst — Macro Sector, Ministry & Benchmarking Brief
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sector risk distribution, ministry comparisons, cost escalation analysis, schedule trends, and benchmarking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/benchmarking"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>Open Benchmarking Matrix</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/ml"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Model Insights
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Sector Risk Index</div>
              <div className="text-xl font-bold text-white mt-1">{data.projectHealth?.avgOverallRisk} / 100</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Across {sectorData.length} major sectors</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Central Ministries</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">{ministryCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active line ministries</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Net Cost Escalation</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                +{data.projectHealth?.portfolioCostVariancePct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sanctioned vs. Revised</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Mean Schedule Delay</div>
              <div className="text-xl font-bold text-white mt-1">{data.projectHealth?.avgDelayDays} days</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.projectHealth?.delayedCount} delayed projects</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Expenditure Utilization</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {data.projectHealth?.portfolioExpenditurePct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mean Progress: {data.projectHealth?.avgProgress}%</div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'VIEWER' && (
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye size={17} className="text-blue-400" />
              Welcome to NIRVANA — Read-Only Public Oversight View
            </h3>
            <p className="text-xs text-slate-400">
              You have read-only access to the Project Overview, Project Details, Basic Risk Intelligence, and Basic Analytics. Data upload, user management, and administrative settings are restricted.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/projects"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Explore Projects
            </Link>
            <Link
              to="/analytics"
              className="px-3.5 py-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Basic Analytics
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'ADMINISTRATOR' && (
        <div className="bg-[#1e293b] border border-blue-800/70 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Cpu size={17} className="text-blue-400" />
                System Administration — Platform, Data Quality, Models & User Governance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time administrative telemetry across dataset quality, ML pipeline readiness, registered users, and audit activity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/users"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Users size={13} className="text-blue-400" />
                <span>Manage Users</span>
              </Link>
              <Link
                to="/data"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Database size={13} className="text-emerald-400" />
                <span>Dataset Governance</span>
              </Link>
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Audit Logs & Settings
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">System Status</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {adminSummary?.system?.status || 'OPERATIONAL'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.totalProjects} active project records</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Data Quality Score</div>
              <div className="text-lg font-bold text-white mt-1">
                {adminSummary?.system?.dataQuality?.overallQualityScore ?? 98.4}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">MoSPI schema validated</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">ML Models Status</div>
              <div className="text-lg font-bold text-blue-400 mt-1">3 / 3 READY</div>
              <div className="text-[11px] text-slate-500 mt-0.5">RF · Gradient Boosting · IsoForest</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Registered Users</div>
              <div className="text-lg font-bold text-white mt-1">
                {adminSummary?.system?.activeUsersCount ?? 4} Active
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {adminSummary?.system?.auditEventsCount ?? 3} Audit Log events
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Projects" value={data.totalProjects} icon={<Activity />} />
        <KpiCard title="Total Original Cost" value={`₹${(data.totalOriginalCost / 1000).toFixed(1)}k Cr`} icon={<TrendingUp />} />
        <KpiCard title="High-Risk Projects" value={data.highRiskProjects} alert icon={<AlertTriangle />} />
        <KpiCard title="Critical Warnings" value={data.criticalEarlyWarnings} alert icon={<ShieldAlert />} />
      </div>

      {/* Project Health Summary Card */}
      {data.projectHealth && (
        <ProjectHealthCard
          health={data.projectHealth}
          totalProjects={data.totalProjects}
          totalOriginalCost={data.totalOriginalCost}
          totalRevisedCost={data.totalRevisedCost || data.totalOriginalCost}
        />
      )}

      {/* Real-Time Sub-Sector Anomaly Density Heatmap (D3.js) */}
      <SubSectorAnomalyHeatmap projects={data.projects || data.projectHealth?.watchlist || []} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 col-span-1">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Project Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {riskData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {riskData.map((d: any) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-slate-300">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Cost Overview */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Original vs Revised Cost by Sector (Cr)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="cost" name="Original Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revised" name="Revised Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, alert = false }: any) {
  return (
    <div className={`bg-[#1e293b] rounded-xl border ${alert ? 'border-red-900/50' : 'border-slate-700'} p-5 flex items-center justify-between`}>
      <div>
        <div className="text-slate-400 text-sm mb-1">{title}</div>
        <div className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-blue-400'}`}>
        {icon}
      </div>
    </div>
  );
}

function FileTextIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
}
