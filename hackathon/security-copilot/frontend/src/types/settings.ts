export interface Setting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  updated_by: number | null;
  updated_at: string;
}

export interface SettingUpdate {
  value: string;
}
