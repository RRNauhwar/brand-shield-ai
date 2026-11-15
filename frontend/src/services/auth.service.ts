import api from './api';
import { User } from '../types';
import { mockStorage, DEFAULT_USER } from './mockStorage';

export interface AuthResponse {
  user: User;
  access_token: string;
}

export const authService = {
  async register(email: string, password: string, fullName: string, orgName?: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        org_name: orgName
      });
      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      return response.data;
    } catch (error) {
      // Clean fallback implementation
      const user: User = {
        id: `usr_${Date.now()}`,
        email,
        full_name: fullName || email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName || email)}`
      };
      mockStorage.setCurrentUser(user);
      if (orgName) {
        mockStorage.createOrganisation(orgName);
      }
      const token = `token_${Date.now()}`;
      localStorage.setItem('access_token', token);
      return { user, access_token: token };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      return response.data;
    } catch (error) {
      // Seamless clean login fallback
      let user = mockStorage.getCurrentUser();
      if (!user || user.email !== email) {
        const namePart = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Brand Lead';
        user = {
          id: `usr_${Date.now()}`,
          email,
          full_name: namePart,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(namePart)}`
        };
        mockStorage.setCurrentUser(user);
        const domain = email.split('@')[1]?.split('.')[0];
        const orgName = domain ? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Brand Workspace` : 'My Brand Workspace';
        const org = mockStorage.createOrganisation(orgName);
        mockStorage.setCurrentOrg(org);
      }
      const token = `token_${Date.now()}`;
      localStorage.setItem('access_token', token);
      return { user, access_token: token };
    }
  },

  async demoLogin(): Promise<AuthResponse> {
    const token = 'demo-token-novatech';
    localStorage.setItem('access_token', token);
    try {
      await api.post('/demo/setup');
      const orgsRes = await api.get('/organisations');
      if (orgsRes.data && orgsRes.data.length > 0) {
        mockStorage.setCurrentOrg(orgsRes.data[0]);
      }
    } catch (e) {
      // Ignore if offline
    }
    const user = mockStorage.getCurrentUser() || DEFAULT_USER;
    return {
      user,
      access_token: token,
    };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
    }
  },

  async getProfile(): Promise<User> {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      return mockStorage.getCurrentUser();
    }
  }
};
