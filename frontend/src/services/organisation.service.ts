import api from './api';
import { Organisation, OrganisationMember } from '../types';
import { mockStorage } from './mockStorage';

export const organisationService = {
  async getOrganisations(): Promise<Organisation[]> {
    try {
      const response = await api.get('/organisations');
      return response.data;
    } catch (error) {
      return mockStorage.getOrganisations();
    }
  },

  async getOrganisation(id: string): Promise<Organisation> {
    try {
      const response = await api.get(`/organisations/${id}`);
      return response.data;
    } catch (error) {
      const orgs = mockStorage.getOrganisations();
      return orgs.find(o => o.id === id) || mockStorage.getCurrentOrg();
    }
  },

  async createOrganisation(name: string, description?: string): Promise<Organisation> {
    try {
      const response = await api.post('/organisations', { name, description });
      return response.data;
    } catch (error) {
      return mockStorage.createOrganisation(name, description);
    }
  },

  async updateOrganisation(id: string, data: Partial<Organisation>): Promise<Organisation> {
    try {
      const response = await api.patch(`/organisations/${id}`, data);
      return response.data;
    } catch (error) {
      return mockStorage.updateOrganisation(id, data);
    }
  },

  async getMembers(orgId: string): Promise<OrganisationMember[]> {
    try {
      const response = await api.get(`/organisations/${orgId}/members`);
      return response.data;
    } catch (error) {
      return mockStorage.getMembers(orgId);
    }
  },

  async inviteMember(orgId: string, email: string, role: 'admin' | 'creator' | 'reviewer'): Promise<OrganisationMember> {
    try {
      const response = await api.post(`/organisations/${orgId}/members`, { email, role });
      return response.data;
    } catch (error) {
      return mockStorage.inviteMember(email, role);
    }
  },

  async updateMemberRole(orgId: string, memberId: string, role: 'admin' | 'creator' | 'reviewer'): Promise<OrganisationMember> {
    try {
      const response = await api.patch(`/organisations/${orgId}/members/${memberId}`, { role });
      return response.data;
    } catch (error) {
      const updated = mockStorage.updateMemberRole(memberId, role);
      if (!updated) throw new Error('Member not found');
      return updated;
    }
  },

  async removeMember(orgId: string, memberId: string): Promise<void> {
    try {
      await api.delete(`/organisations/${orgId}/members/${memberId}`);
    } catch (error) {
      mockStorage.removeMember(memberId);
    }
  }
};
