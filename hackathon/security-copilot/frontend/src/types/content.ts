export enum ContentType {
  ExecutiveBrief = 'executive_brief',
  CustomerAdvisory = 'customer_advisory',
  TechnicalAnalysis = 'technical_analysis',
  Newsletter = 'newsletter',
  SocialMedia = 'social_media',
}

export interface GeneratedContent {
  id: number;
  article_id: number;
  content_type: ContentType;
  title: string | null;
  content: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedContentUpdate {
  title?: string;
  content?: string;
}

export interface PublishedContent {
  id: number;
  generated_content_id: number;
  article_id: number;
  published_by: number | null;
  platform: string;
  status: string;
  published_at: string;
}

export interface PublishHistoryParams {
  skip?: number;
  limit?: number;
}

export interface PublishHistoryResponse {
  items: PublishedContent[];
  total: number;
}
