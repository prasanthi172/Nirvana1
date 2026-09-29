import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  HardHat,
  TrendingUp,
  Clock,
  BellRing,
  Activity,
  BarChart3,
  ArrowRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, UserRole } from '../context/AuthContext';

interface PublicSummary {
  totalProjects: number;
  sectorsCount: number;
  ministriesCount: number;
  totalOriginalCost: number;
  totalRevisedCost: number;
  highRiskCount: number;
  demoAccounts: Array<{
    name: string;
    email: string;
    role: UserRole;
    organization: string;
  }>;
}

export default function LandingPage() {
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/summary')
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(() => {});
  }, []);

  const handleDemoQuickAccess = async (email: string) => {
    setQuickLoading(email);
    const res = await login(email, '', true);
    setQuickLoading(null);
    if (res.ok) {
      navigate('/');
    }
  };

  const features = [
    {
      title: 'Project Monitoring',
      description:
        'Centralized tracking of capital infrastructure corridors across ministries, implementing agencies, states, and physical execution milestones.',
      icon: <HardHat size={20} className="text-blue-400" />,
    },
    {
      title: 'Cost Overrun Prediction',
      description:
        'Random Forest classification models quantifying cost escalation probability and sanctioned-to-revised capital variance.',
      icon: <TrendingUp size={20} className="text-indigo-400" />,
    },
    {
      title: 'Schedule Risk Analysis',
      description:
        'Gradient Boosting regression estimating commissioning slippage in days and identifying execution velocity bottlenecks.',
      icon: <Clock size={20} className="text-amber-400" />,
    },
    {
      title: 'Early Warning Alerts',
      description:
        'Automated multi-factor alert generation for projects exhibiting severe cost-progress divergence or commissioning delays.',
      icon: <BellRing size={20} className="text-red-400" />,
    },
    {
      title: 'Risk Intelligence',
      description:
        'Composite 0–100 risk scoring ensemble combining cost, schedule, physical progress, financial mismatch, and Isolation Forest anomalies.',
      icon: <Activity size={20} className="text-emerald-400" />,
    },
    {
      title: 'Project Analytics',
      description:
        'Sector-level and ministry-level benchmarking, real-time D3.js sub-sector anomaly heatmaps, and executive PDF brief generation.',
      icon: <BarChart3 size={20} className="text-cyan-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1122] text-slate-100 flex flex-col">
      {/* Top Institutional Navigation Bar */}
      <header className="border-b border-slate-800/90 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/25">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wider text-base">NIRVANA</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  National Infrastructure Risk & Vision Analytics Network
                </span>
              </div>
              <p className="text-[11px] text-slate-400 sm:hidden">Infrastructure Risk & Vision Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Open Dashboard ({ROLE_LABELS[user.role]})</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-blue-600/20"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Overview */}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#0f172a] via-[#0d162c] to-[#0a1122] py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="text-xs font-medium text-blue-400 tracking-wide">
                  National Infrastructure Monitoring & Predictive Governance Platform
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                    NIRVANA
                  </h1>
                  <p className="text-lg sm:text-xl font-semibold text-blue-200">
                    National Infrastructure Risk & Vision Analytics Network
                  </p>
                </div>

                <p className="text-base sm:text-lg font-medium text-slate-200 border-l-2 border-blue-500 pl-4">
                  AI-Powered Infrastructure Project Monitoring & Early Warning System
                </p>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  NIRVANA helps monitoring teams identify infrastructure project risks, cost escalation, schedule delays, and early warning signals using data-driven analytics.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to="/login"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/25"
                  >
                    <span>Login</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-3 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Register
                  </Link>
                </div>

                {/* Live Dataset Telemetry Strip (Real calculations from server) */}
                {summary && (
                  <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 tabular-nums">
                    <div>
                      <div className="text-2xl font-bold text-white">{summary.totalProjects}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Monitored Projects</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{summary.sectorsCount}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Infrastructure Sectors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">
                        ₹{(summary.totalOriginalCost / 1000).toFixed(1)}k Cr
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Sanctioned Outlay</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-400">{summary.highRiskCount}</div>
                      <div className="text-xs text-slate-400 mt-0.5">High-Risk Flagged</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Role-Based Access & Demo Credentials Preview */}
              <div className="lg:col-span-5">
                <div className="bg-[#131d36] border border-slate-700/80 rounded-xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Lock size={16} className="text-blue-400" />
                        Role-Based Access Governance
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Select a pre-configured institutional demo account or sign in with your credentials.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(summary?.demoAccounts || [
                      {
                        name: 'Dr. Rajeshwar Rao',
                        email: 'admin@nirvana.demo',
                        role: 'ADMINISTRATOR' as UserRole,
                        organization: 'MoSPI / IPMD Central Administration',
                      },
                      {
                        name: 'Durga Prasanthi',
                        email: 'officer@nirvana.demo',
                        role: 'MONITORING_OFFICER' as UserRole,
                        organization: 'Infrastructure & Project Monitoring Division (IPMD)',
                      },
                      {
                        name: 'Vikramaditya Sen',
                        email: 'analyst@nirvana.demo',
                        role: 'POLICY_ANALYST' as UserRole,
                        organization: 'NITI Aayog — Infrastructure Policy Cell',
                      },
                      {
                        name: 'Ananya Sharma',
                        email: 'viewer@nirvana.demo',
                        role: 'VIEWER' as UserRole,
                        organization: 'Public Infrastructure Audit & Oversight Directorate',
                      },
                    ]).map(acct => (
                      <div
                        key={acct.email}
                        className="p-3.5 rounded-lg bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-white">{ROLE_LABELS[acct.role]}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300 truncate">{acct.name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-blue-400 mt-0.5">{acct.email}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{acct.organization}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDemoQuickAccess(acct.email)}
                          disabled={quickLoading === acct.email}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
                        >
                          {quickLoading === acct.email ? 'Signing in…' : 'Launch Role'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Scrypt Password Hashing & RBAC Protected
                    </span>
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                      Standard Login →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Core Capabilities Feature Grid */}
        <section className="py-16 max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white">Core Platform Capabilities</h2>
            <p className="text-sm text-slate-400 mt-1">
              Integrated analytical modules built on MoSPI/IPMD Central Sector infrastructure project telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(item => (
              <div
                key={item.title}
                className="bg-[#131d36] border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#0f172a] border border-slate-800 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0f172a] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            NIRVANA — National Infrastructure Risk & Vision Analytics Network · AI-Powered Monitoring & Early Warning System
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white transition-colors">
              Login
            </Link>
            <span>·</span>
            <Link to="/register" className="hover:text-white transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
