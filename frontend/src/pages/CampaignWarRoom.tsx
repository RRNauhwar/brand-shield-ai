import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { campaignService } from '../services/campaign.service';
import { Campaign, CampaignAsset, CrossChannelFinding } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import {
  Flame,
  Plus,
  Play,
  ArrowRight,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Megaphone,
  FileText,
  Clock,
  Compass,
  Zap,
  Split,
  ChevronRight,
  BarChart2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import toast from 'react-hot-toast';

export const CampaignWarRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrganisation();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgressStage, setAuditProgressStage] = useState<string>('');

  // Modal State for New Campaign
  const [createModalOpen, setNewCampaignModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [objective, setObjective] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram', 'website', 'email']);
  const [assets, setAssets] = useState<Array<{ title: string; channel: string; content: string }>>([
    {
      title: 'Website Landing Page Hero',
      channel: 'website',
      content: 'Experience next-generation cybersecurity. Pricing starts from $49/mo with guaranteed 99.99% uptime and enterprise-grade encryption.',
    },
    {
      title: 'Instagram Launch Creative',
      channel: 'instagram',
      content: 'Get our revolutionary breakthrough completely free forever! Our software is 100% bug-free and guarantees total unhackable immunity.',
    },
    {
      title: 'Executive Email Announcement',
      channel: 'email',
      content: 'Dear Partner, We are excited to unveil our verified SOC 2 Type II compliant intelligence platform for modern security teams.',
    },
  ]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const list = await campaignService.listCampaigns(currentOrg.id);
      setCampaigns(list);
      if (id) {
        const found = list.find(c => c.id === id) || (await campaignService.getCampaign(currentOrg.id, id));
        setSelectedCampaign(found);
      } else if (list.length > 0 && !selectedCampaign) {
        setSelectedCampaign(list[0]);
      }
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg, id]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !name.trim()) return;

    try {
      const created = await campaignService.createCampaign(currentOrg.id, {
        name,
        brief,
        target_audience: targetAudience,
        objective,
        channels: selectedChannels,
        assets: assets.map(a => ({
          ...a,
          asset_type: 'text',
        })),
      });
      toast.success('Campaign created in War Room!');
      setNewCampaignModalOpen(false);
      setName('');
      setBrief('');
      await loadData();
      setSelectedCampaign(created);
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  const handleLaunchAudit = async () => {
    if (!currentOrg || !selectedCampaign) return;
    setIsAuditing(true);
    try {
      setAuditProgressStage('Ingesting Multi-Channel Assets...');
      await new Promise(r => setTimeout(r, 600));

      setAuditProgressStage('Retrieving Relevant Brand Guidelines & Vector Chunks...');
      await new Promise(r => setTimeout(r, 700));

      setAuditProgressStage('Executing Gemini 2.5 Flash Audits on Channel Assets...');
      await new Promise(r => setTimeout(r, 800));

      setAuditProgressStage('Running Cross-Channel Consistency & Contradiction Intelligence...');
      const updated = await campaignService.runCampaignAudit(currentOrg.id, selectedCampaign.id);

      setSelectedCampaign(updated);
      setCampaigns(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      toast.success('Campaign War Room audit completed!');
    } catch (err) {
      toast.error('Failed to execute campaign audit');
    } finally {
      setIsAuditing(false);
      setAuditProgressStage('');
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5 text-sky-400" />;
      case 'website':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-amber-400" />;
      case 'ad_creative':
        return <Megaphone className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Initializing Campaign War Room Intelligence..." />;
  }

  // Pre-calculate chart data for channels
  const channelChartData = selectedCampaign?.assets.map(a => ({
    channel: a.channel.toUpperCase(),
    score: a.score,
    issues: a.issues_count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              Flagship Command Center
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Multi-Asset Consistency Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Campaign War Room
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Audit comprehensive multi-channel marketing campaigns before launch. Detect cross-channel contradictions, conflicting claims, pricing mismatches, and brand voice drift across Website, Social, Email, and Advertising touchpoints.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Button
            variant="outline"
            onClick={() => setNewCampaignModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Campaign
          </Button>

          {selectedCampaign && (
            <Button
              variant="primary"
              onClick={handleLaunchAudit}
              isLoading={isAuditing}
              leftIcon={<Play className="w-4 h-4 fill-white" />}
            >
              Launch War Room Audit
            </Button>
          )}
        </div>
      </div>

      {/* Live Audit Progress Overlay */}
      {isAuditing && (
        <Card className="border-brand-500/40 bg-surface-2/90 shadow-glow-brand animate-pulse">
          <CardBody className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-brand-400 animate-spin" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  Audit Execution In Progress
                </p>
                <p className="text-sm font-semibold text-white">{auditProgressStage}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Powered by Google Gemini 2.5 Flash</span>
          </CardBody>
        </Card>
      )}

      {/* Campaign Selector / Tabs */}
      {campaigns.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-border">
          {campaigns.map(c => {
            const isSelected = selectedCampaign?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCampaign(c)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-surface-2 text-white border-brand-500 shadow-glow-brand/20'
                    : 'bg-surface-1/60 text-slate-400 border-surface-border hover:bg-surface-2 hover:text-slate-200'
                }`}
              >
                <span>{c.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getScoreColor(c.overall_score)}`}>
                  {c.overall_score > 0 ? `${c.overall_score}%` : 'Draft'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Campaigns Created Yet"
          description="Build your first multi-channel marketing campaign to start auditing cross-channel copy and creative assets."
          actionText="Create Initial Campaign"
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => setNewCampaignModalOpen(true)}
        />
      )}

      {/* Active Campaign Detail View */}
      {selectedCampaign && (
        <div className="space-y-6">
          {/* Campaign Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardBody className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign Health</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">
                    {selectedCampaign.overall_score > 0 ? `${selectedCampaign.overall_score}%` : 'Not Audited'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Asset & cross-channel weighted</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-extrabold text-lg ${getScoreColor(selectedCampaign.overall_score)}`}>
                  {selectedCampaign.overall_score > 0 ? Math.round(selectedCampaign.overall_score) : '—'}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Channel Touchpoints</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">
                    {selectedCampaign.total_assets} Assets
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedCampaign.channels.map(ch => (
                      <span key={ch} title={ch} className="p-1 rounded bg-surface-2 border border-surface-border">
                        {getChannelIcon(ch)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Layers className="w-6 h-6" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cross-Channel Clashes</p>
                  <h3 className="text-2xl font-extrabold text-rose-400 mt-1">
                    {selectedCampaign.cross_channel_findings.length} Detected
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Contradictory promises/pricing</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Split className="w-6 h-6" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign Status</p>
                  <div className="mt-2">
                    <Badge variant={selectedCampaign.status === 'audited' ? 'brand' : 'slate'} size="md">
                      {selectedCampaign.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Target: {selectedCampaign.target_audience || 'All Audience'}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Compass className="w-6 h-6" />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* FLAGSHIP SECTION: Cross-Channel Consistency Intelligence */}
          <Card className="border-cyan-500/30 bg-gradient-to-b from-surface-1 via-surface-1 to-surface-2 shadow-glow-cyan/10">
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <Split className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-white text-lg">
                    Campaign Consistency Intelligence
                  </CardTitle>
                  <Badge variant="brand" size="sm">
                    Cross-Channel Detection
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  AI compares copy across channels simultaneously to find conflicting promises, pricing discrepancies, and terminology drift before publication.
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {selectedCampaign.cross_channel_findings.length === 0 ? (
                <div className="py-8 text-center rounded-2xl bg-surface-2/40 border border-surface-border">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">
                    {selectedCampaign.status === 'audited'
                      ? 'No Cross-Channel Contradictions Detected'
                      : 'Launch Audit to Analyze Cross-Channel Consistency'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    {selectedCampaign.status === 'audited'
                      ? 'All marketing channels communicate harmonious pricing, claims, and brand voice.'
                      : 'War Room will evaluate Website, Social, Email, and Ad copy side by side.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCampaign.cross_channel_findings.map(finding => (
                    <div
                      key={finding.id}
                      className="p-5 rounded-2xl bg-surface-2/80 border border-surface-border hover:border-surface-borderLight transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeverityBadge severity={finding.severity} />
                          <Badge variant="slate" size="sm">{finding.category}</Badge>
                          <span className="text-sm font-bold text-white">{finding.title}</span>
                        </div>
                        <span className="text-[11px] text-cyan-300 font-mono">
                          Confidence: {(finding.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Side-by-Side Channel Excerpt Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Channel A */}
                        <div className="p-4 rounded-xl bg-surface-3/80 border border-surface-border">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                            {getChannelIcon(finding.channel_a)}
                            <span>{finding.channel_a}: &ldquo;{finding.asset_a_title}&rdquo;</span>
                          </div>
                          <p className="text-xs sm:text-sm font-mono text-rose-300 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/30">
                            &ldquo;{finding.asset_a_excerpt}&rdquo;
                          </p>
                        </div>

                        {/* Channel B */}
                        <div className="p-4 rounded-xl bg-surface-3/80 border border-surface-border">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                            {getChannelIcon(finding.channel_b)}
                            <span>{finding.channel_b}: &ldquo;{finding.asset_b_title}&rdquo;</span>
                          </div>
                          <p className="text-xs sm:text-sm font-mono text-amber-300 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30">
                            &ldquo;{finding.asset_b_excerpt}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Explanation & Reconciliation */}
                      <div className="p-4 rounded-xl bg-surface-3/40 border border-surface-border text-xs space-y-2">
                        <p className="text-slate-300 leading-relaxed">
                          <strong className="text-white">Why this is flagged:</strong> {finding.explanation}
                        </p>
                        <div className="flex items-start gap-2 pt-1 border-t border-surface-border">
                          <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                          <p className="text-cyan-200">
                            <strong>Recommended Resolution:</strong> {finding.reconciliation_suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Campaign Multi-Asset Grid & Channel Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assets Cards Grid (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  Campaign Marketing Assets ({selectedCampaign.assets.length})
                </h3>
                <span className="text-xs text-slate-400">Click asset to open audit report</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCampaign.assets.map(asset => (
                  <Card
                    key={asset.id}
                    hoverable
                    onClick={() => asset.content_id && navigate(`/content-audit/${asset.content_id}`)}
                    className="cursor-pointer"
                  >
                    <CardBody className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-surface-border text-xs font-semibold text-slate-200 uppercase">
                          {getChannelIcon(asset.channel)}
                          <span>{asset.channel}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${getScoreColor(asset.score)}`}>
                          {asset.score > 0 ? `${asset.score}%` : 'Pending'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white tracking-tight truncate">
                        {asset.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-3 font-mono bg-surface-2/60 p-2.5 rounded-lg border border-surface-border">
                        {asset.content || 'No text content available.'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-surface-border">
                        <span>{asset.issues_count} compliance findings</span>
                        <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Inspect <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>

            {/* Channel Comparison Chart (1 Col) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Channel Health Breakdown
              </h3>

              <Card>
                <CardBody className="p-5 space-y-4">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelChartData}>
                        <XAxis dataKey="channel" stroke="#64748b" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0e131f', borderColor: '#232d42', borderRadius: '12px' }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                          {channelChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#f43f5e'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-2 border border-surface-border text-xs space-y-1 text-slate-400">
                    <p className="font-semibold text-white">War Room Recommendation:</p>
                    <p>
                      Harmonize the value proposition across Social and Website channels to prevent customer churn or compliance penalties.
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setNewCampaignModalOpen(false)}
        title="Initialize Campaign War Room"
        description="Configure a multi-channel campaign to audit copy, dates, offers, and visual assets."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <Input
            label="Campaign Name"
            placeholder="e.g. Q4 Global Cloud Security Launch"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <Textarea
            label="Campaign Brief & Objectives"
            placeholder="Describe the primary marketing goals, positioning, and required claims..."
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Audience"
              placeholder="e.g. Enterprise CISOs, IT Directors"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
            />
            <Input
              label="Primary Objective"
              placeholder="e.g. Inbound Demo Requests"
              value={objective}
              onChange={e => setObjective(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-surface-border">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Default Multi-Channel Assets Included:
            </h4>
            <div className="space-y-2 text-xs">
              {assets.map((a, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(a.channel)}
                    <span className="font-semibold text-white">{a.title}</span>
                  </div>
                  <span className="text-slate-400 font-mono uppercase text-[10px]">{a.channel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setNewCampaignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Create & Enter War Room
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
