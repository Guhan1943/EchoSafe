/** Single source of truth — mirrored as CSS vars in variables.css */
export const colors = {
  bgDefault: '#ffffff',
  bgPaper: '#ffffff',
  bgSubtle: '#f5f7fa',
  bgSidebar: '#ffffff',

  primary: '#1976d2',
  primaryLight: '#42a5f5',
  primaryDark: '#1565c0',
  primaryContrast: '#ffffff',

  textPrimary: '#212121',
  textSecondary: '#757575',
  textMuted: '#9e9e9e',

  border: 'rgba(0, 0, 0, 0.12)',
  borderPrimary: 'rgba(25, 118, 210, 0.3)',
  cardBg: '#ffffff',
  cardBorder: 'rgba(0, 0, 0, 0.12)',
  divider: 'rgba(0, 0, 0, 0.12)',

  shadow: 'rgba(0, 0, 0, 0.08)',
} as const;
