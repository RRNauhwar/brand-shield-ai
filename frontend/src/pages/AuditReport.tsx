import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { auditService } from '../services/audit.service';
import { contentService } from '../services/content.service';
import { correctionService } from '../services/correction.service';
import { reviewService } from '../services/review.service';
import { AuditReport as IAuditReport, ContentSubmission, ComplianceFinding, Severity, FindingStatus } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileEdit,
  Send,
  BookOpen,
  Cpu,
  Clock,
  Sparkles,
  Columns,
  List,
  Check,
  Eye,
  Wrench,
  Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AuditReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg, userRole } = useOrganisation();
  const navigate = useNavigate();

  const [report, setReport] = useState<IAuditReport | null>(null);
  const [submission, setSubmission] = useState<ContentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [viewMode, setViewMode] = useState<'findings' | 'split' | 'visual'>('findings');

  // Edit custom correction modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [targetFinding, setTargetFinding] = useState<ComplianceFinding | null>(null);
  const [customText, setCustomText] = useState('');

  // Submit for Review modal
  const [submitReviewModalOpen, setSubmitReviewModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadReport = async () => {
    if (!currentOrg || !id) return;
    setLoading(true);
    try {
      const [sub, rep] = await Promise.all([
        contentService.getSubmission(currentOrg.id, id),
        auditService.getAuditReport(currentOrg.id, id)
      ]);
      setSubmission(sub);
      setReport(rep);
    } catch (err) {
      console.error('Error fetching report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [currentOrg, id]);

  const handleUpdateFinding = async (finding: ComplianceFinding, status: FindingStatus, customCorrection?: string) => {
    if (!currentOrg || !id) return;
    try {
      const updated = await correctionService.updateFindingStatus(
        currentOrg.id,
        id,
        finding.id,
        status,
        customCorrection
      );
      setReport(updated.report);
      setSubmission(updated.submission);

      if (status === 'accepted') {
        toast.success(`Applied correction for "${finding.original_text}"`);
      } else if (status === 'rejected') {
        toast.success('Suggestion rejected');
      } else if (status === 'manually_edited') {
        toast.success('Custom replacement applied');
      } else {
        toast.success('Finding ignored');
      }
    } catch (err) {
      toast.error('Failed to update finding');
    }
  };

  const handleSaveCustomEdit = () => {
    if (targetFinding) {
      handleUpdateFinding(targetFinding, 'manually_edited', customText);
      setEditModalOpen(false);
      setTargetFinding(null);
    }
  };

  const handleSubmitForReview = async () => {
    if (!currentOrg || !id) return;
    setIsSubmittingReview(true);
    try {
      const updated = await reviewService.submitForReview(currentOrg.id, id, reviewNotes);
      setSubmission(updated);
      setSubmitReviewModalOpen(false);
      toast.success('Successfully submitted for human reviewer approval!');
    } catch (err) {
      toast.error('Could not submit for review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Retrieving Audit Analysis Report..." />;
  }

  if (!report || !submission) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Audit Report Not Found</h3>
        <p className="text-sm text-slate-400">Could not locate audit findings for this submission.</p>
        <Button onClick={() => navigate('/audit-history')}>Back to Audit History</Button>
      </div>
    );
  }

  const filteredFindings = report.findings.filter(
    f => selectedSeverity === 'all' || f.severity === selectedSeverity
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const visualData = (report as any)?.visual_results;

  return (
    <div className="space-y-6">
      {/* Back and Action Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/audit-history')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Audit Logs</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex bg-surface-1 p-1 rounded-lg border border-surface-border">
            <button
              onClick={() => setViewMode('findings')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'findings'
                  ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Findings View
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'split'
                  ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Side-by-Side Diff
            </button>
            {visualData && (
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                Visual Brand Inspector
              </button>
            )}
          </div>

          {/* Open in AI Repair Studio CTA */}
          <Button
            variant="outline"
            onClick={() => navigate(`/repair-studio/${submission.id}`)}
            leftIcon={<Wrench className="w-4 h-4 text-cyan-400" />}
            className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
          >
            Open in AI Repair Studio
          </Button>

          <Button
            variant="primary"
            onClick={() => setSubmitReviewModalOpen(true)}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit for Review
          </Button>
        </div>
      </div>

      {/* Audit Overview Header Card */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title & Metadata */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={submission.status} />
                <Badge variant="brand" size="sm">
                  {submission.category.replace('_', ' ')}
                </Badge>
                {report.engine === 'gemini' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Gemini Core Intelligence ({report.ai_model || 'gemini-2.5-flash'})</span>
                  </div>
                ) : report.engine === 'fallback_engine' || report.is_ai_powered === false ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Heuristic & Rule Engine</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 border border-surface-border text-slate-300 text-xs font-semibold">
                    <Cpu className="w-3 h-3 text-slate-400" />
                    <span>Engine: {report.engine}</span>
                  </div>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  Audited {new Date(report.created_at).toLocaleString()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {submission.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {report.summary}
              </p>
            </div>

            {/* Score Indicator Gauge */}
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-surface-2/60 border border-surface-border shrink-0">
              <div
                className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-extrabold shadow-inner font-mono ${getScoreColor(
                  report.overall_score
                )}`}
              >
                <span className="text-2xl leading-none">{report.overall_score}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-80">
                  / 100
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white">Compliance Health</p>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{report.critical_count} Critical</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{report.high_count} High</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>{report.medium_count} Medium</span>
                </div>
              </div>
            </div>
          </div>

          {/* Engine & Processing metadata footer */}
          <div className="mt-6 pt-4 border-t border-surface-border flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="w-4 h-4 text-brand-400" />
                <span>Deterministic Rules + RAG Grounding</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Processing Time: {report.processing_time_seconds || 1.28}s</span>
              </span>
            </div>
            <span>ID: {report.id}</span>
          </div>
        </CardBody>
      </Card>

      {/* VIEW MODE 1: FINDINGS LIST */}
      {viewMode === 'findings' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-surface-1 p-3 rounded-xl border border-surface-border">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Findings Stratification ({report.findings.length} Total):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'critical', 'high', 'medium', 'low', 'informational'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    selectedSeverity === sev
                      ? 'bg-brand-500 text-white shadow-glow-brand'
                      : 'bg-surface-2 text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Findings Cards List */}
          <div className="space-y-4">
            {filteredFindings.map(finding => {
              const isAccepted = finding.status === 'accepted' || finding.status === 'manually_edited';
              const isRejected = finding.status === 'rejected';

              return (
                <Card
                  key={finding.id}
                  className={`transition-all ${
                    isAccepted
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : isRejected
                      ? 'opacity-50 bg-surface-1'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <CardBody className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={finding.severity} />
                        <Badge variant="slate" size="sm">{finding.category}</Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          Confidence: {(finding.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Badge
                        variant={
                          isAccepted
                            ? 'success'
                            : isRejected
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        Status: {finding.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Problematic Text Excerpt */}
                    <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 font-mono">
                        Flagged Content Excerpt
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-rose-200 font-mono">
                        &quot;{finding.original_text}&quot;
                      </p>
                    </div>

                    {/* Explanation */}
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {finding.explanation}
                    </p>

                    {/* Guideline Reference & Evidence Grounding */}
                    {(finding.evidence || finding.guideline_reference || finding.source_document) && (
                      <div className="p-3.5 bg-brand-500/10 rounded-xl border border-brand-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-bold text-brand-300">
                            <BookOpen className="w-3.5 h-3.5 text-brand-400" />
                            <span>{finding.guideline_reference || 'Brand Guideline Grounding'}</span>
                          </div>
                          {(finding.source_document || finding.source_page) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 text-[11px] font-semibold font-mono">
                              📄 {finding.source_document || 'Guideline Doc'}
                              {finding.source_page ? ` • Page ${finding.source_page}` : ''}
                            </span>
                          )}
                        </div>
                        {finding.evidence && (
                          <p className="text-slate-300 italic leading-relaxed pl-4 border-l-2 border-brand-400/50">
                            &ldquo;{finding.evidence}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Suggested Correction */}
                    {finding.suggested_correction && (
                      <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          Recommended Correction
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-emerald-200 font-mono">
                          {finding.suggested_correction}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-surface-border flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {finding.engine === 'gemini' ? (
                          <span className="inline-flex items-center gap-1 text-purple-300 font-medium">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            Google Gemini 2.5 Flash
                          </span>
                        ) : finding.engine === 'opencv_rule_engine' ? (
                          <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
                            <Cpu className="w-3 h-3 text-cyan-400" />
                            OpenCV Computer Vision
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                            <ShieldCheck className="w-3 h-3 text-brand-400" />
                            Deterministic Rules
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isAccepted ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleUpdateFinding(finding, 'accepted')}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          {isAccepted ? 'Accepted' : 'Accept Correction'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetFinding(finding);
                            setCustomText(finding.suggested_correction || finding.original_text);
                            setEditModalOpen(true);
                          }}
                          leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                        >
                          Manual Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateFinding(finding, 'rejected')}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SIDE-BY-SIDE DIFF */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Original Submitted Content</CardTitle>
                <CardDescription>Raw copy prior to compliance interventions</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="p-4 rounded-xl bg-surface-2 border border-surface-border font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                {submission.original_content}
              </div>
            </CardBody>
          </Card>

          <Card className="border-emerald-500/30">
            <CardHeader>
              <div>
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Remediated Content
                </CardTitle>
                <CardDescription>Live copy with accepted corrections applied</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-emerald-200">
                {submission.current_content}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* VIEW MODE 3: VISUAL BRAND INSPECTOR */}
      {viewMode === 'visual' && visualData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-brand-400" />
                  Computer Vision & Visual Identity Analysis
                </CardTitle>
                <CardDescription>
                  OpenCV color extraction, WCAG contrast verification, and Gemini Vision assessment
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-6 space-y-6">
              {/* Dominant Colors */}
              {visualData.dominant_colors && (
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                    Detected Dominant Colors
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {visualData.dominant_colors.map((c: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-surface-2 border border-surface-border flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border border-surface-border shrink-0 shadow-sm"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-white font-bold">{c.hex}</p>
                          <p className="text-[11px] text-slate-400">{c.percentage}% of surface</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contrast and OCR Remarks */}
              {visualData.remarks && (
                <div className="p-4 rounded-xl bg-surface-2 border border-surface-border text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-white uppercase tracking-wider">Vision Engine Findings</p>
                  <p className="leading-relaxed">{visualData.remarks}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Manual Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Custom Replacement"
        description="Enter custom copy to replace the flagged finding while adhering to brand guidelines."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomEdit}>Apply Edit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-2 rounded-lg text-xs font-mono text-slate-300 border border-surface-border">
            Original: &quot;{targetFinding?.original_text}&quot;
          </div>
          <Textarea
            label="Replacement Text"
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={3}
            required
          />
        </div>
      </Modal>

      {/* Submit for Review Modal */}
      <Modal
        isOpen={submitReviewModalOpen}
        onClose={() => setSubmitReviewModalOpen(false)}
        title="Submit Content for Review"
        description="Notify designated legal and brand reviewers for formal publication approval."
        footer={
          <>
            <Button variant="outline" onClick={() => setSubmitReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForReview}
              isLoading={isSubmittingReview}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Submit for Approval
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-500/10 rounded-lg text-xs text-brand-300 border border-brand-500/20 flex items-center justify-between">
            <span>Current Compliance Score:</span>
            <span className="font-bold font-mono text-white">{report.overall_score} / 100</span>
          </div>
          <Textarea
            label="Reviewer Notes / Instructions"
            placeholder="Add any specific context or target launch deadlines for the legal/reviewer team..."
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};
