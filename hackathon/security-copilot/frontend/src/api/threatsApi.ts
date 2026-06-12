import apiClient from './client';
import type {
  CollectorRunRequest,
  CollectorRunResponse,
  ThreatEventDetail,
  ThreatEventListResponse,
  ThreatStats,
} from '../types/threat';

export interface ThreatFilters {
  status?: string;
  severity?: string;
  source_adapter?: string;
  confidence_level?: string;
  is_duplicate?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export const threatsApi = {
  listThreats: async (params: ThreatFilters = {}): Promise<ThreatEventListResponse> => {
    const response = await apiClient.get<ThreatEventListResponse>('/threats', { params });
    return response.data;
  },

  getThreat: async (id: number): Promise<ThreatEventDetail> => {
    const response = await apiClient.get<ThreatEventDetail>(`/threats/${id}`);
    return response.data;
  },

  searchThreats: async (q: string, params: { skip?: number; limit?: number } = {}): Promise<ThreatEventListResponse> => {
    const response = await apiClient.get<ThreatEventListResponse>('/threats/search', {
      params: { q, ...params },
    });
    return response.data;
  },

  getHighRisk: async (params: { min_risk?: number; limit?: number } = {}): Promise<ThreatEventDetail[]> => {
    const response = await apiClient.get<ThreatEventDetail[]>('/threats/high-risk', { params });
    return response.data;
  },

  getTrending: async (params: { hours?: number; limit?: number } = {}): Promise<ThreatEventDetail[]> => {
    const response = await apiClient.get<ThreatEventDetail[]>('/threats/trending', { params });
    return response.data;
  },

  getStats: async (): Promise<ThreatStats> => {
    const response = await apiClient.get<ThreatStats>('/threats/stats');
    return response.data;
  },

  runCollectors: async (body: CollectorRunRequest = {}): Promise<CollectorRunResponse> => {
    const response = await apiClient.post<CollectorRunResponse>('/collectors/run', body);
    return response.data;
  },

  getCollectorHealth: async (): Promise<unknown[]> => {
    const response = await apiClient.get('/collectors/health');
    return response.data;
  },

  listAdapters: async (): Promise<unknown[]> => {
    const response = await apiClient.get('/collectors/adapters');
    return response.data;
  },
};
