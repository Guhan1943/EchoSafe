import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import PublishingChannelsPanel from '../Admin/PublishingChannelsPanel';
import { useNotification } from '../../hooks/useNotification';

const PublishingChannelsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    const linkedin = searchParams.get('linkedin');
    if (!linkedin) return;

    if (linkedin === 'success') {
      showSuccess('LinkedIn connected successfully. You can now publish social media content.');
    } else if (linkedin === 'error') {
      const message = searchParams.get('message') ?? 'LinkedIn authorization failed';
      showError(message);
    }

    searchParams.delete('linkedin');
    searchParams.delete('message');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, showSuccess, showError]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
        Publishing Channels
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
        Connect LinkedIn and SMTP email to publish approved content from Content Management.
      </Typography>
      <PublishingChannelsPanel />
    </Box>
  );
};

export default PublishingChannelsPage;
