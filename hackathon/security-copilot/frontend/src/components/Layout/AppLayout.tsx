import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ArticleIcon from '@mui/icons-material/Article';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import RoleChip from '../Common/RoleChip';
import { useAuth } from '../../hooks/useAuth';
import { analyticsApi } from '../../api/analytics';

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    refetchInterval: 60000,
    enabled: Boolean(user),
  });

  const pendingReview =
    (overview?.articles_by_status?.pending_manual_review ?? 0) +
    (overview?.articles_by_status?.under_review ?? 0);

  const newArticles = overview?.articles_by_status?.new ?? 0;

  const notificationItems = [
    pendingReview > 0
      ? {
          id: 'review',
          label: `${pendingReview} article${pendingReview === 1 ? '' : 's'} pending review`,
          path: '/review',
          icon: <RateReviewIcon fontSize="small" />,
        }
      : null,
    newArticles > 0
      ? {
          id: 'new',
          label: `${newArticles} new article${newArticles === 1 ? '' : 's'} collected`,
          path: '/intelligence',
          icon: <ArticleIcon fontSize="small" />,
        }
      : null,
  ].filter(Boolean) as { id: string; label: string; path: string; icon: React.ReactNode }[];

  const notificationCount = pendingReview + newArticles;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleNotificationClick = (path: string) => {
    handleNotifClose();
    navigate(path);
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

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
          elevation={0}
          sx={{
            width: '100%',
            zIndex: (t) => t.zIndex.drawer - 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  letterSpacing: 0.6,
                  display: 'block',
                  lineHeight: 1.3,
                  fontSize: '0.7rem',
                }}
              >
                {today}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
                Security Intelligence
              </Typography>
            </Box>

            {user && (
              <>
                <Tooltip title="Notifications">
                  <IconButton color="inherit" onClick={handleNotifOpen} sx={{ mr: 0.5 }}>
                    <Badge badgeContent={notificationCount} color="error" max={99} invisible={notificationCount === 0}>
                      <NotificationsOutlinedIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={notifAnchorEl}
                  open={Boolean(notifAnchorEl)}
                  onClose={handleNotifClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{ sx: { width: 320, maxWidth: '100%' } }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Notifications
                    </Typography>
                  </Box>
                  <Divider />
                  {notificationItems.length === 0 ? (
                    <MenuItem disabled>
                      <ListItemText primary="No new notifications" secondary="You're all caught up" />
                    </MenuItem>
                  ) : (
                    notificationItems.map((item) => (
                      <MenuItem key={item.id} onClick={() => handleNotificationClick(item.path)}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                      </MenuItem>
                    ))
                  )}
                </Menu>

                <Box sx={{ mr: 1 }}>
                  <RoleChip role={user.role} />
                </Box>

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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {user.full_name ?? 'User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                      <Box sx={{ pt: 0.25 }}>
                        <RoleChip role={user.role} showIcon={false} />
                      </Box>
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
