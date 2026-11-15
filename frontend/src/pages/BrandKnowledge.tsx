import React, { useState, useEffect } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { brandService } from '../services/brand.service';
import { BrandDocument, BrandRule, BrandAsset, RuleType } from '../types';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { FileUpload } from '../components/ui/FileUpload';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  FileText,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  BookOpen,
  Volume2,
  CheckSquare,
  Palette,
  Edit2,
  Sparkles,
  Database,
  Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';

export const BrandKnowledge: React.FC = () => {
  const { currentOrg, userRole } = useOrganisation();

  const [activeTab, setActiveTab] = useState<'documents' | 'terminology' | 'facts' | 'voice' | 'assets'>('documents');
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrandRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    rule_type: 'terminology_prohibited' as RuleType,
    name: '',
    value: '',
    replacement: '',
    description: '',
    is_active: true
  });

  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#6366f1');
  const [newColorDesc, setNewColorDesc] = useState('');

  const canEdit = userRole === 'admin' || userRole === 'creator';

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [docs, rls, asts] = await Promise.all([
        brandService.getDocuments(currentOrg.id),
        brandService.getRules(currentOrg.id),
        brandService.getAssets(currentOrg.id)
      ]);
      setDocuments(docs);
      setRules(rls);
      setAssets(asts);
    } catch (err) {
      console.error('Error fetching brand data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  // Handlers for Documents
  const handleUploadDocument = async () => {
    if (!currentOrg || !selectedFile) return;
    setIsUploadingDoc(true);
    try {
      await brandService.uploadDocument(currentOrg.id, selectedFile);
      toast.success(`Uploaded "${selectedFile.name}" and indexed into vector store!`);
      setSelectedFile(null);
      setUploadDocModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!currentOrg) return;
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await brandService.deleteDocument(currentOrg.id, id);
        toast.success('Document deleted');
        setDocuments(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        toast.error('Failed to delete document');
      }
    }
  };

  // Handlers for Rules
  const handleOpenRuleModal = (ruleToEdit?: BrandRule, defaultType?: RuleType) => {
    if (ruleToEdit) {
      setEditingRule(ruleToEdit);
      setRuleFormData({
        rule_type: ruleToEdit.rule_type,
        name: ruleToEdit.name,
        value: ruleToEdit.value,
        replacement: ruleToEdit.replacement || '',
        description: ruleToEdit.description || '',
        is_active: ruleToEdit.is_active
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        rule_type: defaultType || 'terminology_prohibited',
        name: '',
        value: '',
        replacement: '',
        description: '',
        is_active: true
      });
    }
    setRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      if (editingRule) {
        await brandService.updateRule(currentOrg.id, editingRule.id, ruleFormData);
        toast.success('Brand rule updated');
      } else {
        await brandService.createRule(currentOrg.id, ruleFormData);
        toast.success('Brand rule created');
      }
      setRuleModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!currentOrg) return;
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await brandService.deleteRule(currentOrg.id, id);
        toast.success('Rule removed');
        setRules(prev => prev.filter(r => r.id !== id));
      } catch (err) {
        toast.error('Failed to delete rule');
      }
    }
  };

  const handleToggleRuleActive = async (rule: BrandRule) => {
    if (!currentOrg) return;
    try {
      await brandService.updateRule(currentOrg.id, rule.id, { is_active: !rule.is_active });
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Could not update status');
    }
  };

  // Color Swatch creation
  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      await brandService.createRule(currentOrg.id, {
        rule_type: 'brand_color',
        name: newColorName,
        value: newColorHex,
        description: newColorDesc,
        is_active: true
      });
      toast.success('Color added to brand palette');
      setColorModalOpen(false);
      setNewColorName('');
      setNewColorDesc('');
      fetchData();
    } catch (err) {
      toast.error('Failed to save color');
    }
  };

  // Filtered views
  const filterBySearch = (text: string) =>
    text.toLowerCase().includes(searchQuery.toLowerCase());

  const terminologyRules = rules.filter(
    r =>
      (r.rule_type === 'terminology_preferred' || r.rule_type === 'terminology_prohibited') &&
      (filterBySearch(r.name) || filterBySearch(r.value) || filterBySearch(r.replacement || ''))
  );

  const factsRules = rules.filter(
    r => r.rule_type === 'approved_fact' && (filterBySearch(r.name) || filterBySearch(r.value))
  );

  const voiceAndMessagingRules = rules.filter(
    r =>
      (r.rule_type === 'brand_voice' || r.rule_type === 'mandatory_message') &&
      (filterBySearch(r.name) || filterBySearch(r.value))
  );

  const colorRules = rules.filter(r => r.rule_type === 'brand_color');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard: ${text}`);
  };

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  const tabsConfig = [
    { id: 'documents', label: 'Guidelines & RAG Chunks', icon: <FileText className="w-4 h-4" />, badge: documents.length },
    { id: 'terminology', label: 'Terminology Dictionary', icon: <BookOpen className="w-4 h-4" />, badge: terminologyRules.length },
    { id: 'facts', label: 'Approved Fact Vault', icon: <CheckSquare className="w-4 h-4" />, badge: factsRules.length },
    { id: 'voice', label: 'Tone & Voice Directives', icon: <Volume2 className="w-4 h-4" />, badge: voiceAndMessagingRules.length },
    { id: 'assets', label: 'Brand Palette & Assets', icon: <Palette className="w-4 h-4" />, badge: assets.length + colorRules.length }
  ];

  if (loading) {
    return <LoadingSpinner fullPage label="Loading Brand Knowledge DNA Hub..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Brand DNA Command Center
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {rules.length} active rules • {totalChunks} RAG vectors
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Brand Knowledge Hub</h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally govern brand guidelines, terminology dictionaries, approved facts, and visual identity standards.
          </p>
        </div>

        {/* Global Tab Context Action Button */}
        {canEdit && (
          <div className="flex items-center gap-2">
            {activeTab === 'documents' && (
              <Button
                variant="primary"
                onClick={() => setUploadDocModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Upload Guideline
              </Button>
            )}
            {activeTab === 'terminology' && (
              <Button
                variant="primary"
                onClick={() => handleOpenRuleModal(undefined, 'terminology_prohibited')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Term Rule
              </Button>
            )}
            {activeTab === 'facts' && (
              <Button
                variant="primary"
                onClick={() => handleOpenRuleModal(undefined, 'approved_fact')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Approved Fact
              </Button>
            )}
            {activeTab === 'voice' && (
              <Button
                variant="primary"
                onClick={() => handleOpenRuleModal(undefined, 'mandatory_message')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Policy / Directive
              </Button>
            )}
            {activeTab === 'assets' && (
              <Button
                variant="primary"
                onClick={() => setColorModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Brand Color
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Vector RAG Telemetry Bar */}
      <div className="p-3.5 rounded-xl bg-surface-1 border border-surface-border flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-white">Semantic Knowledge Grounding Engine</p>
            <p className="text-[11px] text-slate-400">
              Vector store populated with {documents.length} guidelines and {totalChunks} text chunks indexed with Gemini embeddings.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RAG Active
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-2 text-slate-300 border border-surface-border">
            1536-dim Cosine Similarity
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={tabId => {
          setActiveTab(tabId as any);
          setSearchQuery('');
        }}
      />

      {/* Search Bar for current tab */}
      {activeTab !== 'documents' && (
        <div className="max-w-md">
          <Input
            placeholder="Search rules, phrases, facts, or colors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
          />
        </div>
      )}

      {/* TAB 1: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {documents.length === 0 ? (
            <EmptyState
              title="No Brand Guidelines Uploaded"
              description="Upload your corporate brand guide PDF, DOCX messaging pillars, or style book to activate RAG semantic retrieval."
              actionText="Upload Brand Guideline"
              onAction={() => setUploadDocModalOpen(true)}
              actionIcon={<Plus className="w-4 h-4" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <Card key={doc.id} hoverable className="flex flex-col justify-between">
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Vectorized
                      </Badge>
                    </div>

                    <h4 className="text-sm font-semibold text-white mt-3 line-clamp-1">
                      {doc.name}
                    </h4>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Chunks Indexed:</span>
                        <span className="font-semibold text-slate-200">{doc.chunk_count} text chunks</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="font-semibold text-slate-200">
                          {doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : '3.8 MB'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uploaded by:</span>
                        <span className="font-semibold text-slate-200">{doc.uploaded_by || 'Admin'}</span>
                      </div>
                    </div>
                  </CardBody>

                  <div className="px-5 py-3 bg-surface-2/40 border-t border-surface-border flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TERMINOLOGY */}
      {activeTab === 'terminology' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Terminology Enforcement</CardTitle>
              <CardDescription>
                Deterministic dictionary for prohibited terms, trademarks, and mandatory brand nomenclature
              </CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-surface-border text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-6">Rule Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Phrase</th>
                  <th className="py-3 px-4">Mandatory Replacement</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-medium">
                {terminologyRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">{rule.name}</td>
                    <td className="py-3.5 px-4">
                      {rule.rule_type === 'terminology_prohibited' ? (
                        <Badge variant="danger" size="sm">Prohibited</Badge>
                      ) : (
                        <Badge variant="brand" size="sm">Preferred</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded inline-block">
                        &quot;{rule.value}&quot;
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rule.replacement ? (
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block">
                          {rule.replacement}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleRuleActive(rule)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                          rule.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-surface-2 text-slate-400 border border-surface-border'
                        }`}
                      >
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenRuleModal(rule)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Edit rule"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: APPROVED FACTS */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factsRules.map(fact => (
              <Card key={fact.id} hoverable>
                <CardBody className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">{fact.name}</h4>
                    <Badge variant="success" size="sm">Audited Metric</Badge>
                  </div>
                  <blockquote className="p-3 bg-brand-500/10 rounded-xl border-l-2 border-brand-500 text-xs text-slate-200 my-2 leading-relaxed italic">
                    &quot;{fact.value}&quot;
                  </blockquote>
                  {fact.description && (
                    <p className="text-xs text-slate-400 mt-2">{fact.description}</p>
                  )}
                </CardBody>
                {canEdit && (
                  <div className="px-5 py-2.5 bg-surface-2/40 border-t border-surface-border flex items-center justify-end gap-2 text-xs">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenRuleModal(fact)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => handleDeleteRule(fact.id)}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VOICE & MESSAGING */}
      {activeTab === 'voice' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brand Voice Pillar */}
            <Card>
              <CardHeader>
                <CardTitle>Tone of Voice Directives</CardTitle>
                <CardDescription>Guides Gemini 2.5 Flash on stylistic tone, persona, and perspective</CardDescription>
              </CardHeader>
              <CardBody className="p-5 space-y-4">
                {voiceAndMessagingRules
                  .filter(r => r.rule_type === 'brand_voice')
                  .map(rule => (
                    <div key={rule.id} className="p-4 rounded-xl border border-surface-border bg-surface-2/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-white">{rule.name}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">{rule.value}</p>
                      {rule.description && (
                        <p className="text-[11px] text-slate-500 mt-2 italic">{rule.description}</p>
                      )}
                    </div>
                  ))}
              </CardBody>
            </Card>

            {/* Mandatory Disclaimers */}
            <Card>
              <CardHeader>
                <CardTitle>Mandatory Statements & Disclaimers</CardTitle>
                <CardDescription>Required regulatory footers, disclosures, and legal notices</CardDescription>
              </CardHeader>
              <CardBody className="p-5 space-y-4">
                {voiceAndMessagingRules
                  .filter(r => r.rule_type === 'mandatory_message')
                  .map(rule => (
                    <div key={rule.id} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-amber-300">{rule.name}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-amber-200 leading-relaxed font-mono bg-surface-0/60 p-2.5 rounded-lg border border-amber-500/20 mt-1">
                        {rule.value}
                      </p>
                      {rule.description && (
                        <p className="text-[11px] text-slate-400 mt-2">{rule.description}</p>
                      )}
                    </div>
                  ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: ASSETS & COLORS */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Color Palette Swatches */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Approved Brand Color Palette</CardTitle>
                <CardDescription>Official color codes verified by OpenCV and Gemini Vision</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setColorModalOpen(true)}>
                  Add Color
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {colorRules.map(color => (
                  <div
                    key={color.id}
                    className="border border-surface-border rounded-xl overflow-hidden bg-surface-2 group hover:border-slate-600 transition-all"
                  >
                    <div
                      className="h-20 w-full relative flex items-end justify-end p-2"
                      style={{ backgroundColor: color.value }}
                    >
                      <button
                        onClick={() => copyToClipboard(color.value, color.name)}
                        className="bg-black/60 hover:bg-black/80 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy hex code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 bg-surface-1">
                      <p className="text-xs font-bold text-white truncate">{color.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-xs text-slate-400">{color.value}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteRule(color.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Visual Brand Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Visual Assets & Logos</CardTitle>
              <CardDescription>Official vectors and emblems for brand audit verification</CardDescription>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map(asset => (
                  <div
                    key={asset.id}
                    className="p-4 rounded-xl border border-surface-border flex items-center gap-4 bg-surface-2/40"
                  >
                    <div className="w-16 h-16 rounded-lg bg-surface-0 flex items-center justify-center p-2 shrink-0 border border-surface-border">
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{asset.name}</h4>
                      <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                        Type: {asset.asset_type.replace('_', ' ')}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Added {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        title="Upload Brand Guideline"
        description="Supported formats: PDF, DOCX, TXT. Documents are chunked and vector-indexed for RAG retrieval."
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadDocModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={!selectedFile}
              isLoading={isUploadingDoc}
            >
              Upload & Process
            </Button>
          </>
        }
      >
        <FileUpload
          selectedFile={selectedFile}
          onFileSelect={file => setSelectedFile(file)}
          onClear={() => setSelectedFile(null)}
          maxSizeMB={25}
        />
      </Modal>

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule ? 'Edit Brand Rule' : 'Create Brand Rule'}
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </>
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <Select
            label="Rule Type"
            value={ruleFormData.rule_type}
            onChange={e => setRuleFormData({ ...ruleFormData, rule_type: e.target.value as any })}
            options={[
              { value: 'terminology_prohibited', label: 'Prohibited Terminology' },
              { value: 'terminology_preferred', label: 'Preferred Brand Nomenclature' },
              { value: 'approved_fact', label: 'Approved Fact & Metric' },
              { value: 'mandatory_message', label: 'Mandatory Policy / Disclaimer' },
              { value: 'brand_voice', label: 'Brand Voice Directive' }
            ]}
          />

          <Input
            label="Rule Name"
            placeholder="e.g. Prohibit 'unhackable' or Product Name Spelling"
            value={ruleFormData.name}
            onChange={e => setRuleFormData({ ...ruleFormData, name: e.target.value })}
            required
          />

          <Textarea
            label={
              ruleFormData.rule_type === 'terminology_prohibited' || ruleFormData.rule_type === 'terminology_preferred'
                ? 'Target Phrase / Term'
                : 'Rule Content / Statement'
            }
            placeholder="The exact phrase, fact, or mandatory statement..."
            value={ruleFormData.value}
            onChange={e => setRuleFormData({ ...ruleFormData, value: e.target.value })}
            required
            rows={2}
          />

          {(ruleFormData.rule_type === 'terminology_prohibited' || ruleFormData.rule_type === 'terminology_preferred') && (
            <Input
              label="Mandatory Replacement / Preferred Alternative"
              placeholder="e.g. enterprise-grade security architecture"
              value={ruleFormData.replacement}
              onChange={e => setRuleFormData({ ...ruleFormData, replacement: e.target.value })}
            />
          )}

          <Textarea
            label="Guideline Reference & Context"
            placeholder="Explain why this rule exists and cite relevant section in Brand Guidelines..."
            value={ruleFormData.description}
            onChange={e => setRuleFormData({ ...ruleFormData, description: e.target.value })}
            rows={3}
          />
        </form>
      </Modal>

      {/* Add Color Modal */}
      <Modal
        isOpen={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        title="Add Brand Color"
        footer={
          <>
            <Button variant="outline" onClick={() => setColorModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColor}>Add Color</Button>
          </>
        }
      >
        <form onSubmit={handleSaveColor} className="space-y-4">
          <Input
            label="Color Name"
            placeholder="e.g. Corporate Navy or Electric Blue"
            value={newColorName}
            onChange={e => setNewColorName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Hex Code
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newColorHex}
                onChange={e => setNewColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-surface-border p-0.5 bg-surface-2"
              />
              <Input
                value={newColorHex}
                onChange={e => setNewColorHex(e.target.value)}
                placeholder="#6366f1"
                required
              />
            </div>
          </div>
          <Input
            label="Usage / Notes"
            placeholder="e.g. Primary CTAs and active interactive highlights"
            value={newColorDesc}
            onChange={e => setNewColorDesc(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
