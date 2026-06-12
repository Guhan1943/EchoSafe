export interface ArticlesBySeverity {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ArticlesByStatus {
  new: number;
  ai_verified: number;
  pending_manual_review: number;
  approved: number;
  published: number;
  rejected: number;
  under_review: number;
}

export interface OverviewResponse {
  total_articles: number;
  verified_count: number;
  approved_count: number;
  published_count: number;
  avg_trust_score: number;
  verification_success_rate: number;
  articles_by_severity: ArticlesBySeverity;
  articles_by_status: ArticlesByStatus;
}

export interface SourceStats {
  source_id: number;
  name: string;
  article_count: number;
  avg_trust_score: number;
  last_collected: string | null;
}

export interface TrustScoreRange {
  range: string;
  count: number;
}

export interface TrustScoreDistribution {
  distribution: TrustScoreRange[];
  avg: number;
  min: number;
  max: number;
}
