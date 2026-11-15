export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface Organisation {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_demo: boolean;
  created_at: string;
}

export interface OrganisationMember {
  id: string;
  organisation_id: string;
  user_id: string;
  role: 'admin' | 'creator' | 'reviewer';
  joined_at: string;
  user?: User;
}

export interface BrandDocument {
  id: string;
  organisation_id: string;
  name: string;
  file_type: string;
  file_url?: string;
  file_size?: number;
  status: 'processing' | 'ready' | 'error';
  chunk_count: number;
  uploaded_by?: string;
  created_at: string;
}

export type RuleType = 
  | 'terminology_preferred' 
  | 'terminology_prohibited' 
  | 'approved_fact' 
  | 'mandatory_message' 
  | 'brand_voice' 
  | 'brand_color';

export interface BrandRule {
  id: string;
  organisation_id: string;
  rule_type: RuleType;
  name: string;
  value: string;
  replacement?: string;
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface BrandAsset {
  id: string;
  organisation_id: string;
  name: string;
  asset_type: 'logo' | 'image' | 'icon' | 'color_palette';
  file_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ContentCategory = 
  | 'social_media' 
  | 'marketing_campaign' 
  | 'advertisement' 
  | 'blog_article' 
  | 'product_description' 
  | 'email_marketing';

export type ContentStatus = 
  | 'draft' 
  | 'audited' 
  | 'under_review' 
  | 'changes_requested' 
  | 'approved' 
  | 'rejected';

export interface ContentSubmission {
  id: string;
  organisation_id: string;
  title: string;
  category: ContentCategory;
  original_content: string;
  current_content: string;
  content_type: 'text' | 'pdf' | 'docx' | 'image';
  file_url?: string;
  status: ContentStatus;
  submitted_by?: string;
  assigned_reviewer?: string;
  created_at: string;
  updated_at: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type FindingStatus = 'open' | 'accepted' | 'rejected' | 'manually_edited' | 'ignored';

export interface ComplianceFinding {
  id: string;
  audit_id: string;
  content_id: string;
  category: string;
  severity: Severity;
  original_text: string;
  explanation: string;
  guideline_reference?: string;
  evidence?: string;
  source_document?: string;
  source_page?: number;
  suggested_correction?: string;
  confidence: number;
  status: FindingStatus;
  engine: string;
  created_at: string;
}

export interface AuditReport {
  id: string;
  content_id: string;
  organisation_id: string;
  overall_score: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  findings: ComplianceFinding[];
  summary: string;
  engine?: string;
  is_ai_powered?: boolean;
  ai_model?: string;
  processing_time_seconds?: number;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  content_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: User;
}

export interface ApprovalRecord {
  id: string;
  content_id: string;
  reviewer_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'changes_requested' | 'commented';
  previous_status?: string;
  new_status?: string;
  comment?: string;
  created_at: string;
  reviewer?: User;
}

export interface RevisionHistory {
  id: string;
  content_id: string;
  finding_id?: string;
  previous_text: string;
  new_text: string;
  action: string;
  performed_by?: string;
  created_at: string;
}

export interface AnalyticsOverview {
  total_audits: number;
  total_findings: number;
  approved_submissions: number;
  pending_reviews: number;
  avg_score: number;
  findings_by_category: Record<string, number>;
  findings_by_severity: Record<string, number>;
  recent_audits: AuditReport[];
}

export interface ViolationStats {
  category: string;
  count: number;
  severity_breakdown: Record<string, number>;
}

export interface CrossChannelFinding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  channel_a: string;
  channel_b: string;
  asset_a_title: string;
  asset_b_title: string;
  asset_a_excerpt: string;
  asset_b_excerpt: string;
  explanation: string;
  guideline_reference?: string;
  reconciliation_suggestion: string;
  confidence: number;
  engine: string;
}

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  organisation_id: string;
  content_id?: string;
  channel: string;
  title: string;
  content?: string;
  asset_type: 'text' | 'image';
  file_url?: string;
  score: number;
  issues_count: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  audit_id?: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  organisation_id: string;
  name: string;
  brief?: string;
  target_audience?: string;
  objective?: string;
  channels: string[];
  status: 'draft' | 'audited' | 'in_review' | 'approved';
  overall_score: number;
  total_assets: number;
  cross_channel_findings: CrossChannelFinding[];
  assets: CampaignAsset[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SmartRepairRequest {
  content_id?: string;
  original_text: string;
  finding_id?: string;
  violation_category?: string;
  guideline_reference?: string;
  explanation?: string;
  instruction?: string;
}

export interface SmartRepairResponse {
  repaired_text: string;
  diff_summary: string;
  safety_rationale: string;
  engine: string;
  model: string;
  changes: Array<{
    original_segment: string;
    revised_segment: string;
    reason: string;
  }>;
}
