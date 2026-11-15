import api from './api';
import { Campaign, CampaignAsset } from '../types';

export interface CreateCampaignData {
  name: string;
  brief?: string;
  target_audience?: string;
  objective?: string;
  channels: string[];
  assets?: Array<{
    title: string;
    channel: string;
    content: string;
    asset_type: 'text' | 'image';
    file_url?: string;
  }>;
}

export const campaignService = {
  async listCampaigns(orgId: string): Promise<Campaign[]> {
    const res = await api.get<Campaign[]>(`/campaigns?org_id=${orgId}`);
    return res.data;
  },

  async getCampaign(orgId: string, campaignId: string): Promise<Campaign> {
    const res = await api.get<Campaign>(`/campaigns/${campaignId}?org_id=${orgId}`);
    return res.data;
  },

  async createCampaign(orgId: string, data: CreateCampaignData): Promise<Campaign> {
    const res = await api.post<Campaign>(`/campaigns?org_id=${orgId}`, data);
    return res.data;
  },

  async addAsset(
    orgId: string,
    campaignId: string,
    asset: {
      title: string;
      channel: string;
      content: string;
      asset_type: 'text' | 'image';
      file_url?: string;
    }
  ): Promise<CampaignAsset> {
    const res = await api.post<CampaignAsset>(`/campaigns/${campaignId}/assets?org_id=${orgId}`, asset);
    return res.data;
  },

  async runCampaignAudit(orgId: string, campaignId: string): Promise<Campaign> {
    const res = await api.post<Campaign>(`/campaigns/${campaignId}/audit?org_id=${orgId}`);
    return res.data;
  },
};
