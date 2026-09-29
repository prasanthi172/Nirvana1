import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Download } from 'lucide-react';

export interface RiskTrendPoint {
  key: string;
  period: string;
  quarter: string;
  totalProjects: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
  elevatedCount: number;
  lowPct: number;
  moderatePct: number;
  highPct: number;
  criticalPct: number;
  avgOverallRisk: number;
  avgCostRisk: number;
  avgScheduleRisk: number;
  avgProgressRisk: number;
  avgFinancialRisk: number;
  avgAnomalyRisk: number;
  anomaliesFlagged: number;
}

interface TrendResponse {
  sector: string;
  range: string;
  availableSectors?: string[];
  snapshotNote: string;
  weights: {
    cost: number;
    schedule: number;
    progress: number;
    financial: number;
    anomaly: number;
  };
  summary: {
    currentAvgRisk: number;
    riskDelta: number;
    currentElevatedProjects: number;
    elevatedDelta: number;
    criticalProjects: number;
    totalEvaluated: number;
  };
  timeline: RiskTrendPoint[];
}

const DEFAULT_SECTORS = ['All Sectors', 'Roads', 'Railways', 'Power', 'Petroleum'] as const;
const RANGES = [
  { id: '12M', label: '12 Months' },
  { id: '6M', label: '6 Months' },
  { id: 'QTR', label: 'Quarterly' },
] as const;

type ChartMode = 'distribution' | 'dimensions' | 'shift';
type MetricUnit = 'count' | 'percent';

export default function RiskTrendAnalysis() {
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors');
  const [selectedRange, setSelectedRange] = useState<string>('12M');
  const [chartMode, setChartMode] = useState<ChartMode>('distribution');
  const [metricUnit, setMetricUnit] = useState<MetricUnit>('count');
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/risk/trends?sector=${encodeURIComponent(selectedSector)}&range=${encodeURIComponent(selectedRange)}`)
      .then(res => {
        if (!res.ok) throw new Error('Unable to load historical risk trend distributions.');
        return res.json();
      })
      .then((data: TrendResponse) => {
        if (!active) return;
        setTrendData(data);
        if (data.timeline && data.timeline.length > 0) {
          setSelectedPeriodKey(data.timeline[data.timeline.length - 1].key);
        }
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Error loading trend data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSector, selectedRange]);

  const timeline = trendData?.timeline ?? [];

  const inspectedPoint = useMemo(() => {
    if (!timeline.length) return null;
    if (selectedPeriodKey) {
      const found = timeline.find(p => p.key === selectedPeriodKey);
      if (found) return found;
    }
    return timeline[timeline.length - 1];
  }, [timeline, selectedPeriodKey]);

  const handleExportCsv = () => {
    if (!timeline.length) return;
    const headers = [
      'Period',
      'Quarter',
      'Sector',
      'Total Projects',
      'Low Risk (0-24)',
      'Moderate Risk (25-49)',
      'High Risk (50-74)',
      'Critical Risk (75-100)',
      'Avg Overall Risk',
      'Avg Cost Risk',
      'Avg Schedule Risk',
      'Avg Progress Risk',
      'Avg Financial Risk',
      'Avg Anomaly Risk',
    ];
    const rows = timeline.map(row => [
      row.period,
      row.quarter,
      selectedSector,
      row.totalProjects,
      row.low,
      row.moderate,
      row.high,
      row.critical,
      row.avgOverallRisk,
      row.avgCostRisk,
      row.avgScheduleRisk,
      row.avgProgressRisk,
      row.avgFinancialRisk,
      row.avgAnomalyRisk,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nirvana_risk_trends_${selectedSector.toLowerCase().replace(/\s+/g, '_')}_${selectedRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-700/70">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Historical Risk Trend Distributions
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Snapshot Series: Sep 2025 – Aug 2026</span>
            <span aria-hidden="true">·</span>
            <span>Prototype Risk Thresholds (Low 0–24, Moderate 25–49, High 50–74, Critical 75–100)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Segmented Switcher */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80">
            <button
              type="button"
              onClick={() => setChartMode('distribution')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                chartMode === 'distribution'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tier Distribution
            </button>
            <button
              type="button"
              onClick={() => setChartMode('dimensions')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                chartMode === 'dimensions'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Risk Dimensions
            </button>
            <button
              type="button"
              onClick={() => setChartMode('shift')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                chartMode === 'shift'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Composition & Escalation
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80">
            {RANGES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRange(r.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedRange === r.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!timeline.length}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar: Sector Selection & Unit Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-slate-700/50">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-2">Sector Scope:</span>
          {(trendData?.availableSectors || DEFAULT_SECTORS).map(sec => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSector(sec)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedSector === sec
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {chartMode === 'distribution' && (
          <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-lg border border-slate-700/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetricUnit('count')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                metricUnit === 'count' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Project Count
            </button>
            <button
              type="button"
              onClick={() => setMetricUnit('percent')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                metricUnit === 'percent' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Portfolio Share (%)
            </button>
          </div>
        )}
      </div>

      {/* Summary Telemetry Row (Hairline separated, no nested cards) */}
      {trendData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-5 border-b border-slate-700/50">
          <div>
            <div className="text-xs text-slate-400">Evaluated Portfolio Scope</div>
            <div className="text-2xl font-bold text-white tabular-nums mt-1">
              {trendData.summary.totalEvaluated} <span className="text-sm font-normal text-slate-400">projects</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {selectedSector} · {timeline.length} snapshots
            </div>
          </div>

          <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
            <div className="text-xs text-slate-400">Mean Composite Risk Score</div>
            <div className="text-2xl font-bold text-white tabular-nums mt-1">
              {trendData.summary.currentAvgRisk.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Period Shift: {trendData.summary.riskDelta > 0 ? `+${trendData.summary.riskDelta}` : trendData.summary.riskDelta} pts over window
            </div>
          </div>

          <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
            <div className="text-xs text-slate-400">Elevated Risk (High + Critical)</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">
              {trendData.summary.currentElevatedProjects} <span className="text-sm font-normal text-slate-400">projects</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Net Window Change: {trendData.summary.elevatedDelta > 0 ? `+${trendData.summary.elevatedDelta}` : trendData.summary.elevatedDelta} projects
            </div>
          </div>

          <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
            <div className="text-xs text-slate-400">Critical Threshold (75–100)</div>
            <div className="text-2xl font-bold text-red-400 tabular-nums mt-1">
              {trendData.summary.criticalProjects} <span className="text-sm font-normal text-slate-400">projects</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Immediate monitoring attention
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Viewport */}
      <div className="pt-6">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            Computing historical risk trend distributions...
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center text-sm text-red-400">
            {error}
          </div>
        ) : timeline.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            No historical risk snapshots match the selected filters.
          </div>
        ) : (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'distribution' ? (
                  <AreaChart
                    data={timeline}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state?.activePayload?.[0]?.payload?.key) {
                        setSelectedPeriodKey(state.activePayload[0].payload.key);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.75} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.15} />
                      </linearGradient>
                      <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.75} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.15} />
                      </linearGradient>
                      <linearGradient id="gradModerate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0.15} />
                      </linearGradient>
                      <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.65} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.12} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      unit={metricUnit === 'percent' ? '%' : ''}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(value: any, name: string) => [
                        metricUnit === 'percent' ? `${value}%` : `${value} projects`,
                        name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={metricUnit === 'percent' ? 'lowPct' : 'low'}
                      name="Low Risk (0–24)"
                      stackId="1"
                      stroke="#22c55e"
                      strokeWidth={1.75}
                      fill="url(#gradLow)"
                    />
                    <Area
                      type="monotone"
                      dataKey={metricUnit === 'percent' ? 'moderatePct' : 'moderate'}
                      name="Moderate Risk (25–49)"
                      stackId="1"
                      stroke="#eab308"
                      strokeWidth={1.75}
                      fill="url(#gradModerate)"
                    />
                    <Area
                      type="monotone"
                      dataKey={metricUnit === 'percent' ? 'highPct' : 'high'}
                      name="High Risk (50–74)"
                      stackId="1"
                      stroke="#f97316"
                      strokeWidth={1.75}
                      fill="url(#gradHigh)"
                    />
                    <Area
                      type="monotone"
                      dataKey={metricUnit === 'percent' ? 'criticalPct' : 'critical'}
                      name="Critical Risk (75–100)"
                      stackId="1"
                      stroke="#ef4444"
                      strokeWidth={1.75}
                      fill="url(#gradCritical)"
                    />
                  </AreaChart>
                ) : chartMode === 'dimensions' ? (
                  <LineChart
                    data={timeline}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state?.activePayload?.[0]?.payload?.key) {
                        setSelectedPeriodKey(state.activePayload[0].payload.key);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(value: any, name: string) => [`${value} / 100`, name]}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="#f97316"
                      strokeDasharray="4 4"
                      label={{
                        value: 'High-Risk Threshold (50)',
                        position: 'insideTopRight',
                        fill: '#f97316',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgOverallRisk"
                      name="Overall Ensemble Risk"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#38bdf8' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgCostRisk"
                      name="Cost Overrun Risk (25%)"
                      stroke="#e879f9"
                      strokeWidth={1.75}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgScheduleRisk"
                      name="Schedule Slippage Risk (25%)"
                      stroke="#fbbf24"
                      strokeWidth={1.75}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgFinancialRisk"
                      name="Progress-Expenditure Risk (15%)"
                      stroke="#34d399"
                      strokeWidth={1.75}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgAnomalyRisk"
                      name="Isolation Forest Anomaly Risk (15%)"
                      stroke="#f87171"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <ComposedChart
                    data={timeline}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state?.activePayload?.[0]?.payload?.key) {
                        setSelectedPeriodKey(state.activePayload[0].payload.key);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      stroke="#38bdf8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="low"
                      name="Low Risk Projects"
                      stackId="a"
                      fill="#22c55e"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="moderate"
                      name="Moderate Risk Projects"
                      stackId="a"
                      fill="#eab308"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="high"
                      name="High Risk Projects"
                      stackId="a"
                      fill="#f97316"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="critical"
                      name="Critical Risk Projects"
                      stackId="a"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgOverallRisk"
                      name="Mean Risk Score (0–100)"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#38bdf8' }}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Accessible Legend & Interactive Period Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-700/50 text-xs">
              {chartMode === 'dimensions' ? (
                <div className="flex flex-wrap items-center gap-4 text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                    Overall Ensemble Score
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-fuchsia-400 inline-block" />
                    Cost Risk (25%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                    Schedule Risk (25%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                    Progress-Financial Risk (15%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-red-400 inline-block" />
                    Anomaly Signal (15%)
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4 text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
                    Low (0–24)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" />
                    Moderate (25–49)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                    High (50–74)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
                    Critical (75–100)
                  </span>
                </div>
              )}

              <div className="text-slate-400">
                Click any period on the chart or table below to inspect snapshot telemetry.
              </div>
            </div>

            {/* Selected Snapshot Breakdown & Historical Table */}
            {inspectedPoint && (
              <div className="mt-6 pt-5 border-t border-slate-700/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Snapshot Distribution Breakdown: {inspectedPoint.period} ({inspectedPoint.quarter})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Mean Risk Score: {inspectedPoint.avgOverallRisk} / 100 · Cost Risk: {inspectedPoint.avgCostRisk} · Schedule Risk: {inspectedPoint.avgScheduleRisk} · Flagged Anomalies: {inspectedPoint.anomaliesFlagged}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {timeline.slice(-6).map(pt => (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => setSelectedPeriodKey(pt.key)}
                        className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap tabular-nums ${
                          inspectedPoint.key === pt.key
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-700/80'
                        }`}
                      >
                        {pt.period}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                    <thead className="text-slate-400 border-b border-slate-700/80">
                      <tr>
                        <th className="py-2.5 pr-4 font-medium">Snapshot Period</th>
                        <th className="py-2.5 px-3 font-medium text-right">Low (0–24)</th>
                        <th className="py-2.5 px-3 font-medium text-right">Moderate (25–49)</th>
                        <th className="py-2.5 px-3 font-medium text-right">High (50–74)</th>
                        <th className="py-2.5 px-3 font-medium text-right">Critical (75–100)</th>
                        <th className="py-2.5 px-3 font-medium text-right">Cost Risk</th>
                        <th className="py-2.5 px-3 font-medium text-right">Schedule Risk</th>
                        <th className="py-2.5 pl-3 font-medium text-right">Composite Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {timeline.map(row => {
                        const isSelected = inspectedPoint.key === row.key;
                        return (
                          <tr
                            key={row.key}
                            onClick={() => setSelectedPeriodKey(row.key)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-950/40 text-white' : 'hover:bg-[#0f172a]/60'
                            }`}
                          >
                            <td className="py-2.5 pr-4 font-medium text-white">
                              {row.period} <span className="text-slate-500 font-normal">· {row.quarter}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-green-400">
                              {row.low} <span className="text-slate-500">({row.lowPct}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-yellow-400">
                              {row.moderate} <span className="text-slate-500">({row.moderatePct}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-orange-400">
                              {row.high} <span className="text-slate-500">({row.highPct}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-red-400 font-medium">
                              {row.critical} <span className="text-slate-500 font-normal">({row.criticalPct}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">{row.avgCostRisk.toFixed(1)}</td>
                            <td className="py-2.5 px-3 text-right">{row.avgScheduleRisk.toFixed(1)}</td>
                            <td className="py-2.5 pl-3 text-right font-semibold text-sky-400">
                              {row.avgOverallRisk.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
