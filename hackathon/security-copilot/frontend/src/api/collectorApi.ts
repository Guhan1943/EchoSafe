import apiClient from './client';

export interface CollectorStatus {
  sources: Array<{
    id: number;
    name: string;
    last_polled: string | null;
    next_poll: string | null;
  }>;
}

export const collectorApi = {
  collectAll: async (): Promise<{ message: string; sources_processed: number }> => {
    const response = await apiClient.post<{ message: string; sources_processed: number }>('/collector/collect-all');
    return response.data;
  },

  getStatus: async (): Promise<CollectorStatus> => {
    const response = await apiClient.get<CollectorStatus>('/collector/status');
    return response.data;
  },
};
