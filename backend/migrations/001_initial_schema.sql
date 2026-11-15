-- ==============================================================================
-- BrandShield AI Database Migration 001: Initial Schema
-- ==============================================================================

-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organisations
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organisation members
CREATE TABLE IF NOT EXISTS organisation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID,
    role TEXT NOT NULL CHECK (role IN ('admin', 'creator', 'reviewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);

-- Brand documents
CREATE TABLE IF NOT EXISTS brand_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    chunk_count INTEGER DEFAULT 0,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guideline chunks with vectors
CREATE TABLE IF NOT EXISTS guideline_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES brand_documents(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER,
    chunk_index INTEGER,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS guideline_chunks_embedding_idx ON guideline_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Brand rules
CREATE TABLE IF NOT EXISTS brand_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('terminology_preferred', 'terminology_prohibited', 'approved_fact', 'mandatory_message', 'brand_voice', 'brand_color')),
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    replacement TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand assets
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'image', 'icon', 'color_palette')),
    file_url TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content submissions
CREATE TABLE IF NOT EXISTS content_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('social_media', 'marketing_campaign', 'advertisement', 'blog_article', 'product_description', 'email_marketing')),
    original_content TEXT NOT NULL,
    current_content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'pdf', 'docx', 'image')),
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'audited', 'under_review', 'changes_requested', 'approved', 'rejected')),
    submitted_by UUID,
    assigned_reviewer UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit reports
CREATE TABLE IF NOT EXISTS audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_submissions(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    overall_score FLOAT DEFAULT 0,
    total_findings INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    summary TEXT,
    processing_time_seconds FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance findings
CREATE TABLE IF NOT EXISTS compliance_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audit_reports(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_submissions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
    original_text TEXT NOT NULL,
    explanation TEXT NOT NULL,
    guideline_reference TEXT,
    evidence TEXT,
    source_document TEXT,
    source_page INTEGER,
    suggested_correction TEXT,
    confidence FLOAT DEFAULT 0.5,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'manually_edited', 'ignored')),
    engine TEXT DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revision history
CREATE TABLE IF NOT EXISTS revision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_submissions(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES compliance_findings(id) ON DELETE SET NULL,
    previous_text TEXT NOT NULL,
    new_text TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('correction_accepted', 'manual_edit', 'revert')),
    performed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review comments
CREATE TABLE IF NOT EXISTS review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_submissions(id) ON DELETE CASCADE,
    user_id UUID,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval records
CREATE TABLE IF NOT EXISTS approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_submissions(id) ON DELETE CASCADE,
    reviewer_id UUID,
    action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'changes_requested', 'commented')),
    previous_status TEXT,
    new_status TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit events (for analytics)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Service role and anon policies for unrestricted service execution
CREATE POLICY "Service role full access on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on organisations" ON organisations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on organisation_members" ON organisation_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on brand_documents" ON brand_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on guideline_chunks" ON guideline_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on brand_rules" ON brand_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on brand_assets" ON brand_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on content_submissions" ON content_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_reports" ON audit_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on compliance_findings" ON compliance_findings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on revision_history" ON revision_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on review_comments" ON review_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on approval_records" ON approval_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_events" ON audit_events FOR ALL USING (true) WITH CHECK (true);

-- Vector similarity search RPC function
CREATE OR REPLACE FUNCTION match_guideline_chunks(
    query_embedding vector(1536),
    match_org_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    document_id UUID,
    page_number INT,
    chunk_index INT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gc.id,
        gc.content,
        gc.document_id,
        gc.page_number,
        gc.chunk_index,
        gc.metadata,
        1 - (gc.embedding <=> query_embedding) AS similarity
    FROM guideline_chunks gc
    WHERE gc.organisation_id = match_org_id
    AND 1 - (gc.embedding <=> query_embedding) > match_threshold
    ORDER BY gc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
