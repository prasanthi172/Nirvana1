import { useState, useEffect, useMemo } from 'react';
import { Search, Download, X, FileText, MapPin, Building2, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ProjectHealthIndexRing, {
  calculateProjectHealthIndex,
  ProjectHealthMetrics,
} from '../components/ProjectHealthIndexRing';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const { user, logAuditAction } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All Sectors');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'Optimal' | 'Stable' | 'Strained' | 'Distressed'>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const isViewer = user?.role === 'VIEWER';

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        if (Array.isArray(data) && data.length > 0 && location.pathname === '/project-details') {
          setSelectedProjectId(data[0].id);
        }
      })
      .catch(err => console.error(err));
  }, [location.pathname]);

  const handleSelectProject = (proj: any) => {
    setSelectedProjectId(proj.id);
    logAuditAction('VIEW_PROJECT', `Inspected project ${proj.id} (${proj.name})`);
  };

  const enrichedProjects = useMemo(() => {
    return projects.map(p => ({
      ...p,
      healthMetrics: calculateProjectHealthIndex(p),
    }));
  }, [projects]);

  const sectors = useMemo(() => {
    return ['All Sectors', ...Array.from(new Set(projects.map(p => p.sector)))];
  }, [projects]);

  const filtered = useMemo(() => {
    return enrichedProjects.filter(p => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.agency && p.agency.toLowerCase().includes(search.toLowerCase())) ||
        p.ministry.toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'All Sectors' || p.sector === sectorFilter;
      const matchesRisk = riskFilter === 'ALL' || p.risk_level === riskFilter;
      const matchesHealth = healthFilter === 'ALL' || p.healthMetrics.statusLabel === healthFilter;
      return matchesSearch && matchesSector && matchesRisk && matchesHealth;
    });
  }, [enrichedProjects, search, sectorFilter, riskFilter, healthFilter]);

  const cohortSummary = useMemo(() => {
    const count = Math.max(1, filtered.length);
    const avgHealth = Math.round(
      filtered.reduce((acc, p) => acc + p.healthMetrics.healthIndex, 0) / count
    );
    const avgCostAdherence = Math.round(
      filtered.reduce((acc, p) => acc + p.healthMetrics.costAdherenceScore, 0) / count
    );
    const avgScheduleAdherence = Math.round(
      filtered.reduce((acc, p) => acc + p.healthMetrics.scheduleAdherenceScore, 0) / count
    );

    const counts = {
      Optimal: filtered.filter(p => p.healthMetrics.statusLabel === 'Optimal').length,
      Stable: filtered.filter(p => p.healthMetrics.statusLabel === 'Stable').length,
      Strained: filtered.filter(p => p.healthMetrics.statusLabel === 'Strained').length,
      Distressed: filtered.filter(p => p.healthMetrics.statusLabel === 'Distressed').length,
    };

    return {
      avgHealth,
      avgCostAdherence,
      avgScheduleAdherence,
      counts,
    };
  }, [filtered]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return enrichedProjects.find(p => p.id === selectedProjectId) || null;
  }, [enrichedProjects, selectedProjectId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedProjects = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = [
      'Project Code',
      'Project Name',
      'Sector',
      'Ministry',
      'Implementing Agency',
      'State',
      'Original Cost (Cr)',
      'Revised Cost (Cr)',
      'Expenditure (Cr)',
      'Physical Progress (%)',
      'Cost Overrun (%)',
      'Time Overrun (Days)',
      'Project Health Index (0-100)',
      'Health Status',
      'Risk Score',
      'Risk Level',
    ];
    const rows = filtered.map(p => [
      `"${p.id}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sector}"`,
      `"${p.ministry}"`,
      `"${p.agency || ''}"`,
      `"${p.state}"`,
      p.original_cost,
      p.revised_cost,
      p.expenditure,
      p.physical_progress,
      p.cost_overrun_pct,
      p.time_overrun_days ?? 0,
      p.healthMetrics.healthIndex,
      p.healthMetrics.statusLabel,
      p.overall_risk_score,
      p.risk_level,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'nirvana_mospi_projects_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAuditAction('EXPORT_REPORT', `Exported filtered project CSV (${filtered.length} records)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {location.pathname === '/project-details' ? 'Project Details & Execution Dossier' : 'Project Explorer'}
          </h2>
          <p className="text-slate-400 text-sm">
            MoSPI/IPMD Central Sector Infrastructure Projects ({filtered.length} of {projects.length} projects). Click any row to inspect full Project Details.
          </p>
        </div>
        {!isViewer && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            <Download size={14} /> Export Filtered CSV
          </button>
        )}
      </div>

      {/* Circular Project Health Index Cohort Overview */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <ProjectHealthIndexRing
              score={cohortSummary.avgHealth}
              size={84}
              strokeWidth={7}
              label="Aggregate Project Health Index"
              sublabel="Composite Cost & Time Variance Score"
              showTierBadge
            />

            <div className="h-12 w-px bg-slate-700/80 hidden sm:block" />

            <div className="flex items-center gap-6">
              <ProjectHealthIndexRing
                score={cohortSummary.avgCostAdherence}
                size={56}
                strokeWidth={5}
                colorHex="#38bdf8"
                trackHex="rgba(56, 189, 248, 0.15)"
                label="Cost Adherence"
                sublabel="Sanctioned vs. Revised"
              />
              <ProjectHealthIndexRing
                score={cohortSummary.avgScheduleAdherence}
                size={56}
                strokeWidth={5}
                colorHex="#a855f7"
                trackHex="rgba(168, 85, 247, 0.15)"
                label="Schedule Adherence"
                sublabel="Commissioning Slippage"
              />
            </div>
          </div>

          {/* Interactive Health Tier Breakdown Filter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
            {(
              [
                {
                  tier: 'Optimal',
                  range: '80–100',
                  count: cohortSummary.counts.Optimal,
                  color: '#10b981',
                },
                {
                  tier: 'Stable',
                  range: '60–79',
                  count: cohortSummary.counts.Stable,
                  color: '#3b82f6',
                },
                {
                  tier: 'Strained',
                  range: '40–59',
                  count: cohortSummary.counts.Strained,
                  color: '#f59e0b',
                },
                {
                  tier: 'Distressed',
                  range: '0–39',
                  count: cohortSummary.counts.Distressed,
                  color: '#ef4444',
                },
              ] as const
            ).map(item => {
              const active = healthFilter === item.tier;
              return (
                <button
                  key={item.tier}
                  type="button"
                  onClick={() => {
                    setHealthFilter(prev => (prev === item.tier ? 'ALL' : item.tier));
                    setPage(1);
                  }}
                  className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#0f172a] border-blue-500'
                      : 'bg-[#0f172a]/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold" style={{ color: item.color }}>
                      {item.tier}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.range}</span>
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">{item.count}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Project Details & Health Formula Inspector */}
        {selectedProject && (
          <div className="mt-5 pt-4 border-t border-slate-700/80 space-y-4 bg-[#0f172a]/80 rounded-xl p-5 border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProjectHealthIndexRing
                  score={selectedProject.healthMetrics.healthIndex}
                  size={68}
                  strokeWidth={6}
                  colorHex={selectedProject.healthMetrics.colorHex}
                  trackHex={selectedProject.healthMetrics.trackHex}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-blue-400">{selectedProject.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-base font-bold text-white">{selectedProject.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} className="text-slate-500" />
                      {selectedProject.ministry} ({selectedProject.agency || 'Central Agency'})
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-slate-500" />
                      {selectedProject.state} · {selectedProject.sector}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" />
                      Target: {selectedProject.revised_commissioning || selectedProject.original_commissioning || 'Q4 FY27'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Project Health Index Formula: 100 − Cost Variance Penalty ({selectedProject.healthMetrics.costPenalty} pts from +{selectedProject.healthMetrics.costVariancePct}% cost overrun) − Time Variance Penalty ({selectedProject.healthMetrics.timePenalty} pts from +{selectedProject.healthMetrics.timeVarianceMonths}m schedule slippage) ={' '}
                    <span className="text-white font-semibold">{selectedProject.healthMetrics.healthIndex} / 100 ({selectedProject.healthMetrics.statusLabel})</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 self-end lg:self-start"
              >
                <X size={14} /> Close Project Details
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800 text-xs tabular-nums">
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Sanctioned Cost</div>
                <div className="text-sm font-bold text-white mt-0.5">₹{Number(selectedProject.original_cost).toLocaleString()} Cr</div>
              </div>
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Revised Cost</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  ₹{Number(selectedProject.revised_cost).toLocaleString()} Cr (+{selectedProject.cost_overrun_pct}%)
                </div>
              </div>
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Cumulative Expenditure</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  ₹{Number(selectedProject.expenditure).toLocaleString()} Cr ({selectedProject.expenditure_pct}%)
                </div>
              </div>
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Physical Progress</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{selectedProject.physical_progress}%</div>
              </div>
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Schedule Overrun</div>
                <div className="text-sm font-bold text-white mt-0.5">{selectedProject.time_overrun_days || 0} days</div>
              </div>
              <div className="bg-[#1e293b]/70 rounded-lg p-3">
                <div className="text-slate-400">Composite Risk Score</div>
                <div className="text-sm font-bold text-red-400 mt-0.5">
                  {selectedProject.overall_risk_score} / 100 ({selectedProject.risk_level})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Project Name, Project Code, Implementing Agency, or Ministry..."
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={sectorFilter}
            onChange={e => {
              setSectorFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {sectors.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={healthFilter}
            onChange={e => {
              setHealthFilter(e.target.value as any);
              setPage(1);
            }}
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Health Index Tiers</option>
            <option value="Optimal">Optimal Health (80–100)</option>
            <option value="Stable">Stable Health (60–79)</option>
            <option value="Strained">Strained Health (40–59)</option>
            <option value="Distressed">Distressed Health (0–39)</option>
          </select>

          <select
            value={riskFilter}
            onChange={e => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical (75–100)</option>
            <option value="HIGH">High (50–74)</option>
            <option value="MODERATE">Moderate (25–49)</option>
            <option value="LOW">Low (0–24)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 tabular-nums">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Project Name & Agency</th>
                <th className="px-4 py-3 font-medium">Sector & State</th>
                <th className="px-4 py-3 font-medium">Project Health Index</th>
                <th className="px-4 py-3 font-medium text-right">Original Cost</th>
                <th className="px-4 py-3 font-medium text-right">Revised Cost</th>
                <th className="px-4 py-3 font-medium text-right">Expenditure</th>
                <th className="px-4 py-3 font-medium">Physical Progress</th>
                <th className="px-4 py-3 font-medium text-right">Commissioning</th>
                <th className="px-4 py-3 font-medium text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/70">
              {pagedProjects.map((p: any) => {
                const hm: ProjectHealthMetrics = p.healthMetrics;
                return (
                  <tr
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    className="hover:bg-[#0f172a]/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-blue-400 whitespace-nowrap">{p.id}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-white font-medium truncate" title={p.name}>
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.agency || p.ministry}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{p.sector}</div>
                      <div className="text-[11px] text-slate-400">{p.state}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ProjectHealthIndexRing
                        score={hm.healthIndex}
                        size={42}
                        strokeWidth={4}
                        colorHex={hm.colorHex}
                        trackHex={hm.trackHex}
                        showTierBadge
                        statusLabel={hm.statusLabel}
                        sublabel={`Cost +${hm.costVariancePct}% · Time +${hm.timeVarianceMonths}m`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{Number(p.original_cost).toLocaleString()} Cr
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{Number(p.revised_cost).toLocaleString()} Cr
                      {p.cost_overrun_pct > 0 && (
                        <div className="text-[10px] text-fuchsia-400">+{p.cost_overrun_pct}%</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{Number(p.expenditure).toLocaleString()} Cr
                      <div className="text-[10px] text-slate-400">{p.expenditure_pct}%</div>
                    </td>
                    <td className="px-4 py-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, p.physical_progress))}%` }}
                          />
                        </div>
                        <span className="text-xs w-9 text-right">{p.physical_progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-[11px]">
                      <div>Orig: {p.original_commissioning || 'N/A'}</div>
                      <div className="text-slate-400">Rev: {p.revised_commissioning || 'Unrevised'}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to="/risk"
                        onClick={e => e.stopPropagation()}
                        className={`font-semibold ${
                          p.risk_level === 'CRITICAL'
                            ? 'text-red-400'
                            : p.risk_level === 'HIGH'
                            ? 'text-orange-400'
                            : p.risk_level === 'MODERATE'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {p.overall_risk_score} · {p.risk_level}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 tabular-nums">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} projects
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-[#0f172a] border border-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-[#0f172a] border border-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
