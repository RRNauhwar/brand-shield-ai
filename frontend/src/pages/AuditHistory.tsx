import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { contentService } from '../services/content.service';
import { auditService } from '../services/audit.service';
import { ContentSubmission, AuditReport } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Search,
  Plus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
  History
} from 'lucide-react';

export const AuditHistory: React.FC = () => {
  const { currentOrg } = useOrganisation();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [reports, setReports] = useState<Record<string, AuditReport>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrg) return;
      setLoading(true);
      try {
        const [subs, reps] = await Promise.all([
          contentService.listSubmissions(currentOrg.id),
          auditService.getAuditHistory(currentOrg.id)
        ]);
        setSubmissions(subs);
        const map: Record<string, AuditReport> = {};
        reps.forEach(r => {
          map[r.content_id] = r;
        });
        setReports(map);
      } catch (err) {
        console.error('Error fetching audit history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentOrg]);

  if (loading) {
    return <LoadingSpinner fullPage label="Loading Audit History Registry..." />;
  }

  // Filter logic
  const filtered = submissions.filter(sub => {
    const matchesSearch =
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.original_content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || sub.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort logic
  filtered.sort((a, b) => {
    if (sortBy === 'date') {
      const d1 = new Date(a.created_at).getTime();
      const d2 = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? d2 - d1 : d1 - d2;
    }
    if (sortBy === 'score') {
      const s1 = reports[a.id]?.overall_score || 0;
      const s2 = reports[b.id]?.overall_score || 0;
      return sortOrder === 'desc' ? s2 - s1 : s1 - s2;
    }
    if (sortBy === 'title') {
      return sortOrder === 'desc'
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    }
    return 0;
  });

  const getScoreBadge = (score?: number) => {
    if (score === undefined) return <span className="text-slate-500">—</span>;
    let color = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (score >= 90) color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    else if (score >= 70) color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${color}`}>
        {score} / 100
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Audit Registry
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {filtered.length} submissions recorded
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Audit History & Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete compliance registry for all marketing, social, and product collateral across your brand.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/content-audit')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Content Audit
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Search by title or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            />

            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'social_media', label: 'Social Media' },
                { value: 'marketing_campaign', label: 'Marketing Campaign' },
                { value: 'advertisement', label: 'Advertisement' },
                { value: 'blog_article', label: 'Blog Article' },
                { value: 'product_description', label: 'Product Description' },
                { value: 'email_marketing', label: 'Email Marketing' }
              ]}
            />

            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'audited', label: 'Audited' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'changes_requested', label: 'Changes Requested' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
            />

            <Select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              options={[
                { value: 'date_desc', label: 'Newest First' },
                { value: 'date_asc', label: 'Oldest First' },
                { value: 'score_desc', label: 'Highest Score' },
                { value: 'score_asc', label: 'Lowest Score' },
                { value: 'title_asc', label: 'Title (A-Z)' }
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Audit Registry Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No Audits Found"
            description="No submissions matched your search or filter parameters."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-surface-border text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Content Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Engine</th>
                  <th className="py-3.5 px-4">Compliance Score</th>
                  <th className="py-3.5 px-4">Violations Flagged</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-medium">
                {filtered.map(sub => {
                  const rep = reports[sub.id];
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/audit/${sub.id}`)}
                      className="hover:bg-surface-2/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-6 font-semibold text-white max-w-xs truncate">
                        {sub.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">
                        {sub.category.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        {rep?.engine === 'gemini' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold text-[11px]">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            Gemini AI
                          </span>
                        ) : rep?.engine === 'fallback_engine' || rep?.is_ai_powered === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium text-[11px]">
                            Heuristic
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 text-slate-300 border border-surface-border font-medium text-[11px]">
                            Rules
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getScoreBadge(rep?.overall_score)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {rep ? `${rep.total_findings} findings` : '0 findings'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={sub.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/audit/${sub.id}`)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          View Report
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
