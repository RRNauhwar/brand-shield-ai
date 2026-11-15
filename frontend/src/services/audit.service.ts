import api from './api';
import { AuditReport } from '../types';
import { mockStorage } from './mockStorage';

export const auditService = {
  async runAudit(orgId: string, contentId: string): Promise<AuditReport> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/audit`);
      return response.data;
    } catch (error) {
      const report = mockStorage.getReport(contentId);
      if (report) return report;
      // If none, run on current submission
      const sub = mockStorage.getSubmission(contentId);
      if (sub) {
        const res = mockStorage.createSubmission({
          title: sub.title,
          category: sub.category,
          content: sub.current_content,
          content_type: sub.content_type
        });
        return res.report;
      }
      throw new Error('Audit report could not be generated');
    }
  },

  async getAuditReport(orgId: string, contentId: string): Promise<AuditReport> {
    try {
      const response = await api.get(`/organisations/${orgId}/content/${contentId}/report`);
      return response.data;
    } catch (error) {
      const report = mockStorage.getReport(contentId);
      if (report) return report;
      throw new Error('Report not found');
    }
  },

  async getAuditHistory(orgId: string): Promise<AuditReport[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/audits`);
      return response.data;
    } catch (error) {
      return mockStorage.getAllReports(orgId);
    }
  }
};
