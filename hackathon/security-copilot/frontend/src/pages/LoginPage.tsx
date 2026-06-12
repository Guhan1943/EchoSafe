import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HubIcon from '@mui/icons-material/Hub';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    icon: <ShieldIcon sx={{ fontSize: 20 }} />,
    title: 'Collect intelligence',
    desc: 'Aggregate threat feeds and security news in one place.',
  },
  {
    icon: <VerifiedUserIcon sx={{ fontSize: 20 }} />,
    title: 'Verify & score',
    desc: 'AI-assisted trust scoring before content goes out.',
  },
  {
    icon: <HubIcon sx={{ fontSize: 20 }} />,
    title: 'Publish with confidence',
    desc: 'Review, approve, and distribute to your channels.',
  },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: 'var(--color-bg-subtle)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    '& fieldset': {
      borderColor: 'var(--color-border)',
    },
    '&:hover fieldset': {
      borderColor: 'var(--color-primary-light)',
    },
    '&.Mui-focused': {
      bgcolor: '#fff',
      boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.12)',
      '& fieldset': {
        borderColor: 'var(--color-primary)',
        borderWidth: 1.5,
      },
    },
  },
  '& .MuiFormLabel-asterisk': {
    display: 'none',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary)',
    fontWeight: 600,
  },
};

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError?.response?.data?.detail ?? 'Invalid email or password. Please try again.'
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'var(--color-bg-default)',
      }}
    >
      {/* Brand panel — 60% */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 60%',
          width: '60%',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { md: 6, lg: 8 },
          color: '#fff',
          background: `
            linear-gradient(155deg,
              var(--color-primary-dark) 0%,
              var(--color-primary) 45%,
              #0d3a6e 100%
            )
          `,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            backgroundImage: `
              radial-gradient(circle at 20% 80%, #fff 0%, transparent 45%),
              radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)
            `,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <SecurityIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
              EchoSafe
            </Typography>
          </Box>

          <Typography
            variant="h2"
            fontWeight={700}
            sx={{
              mb: 2.5,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              textWrap: 'balance',
              maxWidth: '16ch',
              fontSize: { md: '2.75rem', lg: '3.25rem' },
            }}
          >
            Security intelligence, verified.
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.88,
              maxWidth: 520,
              lineHeight: 1.6,
              textWrap: 'pretty',
              fontWeight: 400,
              fontSize: { md: '1.05rem', lg: '1.15rem' },
            }}
          >
            Monitor threats, score trust, and publish vetted content — all from one workspace built
            for security teams.
          </Typography>
        </Box>

        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, mt: 6, maxWidth: 520 }}>
          {FEATURES.map((feature) => (
            <Box key={feature.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {feature.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.78, lineHeight: 1.5 }}>
                  {feature.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Form panel — 40% */}
      <Box
        sx={{
          flex: { xs: '1 1 auto', md: '0 0 40%' },
          width: { xs: '100%', md: '40%' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 4, md: 5, lg: 6 },
          bgcolor: 'var(--color-bg-subtle)',
          backgroundImage: `
            radial-gradient(circle at 100% 0%, rgba(25, 118, 210, 0.06) 0%, transparent 45%),
            radial-gradient(circle at 0% 100%, rgba(25, 118, 210, 0.04) 0%, transparent 40%)
          `,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: 'var(--color-bg-paper)',
            borderRadius: 3,
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
            p: { xs: 3, sm: 4 },
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, var(--color-primary-dark), var(--color-primary), var(--color-primary-light))',
            },
          }}
        >
          {/* Mobile brand header */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              gap: 1.5,
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SecurityIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                EchoSafe
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Security Intelligence Platform
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3.5, pt: { md: 0.5 } }}>
            <Typography
              variant="overline"
              sx={{
                color: 'var(--color-primary)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                display: 'block',
                mb: 1,
              }}
            >
              Account access
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                mb: 1,
                letterSpacing: '-0.03em',
                textWrap: 'balance',
                lineHeight: 1.15,
              }}
            >
              Welcome back
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Sign in to your intelligence workspace.
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{ mb: 2.5, borderRadius: 2 }}
              role="alert"
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoFocus
              autoComplete="email"
              disabled={isLoading}
              error={Boolean(error)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: 'var(--color-primary)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              disabled={isLoading}
              error={Boolean(error)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'var(--color-primary)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                      sx={{
                        color: 'var(--color-text-secondary)',
                        '&:hover': { color: 'var(--color-primary)' },
                      }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!canSubmit}
              sx={{
                py: 1.6,
                mt: 1,
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: 2,
                textTransform: 'none',
                letterSpacing: '0.01em',
                background: canSubmit
                  ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                  : undefined,
                boxShadow: canSubmit ? '0 4px 16px rgba(25, 118, 210, 0.35)' : 'none',
                '@media (prefers-reduced-motion: no-preference)': {
                  transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                  '&:hover:not(:disabled)': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 24px rgba(25, 118, 210, 0.4)',
                  },
                },
              }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CircularProgress size={20} color="inherit" />
                  Signing in…
                </Box>
              ) : (
                'Sign in to EchoSafe'
              )}
            </Button>
          </Box>

          <Box
            sx={{
              mt: 3.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(25, 118, 210, 0.04)',
              border: '1px solid rgba(25, 118, 210, 0.12)',
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25, lineHeight: 1.3 }}>
                Enterprise-grade security
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block' }}>
                All sign-in activity is encrypted, logged, and audited for compliance.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
