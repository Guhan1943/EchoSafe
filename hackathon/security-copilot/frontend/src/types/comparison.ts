export interface RelatedSourceItem {
  title: string;
  url: string;
  summary: string;
  published_at: string | null;
  relevance_score: number;
  matched_terms: string[];
  is_topical_match: boolean;
}

export interface VendorCompareSource {
  source_id: string;
  name: string;
  site: string;
  tagline: string;
  description: string;
  feed_url: string;
  related: RelatedSourceItem | null;
}

export interface SourceCompareResponse {
  article_id: number;
  article_title: string;
  sources: VendorCompareSource[];
}
