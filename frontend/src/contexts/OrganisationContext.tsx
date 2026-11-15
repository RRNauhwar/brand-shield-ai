import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Organisation, OrganisationMember } from '../types';
import { organisationService } from '../services/organisation.service';
import { mockStorage } from '../services/mockStorage';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface OrganisationContextType {
  organisations: Organisation[];
  currentOrg: Organisation | null;
  members: OrganisationMember[];
  userRole: 'admin' | 'creator' | 'reviewer';
  isDemo: boolean;
  isLoading: boolean;
  selectOrg: (orgId: string) => void;
  createOrg: (name: string, description?: string) => Promise<Organisation>;
  updateOrg: (updates: Partial<Organisation>) => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshOrgs: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrgs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const orgs = await organisationService.getOrganisations();
      setOrganisations(orgs);
      
      // Select stored or default
      const stored = mockStorage.getCurrentOrg();
      const matched = orgs.find(o => o.id === stored?.id) || orgs[0] || stored || null;
      setCurrentOrg(matched);
      if (matched) {
        mockStorage.setCurrentOrg(matched);
      }

      if (matched) {
        const mems = await organisationService.getMembers(matched.id);
        setMembers(mems);
      }
    } catch (error) {
      console.error('Error fetching orgs', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrgs();
    } else {
      setOrganisations([]);
      setCurrentOrg(null);
      setMembers([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchOrgs]);

  const selectOrg = async (orgId: string) => {
    const found = organisations.find(o => o.id === orgId);
    if (found) {
      setCurrentOrg(found);
      mockStorage.setCurrentOrg(found);
      try {
        const mems = await organisationService.getMembers(found.id);
        setMembers(mems);
      } catch (err) {
        setMembers(mockStorage.getMembers(found.id));
      }
      toast.success(`Switched to ${found.name}`);
    }
  };

  const createOrg = async (name: string, description?: string) => {
    setIsLoading(true);
    try {
      const newOrg = await organisationService.createOrganisation(name, description);
      setOrganisations(prev => [...prev, newOrg]);
      setCurrentOrg(newOrg);
      mockStorage.setCurrentOrg(newOrg);
      const mems = await organisationService.getMembers(newOrg.id);
      setMembers(mems);
      toast.success(`Created organisation "${name}"`);
      return newOrg;
    } catch (err: any) {
      toast.error('Failed to create organisation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrg = async (updates: Partial<Organisation>) => {
    if (!currentOrg) return;
    try {
      const updated = await organisationService.updateOrganisation(currentOrg.id, updates);
      setCurrentOrg(updated);
      setOrganisations(prev => prev.map(o => (o.id === updated.id ? updated : o)));
      toast.success('Organisation settings updated');
    } catch (err) {
      toast.error('Could not update organisation');
    }
  };

  const refreshMembers = async () => {
    if (!currentOrg) return;
    try {
      const mems = await organisationService.getMembers(currentOrg.id);
      setMembers(mems);
    } catch (err) {
      setMembers(mockStorage.getMembers(currentOrg.id));
    }
  };

  // Determine role of current user in currentOrg
  const currentMember = members.find(m => m.user_id === user?.id || m.user?.email === user?.email);
  const userRole: 'admin' | 'creator' | 'reviewer' = currentMember?.role || 'admin';
  const isDemo = currentOrg?.is_demo || false;

  return (
    <OrganisationContext.Provider
      value={{
        organisations,
        currentOrg,
        members,
        userRole,
        isDemo,
        isLoading,
        selectOrg,
        createOrg,
        updateOrg,
        refreshMembers,
        refreshOrgs: fetchOrgs
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};
