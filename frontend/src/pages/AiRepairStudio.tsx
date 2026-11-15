import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { contentService } from '../services/content.service';
import { auditService } from '../services/audit.service';
import { repairService } from '../services/repair.service';
import { correctionService } from '../services/correction.service';
import { ContentSubmission, AuditReport, ComplianceFinding, SmartRepairResponse } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Wand2,
  Sparkles,
  Check,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Send,
  ArrowRight,
  Split,
  FileEdit,
  Eye,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AiRepairStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrganisation();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ContentSubmission | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<ComplianceFinding | null>(null);

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [repairResult, setRepairResult] = useState<SmartRepairResponse | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [manualEditedText, setManualEditedText] = useState('');
  const [isEditingManually, setIsEditingManually] = useState(false);

  const loadSubmissions = async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await contentService.listSubmissions(currentOrg.id).catch(() => []);
      setSubmissions(list || []);
      if (id) {
        const found = (list || []).find(s => s.id === id) || (await contentService.getSubmission(currentOrg.id, id).catch(() => null));
        if (found) {
          setSelectedSubmission(found);
          await loadAuditForSubmission(found.id);
        }
      } else if ((list || []).length > 0) {
        setSelectedSubmission(list[0]);
        await loadAuditForSubmission(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load content for Repair Studio', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditForSubmission = async (contentId: string) => {
    if (!currentOrg) return;
    try {
      const rep = await auditService.getAuditReport(currentOrg.id, contentId);
      setReport(rep);
      if (rep.findings.length > 0) {
        setSelectedFinding(rep.findings[0]);
        // Auto-generate initial repair
        handleGenerateRepair(rep.findings[0]);
      } else {
        setSelectedFinding(null);
        setRepairResult(null);
      }
    } catch {
      setReport(null);
      setSelectedFinding(null);
      setRepairResult(null);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [currentOrg, id]);

  const handleSelectSubmission = async (sub: ContentSubmission) => {
    setSelectedSubmission(sub);
    setRepairResult(null);
    setIsEditingManually(false);
    await loadAuditForSubmission(sub.id);
  };

  const handleGenerateRepair = async (finding?: ComplianceFinding | null, customGuidance?: string) => {
    if (!selectedSubmission) return;
    const target = finding || selectedFinding;
    if (!target) return;

    setIsGenerating(true);
    try {
      const res = await repairService.generateRepair({
        content_id: selectedSubmission.id,
        original_text: selectedSubmission.current_content || selectedSubmission.original_content,
        finding_id: target.id,
        violation_category: target.category,
        guideline_reference: target.guideline_reference,
        explanation: target.explanation,
        instruction: customGuidance || customPrompt,
      });
      setRepairResult(res);
      setManualEditedText(res.repaired_text);
    } catch {
      toast.error('Failed to generate smart repair');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToDraft = async () => {
    if (!currentOrg || !selectedSubmission || !repairResult) return;
    const newContent = isEditingManually ? manualEditedText : repairResult.repaired_text;

    try {
      if (selectedFinding) {
        await correctionService.updateFindingStatus(
          currentOrg.id,
          selectedSubmission.id,
          selectedFinding.id,
          'accepted',
          newContent
        );
      }
      setSelectedSubmission({
        ...selectedSubmission,
        current_content: newContent,
      });
      toast.success('Repaired copy saved to draft!');
      await loadAuditForSubmission(selectedSubmission.id);
    } catch {
      toast.error('Failed to apply repair');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading AI Repair Studio..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-xs font-bold uppercase tracking-wider">
              <Wand2 className="w-3.5 h-3.5" />
              AI Repair Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Powered by Google Gemini 2.5 Flash
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Surgical Copy Remediation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Automatically resolve compliance violations while strictly preserving your original authorial tone, marketing structure, and persuasiveness. Inspect diffs, view safety explanations, and apply one-click fixes.
          </p>
        </div>

        {selectedSubmission && (
          <div className="flex items-center gap-3 z-10 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate(`/content-audit/${selectedSubmission.id}`)}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Full Audit Report
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyToDraft}
              disabled={!repairResult}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Apply Remediation
            </Button>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Submissions & Findings Queue (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Content Queue</CardTitle>
              <span className="text-xs text-slate-400">{submissions.length} Items</span>
            </CardHeader>
            <CardBody className="p-3 max-h-56 overflow-y-auto space-y-1.5">
              {submissions.map(sub => {
                const isSelected = selectedSubmission?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-surface-3 text-white border border-brand-500 shadow-glow-brand/20'
                        : 'text-slate-400 hover:text-white hover:bg-surface-2'
                    }`}
                  >
                    <span className="font-semibold truncate max-w-[180px]">{sub.title}</span>
                    <Badge variant="slate" size="sm">{sub.category.replace('_', ' ')}</Badge>
                  </button>
                );
              })}
            </CardBody>
          </Card>

          {/* Active Violations List */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">Identified Violations</CardTitle>
                <CardDescription>Select an issue to generate targeted safe copy</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-3 space-y-2 max-h-[460px] overflow-y-auto">
              {!report || report.findings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  No violations requiring repair
                </div>
              ) : (
                report.findings.map(finding => {
                  const isSelected = selectedFinding?.id === finding.id;
                  return (
                    <div
                      key={finding.id}
                      onClick={() => {
                        setSelectedFinding(finding);
                        handleGenerateRepair(finding);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-surface-3 border-accent-violet shadow-glow-violet/20'
                          : 'bg-surface-2/60 border-surface-border hover:bg-surface-2 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <SeverityBadge severity={finding.severity} size="sm" />
                        <span className="text-[10px] text-slate-500 font-mono">{finding.category}</span>
                      </div>
                      <p className="font-mono text-rose-300 line-clamp-2 bg-rose-950/20 p-1.5 rounded border border-rose-500/20">
                        &ldquo;{finding.original_text}&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{finding.explanation}</p>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Interactive Remediation Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Target Banner */}
          {selectedFinding ? (
            <Card className="border-accent-violet/30 bg-surface-1">
              <CardBody className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={selectedFinding.severity} />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{selectedFinding.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-rose-300 font-mono mt-1">
                      Flagged: &ldquo;{selectedFinding.original_text}&rdquo;
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateRepair(selectedFinding)}
                    isLoading={isGenerating}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Regenerate AI Fix
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-2 border border-surface-border text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-brand-300">
                    <BookOpen className="w-3.5 h-3.5 text-brand-400" />
                    <span>Guideline Grounding: {selectedFinding.guideline_reference || 'Brand Governance Policy'}</span>
                    {selectedFinding.source_page && <span>(Page {selectedFinding.source_page})</span>}
                  </div>
                  <p className="text-slate-400 italic leading-relaxed pl-5">
                    {selectedFinding.evidence || selectedFinding.explanation}
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="py-8 text-center text-xs text-slate-400">
                Select a content submission and finding on the left to activate the AI Repair Studio.
              </CardBody>
            </Card>
          )}

          {/* Before & After Diff Inspection */}
          {repairResult && selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before: Original Copy */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="text-xs uppercase tracking-wider text-slate-400">Original Copy (Flagged)</CardTitle>
                      <Badge variant="danger" size="sm">Non-Compliant</Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="p-4">
                    <div className="font-mono text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-surface-2 p-3.5 rounded-xl border border-surface-border">
                      {selectedSubmission.original_content}
                    </div>
                  </CardBody>
                </Card>

                {/* After: Remediated Copy */}
                <Card className="border-emerald-500/40 shadow-glow-brand/10">
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Remediated Copy (Gemini 2.5 Flash)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingManually(!isEditingManually)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit className="w-3 h-3" />
                          {isEditingManually ? 'View Diff' : 'Manual Tweak'}
                        </button>
                        <Badge variant="success" size="sm">Brand Safe</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="p-4">
                    {isEditingManually ? (
                      <textarea
                        value={manualEditedText}
                        onChange={e => setManualEditedText(e.target.value)}
                        rows={8}
                        className="w-full font-mono text-xs sm:text-sm text-emerald-200 leading-relaxed bg-surface-2 p-3.5 rounded-xl border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    ) : (
                      <div className="font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed whitespace-pre-wrap bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
                        {repairResult.repaired_text}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Safety Explanation Card */}
              <Card className="border-brand-500/30 bg-surface-1">
                <CardBody className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      Why This Correction Is Compliant:
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-6">
                    {repairResult.safety_rationale}
                  </p>
                  <p className="text-[11px] text-slate-400 pl-6 border-t border-surface-border pt-2 font-mono">
                    Diff Summary: {repairResult.diff_summary}
                  </p>
                </CardBody>
              </Card>

              {/* Action Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-surface-border">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Custom instruction (e.g. make it punchier, emphasize speed)..."
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    className="w-72 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateRepair(selectedFinding, customPrompt)}
                    isLoading={isGenerating}
                  >
                    Regenerate with Guidance
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={handleApplyToDraft}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Apply & Save to Draft
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
