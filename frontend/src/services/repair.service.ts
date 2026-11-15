import api from './api';
import { SmartRepairRequest, SmartRepairResponse } from '../types';

export const repairService = {
  async generateRepair(payload: SmartRepairRequest): Promise<SmartRepairResponse> {
    const res = await api.post<SmartRepairResponse>('/repair/suggest', payload);
    return res.data;
  },
};
