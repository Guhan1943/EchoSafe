import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import type { RootState } from '../../store';
import type { User } from '../../types/auth';

interface PrivateRouteProps {
  children?: React.ReactNode;
  roles?: Array<User['role']>;
}

const Forbidden: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      gap: 2,
    }}
  >
    <LockIcon sx={{ fontSize: 64, color: 'error.main' }} />
    <Typography variant="h4" fontWeight={700}>
      403 — Forbidden
    </Typography>
    <Typography variant="body1" color="text.secondary">
      You do not have permission to access this page.
    </Typography>
    <Button variant="contained" href="/dashboard">
      Return to Dashboard
    </Button>
  </Box>
);

/**
 * PrivateRoute can be used two ways:
 * 1. As a layout route (no children): renders <Outlet /> when auth passes
 * 2. As a wrapper component (with children): renders children when auth passes
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Forbidden />;
  }

  // Layout route usage — render nested routes via Outlet
  if (!children) {
    return <Outlet />;
  }

  // Wrapper usage — render provided children
  return <>{children}</>;
};

export default PrivateRoute;
