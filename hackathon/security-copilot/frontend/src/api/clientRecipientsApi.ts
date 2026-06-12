import apiClient from './client';
import type {
  ClientRecipient,
  ClientRecipientCreate,
  ClientRecipientListResponse,
  ClientRecipientUpdate,
} from '../types/clientRecipient';

export const clientRecipientsApi = {
  list: async (activeOnly = false): Promise<ClientRecipientListResponse> => {
    const response = await apiClient.get<ClientRecipientListResponse>('/recipients', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  create: async (data: ClientRecipientCreate): Promise<ClientRecipient> => {
    const response = await apiClient.post<ClientRecipient>('/recipients', data);
    return response.data;
  },

  update: async (id: number, data: ClientRecipientUpdate): Promise<ClientRecipient> => {
    const response = await apiClient.put<ClientRecipient>(`/recipients/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/recipients/${id}`);
  },
};
