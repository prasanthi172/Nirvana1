import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Activity,
  ShieldAlert,
  LayoutDashboard,
  Database,
  HardHat,
  FileText,
  Settings,
  Beaker,
  Download,
  BarChart3,
  Scale,
  Users,
  Lock,
  Eye,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import RiskIntelligence from './pages/RiskIntelligence';
import EarlyWarnings from './pages/EarlyWarnings';
import MLIntelligence from './pages/MLIntelligence';
import DataManagement from './pages/DataManagement';
import Admin from './pages/Admin';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AnalyticsHub from './pages/AnalyticsHub';
import ReportsCenter from './pages/ReportsCenter';
import UserManagement from './pages/UserManagement';
import NirvanaAssistantChat from './components/NirvanaAssistantChat';
import { AuthProvider, useAuth, UserProfileDropdown, UserRole, ROLE_LABELS } from './context/AuthContext';
import { generateAndDownloadDashboardPdf } from './utils/pdfReportGenerator';

interface SidebarItemConfig {
  to: string;
  label: string;
  icon: React.ReactNode;
  section?: 'main' | 'governance';
}

function getSidebarItemsForRole(role: UserRole): SidebarItemConfig[] {
  switch (role) {
    case 'ADMINISTRATOR':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'main' },
        { to: '/projects', label: 'Projects', icon: <HardHat size={18} />, section: 'main' },
        { to: '/risk', label: 'Risk Intelligence', icon: <Activity size={18} />, section: 'main' },
        { to: '/warnings', label: 'Early Warnings', icon: <ShieldAlert size={18} />, section: 'main' },
        { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, section: 'main' },
        { to: '/reports', label: 'Reports', icon: <FileText size={18} />, section: 'main' },
        { to: '/ml', label: 'ML Intelligence', icon: <Beaker size={18} />, section: 'main' },
        { to: '/data', label: 'Data Management', icon: <Database size={18} />, section: 'governance' },
        { to: '/users', label: 'Users', icon: <Users size={18} />, section: 'governance' },
        { to: '/admin', label: 'Settings', icon: <Settings size={18} />, section: 'governance' },
      ];
    case 'MONITORING_OFFICER':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'main' },
        { to: '/projects', label: 'Projects', icon: <HardHat size={18} />, section: 'main' },
        { to: '/risk', label: 'Risk Intelligence', icon: <Activity size={18} />, section: 'main' },
        { to: '/warnings', label: 'Early Warnings', icon: <ShieldAlert size={18} />, section: 'main' },
        { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, section: 'main' },
        { to: '/reports', label: 'Reports', icon: <FileText size={18} />, section: 'main' },
      ];
    case 'POLICY_ANALYST':
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'main' },
        { to: '/projects', label: 'Projects', icon: <HardHat size={18} />, section: 'main' },
        { to: '/risk', label: 'Risk Intelligence', icon: <Activity size={18} />, section: 'main' },
        { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, section: 'main' },
        { to: '/benchmarking', label: 'Benchmarking', icon: <Scale size={18} />, section: 'main' },
        { to: '/reports', label: 'Reports', icon: <FileText size={18} />, section: 'main' },
        { to: '/ml', label: 'ML Intelligence', icon: <Beaker size={18} />, section: 'main' },
      ];
    case 'VIEWER':
    default:
      return [
        { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'main' },
        { to: '/projects', label: 'Projects', icon: <HardHat size={18} />, section: 'main' },
        { to: '/project-details', label: 'Project Details', icon: <Eye size={18} />, section: 'main' },
        { to: '/risk', label: 'Basic Risk Intelligence', icon: <Activity size={18} />, section: 'main' },
        { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, section: 'main' },
      ];
  }
}

function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/welcome" replace />;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-[#1e293b] border border-red-900/60 rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
          <Lock size={24} />
        </div>
        <h2 className="text-xl font-bold text-white">403 — Unauthorized Role Clearance</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your current account role (<strong className="text-blue-400">{ROLE_LABELS[user.role]}</strong>) does not have clearance to access this module. Only authorized roles ({allowedRoles.map(r => ROLE_LABELS[r]).join(', ')}) are permitted.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Return to Role Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthenticatedWorkspace() {
  const { user, loading, logAuditAction } = useAuth();
  const location = useLocation();
  const [exportingPdf, setExportingPdf] = useState(false);

  // Public routes accessible without login
  if (location.pathname === '/welcome') {
    return <LandingPage />;
  }
  if (location.pathname === '/login') {
    return user ? <Navigate to="/" replace /> : <LoginPage />;
  }
  if (location.pathname === '/register') {
    return user ? <Navigate to="/" replace /> : <RegisterPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 flex items-center justify-center text-sm">
        Verifying NIRVANA security clearance...
      </div>
    );
  }

  // If unauthenticated user visits any protected route, show Landing Page
  if (!user) {
    return <LandingPage />;
  }

  const sidebarItems = getSidebarItemsForRole(user.role);
  const mainNavItems = sidebarItems.filter(i => i.section !== 'governance');
  const govNavItems = sidebarItems.filter(i => i.section === 'governance');
  const isViewer = user.role === 'VIEWER';
  const isAdmin = user.role === 'ADMINISTRATOR';

  const handleGlobalExportReport = async () => {
    if (exportingPdf || isViewer) return;
    setExportingPdf(true);
    try {
      await generateAndDownloadDashboardPdf();
      await logAuditAction('EXPORT_REPORT', 'Generated Global Executive PDF Report from Header');
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200">
      {/* Dynamic Role-Based Sidebar (Section 9) */}
      <div className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wider">NIRVANA</h1>
              <p className="text-[10px] text-slate-400">Risk & Vision Analytics</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-2.5 bg-[#0f172a]/60 border-b border-slate-700/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Active Role</span>
          <span className="text-blue-400 font-semibold">{ROLE_LABELS[user.role]}</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNavItems.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}

          {govNavItems.length > 0 && (
            <>
              <div className="mt-6 mb-2 px-3 text-[11px] font-semibold text-slate-400">
                Administration
              </div>
              {govNavItems.map(item => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to}
                />
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-400 space-y-1">
          <div className="text-slate-300 font-medium truncate">{user.organization}</div>
          <div className="text-[11px] text-slate-500">
            MoSPI/IPMD Snapshot · Aug 2026
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#1e293b] border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-300 truncate">
            <span>National Infrastructure Risk & Vision Analytics Network</span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <Link to="/welcome" className="text-xs text-blue-400 hover:text-blue-300 hidden md:inline">
              Platform Overview
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {!isViewer && (
              <button
                type="button"
                onClick={handleGlobalExportReport}
                disabled={exportingPdf}
                className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
              >
                <Download size={13} className="text-blue-400" />
                {exportingPdf ? 'Generating PDF…' : 'Export Report'}
              </button>
            )}

            {isAdmin && (
              <Link
                to="/data"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap hidden sm:inline-flex"
              >
                Upload Dataset
              </Link>
            )}

            {/* Top-Right User Profile Section (Section 10) */}
            <UserProfileDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project-details" element={<Projects />} />
            <Route path="/risk" element={<RiskIntelligence />} />
            <Route
              path="/warnings"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR', 'MONITORING_OFFICER']}>
                  <EarlyWarnings />
                </RoleGuard>
              }
            />
            <Route path="/analytics" element={<AnalyticsHub initialTab="sector" />} />
            <Route
              path="/benchmarking"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR', 'POLICY_ANALYST']}>
                  <AnalyticsHub initialTab="benchmarking" />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR', 'MONITORING_OFFICER', 'POLICY_ANALYST']}>
                  <ReportsCenter />
                </RoleGuard>
              }
            />
            <Route
              path="/ml"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR', 'POLICY_ANALYST']}>
                  <MLIntelligence />
                </RoleGuard>
              }
            />
            <Route
              path="/data"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                  <DataManagement />
                </RoleGuard>
              }
            />
            <Route
              path="/users"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                  <UserManagement />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                  <Admin />
                </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                  <Admin />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <NirvanaAssistantChat />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedWorkspace />
    </AuthProvider>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600/20 text-white border border-blue-500/40'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
      }`}
    >
      <span className={active ? 'text-blue-400' : 'text-slate-400'}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
