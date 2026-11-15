import React, { useState, useEffect } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { analyticsService } from '../services/analytics.service';
import { AnalyticsOverview } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Download,
  Layers,
  BarChart2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const GovernanceAnalytics: React.FC = () => {
  const { currentOrg } = useOrganisation();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!currentOrg) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await analyticsService.getOverview(currentOrg.id);
        if (data) setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [currentOrg, timeRange]);

  const handleExportData = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandshield-governance-${(currentOrg?.name || 'brand').toLowerCase().replace(/\s+/g, '-')}-analytics.json`;
    a.click();
    toast.success('Analytics telemetry report exported!');
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Calculating Governance Telemetry..." />;
  }

  // Data transformations for Recharts
  const categoryData = analytics?.findings_by_category && Object.keys(analytics.findings_by_category).length > 0
    ? Object.entries(analytics.findings_by_category).map(([name, count]) => ({
        name: name.replace('Terminology', 'Term'),
        count
      }))
    : [];

  const severityColors: Record<string, string> = {
    critical: '#f43f5e',
    high: '#f59e0b',
    medium: '#8b5cf6',
    low: '#06b6d4',
    informational: '#64748b'
  };

  const severityData = analytics?.findings_by_severity && Object.values(analytics.findings_by_severity).some(v => v > 0)
    ? Object.entries(analytics.findings_by_severity).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: severityColors[name] || '#64748b'
      }))
    : [];

  // Compute time series dynamically from recent audits
  const timeSeriesData = (analytics?.recent_audits && analytics.recent_audits.length > 0)
    ? analytics.recent_audits.slice(0, 10).reverse().map((audit, idx) => ({
        period: `Audit ${idx + 1}`,
        score: Math.round(audit.overall_score),
        critical: audit.critical_count,
        findings: audit.total_findings
      }))
    : [];

  // Dynamically compute frequent violations from actual findings
  const violationsMap: Record<string, { count: number; category: string }> = {};
  if (analytics?.recent_audits) {
    analytics.recent_audits.forEach(rep => {
      rep.findings.forEach(f => {
        const key = f.original_text.slice(0, 30);
        if (!violationsMap[key]) {
          violationsMap[key] = { count: 0, category: f.category };
        }
        violationsMap[key].count += 1;
      });
    });
  }

  const topViolationsData = Object.entries(violationsMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([term, data]) => ({
      term,
      count: data.count,
      category: data.category
    }));

  const hasAudits = (analytics?.total_audits ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Brand Governance Intelligence
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              Real-time telemetry & drift tracking
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Governance Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time brand compliance metrics, violation risk vectors, and remediation velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range picker */}
          <div className="flex bg-surface-1 p-1 rounded-xl border border-surface-border text-xs font-semibold">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={!hasAudits}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Telemetry
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Audits Evaluated
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {analytics?.total_audits ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed compliance runs
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Average Compliance
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {hasAudits ? `${analytics?.avg_score}%` : '—'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Workspace quality index
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Policy Findings
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {analytics?.total_findings ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Flagged for remediation
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Approved for Publishing
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {analytics?.approved_submissions ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Sign-off confirmed
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 2: Findings by Category (Bar) & Severity Distribution (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Violations by Category</CardTitle>
              <CardDescription>
                Distribution across terminology, claims, tone, and visual guidelines
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {categoryData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232d42" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e131f',
                        borderColor: '#232d42',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [val, 'Violations']}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-surface-2/30 rounded-xl border border-dashed border-surface-border">
                <BarChart2 className="w-8 h-8 text-slate-500 mb-2" />
                <h4 className="text-xs font-semibold text-white">No Category Data Recorded</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                  Run audits on your collateral to populate the category breakdown telemetry.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Severity Distribution (1 col) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>Risk impact stratification</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {severityData.length > 0 ? (
              <div className="h-64 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e131f',
                        borderColor: '#232d42',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [val, 'Findings']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-2 text-[11px]">
                  {severityData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 font-medium">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-surface-2/30 rounded-xl border border-dashed border-surface-border">
                <ShieldCheck className="w-8 h-8 text-slate-500 mb-2" />
                <h4 className="text-xs font-semibold text-white">No Policy Findings</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  All reviewed collateral has adhered to brand guidelines.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 3: Score Trajectory & Frequent Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trend Line Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Compliance Score Trajectory
              </CardTitle>
              <CardDescription>Historical score trend across recent audits</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {timeSeriesData.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232d42" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e131f',
                        borderColor: '#232d42',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val}%`, 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center p-6 bg-surface-2/30 rounded-xl border border-dashed border-surface-border">
                <TrendingUp className="w-8 h-8 text-slate-500 mb-2" />
                <h4 className="text-xs font-semibold text-white">Trend Data Pending</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Run consecutive audits to track brand governance velocity over time.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Most Frequent Violations Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recurring Violation Patterns</CardTitle>
              <CardDescription>Top terms flagged across multiple publications</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {topViolationsData.length > 0 ? (
              <div className="space-y-3">
                {topViolationsData.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-rose-300 truncate">
                        &quot;{item.term}&quot;
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                        {item.category.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                      {item.count} occurrences
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center p-6 bg-surface-2/30 rounded-xl border border-dashed border-surface-border">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <h4 className="text-xs font-semibold text-white">No Repeated Violations</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your creators are properly adhering to brand guidelines.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
