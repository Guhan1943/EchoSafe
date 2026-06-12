import apiClient from './client';
import type { Source, SourceCreate, SourceUpdate, CollectResult } from '../types/source';

export const sourcesApi = {
  getSources: async (isActive?: boolean): Promise<Source[]> => {
    const params: Record<string, unknown> = {};
    if (isActive !== undefined) {
      params.is_active = isActive;
    }
    const response = await apiClient.get<Source[]>('/sources', { params });
    return response.data;
  },

  createSource: async (data: SourceCreate): Promise<Source> => {
    const response = await apiClient.post<Source>('/sources', data);
    return response.data;
  },

  getSource: async (id: number): Promise<Source> => {
    const response = await apiClient.get<Source>(`/sources/${id}`);
    return response.data;
  },

  updateSource: async (id: number, data: SourceUpdate): Promise<Source> => {
    const response = await apiClient.put<Source>(`/sources/${id}`, data);
    return response.data;
  },

  deleteSource: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/sources/${id}`);
    return response.data;
  },

  collectSource: async (id: number): Promise<CollectResult> => {
    const response = await apiClient.post<CollectResult>(`/sources/${id}/collect`);
    return response.data;
  },
};
