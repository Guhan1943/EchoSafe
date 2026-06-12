import apiClient from './client';

export type EncryptionType = 'TLS' | 'SSL' | 'STARTTLS' | 'NONE';

export interface EmailConnectPayload {
  smtp_host: string;
  smtp_port: number;
  username: string;
  password: string;
  sender_email: string;
  sender_name: string;
  encryption: EncryptionType;
}

export interface EmailStatus {
  connected: boolean;
  smtp_host?: string;
  smtp_port?: number;
  username?: string;
  sender_email?: string;
  sender_name?: string;
  encryption?: string;
  connected_at?: string;
}

export interface LinkedInConnectPayload {
  access_token: string;
  author_urn: string;
}

export interface LinkedInStatus {
  connected: boolean;
  author_urn?: string;
  profile_name?: string;
  connected_at?: string;
}

export interface ChannelSummary {
  channel_type: string;
  connected: boolean;
  connected_at?: string;
}

export const channelsApi = {
  list: async (): Promise<ChannelSummary[]> => {
    const response = await apiClient.get<ChannelSummary[]>('/channels/');
    return response.data;
  },

  testEmail: async (payload: EmailConnectPayload): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/channels/email/test', payload);
    return response.data;
  },

  connectEmail: async (payload: EmailConnectPayload): Promise<EmailStatus> => {
    const response = await apiClient.post<EmailStatus>('/channels/email/connect', payload);
    return response.data;
  },

  emailStatus: async (): Promise<EmailStatus> => {
    const response = await apiClient.get<EmailStatus>('/channels/email/status');
    return response.data;
  },

  disconnectEmail: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/channels/email/disconnect');
    return response.data;
  },

  connectMailpit: async (): Promise<EmailStatus> => {
    const response = await apiClient.post<EmailStatus>('/channels/email/connect-mailpit');
    return response.data;
  },

  connectLinkedIn: async (payload: LinkedInConnectPayload): Promise<LinkedInStatus> => {
    const response = await apiClient.post<LinkedInStatus>('/channels/linkedin/connect', payload);
    return response.data;
  },

  getLinkedInOAuthUrl: async (): Promise<{ authorization_url: string }> => {
    const response = await apiClient.get<{ authorization_url: string }>('/channels/linkedin/oauth/url');
    return response.data;
  },

  linkedInStatus: async (): Promise<LinkedInStatus> => {
    const response = await apiClient.get<LinkedInStatus>('/channels/linkedin/status');
    return response.data;
  },

  disconnectLinkedIn: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/channels/linkedin/disconnect');
    return response.data;
  },
};
