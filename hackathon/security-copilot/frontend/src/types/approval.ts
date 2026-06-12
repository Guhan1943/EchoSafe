export interface Approval {
  id: number;
  article_id: number;
  analyst_id: number | null;
  action: 'approved' | 'rejected' | 'under_review';
  notes: string | null;
  created_at: string;
}

export interface ApprovalListResponse {
  items: Approval[];
  total: number;
}

export interface ApprovalListParams {
  article_id?: number;
  skip?: number;
  limit?: number;
}
