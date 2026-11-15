import api from './api';
import { ContentSubmission, ReviewComment, ApprovalRecord } from '../types';
import { mockStorage } from './mockStorage';

export const reviewService = {
  async submitForReview(orgId: string, contentId: string, notes?: string): Promise<ContentSubmission> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/submit-review`, { notes });
      return response.data;
    } catch (error) {
      const sub = mockStorage.submitForReview(contentId, notes);
      if (!sub) throw new Error('Could not submit for review');
      return sub;
    }
  },

  async approveSubmission(orgId: string, contentId: string, comment?: string): Promise<ContentSubmission> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/approve`, { comment });
      return response.data;
    } catch (error) {
      const sub = mockStorage.updateSubmissionStatus(contentId, 'approved', comment);
      if (!sub) throw new Error('Could not approve submission');
      return sub;
    }
  },

  async rejectSubmission(orgId: string, contentId: string, comment?: string): Promise<ContentSubmission> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/reject`, { comment });
      return response.data;
    } catch (error) {
      const sub = mockStorage.updateSubmissionStatus(contentId, 'rejected', comment);
      if (!sub) throw new Error('Could not reject submission');
      return sub;
    }
  },

  async requestChanges(orgId: string, contentId: string, comment: string): Promise<ContentSubmission> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/request-changes`, { comment });
      return response.data;
    } catch (error) {
      const sub = mockStorage.updateSubmissionStatus(contentId, 'changes_requested', comment);
      if (!sub) throw new Error('Could not request changes');
      return sub;
    }
  },

  async getComments(orgId: string, contentId: string): Promise<ReviewComment[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/content/${contentId}/comments`);
      return response.data;
    } catch (error) {
      return mockStorage.getComments(contentId);
    }
  },

  async addComment(orgId: string, contentId: string, comment: string): Promise<ReviewComment> {
    try {
      const response = await api.post(`/organisations/${orgId}/content/${contentId}/comments`, { comment });
      return response.data;
    } catch (error) {
      return mockStorage.addComment(contentId, comment);
    }
  },

  async getApprovalHistory(orgId: string, contentId: string): Promise<ApprovalRecord[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/content/${contentId}/approvals`);
      return response.data;
    } catch (error) {
      return mockStorage.getApprovalHistory(contentId);
    }
  }
};
