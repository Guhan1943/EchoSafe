import apiClient from './client';
import type { Approval, ApprovalListResponse, ApprovalListParams } from '../types/approval';

export const approvalsApi = {
  approve: async (articleId: number, notes?: string): Promise<Approval> => {
    const response = await apiClient.post<Approval>(`/approvals/${articleId}/approve`, {
      notes,
    });
    return response.data;
  },

  reject: async (articleId: number, notes?: string): Promise<Approval> => {
    const response = await apiClient.post<Approval>(`/approvals/${articleId}/reject`, {
      notes,
    });
    return response.data;
  },

  underReview: async (articleId: number, notes?: string): Promise<Approval> => {
    const response = await apiClient.post<Approval>(
      `/approvals/${articleId}/under-review`,
      { notes }
    );
    return response.data;
  },

  getApprovals: async (params?: ApprovalListParams): Promise<ApprovalListResponse> => {
    const response = await apiClient.get<ApprovalListResponse>('/approvals', { params });
    return response.data;
  },
};
