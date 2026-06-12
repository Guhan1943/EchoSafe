import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { ArticleStatus } from '../../types/article';
import { softBadgeSx, statusSoftColors } from '../../styles/badges';

interface StatusChipProps {
  status: ArticleStatus | string;
  size?: ChipProps['size'];
}

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const key = status.toLowerCase();
  const config = statusSoftColors[key];

  if (!config) {
    const label = status.replace(/_/g, ' ');
    return (
      <Chip
        label={label}
        size={size}
        sx={softBadgeSx('#546e7a')}
      />
    );
  }

  return (
    <Chip
      label={config.label ?? status.replace(/_/g, ' ')}
      size={size}
      sx={softBadgeSx(config.color)}
    />
  );
};

export default StatusChip;
