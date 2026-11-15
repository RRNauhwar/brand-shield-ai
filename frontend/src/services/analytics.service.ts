import api from './api';
import { AnalyticsOverview, ViolationStats } from '../types';
import { mockStorage } from './mockStorage';

export const analyticsService = {
  async getOverview(orgId: string): Promise<AnalyticsOverview> {
    try {
      const response = await api.get(`/organisations/${orgId}/analytics/overview`);
      return response.data;
    } catch (error) {
      return mockStorage.getAnalytics(orgId);
    }
  },

  async getViolations(orgId: string): Promise<ViolationStats[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/analytics/violations`);
      return response.data;
    } catch (error) {
      const overview = mockStorage.getAnalytics(orgId);
      return Object.entries(overview.findings_by_category).map(([category, count]) => ({
        category,
        count,
        severity_breakdown: overview.findings_by_severity
      }));
    }
  }
};
