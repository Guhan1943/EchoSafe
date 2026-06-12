import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { logout, setUser } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import LoadingSpinner from '../Common/LoadingSpinner';

interface AuthInitializerProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (token && !user) {
        try {
          const me = await authApi.getMe();
          if (!cancelled) {
            dispatch(setUser(me));
          }
        } catch {
          if (!cancelled) {
            dispatch(logout());
          }
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [dispatch, token, user]);

  if (!ready) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <LoadingSpinner />
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthInitializer;
