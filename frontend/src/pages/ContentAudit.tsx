import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { contentService } from '../services/content.service';
import { ContentCategory } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { FileUpload } from '../components/ui/FileUpload';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  FileSearch,
  UploadCloud,
  FileText,
  ShieldCheck,
  Cpu,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ContentAudit: React.FC = () => {
  const { currentOrg } = useOrganisation();
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ContentCategory>('marketing_campaign');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Analysis simulation state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const categories: { value: ContentCategory; label: string }[] = [
    { value: 'social_media', label: 'Social Media Post / Thread' },
    { value: 'marketing_campaign', label: 'Marketing Campaign & Landing Page' },
    { value: 'advertisement', label: 'Paid Advertisement & Copy' },
    { value: 'blog_article', label: 'Blog Article / Whitepaper' },
    { value: 'product_description', label: 'Product Description & Datasheet' },
    { value: 'email_marketing', label: 'Email Marketing & Newsletter' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    if (inputMode === 'text' && !content.trim()) {
      toast.error('Please enter content to analyze');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      toast.error('Please upload a file to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(1);

    try {
      // 4-stage pipeline feedback
      await new Promise(r => setTimeout(r, 400));
      setAnalysisStep(2);
      await new Promise(r => setTimeout(r, 500));
      setAnalysisStep(3);
      await new Promise(r => setTimeout(r, 400));
      setAnalysisStep(4);

      let payloadContent = content;
      if (inputMode === 'file' && selectedFile) {
        payloadContent = `[Extracted Document: ${selectedFile.name}]\nDocument type: ${selectedFile.type || 'file'}\nSize: ${(selectedFile.size / 1024).toFixed(1)} KB.\n\n${content || 'Content extracted and submitted for brand rule evaluation.'}`;
      }

      const res = await contentService.submitContent(currentOrg.id, {
        title: title || (selectedFile ? selectedFile.name : 'Untitled Submission'),
        category,
        content: payloadContent,
        content_type: inputMode === 'file' ? 'pdf' : 'text',
        file: selectedFile || undefined
      });

      toast.success('Compliance audit completed!');
      navigate(`/audit/${res.submission.id}`);
    } catch (err: any) {
      toast.error('Audit failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const steps = [
    'Parsing content and extracting text typography...',
    'Executing deterministic rule engine against active brand dictionary...',
    'Retrieving contextual guidelines via vector semantic embeddings...',
    'Synthesizing evidence-backed report and calculating compliance score...'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
            Automated Audit Scanner
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Content Compliance Audit</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit copy, collateral, or marketing graphics to verify brand governance before public deployment.
        </p>
      </div>

      {/* Main Submission Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-brand-400" />
            <div>
              <CardTitle>Submit Content for Governance Review</CardTitle>
              <CardDescription>
                Compare submitted copy against active brand guidelines, prohibited terminology, and required disclaimers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Content Title / Campaign Name"
                placeholder="e.g. Q3 Product Announcement or Homepage Copy"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />

              <Select
                label="Content Category"
                value={category}
                onChange={e => setCategory(e.target.value as ContentCategory)}
                options={categories}
              />
            </div>

            {/* Input Mode Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
                Submission Format
              </label>
              <div className="flex rounded-xl p-1 bg-surface-2 max-w-xs border border-surface-border">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    inputMode === 'text'
                      ? 'bg-surface-1 text-white shadow-2xs border border-surface-border'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Direct Text Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    inputMode === 'file'
                      ? 'bg-surface-1 text-white shadow-2xs border border-surface-border'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File / Graphic</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Direct Text Copy */}
            {inputMode === 'text' ? (
              <Textarea
                label="Content Text Copy"
                placeholder="Paste the draft copy, email text, article, social post, or marketing description to review..."
                rows={9}
                value={content}
                onChange={e => setContent(e.target.value)}
                showCount
                maxLength={10000}
                required
              />
            ) : (
              /* Mode 2: File Upload (PDF, DOCX, TXT, Images) */
              <div className="space-y-3">
                <FileUpload
                  label="Upload Marketing Collateral, Document, or Ad Creative"
                  description="Supports PDF documents, DOCX files, TXT files, and PNG/JPEG graphics for OCR extraction."
                  accept={{
                    'application/pdf': ['.pdf'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'text/plain': ['.txt'],
                    'image/*': ['.png', '.jpg', '.jpeg']
                  }}
                  maxSizeMB={25}
                  onFileSelect={file => setSelectedFile(file)}
                />

                {selectedFile && (
                  <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-brand-300 font-medium font-mono">
                      <FileText className="w-4 h-4 text-brand-400" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Analysis Progress Box */}
            {isAnalyzing && (
              <div className="p-5 bg-surface-2 border border-brand-500/30 text-white rounded-2xl shadow-glow-brand space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin text-brand-400" />
                    Multi-Engine Compliance Pipeline Active
                  </span>
                  <span className="text-slate-400 font-mono">Stage {analysisStep} of 4</span>
                </div>

                <div className="space-y-1.5">
                  <ProgressBar
                    value={analysisStep * 25}
                    showPercent={false}
                    className="bg-surface-0"
                  />
                  <p className="text-xs text-slate-300 font-medium pt-1 font-mono">
                    {steps[analysisStep - 1] || 'Initializing analysis engines...'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isAnalyzing}
                disabled={isAnalyzing}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Run Brand Compliance Audit
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
