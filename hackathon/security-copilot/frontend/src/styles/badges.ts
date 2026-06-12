/** Shared badge colors and chip styles — used by SeverityChip, StatusChip, RoleChip, theme */

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#c62828',
  high: '#e65100',
  medium: '#f9a825',
  low: '#2e7d32',
  info: '#1565c0',
};

export const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  admin: { label: 'Admin', color: '#c62828', bg: '#c6282818' },
  analyst: { label: 'Analyst', color: '#e65100', bg: '#e6510018' },
  viewer: { label: 'Viewer', color: '#1565c0', bg: '#1565c018' },
};

export const softBadgeSx = (color: string, bgOpacity = '18') => ({
  bgcolor: `${color}${bgOpacity}`,
  color,
  fontWeight: 600,
  fontSize: '0.6875rem',
  height: 24,
  borderRadius: '6px',
  border: `1px solid ${color}35`,
  textTransform: 'capitalize' as const,
  '& .MuiChip-label': {
    px: 1.25,
    letterSpacing: '0.03em',
    lineHeight: 1.2,
  },
});

export const statusSoftColors: Record<string, { color: string; label?: string }> = {
  new: { color: '#546e7a', label: 'New' },
  ai_verified: { color: '#1565c0', label: 'AI Verified' },
  pending_manual_review: { color: '#e65100', label: 'Pending Review' },
  under_review: { color: '#ef6c00', label: 'Under Review' },
  approved: { color: '#2e7d32', label: 'Approved' },
  published: { color: '#6a1b9a', label: 'Published' },
  rejected: { color: '#c62828', label: 'Rejected' },
};
