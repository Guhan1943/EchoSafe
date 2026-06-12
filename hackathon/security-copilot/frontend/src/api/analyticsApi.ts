import apiClient from './client';
import { OverviewResponse, SourceStats, TrustScoreDistribution } from '../types/analytics';

export const analyticsApi = {
  getOverview: async (): Promise<OverviewResponse> => {
    const response = await apiClient.get<OverviewResponse>('/analytics/overview');
    return response.data;
  },

  getSourceStats: async (): Promise<SourceStats[]> => {
    const response = await apiClient.get<SourceStats[]>('/analytics/sources');
    return response.data;
  },

  getTrustScoreDistribution: async (): Promise<TrustScoreDistribution> => {
    const response = await apiClient.get<TrustScoreDistribution>('/analytics/trust-scores');
    return response.data;
  },
};
