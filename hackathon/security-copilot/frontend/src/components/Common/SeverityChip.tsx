import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { ArticleSeverity } from '../../types/article';
import { SEVERITY_COLORS, softBadgeSx } from '../../styles/badges';

interface SeverityChipProps {
  severity: ArticleSeverity | string | null | undefined;
  size?: ChipProps['size'];
}

const SEVERITY_LABELS: Record<ArticleSeverity, string> = {
  [ArticleSeverity.Critical]: 'Critical',
  [ArticleSeverity.High]: 'High',
  [ArticleSeverity.Medium]: 'Medium',
  [ArticleSeverity.Low]: 'Low',
  [ArticleSeverity.Info]: 'Info',
};

const SeverityChip: React.FC<SeverityChipProps> = ({ severity, size = 'small' }) => {
  if (!severity) {
    return (
      <Chip
        label="Unknown"
        size={size}
        sx={softBadgeSx('#90a4ae')}
      />
    );
  }

  const key = severity.toLowerCase();
  const color = SEVERITY_COLORS[key] ?? '#546e7a';
  const label =
    SEVERITY_LABELS[severity as ArticleSeverity] ??
    severity.charAt(0).toUpperCase() + severity.slice(1);

  return <Chip label={label} size={size} sx={softBadgeSx(color)} />;
};

export default SeverityChip;
