import apiClient from './client';

export interface BlogPostSummary {
  id: number;
  generated_content_id: number;
  article_id: number;
  title: string;
  excerpt: string;
  content_type: string;
  content_type_label: string;
  severity: string | null;
  image_url: string | null;
  published_at: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string;
  article_title: string | null;
  article_summary: string | null;
  trust_score: number | null;
}

export interface BlogPostListResponse {
  items: BlogPostSummary[];
  total: number;
}

export const blogApi = {
  listPosts: async (params?: { skip?: number; limit?: number }): Promise<BlogPostListResponse> => {
    const response = await apiClient.get<BlogPostListResponse>('/publishing/blog', { params });
    return response.data;
  },

  getPost: async (publishedId: number): Promise<BlogPostDetail> => {
    const response = await apiClient.get<BlogPostDetail>(`/publishing/blog/${publishedId}`);
    return response.data;
  },
};
