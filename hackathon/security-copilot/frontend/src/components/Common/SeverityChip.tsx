import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { ArticleSeverity } from '../../types/article';

interface SeverityChipProps {
  severity: ArticleSeverity | string | null | undefined;
  size?: ChipProps['size'];
}

const SEVERITY_CONFIG: Record<
  ArticleSeverity,
  { label: string; sx: object }
> = {
  [ArticleSeverity.Critical]: {
    label: 'Critical',
    sx: { bgcolor: '#B71C1C', color: 'white', fontWeight: 700 },
  },
  [ArticleSeverity.High]: {
    label: 'High',
    sx: { bgcolor: '#E65100', color: 'white', fontWeight: 700 },
  },
  [ArticleSeverity.Medium]: {
    label: 'Medium',
    sx: { bgcolor: '#F57F17', color: 'white', fontWeight: 700 },
  },
  [ArticleSeverity.Low]: {
    label: 'Low',
    sx: { bgcolor: '#1B5E20', color: 'white', fontWeight: 700 },
  },
  [ArticleSeverity.Info]: {
    label: 'Info',
    sx: { bgcolor: '#0D47A1', color: 'white', fontWeight: 700 },
  },
};

const SeverityChip: React.FC<SeverityChipProps> = ({ severity, size = 'small' }) => {
  if (!severity) {
    return <Chip label="Unknown" size={size} variant="outlined" />;
  }

  const config = SEVERITY_CONFIG[severity as ArticleSeverity];

  if (!config) {
    return <Chip label={severity} size={size} variant="outlined" />;
  }

  return <Chip label={config.label} size={size} sx={config.sx} />;
};

export default SeverityChip;
