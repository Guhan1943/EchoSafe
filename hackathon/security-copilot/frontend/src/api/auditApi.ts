import apiClient from './client';
import { AuditLogListResponse, AuditLogParams } from '../types/audit';

export const auditApi = {
  getAuditLogs: async (params: AuditLogParams = {}): Promise<AuditLogListResponse> => {
    const response = await apiClient.get<AuditLogListResponse>('/audit', { params });
    return response.data;
  },
};
