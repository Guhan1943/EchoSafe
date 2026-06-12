import apiClient from './client';
import {
  Article,
  ArticleDetail,
  ArticleListResponse,
  ArticleListParams,
  VerificationResult,
  ArticleStatus,
} from '../types/article';

export const articlesApi = {
  getArticles: async (params: ArticleListParams = {}): Promise<ArticleListResponse> => {
    const response = await apiClient.get<ArticleListResponse>('/articles', { params });
    return response.data;
  },

  getArticle: async (id: number): Promise<ArticleDetail> => {
    const response = await apiClient.get<ArticleDetail>(`/articles/${id}`);
    return response.data;
  },

  verifyArticle: async (id: number): Promise<VerificationResult> => {
    const response = await apiClient.post<VerificationResult>(`/articles/${id}/verify`);
    return response.data;
  },

  updateStatus: async (id: number, status: ArticleStatus): Promise<Article> => {
    const response = await apiClient.put<Article>(`/articles/${id}/status`, { status });
    return response.data;
  },
};
