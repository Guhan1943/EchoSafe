import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password. Please try again.';
      setError(msg);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--color-bg-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--color-border-primary)',
          borderRadius: 3,
          boxShadow: '0 4px 24px var(--color-shadow)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'var(--color-primary)',
                mb: 2,
              }}
            >
              <ShieldIcon sx={{ fontSize: 40, color: 'var(--color-primary-contrast)' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              EchoSafe
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1 }}>
              <SecurityIcon sx={{ fontSize: 14, color: 'var(--color-primary)' }} />
              <Typography variant="caption" sx={{ color: 'var(--color-primary)', letterSpacing: 1 }}>
                THREAT INTELLIGENCE PLATFORM
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
              autoFocus
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'var(--color-primary)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={isLoading || !email || !password}
              sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem', textTransform: 'none', borderRadius: 2 }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: 'var(--color-primary-contrast)' }} />
                  <span>Authenticating...</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'var(--color-text-secondary)' }}
          >
            Secure access — all actions are audited
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
