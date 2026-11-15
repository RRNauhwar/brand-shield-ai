import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { analyticsService } from '../services/analytics.service';
import { contentService } from '../services/content.service';
import { brandService } from '../services/brand.service';
import { campaignService } from '../services/campaign.service';
import { ContentSubmission, AnalyticsOverview, BrandRule, Campaign } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSearch,
  Plus,
  ArrowRight,
  BookOpen,
  Sparkles,
  BarChart2,
  Flame,
  Wand2,
  Cpu,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganisation();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentOrg) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [stats, subs, rls, camps] = await Promise.all([
          analyticsService.getOverview(currentOrg.id).catch(() => null),
          contentService.listSubmissions(currentOrg.id).catch(() => []),
          brandService.getRules(currentOrg.id).catch(() => []),
          campaignService.listCampaigns(currentOrg.id).catch(() => []),
        ]);
        if (stats) setAnalytics(stats);
        if (subs) setSubmissions(subs);
        if (rls) setRules(rls);
        if (camps) setCampaigns(camps);
      } catch (err) {
        console.error('Error loading overview data', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [currentOrg]);

  // Construct chart data strictly from actual audits in database
  const chartData =
    analytics?.recent_audits && analytics.recent_audits.length > 0
      ? analytics.recent_audits
          .slice(0, 8)
          .reverse()
          .map((audit, idx) => ({
            name: `Audit ${idx + 1}`,
            score: Math.round(audit.overall_score),
            findings: audit.total_findings,
          }))
      : [];

  const categoryData =
    analytics?.findings_by_category && Object.keys(analytics.findings_by_category).length > 0
      ? Object.entries(analytics.findings_by_category).map(([cat, count]) => ({
          category: cat.replace('_', ' '),
          count,
        }))
      : [];

  if (loading) {
    return <LoadingSpinner fullPage label="Initializing Command Center Telemetry..." />;
  }

  const activeRulesCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Welcome & Command Center Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-surface-border shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-20 w-80 h-80 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>AI Brand Governance Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.full_name?.split(' ')[0] || 'Brand Director'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>{currentOrg?.name || 'Workspace'}</strong> enforces brand governance with Google Gemini across marketing collateral, social posts, web copy, and multi-channel campaigns. Currently monitoring <strong>{activeRulesCount} active brand policies</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate('/brand-knowledge')}
              leftIcon={<BookOpen className="w-4 h-4" />}
            >
              Upload Guidelines
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/campaigns')}
              leftIcon={<Flame className="w-4 h-4" />}
              className="shadow-glow-brand"
            >
              Launch Campaign Audit
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Campaigns */}
        <Card className="hover:border-surface-borderLight transition-all">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Campaigns Audited</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {campaigns.length}
              </h3>
              <p className="text-[11px] text-cyan-400 font-medium mt-0.5 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Multi-channel
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* KPI 2: Average Score */}
        <Card className="hover:border-surface-borderLight transition-all">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average Compliance</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {analytics && analytics.total_audits > 0 ? `${analytics.avg_score}%` : '—'}
              </h3>
              <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Brand adherence
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* KPI 3: Critical Violations */}
        <Card className="hover:border-surface-borderLight transition-all">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Violations</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1">
                {analytics?.findings_by_severity?.critical ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">High-risk claims</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* KPI 4: Pending Approvals */}
        <Card className="hover:border-surface-borderLight transition-all">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {analytics?.pending_reviews ?? 0}
              </h3>
              <p className="text-[11px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Editorial queue
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* KPI 5: Assets Reviewed */}
        <Card className="hover:border-surface-borderLight transition-all">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Assets Reviewed</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {submissions.length}
              </h3>
              <p className="text-[11px] text-brand-400 font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Total copy items
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <FileSearch className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Analytics & Engine Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score Trend Chart (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <CardTitle className="text-sm">Compliance Score Trajectory</CardTitle>
              </div>
              <CardDescription>
                Historical compliance scores across successive audited publications
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/analytics')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Analytics
            </Button>
          </CardHeader>
          <CardBody className="p-6">
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232d42" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e131f',
                        borderColor: '#232d42',
                        borderRadius: '12px',
                        color: '#ffffff',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Compliance Health']}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-surface-2/40 border border-dashed border-surface-border">
                <BarChart2 className="w-8 h-8 text-slate-600 mb-2" />
                <h4 className="text-sm font-semibold text-white">No Audits Completed Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Submit marketing copy or launch a Campaign War Room audit to begin tracking score trajectory.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/content-audit')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Audit Copy
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Intelligence Engine Status (1 Col) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-sm">Intelligence Pipeline</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="p-5 space-y-3.5">
            <div className="p-3.5 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Google Gemini 2.5 Flash</p>
                  <p className="text-[10px] text-slate-400">Content audit & prompt isolation</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Gemini 1536-dim Vectors</p>
                  <p className="text-[10px] text-slate-400">RAG Guideline semantic retrieval</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                Indexed
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">AI Repair Studio</p>
                  <p className="text-[10px] text-slate-400">Contextual copy remediation</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent-violet bg-accent-violet/15 border border-accent-violet/30 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/repair-studio')}
              leftIcon={<Wand2 className="w-3.5 h-3.5" />}
            >
              Open AI Repair Studio
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Recent Submissions Feed */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm">Recent Publications & Audits</CardTitle>
            <CardDescription>
              Latest copy and marketing collateral processed by the governance layer
            </CardDescription>
          </div>
          {submissions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/audit-history')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Full History
            </Button>
          )}
        </CardHeader>

        {submissions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FileSearch className="w-10 h-10 text-slate-600" />}
              title="No Content Audits Yet"
              description="Your workspace has no submitted collateral. Submit your first marketing copy, social post, or ad creative to perform an automated compliance audit."
              actionText="Submit Content for Audit"
              onAction={() => navigate('/content-audit')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-surface-border text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-6">Content Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-medium text-slate-300">
                {submissions.slice(0, 5).map(sub => (
                  <tr key={sub.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white max-w-xs truncate">
                      {sub.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 capitalize">
                      {sub.category.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{sub.submitted_by || 'Creator'}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/content-audit/${sub.id}`)}
                      >
                        Audit Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
