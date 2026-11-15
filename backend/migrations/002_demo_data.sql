-- ==============================================================================
-- BrandShield AI Database Migration 002: NovaTech Solutions Demo Data
-- ==============================================================================

-- 1. Demo User Profile
INSERT INTO profiles (id, email, full_name, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'admin@novatech.ai',
    'Alex Vance (Brand Director)',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
)
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

-- 2. NovaTech Organisation
INSERT INTO organisations (id, name, description, logo_url, is_demo, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'NovaTech Solutions',
    'Enterprise Cloud Security & Autonomous Telemetry Platform',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    TRUE,
    '00000000-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Organisation Membership
INSERT INTO organisation_members (organisation_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'admin'
)
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- 4. Brand Rules
INSERT INTO brand_rules (id, organisation_id, rule_type, name, value, replacement, description, metadata, is_active, created_by)
VALUES
    -- Preferred Terminology
    (
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'terminology_preferred',
        'Flagship Platform Naming',
        'NovaShield Tool',
        'NovaShield AI Platform',
        'Always refer to our flagship software as NovaShield AI Platform.',
        '{"severity": "medium"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'terminology_preferred',
        'Audience Reference',
        'customers',
        'enterprise partners',
        'Refer to B2B enterprise clients as enterprise partners.',
        '{"severity": "low"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'terminology_preferred',
        'Technical Standard: Cloud-Native',
        'cloud based',
        'cloud-native',
        'Standardize on hyphenated technical adjective cloud-native.',
        '{"severity": "low"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    -- Prohibited Terminology
    (
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'terminology_prohibited',
        'Zero-Risk Guarantee Claim',
        'unhackable',
        NULL,
        'Strictly prohibited. No platform can claim to be unhackable.',
        '{"severity": "critical"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'terminology_prohibited',
        '100% Protection Claim',
        '100% protection',
        'multi-layered proactive defense',
        'Never state 100% protection guarantee under FTC marketing guidelines.',
        '{"severity": "critical"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000001',
        'terminology_prohibited',
        'Competitor Disparagement',
        'legacy clunkers',
        NULL,
        'Never use derogatory terms when referring to competitor infrastructure.',
        '{"severity": "high"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    -- Mandatory Message
    (
        '10000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000001',
        'mandatory_message',
        'SOC-2 / ISO Certification Footer',
        'NovaTech Solutions is SOC 2 Type II and ISO 27001 certified.',
        NULL,
        'Mandatory verification disclaimer for marketing and security collateral.',
        '{"placement": "footer"}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    -- Approved Facts
    (
        '10000000-0000-0000-0000-000000000008',
        '00000000-0000-0000-0000-000000000001',
        'approved_fact',
        'Enterprise SLA Uptime',
        '99.99% enterprise SLA uptime across all global regions',
        NULL,
        'Verified corporate uptime metric.',
        '{"metric": "uptime", "value": 99.99}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000001',
        'approved_fact',
        'Enterprise Client Scale',
        'Protecting over 500 Global 2000 enterprises worldwide',
        NULL,
        'Corporate client scale metric.',
        '{"client_count": 500}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    -- Brand Voice & Color
    (
        '10000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'brand_voice',
        'Authoritative & Technically Rigorous',
        'Authoritative, empathetic, technically rigorous, and free from hype.',
        NULL,
        'Brand tone guidelines.',
        '{"avoid_words": ["gonna", "y''all", "miraculous", "crazy"]}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '10000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'brand_color',
        'NovaTech Navy & Cyan',
        '#0F172A',
        NULL,
        'Primary navy blue #0F172A and cyan accent #06B6D4.',
        '{"palette": ["#0F172A", "#06B6D4", "#3B82F6", "#F8FAFC"]}',
        TRUE,
        '00000000-0000-0000-0000-000000000002'
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Content Submissions
INSERT INTO content_submissions (id, organisation_id, title, category, original_content, current_content, content_type, status, submitted_by)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'Q1 Global Cyber Defense Launch Announcement',
        'marketing_campaign',
        'Protect your business today with the NovaShield Tool! Our revolutionary cloud based architecture guarantees 100% protection against every cyberattack, rendering your enterprise completely unhackable. Over 10,000 customers already trust us for zero-downtime security. Join today and forget about security risks forever!',
        'Protect your business today with the NovaShield Tool! Our revolutionary cloud based architecture guarantees 100% protection against every cyberattack, rendering your enterprise completely unhackable. Over 10,000 customers already trust us for zero-downtime security. Join today and forget about security risks forever!',
        'text',
        'audited',
        '00000000-0000-0000-0000-000000000002'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000001',
        'Enterprise Cloud Observability Product Brief',
        'blog_article',
        'We are thrilled to unveil new zero-trust telemetry capabilities on the NovaShield AI Platform. Engineered for high resilience, the platform helps enterprise partners proactively detect anomalies across multi-cloud environments. NovaTech Solutions is SOC 2 Type II and ISO 27001 certified, providing 99.99% enterprise SLA uptime.',
        'We are thrilled to unveil new zero-trust telemetry capabilities on the NovaShield AI Platform. Engineered for high resilience, the platform helps enterprise partners proactively detect anomalies across multi-cloud environments. NovaTech Solutions is SOC 2 Type II and ISO 27001 certified, providing 99.99% enterprise SLA uptime.',
        'text',
        'approved',
        '00000000-0000-0000-0000-000000000002'
    )
ON CONFLICT (id) DO NOTHING;

-- 6. Pre-computed Audit Report for Content 1
INSERT INTO audit_reports (id, content_id, organisation_id, overall_score, total_findings, critical_count, high_count, medium_count, low_count, info_count, summary, processing_time_seconds)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    42.0,
    5,
    2,
    1,
    1,
    1,
    0,
    'Audit identified 5 compliance findings including 2 critical legal risk violations (absolute protection and unhackable claims). Action required: Resolve critical terminology and disclaimer omissions prior to public distribution.',
    0.85
)
ON CONFLICT (id) DO NOTHING;

-- 7. Findings for Content 1
INSERT INTO compliance_findings (id, audit_id, content_id, category, severity, original_text, explanation, guideline_reference, evidence, suggested_correction, confidence, status, engine)
VALUES
    (
        '44444444-4444-4444-4444-444444444001',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Prohibited Term',
        'critical',
        'rendering your enterprise completely unhackable',
        'The term "unhackable" is strictly prohibited per brand safety rules.',
        'Prohibited Term: ''unhackable''',
        'Brand rule: Zero-Risk Guarantee Claim',
        'rendering your enterprise resilient against advanced threats',
        0.98,
        'open',
        'rule_engine'
    ),
    (
        '44444444-4444-4444-4444-444444444002',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Prohibited Term',
        'critical',
        'guarantees 100% protection against every cyberattack',
        'The term "100% protection" is prohibited per brand guidelines.',
        'Prohibited Term: ''100% protection''',
        'Brand rule: 100% Protection Claim',
        'provides multi-layered proactive defense against advanced threats',
        0.98,
        'open',
        'rule_engine'
    ),
    (
        '44444444-4444-4444-4444-444444444003',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Missing Disclaimer',
        'high',
        '(Entire content reviewed)',
        'Required certification disclaimer is missing.',
        'Mandatory Message: ''SOC-2 & ISO Certification Notice''',
        'Brand policy requires inclusion of: NovaTech Solutions is SOC 2 Type II and ISO 27001 certified.',
        'Add: NovaTech Solutions is SOC 2 Type II and ISO 27001 certified.',
        0.95,
        'open',
        'rule_engine'
    ),
    (
        '44444444-4444-4444-4444-444444444004',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Terminology Violation',
        'medium',
        'Protect your business today with the NovaShield Tool!',
        'The term "NovaShield Tool" should be replaced with "NovaShield AI Platform".',
        'Terminology Rule: Use ''NovaShield AI Platform'' instead of ''NovaShield Tool''',
        'Brand terminology rule #1',
        'Protect your business today with the NovaShield AI Platform!',
        0.95,
        'open',
        'rule_engine'
    ),
    (
        '44444444-4444-4444-4444-444444444005',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Terminology Violation',
        'low',
        'Over 10,000 customers already trust us',
        'The term "customers" should be replaced with "enterprise partners".',
        'Terminology Rule: Use ''enterprise partners'' instead of ''customers''',
        'Brand terminology rule #2',
        'Over 10,000 enterprise partners already trust us',
        0.95,
        'open',
        'rule_engine'
    )
ON CONFLICT (id) DO NOTHING;
