import {
  User,
  Organisation,
  OrganisationMember,
  BrandDocument,
  BrandRule,
  BrandAsset,
  ContentSubmission,
  AuditReport,
  ComplianceFinding,
  ReviewComment,
  ApprovalRecord,
  RevisionHistory,
  AnalyticsOverview,
  ViolationStats
} from '../types';

export const DEFAULT_USER: User = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'admin@novatech.ai',
  full_name: 'NovaTech Administrator',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
};

export const DEFAULT_ORGANISATION: Organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'NovaTech Solutions',
  description: 'Enterprise Cloud Architecture and Autonomous Cybersecurity Platform',
  is_demo: true,
  created_at: new Date().toISOString()
};

export const DEFAULT_MEMBER: OrganisationMember = {
  id: 'mem_admin',
  organisation_id: DEFAULT_ORGANISATION.id,
  user_id: DEFAULT_USER.id,
  role: 'admin',
  joined_at: new Date().toISOString(),
  user: DEFAULT_USER
};

class MockStorage {
  private userKey = 'brandshield_user_v2';
  private orgsKey = 'brandshield_orgs_v2';
  private currentOrgKey = 'brandshield_current_org_v2';
  private membersKey = 'brandshield_members_v2';
  private docsKey = 'brandshield_docs_v2';
  private rulesKey = 'brandshield_rules_v2';
  private assetsKey = 'brandshield_assets_v2';
  private submissionsKey = 'brandshield_submissions_v2';
  private reportsKey = 'brandshield_reports_v2';
  private commentsKey = 'brandshield_comments_v2';
  private approvalsKey = 'brandshield_approvals_v2';
  private revisionsKey = 'brandshield_revisions_v2';

  constructor() {
    this.purgeLegacyData();
    this.init();
  }

  /**
   * Purge any previous version of pre-filled or demo data from localStorage.
   */
  private purgeLegacyData(): void {
    try {
      const legacyKeys = [
        'brandshield_user',
        'brandshield_orgs',
        'brandshield_current_org',
        'brandshield_members',
        'brandshield_docs',
        'brandshield_rules',
        'brandshield_assets',
        'brandshield_submissions',
        'brandshield_reports',
        'brandshield_comments',
        'brandshield_approvals',
        'brandshield_revisions',
        'novatech_demo_initialized'
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore if localStorage is unavailable
    }
  }

  public init(forceReset = false) {
    if (forceReset || !localStorage.getItem(this.orgsKey)) {
      localStorage.setItem(this.userKey, JSON.stringify(DEFAULT_USER));
      localStorage.setItem(this.orgsKey, JSON.stringify([DEFAULT_ORGANISATION]));
      localStorage.setItem(this.currentOrgKey, JSON.stringify(DEFAULT_ORGANISATION));
      localStorage.setItem(this.membersKey, JSON.stringify([DEFAULT_MEMBER]));
      localStorage.setItem(this.docsKey, JSON.stringify([]));
      localStorage.setItem(this.rulesKey, JSON.stringify([]));
      localStorage.setItem(this.assetsKey, JSON.stringify([]));
      localStorage.setItem(this.submissionsKey, JSON.stringify([]));
      localStorage.setItem(this.reportsKey, JSON.stringify([]));
      localStorage.setItem(this.commentsKey, JSON.stringify([]));
      localStorage.setItem(this.approvalsKey, JSON.stringify([]));
      localStorage.setItem(this.revisionsKey, JSON.stringify([]));
    }
  }

  public clearAllData(): void {
    localStorage.setItem(this.docsKey, JSON.stringify([]));
    localStorage.setItem(this.rulesKey, JSON.stringify([]));
    localStorage.setItem(this.assetsKey, JSON.stringify([]));
    localStorage.setItem(this.submissionsKey, JSON.stringify([]));
    localStorage.setItem(this.reportsKey, JSON.stringify([]));
    localStorage.setItem(this.commentsKey, JSON.stringify([]));
    localStorage.setItem(this.approvalsKey, JSON.stringify([]));
    localStorage.setItem(this.revisionsKey, JSON.stringify([]));
  }

  // User & Auth
  public getCurrentUser(): User {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : DEFAULT_USER;
  }

  public setCurrentUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Organisations
  public getOrganisations(): Organisation[] {
    const raw = localStorage.getItem(this.orgsKey);
    return raw ? JSON.parse(raw) : [DEFAULT_ORGANISATION];
  }

  public getCurrentOrg(): Organisation {
    const raw = localStorage.getItem(this.currentOrgKey);
    return raw ? JSON.parse(raw) : DEFAULT_ORGANISATION;
  }

  public setCurrentOrg(org: Organisation): void {
    localStorage.setItem(this.currentOrgKey, JSON.stringify(org));
  }

  public createOrganisation(name: string, description?: string): Organisation {
    const newOrg: Organisation = {
      id: `org_${Date.now()}`,
      name,
      description: description || '',
      is_demo: false,
      created_at: new Date().toISOString()
    };
    const orgs = this.getOrganisations();
    orgs.push(newOrg);
    localStorage.setItem(this.orgsKey, JSON.stringify(orgs));
    this.setCurrentOrg(newOrg);

    // Add current user as admin
    const members = this.getMembers(newOrg.id);
    const user = this.getCurrentUser();
    members.push({
      id: `mem_${Date.now()}`,
      organisation_id: newOrg.id,
      user_id: user.id,
      role: 'admin',
      joined_at: new Date().toISOString(),
      user
    });
    localStorage.setItem(this.membersKey, JSON.stringify(members));

    return newOrg;
  }

  public updateOrganisation(orgId: string, updates: Partial<Organisation>): Organisation {
    const orgs = this.getOrganisations();
    const idx = orgs.findIndex(o => o.id === orgId);
    if (idx !== -1) {
      orgs[idx] = { ...orgs[idx], ...updates };
      localStorage.setItem(this.orgsKey, JSON.stringify(orgs));
      const current = this.getCurrentOrg();
      if (current.id === orgId) {
        this.setCurrentOrg(orgs[idx]);
      }
      return orgs[idx];
    }
    return this.getCurrentOrg();
  }

  // Members
  public getMembers(orgId?: string): OrganisationMember[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.membersKey);
    const all: OrganisationMember[] = raw ? JSON.parse(raw) : [DEFAULT_MEMBER];
    return all.filter(m => m.organisation_id === targetOrgId);
  }

  public inviteMember(arg1: string, arg2?: string, arg3?: 'admin' | 'creator' | 'reviewer'): OrganisationMember {
    const orgId = arg3 ? arg1 : this.getCurrentOrg().id;
    const email = arg3 ? arg2! : arg1;
    const role = (arg3 ? arg3 : (arg2 as any)) || 'reviewer';
    const members = this.getMembers(orgId);
    const namePart = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const newMember: OrganisationMember = {
      id: `mem_${Date.now()}`,
      organisation_id: orgId,
      user_id: `usr_${Date.now()}`,
      role,
      joined_at: new Date().toISOString(),
      user: {
        id: `usr_${Date.now()}`,
        email,
        full_name: namePart,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(namePart)}`
      }
    };
    members.push(newMember);
    localStorage.setItem(this.membersKey, JSON.stringify(members));
    return newMember;
  }

  public updateMemberRole(arg1: string, arg2: string | ('admin' | 'creator' | 'reviewer'), arg3?: 'admin' | 'creator' | 'reviewer'): OrganisationMember | null {
    const orgId = arg3 ? arg1 : this.getCurrentOrg().id;
    const memberId = arg3 ? arg2 : arg1;
    const newRole = arg3 ? arg3 : (arg2 as any);
    const raw = localStorage.getItem(this.membersKey);
    const all: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(m => m.id === memberId && m.organisation_id === orgId);
    if (idx !== -1) {
      all[idx].role = newRole;
      localStorage.setItem(this.membersKey, JSON.stringify(all));
      return all[idx];
    }
    return null;
  }

  public removeMember(arg1: string, arg2?: string): boolean {
    const orgId = arg2 ? arg1 : this.getCurrentOrg().id;
    const memberId = arg2 ? arg2 : arg1;
    const raw = localStorage.getItem(this.membersKey);
    const all: OrganisationMember[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(m => !(m.id === memberId && m.organisation_id === orgId));
    localStorage.setItem(this.membersKey, JSON.stringify(filtered));
    return true;
  }

  // Brand Documents
  public getDocuments(orgId?: string): BrandDocument[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.docsKey);
    const all: BrandDocument[] = raw ? JSON.parse(raw) : [];
    return all.filter(d => d.organisation_id === targetOrgId);
  }

  public addDocument(file: File, orgId?: string): BrandDocument {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const user = this.getCurrentUser();
    const ext = file.name.split('.').pop() || 'pdf';
    const newDoc: BrandDocument = {
      id: `doc_${Date.now()}`,
      organisation_id: targetOrgId,
      name: file.name,
      file_type: ext,
      file_size: file.size,
      status: 'ready',
      chunk_count: Math.max(12, Math.floor(file.size / 800)),
      uploaded_by: user.full_name,
      created_at: new Date().toISOString()
    };
    const docs = this.getDocuments(targetOrgId);
    docs.unshift(newDoc);
    localStorage.setItem(this.docsKey, JSON.stringify(docs));
    return newDoc;
  }

  public deleteDocument(docId: string, orgId?: string): boolean {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const docs = this.getDocuments(targetOrgId);
    const filtered = docs.filter(d => d.id !== docId);
    localStorage.setItem(this.docsKey, JSON.stringify(filtered));
    return true;
  }

  // Brand Rules
  public getRules(orgId?: string): BrandRule[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.rulesKey);
    const all: BrandRule[] = raw ? JSON.parse(raw) : [];
    return all.filter(r => r.organisation_id === targetOrgId);
  }

  public addRule(ruleData: Omit<BrandRule, 'id' | 'created_at'>, orgId?: string): BrandRule {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const newRule: BrandRule = {
      ...ruleData,
      id: `rule_${Date.now()}`,
      organisation_id: targetOrgId,
      created_at: new Date().toISOString()
    };
    const rules = this.getRules(targetOrgId);
    rules.unshift(newRule);
    localStorage.setItem(this.rulesKey, JSON.stringify(rules));
    return newRule;
  }

  public createRule(ruleData: any, orgId?: string): BrandRule {
    return this.addRule(ruleData, orgId);
  }

  public updateRule(ruleId: string, updates: Partial<BrandRule>, orgId?: string): BrandRule | null {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const rules = this.getRules(targetOrgId);
    const idx = rules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      rules[idx] = { ...rules[idx], ...updates };
      localStorage.setItem(this.rulesKey, JSON.stringify(rules));
      return rules[idx];
    }
    return null;
  }

  public deleteRule(ruleId: string, orgId?: string): boolean {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const rules = this.getRules(targetOrgId);
    const filtered = rules.filter(r => r.id !== ruleId);
    localStorage.setItem(this.rulesKey, JSON.stringify(filtered));
    return true;
  }

  // Brand Assets
  public getAssets(orgId?: string): BrandAsset[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.assetsKey);
    const all: BrandAsset[] = raw ? JSON.parse(raw) : [];
    return all.filter(a => a.organisation_id === targetOrgId);
  }

  public addAsset(assetData: Omit<BrandAsset, 'id' | 'created_at'>, orgId?: string): BrandAsset {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const newAsset: BrandAsset = {
      ...assetData,
      id: `asset_${Date.now()}`,
      organisation_id: targetOrgId,
      created_at: new Date().toISOString()
    };
    const assets = this.getAssets(targetOrgId);
    assets.unshift(newAsset);
    localStorage.setItem(this.assetsKey, JSON.stringify(assets));
    return newAsset;
  }

  public createAsset(assetData: any, orgId?: string): BrandAsset {
    return this.addAsset(assetData, orgId);
  }

  public deleteAsset(assetId: string, orgId?: string): boolean {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const assets = this.getAssets(targetOrgId);
    const filtered = assets.filter(a => a.id !== assetId);
    localStorage.setItem(this.assetsKey, JSON.stringify(filtered));
    return true;
  }

  // Content Submissions & Audits
  public getSubmissions(orgId?: string): ContentSubmission[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.submissionsKey);
    const all: ContentSubmission[] = raw ? JSON.parse(raw) : [];
    return all.filter(s => s.organisation_id === targetOrgId);
  }

  public getSubmission(id: string): ContentSubmission | null {
    const submissions = this.getSubmissions();
    return submissions.find(s => s.id === id) || null;
  }

  public createSubmission(data: {
    title: string;
    category: any;
    content: string;
    content_type?: 'text' | 'pdf' | 'docx' | 'image';
  }): { submission: ContentSubmission; report: AuditReport } {
    const currentOrg = this.getCurrentOrg();
    const user = this.getCurrentUser();
    const subId = `sub_${Date.now()}`;
    const repId = `rep_${Date.now()}`;

    // Run deterministic rules & heuristic analysis against currently configured rules
    const rules = this.getRules(currentOrg.id).filter(r => r.is_active);
    const docs = this.getDocuments(currentOrg.id);
    const primaryDocName = docs[0]?.name || 'Brand Guidelines';
    const findings: ComplianceFinding[] = [];
    const lowerContent = data.content.toLowerCase();

    // Check prohibited terminology
    for (const rule of rules) {
      if (rule.rule_type === 'terminology_prohibited') {
        const needle = rule.value.toLowerCase();
        if (needle && lowerContent.includes(needle)) {
          findings.push({
            id: `find_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            audit_id: repId,
            content_id: subId,
            category: 'Prohibited Terminology',
            severity: 'critical',
            original_text: rule.value,
            explanation: rule.description || `The term "${rule.value}" violates brand communication policies.`,
            guideline_reference: rule.name || 'Prohibited Brand Terms',
            evidence: `Brand rule states: substitute "${rule.value}" with "${rule.replacement || 'appropriate approved terminology'}"`,
            source_document: primaryDocName,
            source_page: 1,
            suggested_correction: rule.replacement || 'approved terminology',
            confidence: 0.98,
            status: 'open',
            engine: 'Deterministic Rule Engine',
            created_at: new Date().toISOString()
          });
        }
      } else if (rule.rule_type === 'terminology_preferred') {
        const needle = rule.value.toLowerCase();
        if (needle && lowerContent.includes(needle)) {
          findings.push({
            id: `find_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            audit_id: repId,
            content_id: subId,
            category: 'Preferred Terminology',
            severity: 'medium',
            original_text: rule.value,
            explanation: rule.description || `Use "${rule.replacement}" instead of "${rule.value}".`,
            guideline_reference: rule.name || 'Preferred Terminology Guideline',
            evidence: `Brand guideline recommends using "${rule.replacement}".`,
            source_document: primaryDocName,
            source_page: 1,
            suggested_correction: rule.replacement || rule.value,
            confidence: 0.95,
            status: 'open',
            engine: 'Deterministic Rule Engine',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    // Check absolute claims & unverified claims
    if (lowerContent.includes('100%') || lowerContent.includes('guarantee') || lowerContent.includes('guaranteed')) {
      findings.push({
        id: `find_${Date.now()}_abs`,
        audit_id: repId,
        content_id: subId,
        category: 'Regulatory Compliance',
        severity: 'high',
        original_text: 'absolute security/performance claim',
        explanation: 'Absolute certainty statements introduce compliance liability under standard advertising governance.',
        guideline_reference: 'Advertising Claims Governance',
        evidence: 'Never promise 100% or absolute results without third-party audit backing.',
        source_document: primaryDocName,
        source_page: 1,
        suggested_correction: 'enterprise-grade resilient architecture',
        confidence: 0.92,
        status: 'open',
        engine: 'Hybrid RAG + LLM Analyzer',
        created_at: new Date().toISOString()
      });
    }

    // Check mandatory messaging
    const mandatoryRules = rules.filter(r => r.rule_type === 'mandatory_message');
    for (const rule of mandatoryRules) {
      const simplified = rule.value.slice(0, 30).toLowerCase();
      if (!lowerContent.includes(simplified)) {
        findings.push({
          id: `find_${Date.now()}_mand`,
          audit_id: repId,
          content_id: subId,
          category: 'Mandatory Policy',
          severity: 'medium',
          original_text: `[Missing: ${rule.name}]`,
          explanation: `Publications must include required disclaimer: "${rule.value}"`,
          guideline_reference: rule.name || 'Mandatory Disclaimer Policy',
          evidence: `Policy requirement: ${rule.value}`,
          source_document: primaryDocName,
          source_page: 1,
          suggested_correction: `\n\n${rule.value}`,
          confidence: 0.95,
          status: 'open',
          engine: 'Deterministic Rule Engine',
          created_at: new Date().toISOString()
        });
      }
    }

    // Calculate score
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;
    const infoCount = findings.filter(f => f.severity === 'informational').length;

    let score = 100 - (criticalCount * 22 + highCount * 14 + mediumCount * 8 + lowCount * 4);
    if (findings.length === 0) score = 100;
    if (score < 20) score = 25;

    const report: AuditReport = {
      id: repId,
      content_id: subId,
      organisation_id: currentOrg.id,
      overall_score: score,
      total_findings: findings.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      info_count: infoCount,
      findings,
      summary: findings.length === 0
        ? 'High brand alignment. No policy violations or prohibited terminology detected.'
        : `Identified ${findings.length} brand compliance issue${findings.length > 1 ? 's' : ''} (${criticalCount} critical, ${highCount} high). Review suggested corrections before publishing.`,
      processing_time_seconds: 1.15,
      created_at: new Date().toISOString()
    };

    const submission: ContentSubmission = {
      id: subId,
      organisation_id: currentOrg.id,
      title: data.title,
      category: data.category,
      original_content: data.content,
      current_content: data.content,
      content_type: data.content_type || 'text',
      status: score >= 90 ? 'approved' : 'audited',
      submitted_by: user.full_name,
      assigned_reviewer: 'Brand Reviewer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save submission
    const rawSubs = localStorage.getItem(this.submissionsKey);
    const subs: ContentSubmission[] = rawSubs ? JSON.parse(rawSubs) : [];
    subs.unshift(submission);
    localStorage.setItem(this.submissionsKey, JSON.stringify(subs));

    // Save report
    const rawReps = localStorage.getItem(this.reportsKey);
    const reps: AuditReport[] = rawReps ? JSON.parse(rawReps) : [];
    reps.unshift(report);
    localStorage.setItem(this.reportsKey, JSON.stringify(reps));

    return { submission, report };
  }

  public getReport(contentId: string): AuditReport | null {
    const raw = localStorage.getItem(this.reportsKey);
    const all: AuditReport[] = raw ? JSON.parse(raw) : [];
    return all.find(r => r.content_id === contentId) || null;
  }

  public getAllReports(orgId?: string): AuditReport[] {
    const targetOrgId = orgId || this.getCurrentOrg().id;
    const raw = localStorage.getItem(this.reportsKey);
    const all: AuditReport[] = raw ? JSON.parse(raw) : [];
    return all.filter(r => r.organisation_id === targetOrgId);
  }

  // Findings & Corrections
  public updateFinding(contentId: string, findingId: string, status: any, customCorrection?: string): { report: AuditReport; submission: ContentSubmission } | null {
    const rawReps = localStorage.getItem(this.reportsKey);
    const reports: AuditReport[] = rawReps ? JSON.parse(rawReps) : [];
    const rep = reports.find(r => r.content_id === contentId);
    if (!rep) return null;

    const finding = rep.findings.find(f => f.id === findingId);
    if (!finding) return null;

    finding.status = status;

    const submission = this.getSubmission(contentId);
    if (submission) {
      if (status === 'accepted' || status === 'manually_edited') {
        const replacement = customCorrection || finding.suggested_correction;
        if (replacement && finding.original_text && !finding.original_text.startsWith('[')) {
          const regex = new RegExp(finding.original_text, 'gi');
          submission.current_content = submission.current_content.replace(regex, replacement);
        } else if (replacement && finding.original_text.startsWith('[')) {
          if (!submission.current_content.includes(replacement)) {
            submission.current_content = submission.current_content + '\n\n' + replacement;
          }
        }

        // Record revision
        const user = this.getCurrentUser();
        const revisions = this.getRevisions(contentId);
        revisions.unshift({
          id: `rev_${Date.now()}`,
          content_id: contentId,
          finding_id: findingId,
          previous_text: finding.original_text,
          new_text: replacement || '',
          action: status === 'accepted' ? 'correction_accepted' : 'manual_edit',
          performed_by: user.full_name,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(this.revisionsKey, JSON.stringify(revisions));
      }

      // Save updated submission
      const rawSubs = localStorage.getItem(this.submissionsKey);
      const subs: ContentSubmission[] = rawSubs ? JSON.parse(rawSubs) : [];
      const subIdx = subs.findIndex(s => s.id === contentId);
      if (subIdx !== -1) {
        subs[subIdx] = submission;
        localStorage.setItem(this.submissionsKey, JSON.stringify(subs));
      }
    }

    localStorage.setItem(this.reportsKey, JSON.stringify(reports));
    return { report: rep, submission: submission! };
  }

  // Reviews & Approvals
  public submitForReview(contentId: string, reviewerNotes?: string): ContentSubmission | null {
    const rawSubs = localStorage.getItem(this.submissionsKey);
    const subs: ContentSubmission[] = rawSubs ? JSON.parse(rawSubs) : [];
    const subIdx = subs.findIndex(s => s.id === contentId);
    if (subIdx === -1) return null;

    subs[subIdx].status = 'under_review';
    subs[subIdx].updated_at = new Date().toISOString();
    localStorage.setItem(this.submissionsKey, JSON.stringify(subs));

    if (reviewerNotes) {
      this.addComment(contentId, reviewerNotes);
    }

    return subs[subIdx];
  }

  public updateSubmissionStatus(contentId: string, status: any, comment?: string): ContentSubmission | null {
    const rawSubs = localStorage.getItem(this.submissionsKey);
    const subs: ContentSubmission[] = rawSubs ? JSON.parse(rawSubs) : [];
    const subIdx = subs.findIndex(s => s.id === contentId);
    if (subIdx === -1) return null;

    const prev = subs[subIdx].status;
    subs[subIdx].status = status;
    subs[subIdx].updated_at = new Date().toISOString();
    localStorage.setItem(this.submissionsKey, JSON.stringify(subs));

    // Record approval
    const user = this.getCurrentUser();
    const rawApps = localStorage.getItem(this.approvalsKey);
    const apps: ApprovalRecord[] = rawApps ? JSON.parse(rawApps) : [];
    apps.unshift({
      id: `app_${Date.now()}`,
      content_id: contentId,
      reviewer_id: user.id,
      action: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'changes_requested',
      previous_status: prev,
      new_status: status,
      comment: comment || `Status updated to ${status}`,
      created_at: new Date().toISOString(),
      reviewer: user
    });
    localStorage.setItem(this.approvalsKey, JSON.stringify(apps));

    if (comment) {
      this.addComment(contentId, comment);
    }

    return subs[subIdx];
  }

  // Comments
  public getComments(contentId: string): ReviewComment[] {
    const raw = localStorage.getItem(this.commentsKey);
    const all: ReviewComment[] = raw ? JSON.parse(raw) : [];
    return all.filter(c => c.content_id === contentId);
  }

  public addComment(contentId: string, comment: string): ReviewComment {
    const user = this.getCurrentUser();
    const newComment: ReviewComment = {
      id: `com_${Date.now()}`,
      content_id: contentId,
      user_id: user.id,
      comment,
      created_at: new Date().toISOString(),
      user
    };
    const raw = localStorage.getItem(this.commentsKey);
    const all: ReviewComment[] = raw ? JSON.parse(raw) : [];
    all.push(newComment);
    localStorage.setItem(this.commentsKey, JSON.stringify(all));
    return newComment;
  }

  // Approvals & Revisions
  public getApprovalHistory(contentId: string): ApprovalRecord[] {
    const raw = localStorage.getItem(this.approvalsKey);
    const all: ApprovalRecord[] = raw ? JSON.parse(raw) : [];
    return all.filter(a => a.content_id === contentId);
  }

  public getRevisions(contentId: string): RevisionHistory[] {
    const raw = localStorage.getItem(this.revisionsKey);
    const all: RevisionHistory[] = raw ? JSON.parse(raw) : [];
    return all.filter(r => r.content_id === contentId);
  }

  // Analytics
  public getAnalytics(orgId?: string): AnalyticsOverview {
    const reports = this.getAllReports(orgId);
    const subs = this.getSubmissions(orgId);

    const totalAudits = reports.length;
    let totalFindings = 0;
    let sumScore = 0;
    const catMap: Record<string, number> = {};
    const sevMap: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0
    };

    reports.forEach(r => {
      totalFindings += r.total_findings;
      sumScore += r.overall_score;
      r.findings.forEach(f => {
        catMap[f.category] = (catMap[f.category] || 0) + 1;
        sevMap[f.severity] = (sevMap[f.severity] || 0) + 1;
      });
    });

    const approvedCount = subs.filter(s => s.status === 'approved').length;
    const pendingCount = subs.filter(s => s.status === 'under_review').length;
    const avgScore = totalAudits > 0 ? Math.round(sumScore / totalAudits) : 0;

    return {
      total_audits: totalAudits,
      total_findings: totalFindings,
      approved_submissions: approvedCount,
      pending_reviews: pendingCount,
      avg_score: avgScore,
      findings_by_category: catMap,
      findings_by_severity: sevMap,
      recent_audits: reports.slice(0, 5)
    };
  }
}

export const mockStorage = new MockStorage();
