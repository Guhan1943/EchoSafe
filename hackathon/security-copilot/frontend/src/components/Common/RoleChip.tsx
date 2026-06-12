import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { User } from '../../types/auth';
import { ROLE_CONFIG, softBadgeSx } from '../../styles/badges';

interface RoleChipProps {
  role: User['role'];
  size?: ChipProps['size'];
  showIcon?: boolean;
}

const ROLE_ICONS: Record<User['role'], React.ReactElement> = {
  admin: <AdminPanelSettingsIcon />,
  analyst: <AnalyticsIcon />,
  viewer: <VisibilityIcon />,
};

const RoleChip: React.FC<RoleChipProps> = ({ role, size = 'small', showIcon = true }) => {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    color: '#546e7a',
    bg: '#546e7a18',
  };

  return (
    <Chip
      label={config.label}
      size={size}
      icon={showIcon ? ROLE_ICONS[role] : undefined}
      sx={{
        ...softBadgeSx(config.color),
        '& .MuiChip-icon': {
          color: config.color,
          fontSize: 14,
          ml: 0.75,
        },
      }}
    />
  );
};

export default RoleChip;
