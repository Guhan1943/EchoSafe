import apiClient from './client';
import { User } from '../types/auth';

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string;
  role?: 'admin' | 'analyst' | 'viewer';
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'analyst' | 'viewer';
  is_active?: boolean;
}

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  updateUser: async (id: number, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },
};
