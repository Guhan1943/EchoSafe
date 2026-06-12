import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FeedIcon from '@mui/icons-material/Feed';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ArticleIcon from '@mui/icons-material/Article';
import SourceIcon from '@mui/icons-material/Source';
import BarChartIcon from '@mui/icons-material/BarChart';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import RadarIcon from '@mui/icons-material/Radar';
import HubIcon from '@mui/icons-material/Hub';
import ContactsIcon from '@mui/icons-material/Contacts';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User } from '../../types/auth';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: Array<User['role']>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Intelligence Feed', path: '/intelligence', icon: <FeedIcon /> },
  {
    label: 'Review Queue',
    path: '/review',
    icon: <RateReviewIcon />,
    roles: ['analyst', 'admin'],
  },
  {
    label: 'Content Management',
    path: '/content',
    icon: <ArticleIcon />,
    roles: ['analyst', 'admin'],
  },
  {
    label: 'Publishing Channels',
    path: '/publishing-channels',
    icon: <HubIcon />,
    roles: ['admin'],
  },
  {
    label: 'Client Mails',
    path: '/client-mails',
    icon: <ContactsIcon />,
    roles: ['analyst', 'admin'],
  },
  { label: 'Sources', path: '/sources', icon: <SourceIcon />, roles: ['admin'] },
  { label: 'Analytics', path: '/analytics', icon: <BarChartIcon /> },
  { label: 'Threat Feed', path: '/threats', icon: <BugReportIcon /> },
  { label: 'CTI Dashboard', path: '/threat-dashboard', icon: <RadarIcon /> },
  {
    label: 'Admin Panel',
    path: '/admin',
    icon: <AdminPanelSettingsIcon />,
    roles: ['admin'],
  },
  { label: 'Audit Logs', path: '/audit', icon: <HistoryIcon />, roles: ['admin'] },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  variant?: 'permanent' | 'temporary';
}

const Sidebar: React.FC<SidebarProps> = ({
  open = true,
  onClose,
  variant = 'permanent',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1, px: 2 }}>
        <SecurityIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700} noWrap sx={{ color: 'primary.main' }}>
          EchoSafe
        </Typography>
      </Toolbar>
      <Divider />

      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  onClose?.();
                }}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '& .MuiListItemText-primary': { color: 'white', fontWeight: 600 },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? 'white' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          v1.0.0 MVP
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
