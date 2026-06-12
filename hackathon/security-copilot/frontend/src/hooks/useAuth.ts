import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setCredentials, logout as logoutAction, setLoading } from '../store/authSlice';
import { authApi } from '../api/auth';
import type { User } from '../types/auth';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  const login = async (email: string, password: string): Promise<void> => {
    dispatch(setLoading(true));
    try {
      const tokenResponse = await authApi.login(email, password);
      dispatch(
        setCredentials({
          user: tokenResponse.user,
          token: tokenResponse.access_token,
        })
      );
      navigate('/');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logout = (): void => {
    dispatch(logoutAction());
    navigate('/login');
  };

  return { user, isAuthenticated, isLoading, login, logout };
}
