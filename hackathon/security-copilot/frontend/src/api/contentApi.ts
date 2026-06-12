import apiClient from './client';
import {
  GeneratedContent,
  GeneratedContentUpdate,
  PublishedContent,
  PublishHistoryResponse,
  PublishHistoryParams,
} from '../types/content';

export const contentApi = {
  generateContent: async (articleId: number): Promise<GeneratedContent[]> => {
    const response = await apiClient.post<GeneratedContent[]>(
      `/content/by-article/${articleId}/generate`
    );
    return response.data;
  },

  getContentForArticle: async (articleId: number): Promise<GeneratedContent[]> => {
    const response = await apiClient.get<GeneratedContent[]>(
      `/content/by-article/${articleId}`
    );
    return response.data;
  },

  updateContent: async (contentId: number, data: GeneratedContentUpdate): Promise<GeneratedContent> => {
    const response = await apiClient.put<GeneratedContent>(`/content/${contentId}`, data);
    return response.data;
  },

  exportContent: async (contentId: number): Promise<Blob> => {
    const response = await apiClient.get(`/content/${contentId}/export`, { responseType: 'blob' });
    return response.data;
  },

  publishContent: async (contentId: number, data?: { recipients?: string[] }): Promise<PublishedContent> => {
    const response = await apiClient.post<PublishedContent>(`/publishing/${contentId}/publish`, data ?? {});
    return response.data;
  },

  getPublishHistory: async (params: PublishHistoryParams = {}): Promise<PublishHistoryResponse> => {
    const response = await apiClient.get<PublishHistoryResponse>('/publishing/history', { params });
    return response.data;
  },
};
