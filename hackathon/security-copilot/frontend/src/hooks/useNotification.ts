import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { showSuccess, showError, showWarning } from '../store/notificationSlice';

interface UseNotificationReturn {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
}

export function useNotification(): UseNotificationReturn {
  const dispatch = useDispatch<AppDispatch>();

  return {
    showSuccess: (message: string) => dispatch(showSuccess(message)),
    showError: (message: string) => dispatch(showError(message)),
    showWarning: (message: string) => dispatch(showWarning(message)),
  };
}
