import React from 'react';

export interface ProjectHealthMetrics {
  phiScore: number;
  healthIndex: number;
  costHealthScore: number;
  timeHealthScore: number;
  costAdherenceScore: number;
  scheduleAdherenceScore: number;
  costVariancePct: number;
  timeOverrunDays: number;
  timeOverrunMonths: number;
  timeVarianceMonths: number;
  costPenalty: number;
  timePenalty: number;
  tier: 'OPTIMAL' | 'STABLE' | 'STRESSED' | 'CRITICAL';
  label: string;
  statusLabel: 'Optimal' | 'Stable' | 'Strained' | 'Distressed';
  strokeColor: string;
  colorHex: string;
  trackHex: string;
  textColor: string;
  textClass: string;
  badgeBg: string;
  badgeClass: string;
}

export function calculateProjectHealthIndex(project: {
  original_cost?: number;
  revised_cost?: number;
  cost_overrun_pct?: number;
  time_overrun_days?: number;
  project_age_days?: number;
  schedule_risk_score?: number;
}): ProjectHealthMetrics {
  const orig = Number(project.original_cost) || 500;
  const rev = Number(project.revised_cost) || orig;
  const rawCostVar =
    project.cost_overrun_pct !== undefined
      ? Number(project.cost_overrun_pct)
      : orig > 0
      ? ((rev - orig) / orig) * 100
      : 0;

  const costVariancePct = Number(Math.max(0, rawCostVar).toFixed(1));
  const timeOverrunDays = Math.max(0, Number(project.time_overrun_days ?? 0));
  const timeOverrunMonths = Number((timeOverrunDays / 30).toFixed(1));

  const costPenalty = Math.min(
    55,
    costVariancePct <= 0 ? 0 : Math.pow(costVariancePct, 0.78) * 1.85
  );

  const effectiveDelayMonths =
    timeOverrunMonths > 0
      ? timeOverrunMonths
      : project.schedule_risk_score && project.schedule_risk_score > 35
      ? (project.schedule_risk_score - 30) * 0.35
      : 0;

  const timePenalty = Math.min(
    45,
    effectiveDelayMonths <= 0 ? 0 : Math.pow(effectiveDelayMonths, 0.82) * 2.1
  );

  const phiScore = Math.round(Math.max(4, Math.min(100, 100 - costPenalty - timePenalty)));
  const costHealthScore = Math.round(Math.max(0, Math.min(100, 100 - (costPenalty / 55) * 100)));
  const timeHealthScore = Math.round(Math.max(0, Math.min(100, 100 - (timePenalty / 45) * 100)));

  let tier: ProjectHealthMetrics['tier'] = 'OPTIMAL';
  let label = 'Optimal Health';
  let statusLabel: ProjectHealthMetrics['statusLabel'] = 'Optimal';
  let strokeColor = '#10b981';
  let trackHex = 'rgba(16, 185, 129, 0.16)';
  let textColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  if (phiScore < 40) {
    tier = 'CRITICAL';
    label = 'Critical Variance';
    statusLabel = 'Distressed';
    strokeColor = '#ef4444';
    trackHex = 'rgba(239, 68, 68, 0.16)';
    textColor = 'text-red-400';
    badgeBg = 'bg-red-500/15 text-red-400 border-red-500/30';
  } else if (phiScore < 60) {
    tier = 'STRESSED';
    label = 'Stressed';
    statusLabel = 'Strained';
    strokeColor = '#f59e0b';
    trackHex = 'rgba(245, 158, 11, 0.16)';
    textColor = 'text-amber-400';
    badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (phiScore < 80) {
    tier = 'STABLE';
    label = 'Moderate Watch';
    statusLabel = 'Stable';
    strokeColor = '#3b82f6';
    trackHex = 'rgba(59, 130, 246, 0.16)';
    textColor = 'text-blue-400';
    badgeBg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }

  return {
    phiScore,
    healthIndex: phiScore,
    costHealthScore,
    timeHealthScore,
    costAdherenceScore: costHealthScore,
    scheduleAdherenceScore: timeHealthScore,
    costVariancePct,
    timeOverrunDays,
    timeOverrunMonths: Number(effectiveDelayMonths.toFixed(1)),
    timeVarianceMonths: Number(effectiveDelayMonths.toFixed(1)),
    costPenalty: Number(costPenalty.toFixed(1)),
    timePenalty: Number(timePenalty.toFixed(1)),
    tier,
    label,
    statusLabel,
    strokeColor,
    colorHex: strokeColor,
    trackHex,
    textColor,
    textClass: textColor,
    badgeBg,
    badgeClass: badgeBg,
  };
}

interface CircularHealthGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  sublabel?: string;
  showPercent?: boolean;
}

export const CircularHealthGauge: React.FC<CircularHealthGaugeProps> = ({
  score,
  size = 112,
  strokeWidth = 9,
  color,
  sublabel,
  showPercent = false,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const activeColor =
    color ||
    (clamped >= 80
      ? '#10b981'
      : clamped >= 60
      ? '#3b82f6'
      : clamped >= 40
      ? '#f59e0b'
      : '#ef4444');

  const isCompact = size <= 44;

  return (
    <div
      className="relative inline-flex items-center justify-center select-none tabular-nums shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#334155"
          strokeOpacity={0.5}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-bold text-white leading-none ${
            isCompact ? 'text-[11px]' : size >= 108 ? 'text-2xl' : 'text-base'
          }`}
        >
          {clamped}
          {showPercent ? '%' : ''}
        </span>
        {!isCompact && sublabel && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface ProjectHealthIndexPanelProps {
  projects: any[];
  selectedProject: any | null;
  onClearSelection: () => void;
  healthFilter: string;
  onHealthFilterChange: (tier: string) => void;
}

export const ProjectHealthIndexPanel: React.FC<ProjectHealthIndexPanelProps> = ({
  projects,
  selectedProject,
  onClearSelection,
  healthFilter,
  onHealthFilterChange,
}) => {
  const metricsList = projects.map(p => calculateProjectHealthIndex(p));
  const count = Math.max(1, metricsList.length);

  const cohortCounts = {
    ALL: projects.length,
    OPTIMAL: metricsList.filter(m => m.tier === 'OPTIMAL').length,
    STABLE: metricsList.filter(m => m.tier === 'STABLE').length,
    STRESSED: metricsList.filter(m => m.tier === 'STRESSED').length,
    CRITICAL: metricsList.filter(m => m.tier === 'CRITICAL').length,
  };

  const activeMetrics: ProjectHealthMetrics = selectedProject
    ? calculateProjectHealthIndex(selectedProject)
    : (() => {
        const avgPhi = Math.round(metricsList.reduce((s, m) => s + m.phiScore, 0) / count);
        const avgCostHealth = Math.round(metricsList.reduce((s, m) => s + m.costHealthScore, 0) / count);
        const avgTimeHealth = Math.round(metricsList.reduce((s, m) => s + m.timeHealthScore, 0) / count);
        const avgCostVar = Number((metricsList.reduce((s, m) => s + m.costVariancePct, 0) / count).toFixed(1));
        const avgTimeDays = Math.round(metricsList.reduce((s, m) => s + m.timeOverrunDays, 0) / count);
        const avgTimeMonths = Number((metricsList.reduce((s, m) => s + m.timeOverrunMonths, 0) / count).toFixed(1));
        const avgCostPen = Number((metricsList.reduce((s, m) => s + m.costPenalty, 0) / count).toFixed(1));
        const avgTimePen = Number((metricsList.reduce((s, m) => s + m.timePenalty, 0) / count).toFixed(1));

        const base = calculateProjectHealthIndex({
          cost_overrun_pct: avgCostVar,
          time_overrun_days: avgTimeDays,
        });

        return {
          ...base,
          phiScore: avgPhi,
          healthIndex: avgPhi,
          costHealthScore: avgCostHealth,
          timeHealthScore: avgTimeHealth,
          costAdherenceScore: avgCostHealth,
          scheduleAdherenceScore: avgTimeHealth,
          costVariancePct: avgCostVar,
          timeOverrunDays: avgTimeDays,
          timeOverrunMonths: avgTimeMonths,
          timeVarianceMonths: avgTimeMonths,
          costPenalty: avgCostPen,
          timePenalty: avgTimePen,
        };
      })();

  return (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold text-white">
              Project Health Index (PHI) — Cost &amp; Time Variance Telemetry
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${activeMetrics.badgeBg}`}
            >
              {activeMetrics.label} ({activeMetrics.phiScore}/100)
            </span>
            {selectedProject && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-blue-400 hover:text-blue-300 underline ml-1"
              >
                Reset to Portfolio Aggregate
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {selectedProject ? (
              <>
                Inspecting <span className="text-white font-medium">{selectedProject.id}</span> —{' '}
                <span className="text-slate-300">{selectedProject.name}</span> ({selectedProject.sector},{' '}
                {selectedProject.state})
              </>
            ) : (
              <>
                Composite 0–100 health score synthesized from Cost Escalation Variance and Commissioning Schedule Slippage. Click any project row below to inspect its circular health breakdown.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80 gap-1 self-start lg:self-auto tabular-nums">
          {[
            { id: 'ALL', label: `All (${cohortCounts.ALL})` },
            { id: 'OPTIMAL', label: `Optimal 80+ (${cohortCounts.OPTIMAL})` },
            { id: 'STABLE', label: `Stable 60–79 (${cohortCounts.STABLE})` },
            { id: 'STRESSED', label: `Stressed 40–59 (${cohortCounts.STRESSED})` },
            { id: 'CRITICAL', label: `Critical <40 (${cohortCounts.CRITICAL})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onHealthFilterChange(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                healthFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center tabular-nums">
        <div className="flex items-center gap-5 bg-[#0f172a]/70 border border-slate-700/60 rounded-xl p-4">
          <CircularHealthGauge
            score={activeMetrics.phiScore}
            size={112}
            strokeWidth={10}
            color={activeMetrics.strokeColor}
            sublabel="PHI Score"
          />
          <div className="space-y-1.5 min-w-0">
            <div className="text-xs font-medium text-slate-400">Composite Health Index</div>
            <div className="text-lg font-bold text-white truncate">
              {activeMetrics.phiScore} <span className="text-xs font-normal text-slate-400">/ 100 pts</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <div>
                Cost Penalty: <span className="text-fuchsia-400 font-medium">-{activeMetrics.costPenalty} pts</span>
              </div>
              <div>
                Time Penalty: <span className="text-amber-400 font-medium">-{activeMetrics.timePenalty} pts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-[#0f172a]/70 border border-slate-700/60 rounded-xl p-4">
          <CircularHealthGauge
            score={activeMetrics.costHealthScore}
            size={96}
            strokeWidth={8}
            sublabel="Cost Index"
            showPercent
          />
          <div className="space-y-1.5 min-w-0">
            <div className="text-xs font-medium text-slate-400">Cost Adherence Score</div>
            <div className="text-base font-bold text-white">
              {activeMetrics.costVariancePct > 0
                ? `+${activeMetrics.costVariancePct}% Overrun`
                : '0% Cost Overrun'}
            </div>
            <div className="text-[11px] text-slate-400">
              {selectedProject ? (
                <>
                  Orig: ₹{Number(selectedProject.original_cost).toLocaleString()} Cr → Rev: ₹
                  {Number(selectedProject.revised_cost).toLocaleString()} Cr
                </>
              ) : (
                <>Mean cost escalation across {projects.length} projects</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-[#0f172a]/70 border border-slate-700/60 rounded-xl p-4">
          <CircularHealthGauge
            score={activeMetrics.timeHealthScore}
            size={96}
            strokeWidth={8}
            sublabel="Time Index"
            showPercent
          />
          <div className="space-y-1.5 min-w-0">
            <div className="text-xs font-medium text-slate-400">Schedule Adherence Score</div>
            <div className="text-base font-bold text-white">
              {activeMetrics.timeOverrunMonths > 0
                ? `+${activeMetrics.timeOverrunMonths}m Slippage`
                : 'On Schedule (0m delay)'}
            </div>
            <div className="text-[11px] text-slate-400">
              {selectedProject ? (
                <>
                  Orig: {selectedProject.original_commissioning || 'N/A'} → Rev:{' '}
                  {selectedProject.revised_commissioning || 'On Track'}
                </>
              ) : (
                <>Mean commissioning slippage across {projects.length} projects</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectHealthIndexRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  colorHex?: string;
  trackHex?: string;
  label?: string;
  sublabel?: string;
  showTierBadge?: boolean;
  statusLabel?: 'Optimal' | 'Stable' | 'Strained' | 'Distressed';
}

export default function ProjectHealthIndexRing({
  score,
  size = 44,
  strokeWidth = 4.5,
  colorHex,
  trackHex,
  label,
  sublabel,
  showTierBadge = false,
  statusLabel,
}: ProjectHealthIndexRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const resolvedColor =
    colorHex ||
    (clamped >= 80
      ? '#10b981'
      : clamped >= 60
      ? '#3b82f6'
      : clamped >= 40
      ? '#f59e0b'
      : '#ef4444');

  const resolvedTrack =
    trackHex ||
    (clamped >= 80
      ? 'rgba(16, 185, 129, 0.15)'
      : clamped >= 60
      ? 'rgba(59, 130, 246, 0.15)'
      : clamped >= 40
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(239, 68, 68, 0.15)');

  const resolvedTier =
    statusLabel ||
    (clamped >= 80
      ? 'Optimal'
      : clamped >= 60
      ? 'Stable'
      : clamped >= 40
      ? 'Strained'
      : 'Distressed');

  const fontSizeClass =
    size >= 84
      ? 'text-xl font-bold'
      : size >= 60
      ? 'text-sm font-bold'
      : 'text-[11px] font-bold';

  return (
    <div className="inline-flex items-center gap-2.5 tabular-nums">
      <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform overflow-visible">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={resolvedTrack}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${fontSizeClass} text-white leading-none`}>
          <span>{clamped}</span>
          {size >= 76 && <span className="text-[9px] font-normal text-slate-400 mt-0.5">PHI</span>}
        </div>
      </div>

      {(label || sublabel || showTierBadge) && (
        <div className="flex flex-col min-w-0">
          {label && <span className="text-xs font-semibold text-white truncate">{label}</span>}
          {showTierBadge && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: resolvedColor }}
            >
              {resolvedTier}
            </span>
          )}
          {sublabel && <span className="text-[10px] text-slate-400 whitespace-nowrap">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
