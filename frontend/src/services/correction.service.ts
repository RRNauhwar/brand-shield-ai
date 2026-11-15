import api from './api';
import { FindingStatus, RevisionHistory, AuditReport, ContentSubmission } from '../types';
import { mockStorage } from './mockStorage';

export const correctionService = {
  async updateFindingStatus(
    orgId: string,
    contentId: string,
    findingId: string,
    status: FindingStatus,
    customCorrection?: string
  ): Promise<{ report: AuditReport; submission: ContentSubmission }> {
    try {
      const response = await api.patch(
        `/organisations/${orgId}/content/${contentId}/findings/${findingId}`,
        { status, custom_correction: customCorrection }
      );
      return response.data;
    } catch (error) {
      const result = mockStorage.updateFinding(contentId, findingId, status, customCorrection);
      if (!result) throw new Error('Could not update finding');
      return result;
    }
  },

  async getRevisionHistory(orgId: string, contentId: string): Promise<RevisionHistory[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/content/${contentId}/revisions`);
      return response.data;
    } catch (error) {
      return mockStorage.getRevisions(contentId);
    }
  }
};
