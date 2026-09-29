import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useAuth, ROLE_LABELS, UserRole } from '../context/AuthContext';

const DEMO_USERS: Array<{
  role: UserRole;
  email: string;
  name: string;
  organization: string;
}> = [
  {
    role: 'ADMINISTRATOR',
    email: 'admin@nirvana.demo',
    name: 'Dr. Rajeshwar Rao',
    organization: 'MoSPI / IPMD Central Administration',
  },
  {
    role: 'MONITORING_OFFICER',
    email: 'officer@nirvana.demo',
    name: 'Durga Prasanthi',
    organization: 'Infrastructure & Project Monitoring Division',
  },
  {
    role: 'POLICY_ANALYST',
    email: 'analyst@nirvana.demo',
    name: 'Vikramaditya Sen',
    organization: 'NITI Aayog Policy & Benchmarking Cell',
  },
  {
    role: 'VIEWER',
    email: 'viewer@nirvana.demo',
    name: 'Ananya Sharma',
    organization: 'Public Infrastructure Audit Observer',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateMessage = (location.state as any)?.registrationMessage || null;
  const prefillEmail = (location.state as any)?.registeredEmail || '';

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    const res = await login(email.trim(), password, false);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Invalid email or password.');
      return;
    }

    navigate('/');
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setSubmitting(true);
    const res = await login(demoEmail, '', true);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Demo login failed.');
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a1122] text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0f172a]/90">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wider">NIRVANA</span>
              <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
                National Infrastructure Risk & Vision Analytics Network
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/welcome" className="text-slate-400 hover:text-white transition-colors">
              ← Back to Landing Page
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 rounded-lg text-white font-medium transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Login Form Card */}
          <div className="lg:col-span-7 bg-[#131d36] border border-slate-700/80 rounded-xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ShieldAlert size={18} className="text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-wider">NIRVANA</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Sign In to NIRVANA</h1>
              <p className="text-xs text-slate-400 mt-1">
                AI-Powered Infrastructure Project Monitoring & Early Warning System
              </p>
            </div>

            {stateMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="font-medium">{stateMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-red-300 text-xs flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="official@ministry.gov.in or officer@nirvana.demo"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSubmitted(false);
                      setForgotModalOpen(true);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{submitting ? 'Authenticating…' : 'Login'}</span>
                  <ArrowRight size={15} />
                </button>
                <Link
                  to="/register"
                  className="py-2.5 px-5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors text-center"
                >
                  Register
                </Link>
              </div>
            </form>
          </div>

          {/* Right: Documented Demo Users (Section 12) */}
          <div className="lg:col-span-5 bg-[#131d36] border border-slate-700/80 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Development & Demo Role Accounts</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Click any institutional role below to sign in and test role-based navigation, permissions, and personalized dashboards:
              </p>
            </div>

            <div className="space-y-2.5">
              {DEMO_USERS.map(demo => (
                <div
                  key={demo.email}
                  className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{ROLE_LABELS[demo.role]}</div>
                    <div className="text-[11px] font-mono text-blue-400 truncate">{demo.email}</div>
                    <div className="text-[11px] text-slate-400 truncate">{demo.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(demo.email)}
                    disabled={submitting}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-medium transition-colors shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-[#0f172a]/70 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Security Note:</strong> Demo accounts are provisioned for evaluation using server-side scrypt password verification and signed session tokens.
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal Placeholder */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <HelpCircle size={17} className="text-blue-400" />
                <span>Institutional Password Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {resetSubmitted ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs leading-relaxed">
                  If an active NIRVANA account exists for <span className="font-mono font-semibold">{resetEmail}</span>, a credential verification request has been logged for the System Administrator.
                </div>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setResetSubmitted(true);
                }}
                className="space-y-4"
              >
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered official email address to request a credential reset via your Ministry / IPMD Administrator.
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="official@ministry.gov.in"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white"
                  >
                    Request Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0f172a] py-4 text-center text-xs text-slate-500">
        NIRVANA — National Infrastructure Risk & Vision Analytics Network
      </footer>
    </div>
  );
}
