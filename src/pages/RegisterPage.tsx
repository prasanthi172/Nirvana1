import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, User, Mail, Lock, Building2, BadgeCheck, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<UserRole>('MONITORING_OFFICER');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): string | null => {
    if (!name.trim() || name.trim().length < 2) {
      return 'Full Name is required (minimum 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!organization.trim() || organization.trim().length < 2) {
      return 'Organization / Ministry is required.';
    }
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Password confirmation does not match.';
    }
    if (role === 'ADMINISTRATOR') {
      return 'Users are not permitted to self-register as Administrator.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const res = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      organization: organization.trim(),
      role,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Registration failed. Please check your inputs.');
      return;
    }

    setSuccessMsg('Registration successful. Please login.');
    setTimeout(() => {
      navigate('/login', {
        state: {
          registrationMessage: 'Registration successful. Please login.',
          registeredEmail: email.trim(),
        },
      });
    }, 900);
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
              to="/login"
              className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-slate-800 border border-slate-700 rounded-lg text-white font-medium transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Registration Form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#131d36] border border-slate-700/80 rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Create Official NIRVANA Account</h1>
            <p className="text-xs text-slate-400 mt-1">
              Register for role-based access to the National Infrastructure Risk & Vision Analytics Network.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-red-300 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Durga Prasanthi"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@organization.gov.in"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Organization *</label>
                <div className="relative">
                  <Building2 size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. MoSPI / NHAI / NITI Aayog"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Role *</label>
                <div className="relative">
                  <BadgeCheck size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONITORING_OFFICER">Monitoring Officer</option>
                    <option value="POLICY_ANALYST">Policy Analyst</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password * <span className="text-slate-500 font-normal">(min 8 chars)</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock size={15} className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 text-[11px] text-slate-400">
              Note: Self-registration is available for <strong className="text-slate-200">Monitoring Officer</strong>, <strong className="text-slate-200">Policy Analyst</strong>, and <strong className="text-slate-200">Viewer</strong> roles. Administrator privileges can only be granted by an existing System Administrator.
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Creating Account…' : 'Register Account'}</span>
                <ArrowRight size={15} />
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto py-2.5 px-5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors text-center"
              >
                Already registered? Login
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0f172a] py-4 text-center text-xs text-slate-500">
        NIRVANA — National Infrastructure Risk & Vision Analytics Network
      </footer>
    </div>
  );
}
