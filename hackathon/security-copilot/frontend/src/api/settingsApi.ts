import apiClient from './client';
import { Setting, SettingUpdate } from '../types/settings';

export const settingsApi = {
  getSettings: async (): Promise<Setting[]> => {
    const response = await apiClient.get<Setting[]>('/settings');
    return response.data;
  },

  updateSetting: async (key: string, data: SettingUpdate): Promise<Setting> => {
    const response = await apiClient.put<Setting>(`/settings/${key}`, data);
    return response.data;
  },
};
