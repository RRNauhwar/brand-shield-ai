import api from './api';
import { ContentSubmission, ContentCategory } from '../types';
import { mockStorage } from './mockStorage';

export interface SubmitContentPayload {
  title: string;
  category: ContentCategory;
  content: string;
  content_type?: 'text' | 'pdf' | 'docx' | 'image';
  file?: File;
}

export const contentService = {
  async listSubmissions(orgId: string): Promise<ContentSubmission[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/content`);
      return response.data;
    } catch (error) {
      return mockStorage.getSubmissions(orgId);
    }
  },

  async getSubmission(orgId: string, contentId: string): Promise<ContentSubmission> {
    try {
      const response = await api.get(`/organisations/${orgId}/content/${contentId}`);
      return response.data;
    } catch (error) {
      const sub = mockStorage.getSubmission(contentId);
      if (!sub) throw new Error('Submission not found');
      return sub;
    }
  },

  async submitContent(orgId: string, payload: SubmitContentPayload): Promise<{ submission: ContentSubmission; reportId?: string }> {
    try {
      const response = await api.post(`/organisations/${orgId}/content`, payload);
      return response.data;
    } catch (error) {
      const result = mockStorage.createSubmission({
        title: payload.title,
        category: payload.category,
        content: payload.content,
        content_type: payload.content_type || 'text'
      });
      return {
        submission: result.submission,
        reportId: result.report.id
      };
    }
  },

  async updateContent(orgId: string, contentId: string, content: string): Promise<ContentSubmission> {
    try {
      const response = await api.patch(`/organisations/${orgId}/content/${contentId}`, { content });
      return response.data;
    } catch (error) {
      const sub = mockStorage.getSubmission(contentId);
      if (sub) {
        sub.current_content = content;
        sub.updated_at = new Date().toISOString();
        return sub;
      }
      throw new Error('Submission not found');
    }
  }
};
