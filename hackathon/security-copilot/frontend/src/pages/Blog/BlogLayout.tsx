import React from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Link } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';

const BlogLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafbfc' }}>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--color-border)',
          bgcolor: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
              gap: 2,
            }}
          >
            <Box
              component={RouterLink}
              to="/blog"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <SecurityIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2} letterSpacing="-0.02em">
                  EchoSafe Blog
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Security intelligence & advisories
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                startIcon={<DashboardIcon />}
                onClick={() => navigate('/content')}
                sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
              >
                Content
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/dashboard')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  borderColor: 'var(--color-border)',
                }}
              >
                Console
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Outlet />

      <Box
        component="footer"
        sx={{
          borderTop: '1px solid var(--color-border)',
          bgcolor: '#fff',
          py: 4,
          mt: 6,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} EchoSafe · Internal security intelligence blog
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
            Published from{' '}
            <Link component={RouterLink} to="/content" underline="hover">
              Content Management
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default BlogLayout;
