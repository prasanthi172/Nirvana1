import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { TrendingUp, Clock, Layers, Building2, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AnalyticsTab = 'cost' | 'schedule' | 'sector' | 'ministry' | 'benchmarking';

export default function AnalyticsHub({ initialTab = 'sector' }: { initialTab?: AnalyticsTab }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(err => console.error(err));
  }, []);

  const isViewer = user?.role === 'VIEWER';
  const canBenchmark = user?.role === 'ADMINISTRATOR' || user?.role === 'POLICY_ANALYST';

  const sectorStats = useMemo(() => {
    const map = new Map<
      string,
      {
        sector: string;
        count: number;
        originalCost: number;
        revisedCost: number;
        expenditure: number;
        sumRisk: number;
        sumProgress: number;
        sumOverrunPct: number;
        sumDelayDays: number;
        highRiskCount: number;
      }
    >();

    projects.forEach(p => {
      const cur = map.get(p.sector) || {
        sector: p.sector,
        count: 0,
        originalCost: 0,
        revisedCost: 0,
        expenditure: 0,
        sumRisk: 0,
        sumProgress: 0,
        sumOverrunPct: 0,
        sumDelayDays: 0,
        highRiskCount: 0,
      };
      cur.count += 1;
      cur.originalCost += p.original_cost || 0;
      cur.revisedCost += p.revised_cost || 0;
      cur.expenditure += p.expenditure || 0;
      cur.sumRisk += p.overall_risk_score || 0;
      cur.sumProgress += p.physical_progress || 0;
      cur.sumOverrunPct += p.cost_overrun_pct || 0;
      cur.sumDelayDays += p.time_overrun_days || 0;
      if ((p.overall_risk_score || 0) >= 50) cur.highRiskCount += 1;
      map.set(p.sector, cur);
    });

    return Array.from(map.values())
      .map(s => {
        const avgRisk = Number((s.sumRisk / Math.max(1, s.count)).toFixed(1));
        const avgProgress = Number((s.sumProgress / Math.max(1, s.count)).toFixed(1));
        const avgOverrunPct = Number((s.sumOverrunPct / Math.max(1, s.count)).toFixed(1));
        const avgDelayMonths = Number((s.sumDelayDays / Math.max(1, s.count) / 30).toFixed(1));
        const netEscalationPct =
          s.originalCost > 0
            ? Number((((s.revisedCost - s.originalCost) / s.originalCost) * 100).toFixed(1))
            : 0;
        // Benchmarking efficiency index: higher progress and lower risk/overrun yields higher benchmark score
        const efficiencyIndex = Math.max(
          10,
          Math.min(100, Math.round(100 - avgRisk * 0.55 - Math.max(0, netEscalationPct) * 0.3 + avgProgress * 0.15))
        );
        return {
          sector: s.sector,
          shortName: s.sector.length > 16 ? s.sector.slice(0, 14) + '…' : s.sector,
          count: s.count,
          originalCost: Math.round(s.originalCost),
          revisedCost: Math.round(s.revisedCost),
          expenditure: Math.round(s.expenditure),
          avgRisk,
          avgProgress,
          avgOverrunPct,
          avgDelayMonths,
          netEscalationPct,
          highRiskCount: s.highRiskCount,
          efficiencyIndex,
        };
      })
      .sort((a, b) => b.originalCost - a.originalCost);
  }, [projects]);

  const ministryStats = useMemo(() => {
    const map = new Map<
      string,
      {
        ministry: string;
        count: number;
        originalCost: number;
        revisedCost: number;
        expenditure: number;
        sumRisk: number;
        sumProgress: number;
        delayedCount: number;
      }
    >();

    projects.forEach(p => {
      const mName = p.ministry || 'Central Line Ministry';
      const cur = map.get(mName) || {
        ministry: mName,
        count: 0,
        originalCost: 0,
        revisedCost: 0,
        expenditure: 0,
        sumRisk: 0,
        sumProgress: 0,
        delayedCount: 0,
      };
      cur.count += 1;
      cur.originalCost += p.original_cost || 0;
      cur.revisedCost += p.revised_cost || 0;
      cur.expenditure += p.expenditure || 0;
      cur.sumRisk += p.overall_risk_score || 0;
      cur.sumProgress += p.physical_progress || 0;
      if ((p.time_overrun_days || 0) > 0) cur.delayedCount += 1;
      map.set(mName, cur);
    });

    return Array.from(map.values())
      .map(m => {
        const avgRisk = Number((m.sumRisk / Math.max(1, m.count)).toFixed(1));
        const avgProgress = Number((m.sumProgress / Math.max(1, m.count)).toFixed(1));
        const escalationPct =
          m.originalCost > 0
            ? Number((((m.revisedCost - m.originalCost) / m.originalCost) * 100).toFixed(1))
            : 0;
        return {
          ministry: m.ministry,
          shortName: m.ministry.length > 18 ? m.ministry.slice(0, 16) + '…' : m.ministry,
          count: m.count,
          originalCost: Math.round(m.originalCost),
          revisedCost: Math.round(m.revisedCost),
          expenditure: Math.round(m.expenditure),
          avgRisk,
          avgProgress,
          escalationPct,
          delayedCount: m.delayedCount,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [projects]);

  const topCostEscalated = useMemo(() => {
    return [...projects].sort((a, b) => b.cost_overrun_pct - a.cost_overrun_pct).slice(0, 10);
  }, [projects]);

  const topScheduleDelayed = useMemo(() => {
    return [...projects].sort((a, b) => (b.time_overrun_days || 0) - (a.time_overrun_days || 0)).slice(0, 10);
  }, [projects]);

  if (projects.length === 0) {
    return <div className="p-8 text-center text-slate-400">Loading portfolio analytics from MoSPI dataset...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isViewer ? 'Basic Infrastructure Analytics (Read-Only)' : 'Multi-Dimensional Infrastructure Analytics'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isViewer
              ? 'Read-only sector and capital outlay analytics derived from the active MoSPI project dataset.'
              : 'Sector-level, Ministry-level, Cost Intelligence, Schedule Slippage, and Inter-Corridor Benchmarking.'}
          </p>
        </div>

        {/* Sub-module Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-[#1e293b] p-1 rounded-lg border border-slate-700 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('sector')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'sector' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            Sector Analytics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ministry')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'ministry' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 size={13} />
            Ministry Analytics
          </button>

          {!isViewer && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('cost')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'cost' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp size={13} />
                Cost Intelligence
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock size={13} />
                Schedule Intelligence
              </button>
            </>
          )}

          {canBenchmark && (
            <button
              type="button"
              onClick={() => setActiveTab('benchmarking')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'benchmarking' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale size={13} />
              Benchmarking
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SECTOR ANALYTICS */}
      {activeTab === 'sector' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Sector Capital Outlay: Sanctioned vs Revised (₹ Cr)</h3>
              <p className="text-xs text-slate-400 mb-4">Real capital aggregation across monitored infrastructure sectors</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorStats.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="originalCost" name="Original Cost (₹ Cr)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revisedCost" name="Revised Cost (₹ Cr)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Mean Composite Risk & Physical Progress by Sector</h3>
              <p className="text-xs text-slate-400 mb-4">Comparing execution completion (%) against mean risk index (0–100)</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorStats.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="avgRisk" name="Mean Risk Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgProgress" name="Mean Physical Progress (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 overflow-x-auto">
            <h3 className="text-base font-semibold text-white mb-4">Sector-Level Performance Matrix</h3>
            <table className="w-full text-left text-xs text-slate-300 tabular-nums">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 pr-4">Infrastructure Sector</th>
                  <th className="py-2.5 px-3 text-right">Projects</th>
                  <th className="py-2.5 px-3 text-right">Original Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Revised Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Net Cost Escalation</th>
                  <th className="py-2.5 px-3 text-right">Mean Progress</th>
                  <th className="py-2.5 pl-3 text-right">Mean Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sectorStats.map(s => (
                  <tr key={s.sector} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 font-medium text-white">{s.sector}</td>
                    <td className="py-2.5 px-3 text-right">{s.count}</td>
                    <td className="py-2.5 px-3 text-right">₹{s.originalCost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">₹{s.revisedCost.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${s.netEscalationPct > 20 ? 'text-red-400' : 'text-amber-400'}`}>
                      +{s.netEscalationPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{s.avgProgress}%</td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-white">{s.avgRisk} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MINISTRY ANALYTICS */}
      {activeTab === 'ministry' && (
        <div className="space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Line Ministry Capital Allocation & Risk Profile</h3>
            <p className="text-xs text-slate-400 mb-4">Comparison of original vs. revised cost across Central Ministries</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ministryStats.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="originalCost" name="Sanctioned Outlay (₹ Cr)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revisedCost" name="Revised Outlay (₹ Cr)" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 overflow-x-auto">
            <h3 className="text-base font-semibold text-white mb-4">Ministry-Level Execution Ledger</h3>
            <table className="w-full text-left text-xs text-slate-300 tabular-nums">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 pr-4">Line Ministry</th>
                  <th className="py-2.5 px-3 text-right">Monitored Projects</th>
                  <th className="py-2.5 px-3 text-right">Original Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Revised Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Cost Escalation</th>
                  <th className="py-2.5 px-3 text-right">Delayed Projects</th>
                  <th className="py-2.5 pl-3 text-right">Mean Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ministryStats.map(m => (
                  <tr key={m.ministry} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 font-medium text-white">{m.ministry}</td>
                    <td className="py-2.5 px-3 text-right">{m.count}</td>
                    <td className="py-2.5 px-3 text-right">₹{m.originalCost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">₹{m.revisedCost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-amber-400">+{m.escalationPct}%</td>
                    <td className="py-2.5 px-3 text-right">{m.delayedCount}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-white">{m.avgRisk} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COST INTELLIGENCE */}
      {activeTab === 'cost' && !isViewer && (
        <div className="space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 overflow-x-auto">
            <h3 className="text-base font-semibold text-white mb-1">Cost Intelligence: Top Capital Escalation Projects</h3>
            <p className="text-xs text-slate-400 mb-4">
              Projects ranked by percentage cost overrun (((Revised Cost - Original Cost) / Original Cost) × 100)
            </p>
            <table className="w-full text-left text-xs text-slate-300 tabular-nums">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 pr-4">Code</th>
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-right">Original Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Revised Cost (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">Cost Overrun %</th>
                  <th className="py-2.5 pl-3 text-right">Cost Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {topCostEscalated.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 font-mono text-blue-400">{p.id}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{p.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{p.sector}</td>
                    <td className="py-2.5 px-3 text-right">₹{p.original_cost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">₹{p.revised_cost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-red-400">+{p.cost_overrun_pct}%</td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-white">{p.cost_risk_score} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SCHEDULE INTELLIGENCE */}
      {activeTab === 'schedule' && !isViewer && (
        <div className="space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 overflow-x-auto">
            <h3 className="text-base font-semibold text-white mb-1">
              Schedule Intelligence: Top Commissioning Slippage Corridors
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Projects exhibiting the longest commissioning time overruns and execution velocity gaps
            </p>
            <table className="w-full text-left text-xs text-slate-300 tabular-nums">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 pr-4">Code</th>
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-right">Time Overrun (Days)</th>
                  <th className="py-2.5 px-3 text-right">Physical Progress</th>
                  <th className="py-2.5 px-3 text-right">Revised Target</th>
                  <th className="py-2.5 pl-3 text-right">Schedule Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {topScheduleDelayed.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 font-mono text-blue-400">{p.id}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{p.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{p.sector}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-400">
                      {p.time_overrun_days || 0} days
                    </td>
                    <td className="py-2.5 px-3 text-right">{p.physical_progress}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {p.revised_commissioning || p.original_commissioning || 'Q4 FY27'}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-white">{p.schedule_risk_score} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BENCHMARKING (Policy Analyst & Administrator) */}
      {activeTab === 'benchmarking' && canBenchmark && (
        <div className="space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">
                Cross-Sector Capital Efficiency & Execution Benchmarking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Benchmarks each sector across Cost Adherence, Schedule Velocity, Physical Progress, and Composite Efficiency Index (0–100).
              </p>
            </div>

            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="netEscalationPct"
                    name="Cost Escalation %"
                    unit="%"
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey="avgProgress"
                    name="Mean Physical Progress"
                    unit="%"
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <ZAxis type="number" dataKey="count" range={[80, 400]} name="Projects" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  />
                  <Scatter name="Sectors" data={sectorStats} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 pr-4">Benchmark Rank & Sector</th>
                    <th className="py-2.5 px-3 text-right">Projects</th>
                    <th className="py-2.5 px-3 text-right">Mean Cost Overrun</th>
                    <th className="py-2.5 px-3 text-right">Mean Delay (Months)</th>
                    <th className="py-2.5 px-3 text-right">Mean Progress</th>
                    <th className="py-2.5 pl-3 text-right">Efficiency Benchmark Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {[...sectorStats]
                    .sort((a, b) => b.efficiencyIndex - a.efficiencyIndex)
                    .map((s, idx) => (
                      <tr key={s.sector} className="hover:bg-slate-800/40">
                        <td className="py-2.5 pr-4 font-medium text-white">
                          #{idx + 1} · {s.sector}
                        </td>
                        <td className="py-2.5 px-3 text-right">{s.count}</td>
                        <td className="py-2.5 px-3 text-right text-amber-400">+{s.avgOverrunPct}%</td>
                        <td className="py-2.5 px-3 text-right">{s.avgDelayMonths} mos</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">{s.avgProgress}%</td>
                        <td className="py-2.5 pl-3 text-right font-bold text-blue-400">{s.efficiencyIndex} / 100</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
