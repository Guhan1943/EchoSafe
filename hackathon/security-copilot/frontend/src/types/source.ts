export type SourceType = 'rss_feed' | 'news_site' | 'vendor_blog' | 'threat_feed';

export interface Source {
  id: number;
  name: string;
  url: string;
  source_type: SourceType;
  is_active: boolean;
  polling_interval_minutes: number;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceCreate {
  name: string;
  url: string;
  source_type: SourceType;
  is_active?: boolean;
  polling_interval_minutes?: number;
}

export interface SourceUpdate {
  name?: string;
  url?: string;
  source_type?: SourceType;
  is_active?: boolean;
  polling_interval_minutes?: number;
}

export interface CollectResult {
  message: string;
  collected: number;
  errors: number;
}
