import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { ArticleStatus } from '../../types/article';

interface StatusChipProps {
  status: ArticleStatus | string;
  size?: ChipProps['size'];
}

const STATUS_CONFIG: Record<
  ArticleStatus,
  { label: string; color: ChipProps['color']; sx?: object }
> = {
  [ArticleStatus.New]: { label: 'New', color: 'default' },
  [ArticleStatus.AiVerified]: { label: 'AI Verified', color: 'primary' },
  [ArticleStatus.PendingManualReview]: {
    label: 'Pending Review',
    color: 'warning',
  },
  [ArticleStatus.Approved]: { label: 'Approved', color: 'success' },
  [ArticleStatus.Published]: {
    label: 'Published',
    color: 'secondary',
  },
  [ArticleStatus.Rejected]: { label: 'Rejected', color: 'error' },
  [ArticleStatus.UnderReview]: {
    label: 'Under Review',
    color: 'warning',
    sx: { bgcolor: '#EF6C00', color: 'white' },
  },
};

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const config = STATUS_CONFIG[status as ArticleStatus];

  if (!config) {
    return (
      <Chip label={status} size={size} variant="outlined" />
    );
  }

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={config.sx}
      variant="filled"
    />
  );
};

export default StatusChip;
