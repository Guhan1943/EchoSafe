export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | null;
export type ConfidenceLevel = 'verified' | 'high' | 'medium' | 'low';
export type ThreatStatus = 'new' | 'processing' | 'verified' | 'rejected';

export interface ThreatEntity {
  id: number;
  entity_type: 'cve' | 'vendor' | 'product' | 'vulnerability_type' | 'threat_indicator';
  value: string;
  confidence: number;
}

export interface RiskAssessment {
  risk_score: number;
  severity: string;
  cvss_score: number | null;
  exploit_available: boolean;
  public_poc: boolean;
  vendor_confirmed: boolean;
  mention_velocity: number;
  reasons: string[];
  assessed_at: string;
}

export interface ThreatEvent {
  id: number;
  external_id: string;
  source_adapter: string;
  source_type: string;
  title: string;
  description: string | null;
  url: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  status: ThreatStatus;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  risk_score: number;
  severity: ThreatSeverity;
  is_duplicate: boolean;
}

export interface ThreatEventDetail extends ThreatEvent {
  confidence_reasoning: string[] | null;
  entities: ThreatEntity[];
  risk_assessment: RiskAssessment | null;
  duplicate_of_id: number | null;
  related_events: { event_id: number; similarity: number }[];
}

export interface ThreatEventListResponse {
  items: ThreatEvent[];
  total: number;
  skip: number;
  limit: number;
}

export interface ThreatStats {
  total: number;
  duplicates: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  by_confidence: Record<string, number>;
}

export interface CollectorRunRequest {
  adapters?: string[] | null;
}

export interface CollectorRunResponse {
  started_at: string;
  finished_at: string | null;
  total_collected: number;
  total_inserted: number;
  total_duplicates: number;
  total_errors: number;
  adapters: Array<{
    adapter: string;
    collected: number;
    inserted: number;
    duplicates: number;
    errors: number;
    health?: Record<string, unknown>;
    error?: string;
  }>;
}
