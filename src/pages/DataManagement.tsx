import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ValidationFlag {
  row: number;
  code: string;
  issue: string;
  severity: string;
}

interface DataQualityReport {
  datasetName: string;
  uploadedAt: string;
  rows: number;
  columns: number;
  missingValues: number;
  duplicateRecords: number;
  invalidValues: number;
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
  overallQualityScore: number;
  validationFlags: ValidationFlag[];
  lastTrainingMetrics?: Record<string, number>;
}

const SAMPLE_CSV = `Project Code,Project Name,Sector Name,Line Ministry,Implementing Agency,State,Original Cost,Revised Cost,Expenditure,Physical Progress,Project Age
PRJ-2026101,Delhi-Amritsar-Katra Expressway Phase I,Roads,MoRT&H,NHAI,Punjab,14200,16850,11900,62,940
PRJ-2026102,Mumbai-Ahmedabad High Speed Rail Corridor,Railways,Ministry of Railways,NHSRCL,Maharashtra,108000,132000,78500,48,1680
PRJ-2026103,Tehri Pumped Storage Plant (1000 MW),Power,Ministry of Power,THDCIL,Uttarakhand,4825,6420,5980,78,2190
PRJ-2026104,Paradip-Hyderabad Product Pipeline,Petroleum,MoPNG,IOCL,Odisha,3800,4120,3420,88,1120
PRJ-2026105,Chennai Metro Rail Phase II Corridor,Urban Transport,MoHUA,CMRL,Tamil Nadu,63246,69180,34100,41,1340
PRJ-2026106,Bharatmala Greenfield Ring Road Package IV,Roads,MoRT&H,NHAI,Gujarat,5400,5400,4850,91,680`;

export default function DataManagement() {
  const { token } = useAuth();
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [datasetName, setDatasetName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchQuality = () => {
    fetch('/api/data/quality')
      .then(res => res.json())
      .then(data => setQuality(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchQuality();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/data/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      setQuality(data.quality);
      setStatusMessage({
        type: 'success',
        text: data.message || `Ingested ${data.quality?.rows} project records and retrained ML models.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to process uploaded file.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteUpload = async () => {
    if (!rawText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste CSV, TSV, or JSON project records first.' });
      return;
    }

    setUploading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/data/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          datasetName: datasetName.trim() || 'Pasted MoSPI/IPMD Dataset Snapshot',
          rawText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ingestion failed');
      }
      setQuality(data.quality);
      setStatusMessage({
        type: 'success',
        text: data.message || `Ingested ${data.quality?.rows} records and retrained ML models.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to parse pasted dataset.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + SAMPLE_CSV);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'nirvana_mospi_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Data Management & Validation</h2>
          <p className="text-slate-400 text-sm">
            Upload CSV or JSON infrastructure project datasets, run automated validation checks, and retrain the ML pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <Download size={14} />
          Download Sample CSV Template
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : 'bg-red-950/40 border-red-700/60 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Upload & Paste Ingestion Section */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Option 1: File Upload */}
          <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-700/70 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <h3 className="text-base font-semibold text-white">1. Upload Dataset File (CSV / TSV / JSON)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Supports MoSPI/IPMD columns: <span className="text-slate-300">Project Code, Project Name, Sector Name, Line Ministry, Implementing Agency, State, Original Cost, Revised Cost, Expenditure, Physical Progress</span>.
              </p>

              <label className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 cursor-pointer bg-[#0f172a]/60 transition-colors">
                <Upload className="text-blue-400 mb-3" size={28} />
                <span className="text-sm font-medium text-white">
                  {uploading ? 'Processing & Training Models...' : 'Click to select CSV or JSON file'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Automatically validates records and retrains Random Forest & Isolation Forest
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 text-xs text-slate-400">
              Expected numeric units: Costs & Expenditure in ₹ Crore, Physical Progress in 0–100%.
            </div>
          </div>

          {/* Option 2: Direct Paste CSV / JSON */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">2. Paste Raw Dataset (CSV, TSV, or JSON)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paste spreadsheet rows directly below to ingest immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDatasetName('Sample MoSPI High-Priority Corridors');
                    setRawText(SAMPLE_CSV);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
                >
                  Load Sample Rows
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="Dataset Snapshot Label (optional, e.g., MoSPI Q2 FY27 Snapshot)"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste CSV with headers (e.g. Project Code,Project Name,Sector Name,Original Cost,Revised Cost,Expenditure,Physical Progress)..."
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handlePasteUpload}
                disabled={uploading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw size={14} className={uploading ? 'animate-spin' : ''} />
                {uploading ? 'Ingesting & Retraining...' : 'Ingest Dataset & Retrain Models'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality & Validation Dashboard */}
      {quality && (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-700/70">
            <div>
              <h3 className="text-lg font-semibold text-white">Active Dataset Quality & Audit Telemetry</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <FileSpreadsheet size={14} className="text-blue-400" />
                <span className="text-white font-medium">{quality.datasetName}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{quality.rows} rows</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{quality.columns} columns</span>
                <span aria-hidden="true">·</span>
                <span>Updated {new Date(quality.uploadedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="text-right tabular-nums">
              <div className="text-xs text-slate-400">Composite Data Quality Score</div>
              <div className="text-2xl font-bold text-emerald-400">{quality.overallQualityScore}%</div>
            </div>
          </div>

          {/* 4 Quality Dimensions + Record Audit Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 tabular-nums">
            <div>
              <div className="text-xs text-slate-400">Completeness</div>
              <div className="text-xl font-bold text-white mt-1">{quality.completeness}%</div>
            </div>
            <div className="sm:border-l sm:border-slate-700/60 sm:pl-4">
              <div className="text-xs text-slate-400">Validity</div>
              <div className="text-xl font-bold text-white mt-1">{quality.validity}%</div>
            </div>
            <div className="sm:border-l sm:border-slate-700/60 sm:pl-4">
              <div className="text-xs text-slate-400">Uniqueness</div>
              <div className="text-xl font-bold text-white mt-1">{quality.uniqueness}%</div>
            </div>
            <div className="sm:border-l sm:border-slate-700/60 sm:pl-4">
              <div className="text-xs text-slate-400">Consistency</div>
              <div className="text-xl font-bold text-white mt-1">{quality.consistency}%</div>
            </div>
            <div className="lg:border-l lg:border-slate-700/60 lg:pl-4">
              <div className="text-xs text-slate-400">Missing Values</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{quality.missingValues}</div>
            </div>
            <div className="sm:border-l sm:border-slate-700/60 sm:pl-4">
              <div className="text-xs text-slate-400">Duplicates</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{quality.duplicateRecords}</div>
            </div>
            <div className="sm:border-l sm:border-slate-700/60 sm:pl-4">
              <div className="text-xs text-slate-400">Invalid Values</div>
              <div className="text-xl font-bold text-red-400 mt-1">{quality.invalidValues}</div>
            </div>
          </div>

          {/* Validation Checks Table */}
          <div className="pt-4 border-t border-slate-700/60">
            <h4 className="text-sm font-semibold text-white mb-2">
              Automated Validation Flags (Unsilenced Record Anomalies)
            </h4>
            {quality.validationFlags.length === 0 ? (
              <p className="text-xs text-emerald-400">
                All ingested records passed duplicate code, cost positivity, expenditure sign, and physical progress [0–100%] validation checks.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                  <thead className="text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Row #</th>
                      <th className="py-2 px-3 font-medium">Project Code</th>
                      <th className="py-2 px-3 font-medium">Detected Validation Issue</th>
                      <th className="py-2 pl-3 font-medium text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {quality.validationFlags.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4 text-slate-400">{f.row}</td>
                        <td className="py-2 px-3 font-medium text-blue-400">{f.code}</td>
                        <td className="py-2 px-3">{f.issue}</td>
                        <td className="py-2 pl-3 text-right font-medium text-amber-400">{f.severity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
