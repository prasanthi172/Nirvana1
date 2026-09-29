import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WarningItem {
  id: string;
  projectCode: string;
  projectName: string;
  sector: string;
  ministry: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium';
  riskScore: number;
  factorSummary: string;
  recommendedAction: string;
  status: 'Active' | 'Acknowledged' | 'Resolved';
}

export default function EarlyWarnings() {
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then((projects: any[]) => {
        const generated: WarningItem[] = [];

        projects.forEach(p => {
          if (p.overall_risk_score >= 75 || (p.cost_overrun_pct >= 50 && (p.time_overrun_days ?? 0) > 365)) {
            generated.push({
              id: `WARN-${p.id}-MULTI`,
              projectCode: p.id,
              projectName: p.name,
              sector: p.sector,
              ministry: p.ministry,
              type: 'Multi-Factor Cost & Schedule Escalation',
              severity: 'Critical',
              riskScore: p.overall_risk_score,
              factorSummary: `Cost escalation +${p.cost_overrun_pct}% (₹${p.original_cost.toLocaleString()} Cr → ₹${p.revised_cost.toLocaleString()} Cr) · Physical Progress: ${p.physical_progress}%`,
              recommendedAction: 'Conduct inter-ministerial milestone review and audit revised cost completion schedule.',
              status: 'Active',
            });
          } else if (p.progress_expenditure_gap >= 25) {
            generated.push({
              id: `WARN-${p.id}-GAP`,
              projectCode: p.id,
              projectName: p.name,
              sector: p.sector,
              ministry: p.ministry,
              type: 'Progress–Financial Expenditure Mismatch',
              severity: p.progress_expenditure_gap >= 45 ? 'Critical' : 'High',
              riskScore: p.overall_risk_score,
              factorSummary: `Expenditure (${p.expenditure_pct}%) exceeds reported physical progress (${p.physical_progress}%) by +${p.progress_expenditure_gap}%`,
              recommendedAction: 'Verify physical milestone certification against cumulative disbursement ledger.',
              status: 'Active',
            });
          } else if (p.cost_overrun_pct >= 35) {
            generated.push({
              id: `WARN-${p.id}-COST`,
              projectCode: p.id,
              projectName: p.name,
              sector: p.sector,
              ministry: p.ministry,
              type: 'Cost Escalation Threshold Exceeded',
              severity: 'High',
              riskScore: p.overall_risk_score,
              factorSummary: `Revised cost exceeds sanctioned baseline by +${p.cost_overrun_pct}%`,
              recommendedAction: 'Review revised cost sanction drivers and land/procurement bottlenecks.',
              status: 'Active',
            });
          } else if ((p.time_overrun_days ?? 0) >= 730 && p.physical_progress < 65) {
            generated.push({
              id: `WARN-${p.id}-TIME`,
              projectCode: p.id,
              projectName: p.name,
              sector: p.sector,
              ministry: p.ministry,
              type: 'Schedule Slippage & Low Execution Velocity',
              severity: 'Medium',
              riskScore: p.overall_risk_score,
              factorSummary: `Commissioning shift of ${p.time_overrun_days} days with ${p.physical_progress}% physical completion`,
              recommendedAction: 'Assess contractor mobilization and right-of-way clearance status.',
              status: 'Active',
            });
          }
        });

        generated.sort((a, b) => b.riskScore - a.riskScore);
        setWarnings(generated.slice(0, 40));
      })
      .catch(err => console.error(err));
  }, []);

  const filteredWarnings = useMemo(() => {
    if (severityFilter === 'ALL') return warnings;
    return warnings.filter(w => w.severity === severityFilter);
  }, [warnings, severityFilter]);

  const updateStatus = (id: string, nextStatus: 'Acknowledged' | 'Resolved') => {
    setWarnings(prev => prev.map(w => (w.id === id ? { ...w, status: nextStatus } : w)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Early Warning Center</h2>
          <p className="text-slate-400 text-sm">
            Automated monitoring alerts generated from MoSPI/IPMD project cost, schedule, and progress-expenditure signals.
          </p>
        </div>

        <div className="flex items-center bg-[#1e293b] p-1 rounded-lg border border-slate-700 self-start sm:self-auto">
          {['ALL', 'Critical', 'High', 'Medium'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                severityFilter === sev ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev === 'ALL' ? `All (${warnings.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredWarnings.map(w => (
          <div
            key={w.id}
            className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    w.severity === 'Critical'
                      ? 'text-red-400'
                      : w.severity === 'High'
                      ? 'text-orange-400'
                      : 'text-amber-400'
                  }`}
                >
                  {w.severity.toUpperCase()} SEVERITY
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-white font-semibold">{w.type}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-blue-400 font-mono">Code: {w.projectCode}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-slate-400">{w.sector}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-slate-300 tabular-nums">Risk Score: {w.riskScore}/100</span>
              </div>

              <h4 className="text-sm font-medium text-white">{w.projectName}</h4>
              <p className="text-xs text-slate-300 tabular-nums">{w.factorSummary}</p>
              <p className="text-xs text-slate-400">
                Recommended Action: <span className="text-slate-300">{w.recommendedAction}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {w.status === 'Active' ? (
                <>
                  <button
                    type="button"
                    onClick={() => updateStatus(w.id, 'Acknowledged')}
                    className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors whitespace-nowrap"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(w.id, 'Resolved')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors whitespace-nowrap"
                  >
                    Mark Reviewed
                  </button>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 px-3 py-1.5">
                  <CheckCircle2 size={14} />
                  {w.status}
                </span>
              )}
              <Link
                to="/risk"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-blue-400 transition-colors whitespace-nowrap"
              >
                Risk Profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
