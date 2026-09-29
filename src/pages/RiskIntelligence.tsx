import { useState, useEffect, useRef } from 'react';
import RiskTrendAnalysis from '../components/RiskTrendAnalysis';
import OperationalPhaseHeatmap from '../components/OperationalPhaseHeatmap';

interface ProjectRecord {
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

export default function RiskIntelligence() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [riskResult, setRiskResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const mlPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then((data: ProjectRecord[]) => {
        setProjects(data);
        if (data.length > 0) {
          // Pick a high-risk project by default for immediate analytical context
          const highRisk = data.find(p => p.overall_risk_score >= 50) || data[0];
          setSelectedProjectId(highRisk.id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const analyzeProject = async (proj?: ProjectRecord | null) => {
    const target = proj ?? selectedProject;
    setLoading(true);

    const payload = target
      ? {
          original_cost: target.original_cost,
          project_age_days: target.project_age_days,
          physical_progress: target.physical_progress,
          expenditure_pct: target.expenditure_pct,
        }
      : {
          original_cost: 15000,
          project_age_days: 1200,
          physical_progress: 35,
          expenditure_pct: 85,
        };

    try {
      const res = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRiskResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject && !riskResult) {
      analyzeProject(selectedProject);
    }
  }, [selectedProjectId]);

  const classifyRiskTier = (score: number) => {
    if (score >= 75) return { label: 'CRITICAL', color: 'text-red-400' };
    if (score >= 50) return { label: 'HIGH', color: 'text-orange-400' };
    if (score >= 25) return { label: 'MODERATE', color: 'text-yellow-400' };
    return { label: 'LOW', color: 'text-green-400' };
  };

  const compositeScore = riskResult ? riskResult.risk_score : selectedProject?.overall_risk_score ?? 0;
  const riskTier = classifyRiskTier(compositeScore);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Risk Intelligence Engine</h2>
          <p className="text-slate-400 text-sm">
            Multi-model predictive risk scoring, historical risk trend distributions, and explainable factor attribution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMethodology(prev => !prev)}
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          {showMethodology ? 'Hide Risk Ensemble Formula' : 'How is this risk score calculated?'}
        </button>
      </div>

      {/* Transparent Ensemble Formula Panel */}
      {showMethodology && (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-white text-sm">
            Transparent Risk Ensemble Methodology (Prototype Configuration)
          </div>
          <p className="text-slate-400 leading-relaxed">
            Overall Risk Score (0–100) combines five normalized analytical dimensions: Cost Overrun Risk (25% weight), Schedule Slippage Risk (25% weight), Physical Progress Risk (20% weight), Progress–Expenditure Mismatch Risk (15% weight), and Isolation Forest Anomaly Signal (15% weight).
          </p>
          <div className="text-slate-400 pt-1">
            Prototype risk thresholds: Low (0–24) · Moderate (25–49) · High (50–74) · Critical (75–100) — not official government classifications.
          </div>
        </div>
      )}

      {/* Historical Risk Trend Distributions (Recharts Visual Analysis Component) */}
      <RiskTrendAnalysis />

      {/* D3.js Operational Phase Risk Intensity Heatmap */}
      <OperationalPhaseHeatmap
        projects={projects}
        onSelectProject={proj => {
          setSelectedProjectId(proj.id);
          analyzeProject(proj);
          mlPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* Project-Level ML Risk Assessment Panel */}
      <div ref={mlPanelRef} className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/70">
          <div>
            <h3 className="text-lg font-semibold text-white">Project-Level ML Risk Assessment</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a project to run live inference through the Random Forest and Isolation Forest models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={e => {
                const nextId = e.target.value;
                setSelectedProjectId(nextId);
                const found = projects.find(p => p.id === nextId);
                if (found) analyzeProject(found);
              }}
              className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.sector})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => analyzeProject(selectedProject)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {loading ? 'Running ML Inference...' : 'Run ML Risk Assessment'}
            </button>
          </div>
        </div>

        {selectedProject && (
          <div className="pt-5 space-y-6">
            {/* Project Context Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-white font-medium">{selectedProject.name}</span>
              <span aria-hidden="true">·</span>
              <span>Code: {selectedProject.id}</span>
              <span aria-hidden="true">·</span>
              <span>Sector: {selectedProject.sector}</span>
              <span aria-hidden="true">·</span>
              <span>Ministry: {selectedProject.ministry}</span>
              <span aria-hidden="true">·</span>
              <span>State: {selectedProject.state}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Original Cost: ₹{selectedProject.original_cost.toLocaleString()} Cr</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Physical Progress: {selectedProject.physical_progress}%</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Expenditure: {selectedProject.expenditure_pct}%</span>
            </div>

            {/* Primary ML Outputs (Hairline Grid) */}
            {riskResult && !riskResult.error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y border-slate-700/60 tabular-nums">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Overall Risk Score</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {riskResult.risk_score.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                    <span className={`text-xs font-semibold ml-1 ${riskTier.color}`}>
                      {riskTier.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Weighted multi-model ensemble
                  </div>
                </div>

                <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
                  <div className="text-slate-400 text-xs mb-1">Estimated Cost Overrun Probability</div>
                  <div className="text-3xl font-bold text-fuchsia-400">
                    {(riskResult.cost_overrun_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Predicted escalation: +{riskResult.predicted_cost_overrun_pct.toFixed(1)}%
                  </div>
                </div>

                <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
                  <div className="text-slate-400 text-xs mb-1">Estimated Time Overrun Probability</div>
                  <div className="text-3xl font-bold text-amber-400">
                    {(riskResult.time_overrun_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Predicted delay: {Math.round(riskResult.predicted_time_overrun_days)} days
                  </div>
                </div>

                <div className="lg:border-l lg:border-slate-700/60 lg:pl-6">
                  <div className="text-slate-400 text-xs mb-1">Isolation Forest Pattern Signal</div>
                  <div className={`text-xl font-bold mt-1 ${riskResult.is_anomaly ? 'text-red-400' : 'text-green-400'}`}>
                    {riskResult.is_anomaly ? 'Unusual Pattern Detected' : 'Normal Pattern'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Anomaly score: {riskResult.anomaly_score.toFixed(3)}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Score Dimensions & Explainability */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Component Risk Dimensions (0–100)
                </h4>
                <div className="space-y-3 tabular-nums text-xs">
                  {[
                    { label: 'Cost Risk Score (25% weight)', value: selectedProject.cost_risk_score, color: 'bg-fuchsia-500' },
                    { label: 'Schedule Risk Score (25% weight)', value: selectedProject.schedule_risk_score, color: 'bg-amber-500' },
                    { label: 'Progress Risk Score (20% weight)', value: selectedProject.progress_risk_score, color: 'bg-blue-500' },
                    { label: 'Financial Mismatch Risk (15% weight)', value: selectedProject.financial_risk_score, color: 'bg-emerald-500' },
                    { label: 'Anomaly Risk Score (15% weight)', value: selectedProject.anomaly_risk_score, color: 'bg-red-500' },
                  ].map(dim => (
                    <div key={dim.label}>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{dim.label}</span>
                        <span className="font-medium text-white">{dim.value} / 100</span>
                      </div>
                      <div className="w-full bg-[#0f172a] rounded-full h-1.5">
                        <div
                          className={`${dim.color} h-1.5 rounded-full`}
                          style={{ width: `${Math.min(100, Math.max(0, dim.value))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Explainable AI: Signals Associated with Prediction
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex justify-between py-1.5 border-b border-slate-700/50">
                    <span>Progress–Expenditure Gap</span>
                    <span className="tabular-nums text-white font-medium">
                      {selectedProject.progress_expenditure_gap > 0 ? `+${selectedProject.progress_expenditure_gap}%` : `${selectedProject.progress_expenditure_gap}%`} ({selectedProject.progress_expenditure_gap > 15 ? 'Expenditure substantially ahead of progress' : 'Within normal corridor'})
                    </span>
                  </li>
                  <li className="flex justify-between py-1.5 border-b border-slate-700/50">
                    <span>Project Execution Age</span>
                    <span className="tabular-nums text-white font-medium">
                      {selectedProject.project_age_days} days ({Math.round(selectedProject.project_age_days / 365 * 10) / 10} yrs)
                    </span>
                  </li>
                  <li className="flex justify-between py-1.5 border-b border-slate-700/50">
                    <span>Reported Physical Progress</span>
                    <span className="tabular-nums text-white font-medium">
                      {selectedProject.physical_progress}% completed
                    </span>
                  </li>
                  <li className="flex justify-between py-1.5">
                    <span>Capital Cost Baseline</span>
                    <span className="tabular-nums text-white font-medium">
                      ₹{selectedProject.original_cost.toLocaleString()} Cr
                    </span>
                  </li>
                </ul>
                <p className="text-[11px] text-slate-400 mt-3">
                  Note: Feature contributions indicate statistical association with the model's prediction and do not establish causality.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
