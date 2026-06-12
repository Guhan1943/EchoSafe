export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
}

export interface AuditLogParams {
  user_id?: number;
  action?: string;
  resource_type?: string;
  skip?: number;
  limit?: number;
}
