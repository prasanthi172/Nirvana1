import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

export interface ProjectHealthWatchItem {
  id: string;
  name: string;
  sector: string;
  ministry: string;
  state: string;
  original_cost: number;
  revised_cost: number;
  expenditure: number;
  expenditure_pct: number;
  physical_progress: number;
  cost_overrun_pct: number;
  time_overrun_days: number;
  projected_completion: string;
  original_completion: string;
  overall_risk_score: number;
  risk_level: string;
}

export interface ProjectHealthSummaryData {
  avgOverallRisk: number;
  avgCostRisk: number;
  avgScheduleRisk: number;
  avgProgress: number;
  portfolioCostVariancePct: number;
  portfolioExpenditurePct: number;
  withinBudgetCount: number;
  moderateOverrunCount: number;
  severeOverrunCount: number;
  onScheduleCount: number;
  delayedCount: number;
  avgDelayDays: number;
  medianProjectedCompletion: string;
  watchlist: ProjectHealthWatchItem[];
}

interface ProjectHealthCardProps {
  health: ProjectHealthSummaryData;
  totalProjects: number;
  totalOriginalCost: number;
  totalRevisedCost: number;
}

type HealthFilter = 'all' | 'over_budget' | 'delayed' | 'on_track';

function RiskStatusBadge({ score, level }: { score: number; level?: string }) {
  const tier =
    level ||
    (score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW');

  if (tier === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
        <ShieldAlert size={11} />
        CRITICAL ({score})
      </span>
    );
  }
  if (tier === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 whitespace-nowrap">
        <AlertTriangle size={11} />
        HIGH RISK ({score})
      </span>
    );
  }
  if (tier === 'MODERATE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
        MODERATE ({score})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
      <CheckCircle2 size={11} />
      LOW RISK ({score})
    </span>
  );
}

function BudgetStatusBadge({ overrunPct }: { overrunPct: number }) {
  if (overrunPct > 25) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
        OVER BUDGET (+{overrunPct.toFixed(1)}%)
      </span>
    );
  }
  if (overrunPct > 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
        COST VARIANCE (+{overrunPct.toFixed(1)}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
      WITHIN BUDGET
    </span>
  );
}

function ScheduleStatusBadge({ delayDays }: { delayDays: number }) {
  if (delayDays > 365) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
        <Clock size={11} />
        DELAYED (+{Math.round(delayDays / 30)}m)
      </span>
    );
  }
  if (delayDays > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
        <Clock size={11} />
        SLIPPAGE (+{Math.round(delayDays / 30)}m)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
      ON SCHEDULE
    </span>
  );
}

export default function ProjectHealthCard({
  health,
  totalProjects,
  totalOriginalCost,
  totalRevisedCost,
}: ProjectHealthCardProps) {
  const [filter, setFilter] = useState<HealthFilter>('all');

  const filteredWatchlist = useMemo(() => {
    const list = health.watchlist || [];
    if (filter === 'over_budget') return list.filter(p => p.cost_overrun_pct > 5);
    if (filter === 'delayed') return list.filter(p => p.time_overrun_days > 0);
    if (filter === 'on_track')
      return list.filter(p => p.cost_overrun_pct <= 5 && p.time_overrun_days === 0);
    return list;
  }, [health.watchlist, filter]);

  return (
    <section className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-semibold text-white">Project Health Summary</h3>
            <RiskStatusBadge score={Math.round(health.avgOverallRisk)} />
            <BudgetStatusBadge overrunPct={health.portfolioCostVariancePct} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Portfolio-wide aggregate risk posture, projected commissioning horizon, and sanctioned budget adherence across {totalProjects} projects.
          </p>
        </div>

        <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80 self-start lg:self-auto">
          {[
            { id: 'all', label: 'All Monitored' },
            { id: 'over_budget', label: 'Cost Escalated' },
            { id: 'delayed', label: 'Schedule Delayed' },
            { id: 'on_track', label: 'On Track' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as HealthFilter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Aggregate Health Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-5 border-b border-slate-700/60 tabular-nums">
        {/* Pillar 1: Aggregate Risk Scores */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Aggregate Risk Score</span>
            <RiskStatusBadge score={Math.round(health.avgOverallRisk)} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{health.avgOverallRisk.toFixed(1)}</span>
            <span className="text-xs text-slate-400">/ 100 composite index</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Cost Risk Index</span>
              <span className="font-medium text-fuchsia-400">{health.avgCostRisk.toFixed(1)} / 100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Schedule Risk Index</span>
              <span className="font-medium text-amber-400">{health.avgScheduleRisk.toFixed(1)} / 100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Physical Progress</span>
              <span className="font-medium text-blue-400">{health.avgProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Projected Completion Dates */}
        <div className="lg:border-l lg:border-slate-700/60 lg:pl-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Projected Completion Horizon</span>
            <ScheduleStatusBadge delayDays={health.avgDelayDays} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{health.medianProjectedCompletion}</div>
            <div className="text-xs text-slate-400 mt-0.5">Median Revised Commissioning Target</div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">On-Schedule Projects</span>
              <span className="font-medium text-emerald-400">{health.onScheduleCount} projects</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Schedule-Slipped Projects</span>
              <span className="font-medium text-amber-400">{health.delayedCount} projects</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Slippage (Delayed Cohort)</span>
              <span className="font-medium text-white">+{health.avgDelayDays} days</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Budget Adherence Indicators */}
        <div className="lg:border-l lg:border-slate-700/60 lg:pl-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Budget Adherence Posture</span>
            <BudgetStatusBadge overrunPct={health.portfolioCostVariancePct} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {health.portfolioCostVariancePct > 0 ? `+${health.portfolioCostVariancePct}%` : `${health.portfolioCostVariancePct}%`}
            </span>
            <span className="text-xs text-slate-400">net cost variance</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Sanctioned vs Revised</span>
              <span className="font-medium text-white">
                ₹{(totalOriginalCost / 1000).toFixed(1)}k Cr → ₹{(totalRevisedCost / 1000).toFixed(1)}k Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Within Sanction (≤5% var)</span>
              <span className="font-medium text-emerald-400">{health.withinBudgetCount} projects</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Moderate / Severe Overrun</span>
              <span className="font-medium text-red-400">
                {health.moderateOverrunCount} mod · {health.severeOverrunCount} severe
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Health Watchlist Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">
            Monitored Project Health Matrix ({filteredWatchlist.length} shown)
          </h4>
          <Link to="/projects" className="text-xs font-medium text-blue-400 hover:text-blue-300">
            View Full Portfolio →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 tabular-nums">
            <thead className="text-slate-400 border-b border-slate-700/80">
              <tr>
                <th className="py-2.5 pr-3 font-medium">Project Code & Name</th>
                <th className="py-2.5 px-3 font-medium">Sector</th>
                <th className="py-2.5 px-3 font-medium">Aggregate Risk Status</th>
                <th className="py-2.5 px-3 font-medium">Projected Completion</th>
                <th className="py-2.5 px-3 font-medium">Schedule Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Budget Utilization</th>
                <th className="py-2.5 pl-3 font-medium text-right">Budget Adherence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredWatchlist.slice(0, 8).map(item => (
                <tr key={item.id} className="hover:bg-[#0f172a]/50 transition-colors">
                  <td className="py-2.5 pr-3 max-w-xs">
                    <div className="font-medium text-white truncate" title={item.name}>
                      <span className="text-blue-400 mr-1.5">{item.id}</span>
                      {item.name}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{item.sector}</td>
                  <td className="py-2.5 px-3">
                    <RiskStatusBadge score={item.overall_risk_score} level={item.risk_level} />
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-white font-medium">{item.projected_completion}</span>
                    {item.original_completion !== 'N/A' && (
                      <span className="text-slate-500 ml-1.5">(Orig: {item.original_completion})</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <ScheduleStatusBadge delayDays={item.time_overrun_days} />
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    ₹{item.revised_cost.toLocaleString()} Cr · {item.physical_progress}% prog
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <BudgetStatusBadge overrunPct={item.cost_overrun_pct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
