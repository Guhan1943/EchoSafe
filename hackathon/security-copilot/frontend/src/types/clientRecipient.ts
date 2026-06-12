export interface ClientRecipient {
  id: number;
  name: string;
  email: string;
  company: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRecipientCreate {
  name: string;
  email: string;
  company?: string | null;
  is_active?: boolean;
}

export interface ClientRecipientUpdate {
  name?: string;
  email?: string;
  company?: string | null;
  is_active?: boolean;
}

export interface ClientRecipientListResponse {
  items: ClientRecipient[];
  total: number;
}
