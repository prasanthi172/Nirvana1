import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ShieldAlert, Table } from 'lucide-react';
import { generateAndDownloadDashboardPdf } from '../utils/pdfReportGenerator';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

export default function ReportsCenter() {
  const { user, logAuditAction } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [lastExportNotice, setLastExportNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, []);

  const handleExportPdf = async () => {
    setGeneratingPdf(true);
    setLastExportNotice(null);
    try {
      await generateAndDownloadDashboardPdf();
      await logAuditAction('EXPORT_REPORT', 'Generated NIRVANA Executive Portfolio PDF Report');
      setLastExportNotice('Executive PDF Brief generated and recorded in the institutional Audit Log.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleExportCsv = async (filterType: 'ALL' | 'HIGH_RISK' | 'COST_OVERRUN') => {
    const filtered =
      filterType === 'HIGH_RISK'
        ? projects.filter(p => p.overall_risk_score >= 50)
        : filterType === 'COST_OVERRUN'
        ? projects.filter(p => p.cost_overrun_pct > 15)
        : projects;

    const headers = [
      'Project Code',
      'Project Name',
      'Sector',
      'Ministry',
      'State',
      'Original Cost (Cr)',
      'Revised Cost (Cr)',
      'Expenditure (Cr)',
      'Cost Overrun (%)',
      'Time Overrun (Days)',
      'Physical Progress (%)',
      'Overall Risk Score',
      'Risk Tier',
    ];

    const rows = filtered.map(p =>
      [
        `"${p.id}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.sector || '').replace(/"/g, '""')}"`,
        `"${(p.ministry || '').replace(/"/g, '""')}"`,
        `"${(p.state || '').replace(/"/g, '""')}"`,
        p.original_cost,
        p.revised_cost,
        p.expenditure,
        p.cost_overrun_pct,
        p.time_overrun_days ?? 0,
        p.physical_progress,
        p.overall_risk_score,
        p.risk_level,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nirvana_${filterType.toLowerCase()}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logAuditAction('EXPORT_REPORT', `Exported ${filterType} CSV Ledger (${filtered.length} projects)`);
    setLastExportNotice(`Exported ${filtered.length} project records to CSV and logged action in Audit Trail.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Executive Reports & Dossier Export Center</h2>
        <p className="text-slate-400 text-sm">
          Generate structured PDF executive summaries and audit-compliant CSV data ledgers ({ user ? ROLE_LABELS[user.role] : 'Authorized' } clearance).
        </p>
      </div>

      {lastExportNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{lastExportNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Executive Report Card */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Structured Executive Analytics Brief (PDF)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generates a 2-page vector PDF dossier containing national portfolio KPIs, Project Health Index breakdown, Risk Tier distributions, Sector original-vs-revised cost tables, and the High-Risk Project Watchlist.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={generatingPdf}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={15} />
            <span>{generatingPdf ? 'Generating PDF Dossier…' : 'Download Executive PDF Brief'}</span>
          </button>
        </div>

        {/* CSV Analytical Exports */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Table size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Project Monitoring & Risk Ledgers (CSV)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Export project-level cost, schedule slippage, physical progress, and composite ML risk scores for inter-ministerial review.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleExportCsv('ALL')}
              className="w-full py-2 px-4 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-between"
            >
              <span>Complete Monitored Portfolio Ledger ({projects.length} projects)</span>
              <Download size={14} className="text-blue-400" />
            </button>

            <button
              type="button"
              onClick={() => handleExportCsv('HIGH_RISK')}
              className="w-full py-2 px-4 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-between"
            >
              <span>High & Critical Risk Watchlist ({projects.filter(p => p.overall_risk_score >= 50).length} projects)</span>
              <ShieldAlert size={14} className="text-red-400" />
            </button>

            <button
              type="button"
              onClick={() => handleExportCsv('COST_OVERRUN')}
              className="w-full py-2 px-4 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-between"
            >
              <span>Severe Cost Escalation (&gt;15% Overrun) ({projects.filter(p => p.cost_overrun_pct > 15).length} projects)</span>
              <Download size={14} className="text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
