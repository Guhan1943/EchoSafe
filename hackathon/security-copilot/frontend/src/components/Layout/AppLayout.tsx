import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth';

const ROLE_COLORS: Record<User['role'], 'error' | 'warning' | 'info'> = {
  admin: 'error',
  analyst: 'warning',
  viewer: 'info',
};

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - permanent on desktop, temporary on mobile */}
      {!isMobile && <Sidebar variant="permanent" />}
      {isMobile && (
        <Sidebar
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      )}

      {/* Main area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ml: isMobile ? 0 : 0,
        }}
      >
        <AppBar
          position="sticky"
          sx={{
            width: '100%',
            zIndex: (t) => t.zIndex.drawer - 1,
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
              Security Intelligence Copilot
            </Typography>

            {user && (
              <>
                <Chip
                  label={user.role.toUpperCase()}
                  color={ROLE_COLORS[user.role]}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', mr: 1 }}
                />

                <Tooltip title={user.full_name ?? user.email}>
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                      }}
                    >
                      {initials}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem disabled>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {user.full_name ?? 'User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem onClick={handleMenuClose}>
                    <AccountCircleIcon sx={{ mr: 1, fontSize: 18 }} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'auto',
            bgcolor: 'background.default',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
