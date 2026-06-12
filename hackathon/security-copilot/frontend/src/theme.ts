import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1565C0',
      light: '#1976D2',
      dark: '#0D47A1',
      contrastText: '#ffffff',
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
      default: '#0A0E1A',
      paper: '#111827',
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
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
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
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
          background: 'linear-gradient(135deg, #1565C0, #1976D2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0D47A1, #1565C0)',
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
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1117',
          border: 'none',
          borderRight: '1px solid rgba(148, 163, 184, 0.08)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
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
