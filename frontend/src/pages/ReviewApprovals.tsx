import React, { useState, useEffect } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useAuth } from '../contexts/AuthContext';
import { contentService } from '../services/content.service';
import { auditService } from '../services/audit.service';
import { reviewService } from '../services/review.service';
import { ContentSubmission, AuditReport, ReviewComment, ApprovalRecord } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Send,
  Eye,
  FileText,
  UserCheck,
  Check,
  History,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ReviewApprovals: React.FC = () => {
  const { currentOrg, userRole } = useOrganisation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [reports, setReports] = useState<Record<string, AuditReport>>({});
  const [selectedSubmission, setSelectedSubmission] = useState<ContentSubmission | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Review action dialog
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes_requested'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchData = async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [subs, reps] = await Promise.all([
        contentService.listSubmissions(currentOrg.id).catch(() => []),
        auditService.getAuditHistory(currentOrg.id).catch(() => [])
      ]);
      setSubmissions(subs || []);
      const repMap: Record<string, AuditReport> = {};
      (reps || []).forEach(r => {
        repMap[r.content_id] = r;
      });
      setReports(repMap);

      if ((subs || []).length > 0 && !selectedSubmission) {
        const defaultSub = subs.find(s => s.status === 'under_review') || subs[0];
        loadSubmissionDetails(defaultSub);
      }
    } catch (err) {
      console.error('Error fetching reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  const loadSubmissionDetails = async (sub: ContentSubmission) => {
    setSelectedSubmission(sub);
    if (!currentOrg) return;
    try {
      const [comms, apps] = await Promise.all([
        reviewService.getComments(currentOrg.id, sub.id),
        reviewService.getApprovalHistory(currentOrg.id, sub.id)
      ]);
      setComments(comms);
      setApprovals(apps);
    } catch (err) {
      console.error('Error fetching details', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !selectedSubmission || !newComment.trim()) return;
    try {
      const added = await reviewService.addComment(currentOrg.id, selectedSubmission.id, newComment);
      setComments(prev => [...prev, added]);
      setNewComment('');
      toast.success('Comment posted');
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const handleOpenActionModal = (type: 'approve' | 'reject' | 'changes_requested') => {
    setActionType(type);
    setActionComment('');
    setActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!currentOrg || !selectedSubmission) return;
    setIsSubmittingAction(true);
    try {
      let updated: ContentSubmission;
      if (actionType === 'approve') {
        updated = await reviewService.approveSubmission(currentOrg.id, selectedSubmission.id, actionComment);
        toast.success('Content approved for official publication!');
      } else if (actionType === 'reject') {
        updated = await reviewService.rejectSubmission(currentOrg.id, selectedSubmission.id, actionComment);
        toast.success('Content rejected');
      } else {
        updated = await reviewService.requestChanges(
          currentOrg.id,
          selectedSubmission.id,
          actionComment || 'Changes requested by reviewer'
        );
        toast.success('Requested revisions from author');
      }

      setActionModalOpen(false);
      setSelectedSubmission(updated);
      setSubmissions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      loadSubmissionDetails(updated);
    } catch (err) {
      toast.error('Failed to update submission status');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading Review & Approval Registry..." />;
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'under_review');
  const visibleSubmissions = activeTab === 'pending' ? pendingSubmissions : submissions;
  const currentReport = selectedSubmission ? reports[selectedSubmission.id] : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Governance Sign-Off Gate
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400 font-mono">
            {pendingSubmissions.length} pending review • Human authority required
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Review & Approvals</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review queue for legal counsel, brand stewards, and editorial leads to inspect remediated content and issue sign-offs.
        </p>
      </div>

      {/* Main Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Submissions Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Queue Tab selector */}
          <div className="flex bg-surface-1 p-1 rounded-xl border border-surface-border">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Sign-Off</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                {pendingSubmissions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-surface-2 text-white shadow-2xs border border-surface-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Submissions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-3 text-slate-300 font-bold">
                {submissions.length}
              </span>
            </button>
          </div>

          {/* Submissions List */}
          <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {visibleSubmissions.length === 0 ? (
              <EmptyState
                title="Queue Clear"
                description={
                  activeTab === 'pending'
                    ? 'All submissions have been reviewed and approved.'
                    : 'No submissions found in this workspace.'
                }
              />
            ) : (
              visibleSubmissions.map(sub => {
                const isSelected = selectedSubmission?.id === sub.id;
                const rep = reports[sub.id];

                return (
                  <div
                    key={sub.id}
                    onClick={() => loadSubmissionDetails(sub)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 shadow-glow-brand ring-1 ring-brand-500/40'
                        : 'border-surface-border bg-surface-1 hover:border-slate-700 hover:bg-surface-2/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{sub.title}</h4>
                      <StatusBadge status={sub.status} size="sm" showIcon={false} />
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="capitalize">{sub.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>By {sub.submitted_by || 'Author'}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-border text-xs">
                      <span className="text-[11px] text-slate-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                      {rep && (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                            rep.overall_score >= 85
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          Score: {rep.overall_score}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Submission Inspector (7 cols) */}
        <div className="lg:col-span-7">
          {selectedSubmission ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedSubmission.status} />
                    <Badge variant="brand" size="sm">
                      {selectedSubmission.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1 text-white">{selectedSubmission.title}</CardTitle>
                </div>

                {/* Reviewer Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenActionModal('approve')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenActionModal('changes_requested')}
                    className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    leftIcon={<AlertCircle className="w-4 h-4" />}
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenActionModal('reject')}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    Reject
                  </Button>
                </div>
              </CardHeader>

              <CardBody className="p-6 space-y-6">
                {/* Compliance Score Summary Banner */}
                {currentReport && (
                  <div className="p-4 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Compliance Audit Summary</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentReport.total_findings} findings identified ({currentReport.critical_count} critical)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-white font-mono">
                        {currentReport.overall_score} / 100
                      </span>
                    </div>
                  </div>
                )}

                {/* Content View */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Content Draft (Remediated)
                  </h4>
                  <div className="p-4 rounded-xl bg-surface-2/60 border border-surface-border font-mono text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedSubmission.current_content}
                  </div>
                </div>

                {/* Comments & Review Thread */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-400" />
                    Review Conversation ({comments.length})
                  </h4>

                  {/* Comment list */}
                  <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        No comments yet. Provide editorial notes or feedback below.
                      </p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="p-3.5 rounded-xl bg-surface-2/50 border border-surface-border flex items-start gap-3">
                          <Avatar name={c.user?.full_name || 'Reviewer'} src={c.user?.avatar_url} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">
                                {c.user?.full_name || 'Reviewer'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.comment}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* New Comment Input */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Textarea
                      placeholder="Type feedback, compliance notes, or reviewer instructions..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button type="submit" variant="primary" className="self-end" leftIcon={<Send className="w-4 h-4" />}>
                      Post
                    </Button>
                  </form>
                </div>

                {/* Status Timeline */}
                {approvals.length > 0 && (
                  <div className="pt-4 border-t border-surface-border">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-400" />
                      Approval Audit Trail
                    </h4>
                    <div className="space-y-2 text-xs">
                      {approvals.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-slate-300 p-2.5 rounded-lg bg-surface-2/40 border border-surface-border">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-400" />
                            <span>
                              <strong className="text-white">{a.reviewer?.full_name || 'Reviewer'}</strong> performed{' '}
                              <span className="font-semibold uppercase text-brand-300">{a.action.replace('_', ' ')}</span>
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px] font-mono">
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-12 text-center">
              <EmptyState
                title="Select a Submission"
                description="Choose an item from the review queue on the left to examine content and render decisions."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={
          actionType === 'approve'
            ? 'Confirm Content Approval'
            : actionType === 'reject'
            ? 'Confirm Content Rejection'
            : 'Request Content Revisions'
        }
        description={
          actionType === 'approve'
            ? 'This will mark the collateral as fully compliant and authorized for marketing/press publication.'
            : actionType === 'reject'
            ? 'This will notify the author that the content violates brand governance and cannot be published.'
            : 'Specify requested modifications so the author can update the draft.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteAction}
              isLoading={isSubmittingAction}
              className={
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : actionType === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }
            >
              Confirm Decision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Decision Note / Rationale"
            placeholder="Add context for this decision (optional for approval, recommended for revisions/rejection)..."
            value={actionComment}
            onChange={e => setActionComment(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
