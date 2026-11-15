import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { Avatar } from '../components/ui/Avatar';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import {
  LayoutDashboard,
  Sparkles,
  FileSearch,
  BookOpen,
  Wand2,
  CheckCircle2,
  History,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  Bell,
  Search,
  HelpCircle,
  ChevronDown,
  LogOut,
  Building2,
  Menu,
  X,
  Shield,
  Plus,
  Flame,
  Radio,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { currentOrg, organisations, selectOrg, userRole, createOrg } = useOrganisation();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [newOrgModalOpen, setNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // 10 Master Navigation Items according to specs
  const primaryNavItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Campaign War Room', path: '/campaigns', icon: Flame, badge: 'Flagship', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { label: 'Content Audits', path: '/content-audit', icon: FileSearch },
    { label: 'Brand Knowledge', path: '/brand-knowledge', icon: BookOpen },
    { label: 'AI Repair Studio', path: '/repair-studio', icon: Wand2, badge: 'AI', badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/30' },
    { label: 'Review & Approvals', path: '/reviews', icon: CheckCircle2 },
    { label: 'Audit History', path: '/audit-history', icon: History },
    { label: 'Governance Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const adminNavItems = [
    { label: 'Team Members', path: '/team', icon: Users },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      await createOrg(newOrgName.trim());
      setNewOrgModalOpen(false);
      setNewOrgName('');
      toast.success('New workspace created!');
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Determine current page title for breadcrumb
  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'Overview';
    if (p.startsWith('/campaigns')) return 'Campaign War Room';
    if (p.startsWith('/content-audit')) return 'Content Audits';
    if (p.startsWith('/brand-knowledge')) return 'Brand Knowledge';
    if (p.startsWith('/repair-studio')) return 'AI Repair Studio';
    if (p.startsWith('/reviews')) return 'Review & Approvals';
    if (p.startsWith('/audit-history')) return 'Audit History';
    if (p.startsWith('/analytics')) return 'Governance Analytics';
    if (p.startsWith('/team')) return 'Team Members';
    if (p.startsWith('/settings')) return 'Settings';
    return 'BrandShield AI';
  };

  return (
    <div className="min-h-screen bg-surface-0 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-surface-0/80 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={clsx(
            'fixed lg:static top-0 bottom-0 left-0 z-40 bg-surface-1 text-slate-200 flex flex-col transition-all duration-300 ease-in-out border-r border-surface-border shadow-2xl lg:shadow-none',
            sidebarCollapsed ? 'w-20' : 'w-64',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-surface-border">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/25 border border-brand-400/30 text-white">
                <Shield className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-white">BrandShield</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      AI
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block tracking-widest uppercase font-semibold">
                    Intelligence Layer
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Org Selector badge inside sidebar */}
          {!sidebarCollapsed && (
            <div className="px-4 py-3 border-b border-surface-border/80 bg-surface-2/40">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="uppercase text-[10px] font-bold tracking-wider text-slate-400">Workspace</span>
                <span className="text-[10px] font-semibold text-brand-300 bg-brand-500/20 px-1.5 py-0.5 rounded border border-brand-500/30 uppercase">
                  {userRole}
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{currentOrg?.name || 'Primary Workspace'}</p>
            </div>
          )}

          {/* Nav Links */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {!sidebarCollapsed && 'Brand Governance'}
            </div>
            {primaryNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group cursor-pointer',
                      isActive
                        ? 'bg-gradient-to-r from-brand-600/30 to-brand-500/10 text-white font-semibold border border-brand-500/40 shadow-glow-brand/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
                    )
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-brand-400" />
                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={clsx('text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border', item.badgeColor)}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}

            <div className="pt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {!sidebarCollapsed && 'Administration'}
            </div>
            {adminNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer',
                      isActive
                        ? 'bg-surface-3 text-white font-semibold border border-surface-borderLight'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-2'
                    )
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer with Gemini Live Indicator */}
          <div className="p-3 border-t border-surface-border/80 bg-surface-2/30 space-y-2">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3/60 border border-surface-border text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">Gemini 2.5 Flash Online</span>
              </div>
            )}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-2 rounded-xl transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 shrink-0 text-slate-500" />
              {!sidebarCollapsed && <span>Governance Architecture</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="h-16 bg-surface-1/90 border-b border-surface-border sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-surface-2 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb / Title */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 hidden sm:inline">BrandShield</span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="font-bold text-white text-sm">{getPageTitle()}</span>
              </div>

              {/* Organisation Selector */}
              <Dropdown
                align="left"
                trigger={
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-border hover:border-surface-borderLight bg-surface-2/70 hover:bg-surface-2 transition-colors cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-500/50" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-100 max-w-[130px] sm:max-w-[180px] truncate">
                      {currentOrg?.name || 'Workspace'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                }
              >
                <div className="py-1 min-w-[240px] bg-surface-1 border border-surface-border rounded-xl shadow-2xl text-slate-200">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-surface-border">
                    Switch Workspace
                  </div>
                  {organisations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => selectOrg(org.id)}
                      className={clsx(
                        'w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-2 transition-colors cursor-pointer',
                        org.id === currentOrg?.id ? 'font-semibold text-brand-300 bg-brand-500/10' : 'text-slate-300'
                      )}
                    >
                      <span className="truncate">{org.name}</span>
                      {org.id === currentOrg?.id && (
                        <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-surface-border mt-1 pt-1">
                    <button
                      onClick={() => setNewOrgModalOpen(true)}
                      className="w-full text-left px-3 py-2 text-xs text-brand-400 font-semibold hover:bg-surface-2 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Workspace</span>
                    </button>
                  </div>
                </div>
              </Dropdown>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <Dropdown
                align="right"
                trigger={
                  <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-2 transition-colors cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 shadow-xs shadow-brand-500/50" />
                  </button>
                }
              >
                <div className="w-80 p-2 bg-surface-1 border border-surface-border rounded-xl shadow-2xl text-slate-200">
                  <div className="px-3 py-2 border-b border-surface-border flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">Governance Notifications</h4>
                    <span className="text-[10px] text-slate-400">Live</span>
                  </div>
                  <div className="p-3 text-xs space-y-2">
                    <div className="p-2 rounded-lg bg-surface-2 border border-surface-border">
                      <p className="font-semibold text-brand-300">Campaign War Room Ready</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Cross-channel intelligence enabled for multi-asset audits.</p>
                    </div>
                  </div>
                </div>
              </Dropdown>

              {/* User Menu */}
              <Dropdown
                align="right"
                trigger={
                  <button className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer">
                    <Avatar
                      name={user?.full_name || 'Brand User'}
                      src={user?.avatar_url}
                      size="sm"
                    />
                    <div className="hidden md:block text-left text-xs leading-snug">
                      <p className="font-semibold text-white truncate max-w-[120px]">
                        {user?.full_name || 'Brand Lead'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {user?.email || 'admin@brandshield.ai'}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>
                }
              >
                <div className="py-1 min-w-[200px] bg-surface-1 border border-surface-border rounded-xl shadow-2xl text-slate-200">
                  <div className="px-3 py-2 border-b border-surface-border">
                    <p className="text-xs font-semibold text-white">{user?.full_name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-surface-2 flex items-center gap-2 cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Workspace Settings</span>
                  </button>
                  <div className="border-t border-surface-border my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </Dropdown>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* Create Org Modal */}
      <Modal
        isOpen={newOrgModalOpen}
        onClose={() => setNewOrgModalOpen(false)}
        title="Create New Workspace"
        description="Establish an isolated brand governance repository for another organization or business unit."
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Organization Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 text-sm bg-surface-2 border border-surface-border text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-500"
              placeholder="e.g. Cyberdyne Brand Systems"
              value={newOrgName}
              onChange={e => setNewOrgName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setNewOrgModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingOrg}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Governance Architecture Modal */}
      <Modal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="BrandShield AI Multi-Layer Engine"
        description="How the brand verification and campaign intelligence system operates."
      >
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-surface-2 rounded-xl border border-surface-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              1. Brand DNA & Guideline RAG Indexing
            </h4>
            <p className="text-slate-400">
              Upload guidelines in PDF, DOCX, or TXT. Chunks are embedded with Gemini embeddings (1536-dimensional vectors) for high-precision semantic search.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-xl border border-surface-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" />
              2. Campaign War Room & Cross-Channel Consistency
            </h4>
            <p className="text-slate-400">
              Audit entire multi-channel campaigns. Gemini 2.5 Flash analyzes copy across Instagram, Website, Email, and Ads to detect conflicting claims, dates, and promises.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-xl border border-surface-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-violet" />
              3. AI Repair Studio & Human-in-the-Loop Signoff
            </h4>
            <p className="text-slate-400">
              Gemini generates surgical corrections that resolve violations while strictly preserving the creator&apos;s tone. Reviewers approve or request revisions with full audit trails.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
