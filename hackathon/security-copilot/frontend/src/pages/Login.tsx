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
        background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a1628 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background:
            'radial-gradient(ellipse at center, rgba(0, 120, 215, 0.08) 0%, transparent 60%)',
          animation: 'pulse 8s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      }}
    >
      {/* Background grid lines */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0,120,215,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,120,215,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          background: 'rgba(13, 27, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 120, 215, 0.3)',
          borderRadius: 3,
          boxShadow: '0 0 40px rgba(0, 120, 215, 0.15), 0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo / Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0078d4 0%, #004e8c 100%)',
                boxShadow: '0 0 20px rgba(0, 120, 212, 0.5)',
                mb: 2,
              }}
            >
              <ShieldIcon sx={{ fontSize: 40, color: '#fff' }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#e8f4fd',
                letterSpacing: '-0.5px',
              }}
            >
              Security Intelligence
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 400,
                color: '#0078d4',
                letterSpacing: '0.5px',
              }}
            >
              Copilot
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 1,
              }}
            >
              <SecurityIcon sx={{ fontSize: 14, color: '#4a9ede' }} />
              <Typography variant="caption" sx={{ color: '#4a9ede', letterSpacing: 1 }}>
                THREAT INTELLIGENCE PLATFORM
              </Typography>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211,47,47,0.15)', color: '#f44336' }}>
              {error}
            </Alert>
          )}

          {/* Form */}
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
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#e8f4fd',
                  '& fieldset': { borderColor: 'rgba(0, 120, 215, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 120, 215, 0.6)' },
                  '&.Mui-focused fieldset': { borderColor: '#0078d4' },
                },
                '& .MuiInputLabel-root': { color: '#4a9ede' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#0078d4' },
              }}
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
                      sx={{ color: '#4a9ede' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: '#e8f4fd',
                  '& fieldset': { borderColor: 'rgba(0, 120, 215, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 120, 215, 0.6)' },
                  '&.Mui-focused fieldset': { borderColor: '#0078d4' },
                },
                '& .MuiInputLabel-root': { color: '#4a9ede' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#0078d4' },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading || !email || !password}
              sx={{
                py: 1.5,
                background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '0.5px',
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: '0 4px 15px rgba(0, 120, 212, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #106ebe 0%, #004e8c 100%)',
                  boxShadow: '0 4px 20px rgba(0, 120, 212, 0.5)',
                },
                '&:disabled': {
                  background: 'rgba(0, 120, 212, 0.3)',
                  color: 'rgba(255,255,255,0.5)',
                },
              }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                  <span>Authenticating...</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 3,
              color: 'rgba(74, 158, 222, 0.6)',
            }}
          >
            Secure access — all actions are audited
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
