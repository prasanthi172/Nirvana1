import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface HeatmapProjectRecord {
  id: string;
  name: string;
  sector: string;
  ministry: string;
  state: string;
  original_cost: number;
  revised_cost: number;
  expenditure: number;
  physical_progress: number;
  project_age_days: number;
  expenditure_pct: number;
  cost_overrun_pct: number;
  progress_expenditure_gap: number;
  cost_risk_score: number;
  schedule_risk_score: number;
  progress_risk_score: number;
  financial_risk_score: number;
  anomaly_risk_score: number;
  overall_risk_score: number;
  risk_level: string;
}

export interface OperationalPhaseDef {
  id: string;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  minProgress: number;
  maxProgress: number;
}

export const OPERATIONAL_PHASES: OperationalPhaseDef[] = [
  {
    id: 'phase_1',
    label: 'Pre-Construction & Land Acquisition',
    shortLabel: '01. Pre-Construction',
    rangeLabel: '0–20% Progress',
    minProgress: 0,
    maxProgress: 20,
  },
  {
    id: 'phase_2',
    label: 'Foundation & Early Civil Works',
    shortLabel: '02. Early Civil Works',
    rangeLabel: '20–40% Progress',
    minProgress: 20,
    maxProgress: 40,
  },
  {
    id: 'phase_3',
    label: 'Core Structural Execution',
    shortLabel: '03. Core Execution',
    rangeLabel: '40–65% Progress',
    minProgress: 40,
    maxProgress: 65,
  },
  {
    id: 'phase_4',
    label: 'Systems Integration & Finishing',
    shortLabel: '04. Systems Integration',
    rangeLabel: '65–85% Progress',
    minProgress: 65,
    maxProgress: 85,
  },
  {
    id: 'phase_5',
    label: 'Testing, Commissioning & Handover',
    shortLabel: '05. Commissioning',
    rangeLabel: '85–100% Progress',
    minProgress: 85,
    maxProgress: 100.1,
  },
];

type MatrixViewMode = 'sector_by_phase' | 'dimension_by_phase';
type RiskMetricKey =
  | 'overall_risk_score'
  | 'cost_risk_score'
  | 'schedule_risk_score'
  | 'progress_risk_score'
  | 'financial_risk_score'
  | 'anomaly_risk_score';

const METRIC_OPTIONS: Array<{ key: RiskMetricKey; label: string }> = [
  { key: 'overall_risk_score', label: 'Composite Risk Score' },
  { key: 'cost_risk_score', label: 'Cost Overrun Risk' },
  { key: 'schedule_risk_score', label: 'Schedule Slippage Risk' },
  { key: 'financial_risk_score', label: 'Progress–Expenditure Mismatch' },
  { key: 'anomaly_risk_score', label: 'Isolation Forest Anomaly Risk' },
];

const RISK_DIMENSIONS: Array<{ key: RiskMetricKey; label: string }> = [
  { key: 'cost_risk_score', label: 'Cost Overrun Risk (25%)' },
  { key: 'schedule_risk_score', label: 'Schedule Slippage Risk (25%)' },
  { key: 'progress_risk_score', label: 'Physical Progress Risk (20%)' },
  { key: 'financial_risk_score', label: 'Financial Mismatch Risk (15%)' },
  { key: 'anomaly_risk_score', label: 'Anomaly Pattern Signal (15%)' },
];

interface HeatmapCellData {
  rowKey: string;
  rowLabel: string;
  phaseId: string;
  phaseLabel: string;
  phaseShortLabel: string;
  rangeLabel: string;
  score: number;
  projectCount: number;
  highRiskCount: number;
  avgCostOverrunPct: number;
  projects: HeatmapProjectRecord[];
}

interface OperationalPhaseHeatmapProps {
  projects: HeatmapProjectRecord[];
  onSelectProject?: (project: HeatmapProjectRecord) => void;
}

function getTierDescriptor(score: number, count: number): { code: string; label: string } {
  if (count === 0) return { code: 'N/A', label: 'No Projects' };
  if (score >= 75) return { code: 'CRIT', label: 'Critical' };
  if (score >= 50) return { code: 'HIGH', label: 'High' };
  if (score >= 25) return { code: 'MOD', label: 'Moderate' };
  return { code: 'LOW', label: 'Low' };
}

export default function OperationalPhaseHeatmap({
  projects,
  onSelectProject,
}: OperationalPhaseHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [matrixMode, setMatrixMode] = useState<MatrixViewMode>('sector_by_phase');
  const [selectedMetric, setSelectedMetric] = useState<RiskMetricKey>('overall_risk_score');
  const [dimensionSectorFilter, setDimensionSectorFilter] = useState<string>('All Sectors');
  const [selectedCell, setSelectedCell] = useState<HeatmapCellData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(920);

  // Track responsive container width for crisp SVG layout
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.max(640, Math.floor(entry.contentRect.width)));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const sectors = useMemo(() => {
    const unique = Array.from(new Set(projects.map(p => p.sector)));
    return unique.length > 0 ? unique : ['Roads', 'Railways', 'Power', 'Petroleum'];
  }, [projects]);

  // Compute heatmap cells from actual project records
  const cells = useMemo<HeatmapCellData[]>(() => {
    const result: HeatmapCellData[] = [];

    if (matrixMode === 'sector_by_phase') {
      sectors.forEach(sector => {
        OPERATIONAL_PHASES.forEach(phase => {
          const matching = projects.filter(
            p =>
              p.sector === sector &&
              p.physical_progress >= phase.minProgress &&
              p.physical_progress < phase.maxProgress
          );
          const count = matching.length;
          const avgScore =
            count > 0
              ? Number(
                  (
                    matching.reduce((acc, item) => acc + Number(item[selectedMetric] || 0), 0) /
                    count
                  ).toFixed(1)
                )
              : 0;
          const highRiskCount = matching.filter(p => p.overall_risk_score >= 50).length;
          const avgCostOverrunPct =
            count > 0
              ? Number(
                  (
                    matching.reduce((acc, item) => acc + item.cost_overrun_pct, 0) / count
                  ).toFixed(1)
                )
              : 0;

          result.push({
            rowKey: sector,
            rowLabel: sector,
            phaseId: phase.id,
            phaseLabel: phase.label,
            phaseShortLabel: phase.shortLabel,
            rangeLabel: phase.rangeLabel,
            score: avgScore,
            projectCount: count,
            highRiskCount,
            avgCostOverrunPct,
            projects: matching,
          });
        });
      });
    } else {
      const scopedProjects =
        dimensionSectorFilter === 'All Sectors'
          ? projects
          : projects.filter(p => p.sector === dimensionSectorFilter);

      RISK_DIMENSIONS.forEach(dim => {
        OPERATIONAL_PHASES.forEach(phase => {
          const matching = scopedProjects.filter(
            p =>
              p.physical_progress >= phase.minProgress &&
              p.physical_progress < phase.maxProgress
          );
          const count = matching.length;
          const avgScore =
            count > 0
              ? Number(
                  (
                    matching.reduce((acc, item) => acc + Number(item[dim.key] || 0), 0) / count
                  ).toFixed(1)
                )
              : 0;
          const highRiskCount = matching.filter(p => Number(p[dim.key] || 0) >= 50).length;
          const avgCostOverrunPct =
            count > 0
              ? Number(
                  (
                    matching.reduce((acc, item) => acc + item.cost_overrun_pct, 0) / count
                  ).toFixed(1)
                )
              : 0;

          result.push({
            rowKey: dim.key,
            rowLabel: dim.label,
            phaseId: phase.id,
            phaseLabel: phase.label,
            phaseShortLabel: phase.shortLabel,
            rangeLabel: phase.rangeLabel,
            score: avgScore,
            projectCount: count,
            highRiskCount,
            avgCostOverrunPct,
            projects: matching,
          });
        });
      });
    }

    return result;
  }, [projects, matrixMode, selectedMetric, dimensionSectorFilter, sectors]);

  // Select highest-risk populated cell by default when mode/data updates
  useEffect(() => {
    const populated = cells.filter(c => c.projectCount > 0);
    if (populated.length > 0) {
      const highest = [...populated].sort((a, b) => b.score - a.score)[0];
      setSelectedCell(highest);
    } else {
      setSelectedCell(null);
    }
  }, [cells]);

  // Render D3.js Heatmap
  useEffect(() => {
    if (!svgRef.current || cells.length === 0) return;

    const rowLabels = Array.from(new Set(cells.map(c => c.rowLabel)));
    const phaseLabels = OPERATIONAL_PHASES.map(p => p.shortLabel);

    const margin = {
      top: 46,
      right: 24,
      bottom: 24,
      left: matrixMode === 'dimension_by_phase' ? 210 : 140,
    };
    const cellHeight = 58;
    const width = containerWidth;
    const innerWidth = Math.max(380, width - margin.left - margin.right);
    const innerHeight = rowLabels.length * cellHeight;
    const height = innerHeight + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .range([0, innerWidth])
      .domain(phaseLabels)
      .paddingInner(0.06)
      .paddingOuter(0.02);

    const y = d3
      .scaleBand<string>()
      .range([0, innerHeight])
      .domain(rowLabels)
      .paddingInner(0.12)
      .paddingOuter(0.04);

    // Custom domain-calibrated color interpolator matching NIRVANA risk tiers:
    // Low (0-24: deep emerald/teal), Moderate (25-49: amber/ochre), High (50-74: burnt orange), Critical (75-100: crimson)
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 25, 50, 75, 100])
      .range(['#064e3b', '#15803d', '#b45309', '#ea580c', '#dc2626'])
      .clamp(true);

    // Top X-axis column headers (Operational Phases + Progress Range)
    const colHeaderGroup = g.append('g').attr('class', 'column-headers');

    OPERATIONAL_PHASES.forEach(phase => {
      const colX = (x(phase.shortLabel) ?? 0) + x.bandwidth() / 2;
      const headerG = colHeaderGroup
        .append('g')
        .attr('transform', `translate(${colX}, -26)`);

      headerG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '11.5px')
        .attr('font-weight', '600')
        .text(phase.shortLabel);

      headerG
        .append('text')
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(phase.rangeLabel);
    });

    // Left Y-axis row labels
    const rowHeaderGroup = g.append('g').attr('class', 'row-headers');
    rowLabels.forEach(label => {
      const rowY = (y(label) ?? 0) + y.bandwidth() / 2;
      rowHeaderGroup
        .append('text')
        .attr('x', -14)
        .attr('y', rowY)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(label);
    });

    // Cells
    const cellGroups = g
      .selectAll('.heatmap-cell')
      .data(cells)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr(
        'transform',
        d => `translate(${x(d.phaseShortLabel) ?? 0}, ${y(d.rowLabel) ?? 0})`
      )
      .style('cursor', 'pointer')
      .on('mouseenter', function (_, d) {
        setHoveredCell(d);
        d3.select(this)
          .select('rect.cell-bg')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function (_, d) {
        setHoveredCell(null);
        const isSelected =
          selectedCell &&
          selectedCell.rowKey === d.rowKey &&
          selectedCell.phaseId === d.phaseId;
        d3.select(this)
          .select('rect.cell-bg')
          .attr('stroke', isSelected ? '#f8fafc' : '#1e293b')
          .attr('stroke-width', isSelected ? 2 : 1);
      })
      .on('click', (_, d) => {
        setSelectedCell(d);
      });

    // Cell Background Rectangles
    cellGroups
      .append('rect')
      .attr('class', 'cell-bg')
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => (d.projectCount === 0 ? '#0f172a' : colorScale(d.score)))
      .attr('fill-opacity', d => (d.projectCount === 0 ? 0.6 : 0.88))
      .attr('stroke', d => {
        const isSelected =
          selectedCell &&
          selectedCell.rowKey === d.rowKey &&
          selectedCell.phaseId === d.phaseId;
        return isSelected ? '#f8fafc' : '#334155';
      })
      .attr('stroke-width', d => {
        const isSelected =
          selectedCell &&
          selectedCell.rowKey === d.rowKey &&
          selectedCell.phaseId === d.phaseId;
        return isSelected ? 2 : 1;
      });

    // Primary Score + Explicit Risk Tier Code (No hue-only state signaling)
    cellGroups
      .append('text')
      .attr('x', x.bandwidth() / 2)
      .attr('y', y.bandwidth() / 2 - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', d => (d.projectCount === 0 ? '#475569' : '#ffffff'))
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .style('font-variant-numeric', 'tabular-nums')
      .text(d => {
        if (d.projectCount === 0) return '—';
        const tier = getTierDescriptor(d.score, d.projectCount);
        return `${d.score.toFixed(1)} · ${tier.code}`;
      });

    // Secondary Project Count Label inside cell
    cellGroups
      .append('text')
      .attr('x', x.bandwidth() / 2)
      .attr('y', y.bandwidth() / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', d => (d.projectCount === 0 ? '#475569' : '#e2e8f0'))
      .attr('font-size', '10.5px')
      .style('font-variant-numeric', 'tabular-nums')
      .text(d =>
        d.projectCount === 0
          ? '0 projects'
          : `${d.projectCount} ${d.projectCount === 1 ? 'project' : 'projects'}`
      );
  }, [cells, containerWidth, matrixMode, selectedCell]);

  const activeCell = hoveredCell || selectedCell;

  // Compute summary phase statistics across the entire portfolio
  const phaseSummary = useMemo(() => {
    return OPERATIONAL_PHASES.map(phase => {
      const inPhase = projects.filter(
        p => p.physical_progress >= phase.minProgress && p.physical_progress < phase.maxProgress
      );
      const count = inPhase.length;
      const avgRisk =
        count > 0
          ? Number(
              (inPhase.reduce((s, p) => s + p.overall_risk_score, 0) / count).toFixed(1)
            )
          : 0;
      const highCount = inPhase.filter(p => p.overall_risk_score >= 50).length;
      return {
        ...phase,
        count,
        avgRisk,
        highCount,
      };
    });
  }, [projects]);

  return (
    <section className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
      {/* Header & Matrix Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-700/70">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Operational Phase Risk Intensity Heatmap (D3.js Matrix)
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span>5 Execution Lifecycle Phases</span>
            <span aria-hidden="true">·</span>
            <span>Click any matrix cell to inspect underlying projects and trigger ML evaluation</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Matrix Axis Switcher */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80">
            <button
              type="button"
              onClick={() => setMatrixMode('sector_by_phase')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                matrixMode === 'sector_by_phase'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sector × Operational Phase
            </button>
            <button
              type="button"
              onClick={() => setMatrixMode('dimension_by_phase')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                matrixMode === 'dimension_by_phase'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Risk Dimension × Phase
            </button>
          </div>

          {/* Conditional Filter: Metric Selector or Sector Filter */}
          {matrixMode === 'sector_by_phase' ? (
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value as RiskMetricKey)}
              className="bg-[#0f172a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {METRIC_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>
                  Intensity Metric: {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={dimensionSectorFilter}
              onChange={e => setDimensionSectorFilter(e.target.value)}
              className="bg-[#0f172a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="All Sectors">Scope: All Sectors</option>
              {sectors.map(sec => (
                <option key={sec} value={sec}>
                  Scope: {sec}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Phase Lifecycle Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-4 border-b border-slate-700/50 tabular-nums">
        {phaseSummary.map((p, idx) => (
          <div
            key={p.id}
            className={idx > 0 ? 'sm:border-l sm:border-slate-700/60 sm:pl-4' : ''}
          >
            <div className="text-xs font-medium text-slate-300 truncate">{p.shortLabel}</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-white">{p.avgRisk.toFixed(1)}</span>
              <span className="text-xs text-slate-400">avg risk</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {p.count} projects · {p.highCount} elevated
            </div>
          </div>
        ))}
      </div>

      {/* D3 SVG Canvas Container */}
      <div ref={containerRef} className="w-full overflow-x-auto pt-4">
        <svg ref={svgRef} className="w-full select-none" />
      </div>

      {/* Color Scale & Threshold Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-4 border-b border-slate-700/60 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-300 font-medium">Risk Intensity Scale (0–100):</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#15803d] inline-block" />
            LOW (0–24)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#b45309] inline-block" />
            MOD (25–49)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#ea580c] inline-block" />
            HIGH (50–74)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#dc2626] inline-block" />
            CRIT (75–100)
          </span>
        </div>
        <div>
          Each cell displays <span className="text-slate-200">Mean Score · Risk Tier Code</span> and project count.
        </div>
      </div>

      {/* Interactive Cell Drill-Down Panel */}
      {activeCell && (
        <div className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Phase Cohort Breakdown: {activeCell.rowLabel} — {activeCell.phaseLabel} ({activeCell.rangeLabel})
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 tabular-nums">
                <span>Cohort Mean Score: {activeCell.score.toFixed(1)} / 100</span>
                <span aria-hidden="true">·</span>
                <span>Projects in Phase: {activeCell.projectCount}</span>
                <span aria-hidden="true">·</span>
                <span>Elevated Risk (≥50): {activeCell.highRiskCount}</span>
                <span aria-hidden="true">·</span>
                <span>Mean Cost Overrun: +{activeCell.avgCostOverrunPct}%</span>
              </div>
            </div>
          </div>

          {activeCell.projects.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">
              No projects currently fall within {activeCell.rowLabel} at {activeCell.rangeLabel}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                <thead className="text-slate-400 border-b border-slate-700/80">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Project Code</th>
                    <th className="py-2 px-3 font-medium">Project Name</th>
                    <th className="py-2 px-3 font-medium">Sector</th>
                    <th className="py-2 px-3 font-medium text-right">Physical Progress</th>
                    <th className="py-2 px-3 font-medium text-right">Expenditure %</th>
                    <th className="py-2 px-3 font-medium text-right">Cost Overrun %</th>
                    <th className="py-2 px-3 font-medium text-right">Composite Risk</th>
                    {onSelectProject && (
                      <th className="py-2 pl-3 font-medium text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {activeCell.projects.slice(0, 6).map(proj => (
                    <tr key={proj.id} className="hover:bg-[#0f172a]/50 transition-colors">
                      <td className="py-2 pr-3 font-medium text-blue-400">{proj.id}</td>
                      <td className="py-2 px-3 text-white">{proj.name}</td>
                      <td className="py-2 px-3 text-slate-400">{proj.sector}</td>
                      <td className="py-2 px-3 text-right">{proj.physical_progress}%</td>
                      <td className="py-2 px-3 text-right">{proj.expenditure_pct}%</td>
                      <td className="py-2 px-3 text-right text-fuchsia-400">
                        +{proj.cost_overrun_pct}%
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-amber-400">
                        {proj.overall_risk_score} / 100 ({proj.risk_level})
                      </td>
                      {onSelectProject && (
                        <td className="py-2 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectProject(proj)}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap"
                          >
                            Evaluate in ML Engine
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
