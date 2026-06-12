import { createTheme } from '@mui/material/styles';
import { colors } from './styles/colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: colors.primaryContrast,
    },
    secondary: {
      main: '#00897B',
      light: '#26A69A',
      dark: '#00695C',
      contrastText: '#ffffff',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#B71C1C',
    },
    warning: {
      main: '#F57C00',
      light: '#FFA726',
      dark: '#E65100',
    },
    success: {
      main: '#388E3C',
      light: '#66BB6A',
      dark: '#1B5E20',
    },
    background: {
      default: colors.bgDefault,
      paper: colors.bgPaper,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'var(--color-bg-default)',
          color: 'var(--color-text-primary)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          boxShadow: '0 2px 8px var(--color-shadow)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
        },
        containedPrimary: {
          backgroundColor: 'var(--color-primary)',
          '&:hover': {
            backgroundColor: 'var(--color-primary-dark)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: 'default',
        elevation: 1,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'var(--color-bg-paper)',
          color: 'var(--color-text-primary)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px var(--color-shadow)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--color-bg-sidebar)',
          border: 'none',
          borderRight: '1px solid var(--color-border)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-bg-paper)',
            '& fieldset': {
              borderColor: 'var(--color-border)',
            },
            '&:hover fieldset': {
              borderColor: 'var(--color-primary-light)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--color-primary)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'var(--color-text-secondary)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'var(--color-primary)',
          },
          '& .MuiFormHelperText-root': {
            color: 'var(--color-text-secondary)',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-bg-paper)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-border)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-primary-light)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-primary)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--color-bg-paper)',
          backgroundImage: 'none',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 24px var(--color-shadow)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: 'var(--color-text-primary)',
          borderBottom: '1px solid var(--color-divider)',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: 'var(--color-text-primary)',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          borderTop: '1px solid var(--color-divider)',
          padding: '16px 24px',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
