import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AlertColor } from '@mui/material';

export interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  open: boolean;
}

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (
      state,
      action: PayloadAction<{ message: string; severity: AlertColor }>
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      state.notifications.push({
        id,
        message: action.payload.message,
        severity: action.payload.severity,
        open: true,
      });
    },
    hideNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.open = false;
      }
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;

// Helper action creators
export const showSuccess = (message: string) =>
  showNotification({ message, severity: 'success' });

export const showError = (message: string) =>
  showNotification({ message, severity: 'error' });

export const showWarning = (message: string) =>
  showNotification({ message, severity: 'warning' });

export default notificationSlice.reducer;
