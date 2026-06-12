import apiClient from './client';
import type { TokenResponse, User } from '../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const response = await apiClient.post<TokenResponse>('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
