import { Beaker } from 'lucide-react';

export default function MLIntelligence() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Model Intelligence</h2>
        <p className="text-slate-400">Pipeline status and model performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Pipeline Status</h3>
          <div className="space-y-3">
            <StatusRow label="Data Loaded" status="success" />
            <StatusRow label="Data Validated" status="success" />
            <StatusRow label="Features Generated" status="success" />
            <StatusRow label="Cost Classification (Random Forest)" status="success" />
            <StatusRow label="Time Regression (Gradient Boosting)" status="success" />
            <StatusRow label="Anomaly Detection (Isolation Forest)" status="success" />
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Model Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Cost Overrun ROC-AUC</span>
                <span className="text-blue-400 font-medium">0.89</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '89%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Schedule Delay R²</span>
                <span className="text-blue-400 font-medium">0.76</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '76%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Methodology Note:</strong> The current prototype estimates project risk using the available project-level data snapshot.
              Predictions are experimental analytical outputs and should be validated against richer historical records before operational deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string, status: 'success' | 'pending' | 'error' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-300 text-sm">{label}</span>
      <span className="text-green-400">✓</span>
    </div>
  );
}
