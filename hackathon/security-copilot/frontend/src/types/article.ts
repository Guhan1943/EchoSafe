import type { Approval } from './approval';

export enum ArticleStatus {
  New = 'new',
  AiVerified = 'ai_verified',
  PendingManualReview = 'pending_manual_review',
  Approved = 'approved',
  Published = 'published',
  Rejected = 'rejected',
  UnderReview = 'under_review',
}

export enum ArticleSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info',
}

export interface Article {
  id: number;
  source_id: number | null;
  title: string;
  url: string;
  content: string | null;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  status: ArticleStatus;
  severity: ArticleSeverity | null;
  trust_score: number;
  content_hash: string | null;
}

export interface VerificationResult {
  id: number;
  article_id: number;
  authenticity_score: number;
  credibility_score: number;
  severity: ArticleSeverity | null;
  confidence: 'high' | 'medium' | 'low' | null;
  business_impact: string | null;
  ai_analysis: string | null;
  trust_score_breakdown: Record<string, number> | null;
  cve_references: string[] | null;
  sources_checked: Array<{ name: string; found: boolean }> | null;
  affected_products: string[] | null;
  recommended_actions: string | null;
  verified_at: string;
}

// Re-export Approval so consumers can import from this module
export type { Approval };

export interface GeneratedContentSummary {
  id: number;
  article_id: number;
  content_type: string;
  title: string | null;
  content: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArticleDetail extends Article {
  verification_result: VerificationResult | null;
  approvals: Approval[];
  generated_content: GeneratedContentSummary[];
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  skip: number;
  limit: number;
}

export interface ArticleListParams {
  status?: ArticleStatus;
  severity?: ArticleSeverity;
  source_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}
