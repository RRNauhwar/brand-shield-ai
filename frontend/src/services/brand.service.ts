import api from './api';
import { BrandDocument, BrandRule, BrandAsset } from '../types';
import { mockStorage } from './mockStorage';

export const brandService = {
  // Documents
  async getDocuments(orgId: string): Promise<BrandDocument[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/documents`);
      return response.data;
    } catch (error) {
      return mockStorage.getDocuments(orgId);
    }
  },

  async uploadDocument(orgId: string, file: File): Promise<BrandDocument> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/organisations/${orgId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return mockStorage.addDocument(file);
    }
  },

  async deleteDocument(orgId: string, docId: string): Promise<void> {
    try {
      await api.delete(`/organisations/${orgId}/documents/${docId}`);
    } catch (error) {
      mockStorage.deleteDocument(docId);
    }
  },

  // Rules
  async getRules(orgId: string): Promise<BrandRule[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/rules`);
      return response.data;
    } catch (error) {
      return mockStorage.getRules(orgId);
    }
  },

  async createRule(orgId: string, rule: Omit<BrandRule, 'id' | 'organisation_id' | 'created_at'>): Promise<BrandRule> {
    try {
      const response = await api.post(`/organisations/${orgId}/rules`, rule);
      return response.data;
    } catch (error) {
      return mockStorage.createRule(rule);
    }
  },

  async updateRule(orgId: string, ruleId: string, updates: Partial<BrandRule>): Promise<BrandRule> {
    try {
      const response = await api.patch(`/organisations/${orgId}/rules/${ruleId}`, updates);
      return response.data;
    } catch (error) {
      const updated = mockStorage.updateRule(ruleId, updates);
      if (!updated) throw new Error('Rule not found');
      return updated;
    }
  },

  async deleteRule(orgId: string, ruleId: string): Promise<void> {
    try {
      await api.delete(`/organisations/${orgId}/rules/${ruleId}`);
    } catch (error) {
      mockStorage.deleteRule(ruleId);
    }
  },

  // Assets
  async getAssets(orgId: string): Promise<BrandAsset[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/assets`);
      return response.data;
    } catch (error) {
      return mockStorage.getAssets(orgId);
    }
  },

  async uploadAsset(orgId: string, asset: Omit<BrandAsset, 'id' | 'organisation_id' | 'created_at'>): Promise<BrandAsset> {
    try {
      const response = await api.post(`/organisations/${orgId}/assets`, asset);
      return response.data;
    } catch (error) {
      return mockStorage.createAsset(asset);
    }
  },

  async deleteAsset(orgId: string, assetId: string): Promise<void> {
    try {
      await api.delete(`/organisations/${orgId}/assets/${assetId}`);
    } catch (error) {
      mockStorage.deleteAsset(assetId);
    }
  }
};
