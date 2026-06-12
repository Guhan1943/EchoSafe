import apiClient from './client';
import type {
  GeneratedContent,
  GeneratedContentUpdate,
  PublishedContent,
  PublishHistoryParams,
  PublishHistoryResponse,
} from '../types/content';

export interface GeneratedContentListResponse {
  items: GeneratedContent[];
  total: number;
  skip: number;
  limit: number;
}

export const contentApi = {
  listContent: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<GeneratedContentListResponse> => {
    const response = await apiClient.get<GeneratedContentListResponse>('/content', {
      params,
    });
    return response.data;
  },

  generateContent: async (articleId: number): Promise<GeneratedContent[]> => {
    const response = await apiClient.post<GeneratedContent[]>(
      `/content/by-article/${articleId}/generate`
    );
    return response.data;
  },

  getContent: async (articleId: number): Promise<GeneratedContent[]> => {
    const response = await apiClient.get<GeneratedContent[]>(
      `/content/by-article/${articleId}`
    );
    return response.data;
  },

  updateContent: async (
    contentId: number,
    data: GeneratedContentUpdate
  ): Promise<GeneratedContent> => {
    const response = await apiClient.put<GeneratedContent>(`/content/${contentId}`, data);
    return response.data;
  },

  exportContent: async (contentId: number): Promise<Blob> => {
    const response = await apiClient.get(`/content/${contentId}/export`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  publishContent: async (contentId: number): Promise<PublishedContent> => {
    const response = await apiClient.post<PublishedContent>(
      `/publishing/${contentId}/publish`
    );
    return response.data;
  },

  getPublishHistory: async (
    params?: PublishHistoryParams
  ): Promise<PublishHistoryResponse> => {
    const response = await apiClient.get<PublishHistoryResponse>('/publishing/history', {
      params,
    });
    return response.data;
  },
};
