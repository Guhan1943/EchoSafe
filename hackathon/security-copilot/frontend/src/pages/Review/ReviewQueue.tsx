import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Grid,
  Skeleton,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  RateReview as ReviewIcon,
  ArrowForward as ArrowIcon,
  Inbox as InboxIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../../api/articles';
import { approvalsApi } from '../../api/approvals';
import { ArticleStatus } from '../../types/article';
import { useNotification } from '../../hooks/useNotification';
import SeverityChip from '../../components/Common/SeverityChip';
import StatusChip from '../../components/Common/StatusChip';
import { softBadgeSx } from '../../styles/badges';

const panelSx = {
  borderRadius: 2,
  bgcolor: 'var(--color-card-bg)',
  border: '1px solid var(--color-border)',
};

const trustColor = (score: number) =>
  score >= 70 ? '#2e7d32' : score >= 40 ? '#f9a825' : '#c62828';

const formatDate = (published: string | null, collected: string) => {
  const raw = published ?? collected;
  const date = new Date(raw);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const FILTER_OPTIONS: { label: string; value: 'pending_manual_review' | 'under_review' }[] = [
  { label: 'Pending Review', value: 'pending_manual_review' },
  { label: 'Under Review', value: 'under_review' },
];

const ReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending_manual_review' | 'under_review'>('pending_manual_review');

  const { data, isLoading, error } = useQuery({
    queryKey: ['review-queue', filter],
    queryFn: () => articlesApi.getArticles({ status: filter as ArticleStatus, limit: 50 }),
  });

  const approveMutation = useMutation({
    mutationFn: (articleId: number) => approvalsApi.approve(articleId),
    onSuccess: () => {
      showSuccess('Article approved');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: () => showError('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (articleId: number) => approvalsApi.reject(articleId),
    onSuccess: () => {
      showSuccess('Article rejected');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: () => showError('Failed to reject'),
  });

  if (error) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Failed to load review queue.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(245, 124, 0, 0.12)',
                color: '#e65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReviewIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Review Queue
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.6 }}>
            Approve or reject intelligence articles that need manual review before publishing.
          </Typography>
        </Box>

        {!isLoading && data && (
          <Chip
            label={`${data.total} article${data.total !== 1 ? 's' : ''} in queue`}
            size="small"
            sx={softBadgeSx('#e65100')}
          />
        )}
      </Box>

      {/* Filter bar */}
      <Box sx={{ ...panelSx, p: 2, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1 }}>
          Show
        </Typography>
        {FILTER_OPTIONS.map(({ label, value }) => {
          const isActive = filter === value;
          return (
            <Chip
              key={value}
              label={label}
              size="small"
              onClick={() => setFilter(value)}
              sx={{
                fontWeight: 600,
                cursor: 'pointer',
                ...(isActive
                  ? {
                      bgcolor: 'var(--color-primary)',
                      color: '#fff',
                      '&:hover': { bgcolor: 'var(--color-primary-dark)' },
                    }
                  : {
                      bgcolor: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      '&:hover': { bgcolor: 'var(--color-border)' },
                    }),
              }}
            />
          );
        })}
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Box sx={{ ...panelSx, p: 2.5 }}>
                <Skeleton height={24} width="40%" sx={{ mb: 1.5 }} />
                <Skeleton height={20} sx={{ mb: 1 }} />
                <Skeleton height={60} />
                <Skeleton height={36} sx={{ mt: 2 }} />
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : data?.items.length === 0 ? (
        <Box sx={{ ...panelSx, textAlign: 'center', py: 8, px: 3 }}>
          <InboxIcon sx={{ fontSize: 52, color: 'var(--color-text-muted)', mb: 2, opacity: 0.45 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Queue is empty
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
            No articles are currently{' '}
            {filter === 'pending_manual_review' ? 'pending review' : 'under review'}.
          </Typography>
          <Button
            variant="outlined"
            endIcon={<ArrowIcon />}
            onClick={() => navigate('/intelligence')}
            sx={{ mt: 2.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Browse Intelligence Feed
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {data?.items.map((article) => {
            const scoreColor = trustColor(article.trust_score);
            return (
              <Grid item xs={12} sm={6} lg={4} key={article.id}>
                <Box
                  sx={{
                    ...panelSx,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    '@media (prefers-reduced-motion: no-preference)': {
                      '&:hover': {
                        boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
                        transform: 'translateY(-2px)',
                      },
                    },
                  }}
                >
                  <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {article.severity && <SeverityChip severity={article.severity} />}
                      <StatusChip status={article.status} />
                    </Box>

                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        mb: 1,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {article.title}
                    </Typography>

                    {article.summary && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          flex: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.55,
                        }}
                      >
                        {article.summary}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        mt: 'auto',
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: `${scoreColor}08`,
                        border: `1px solid ${scoreColor}25`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Trust score
                        </Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ color: scoreColor }}>
                          {article.trust_score}/100
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={article.trust_score}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: `${scoreColor}18`,
                          '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 3 },
                        }}
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                      {formatDate(article.published_at, article.collected_at)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'var(--color-bg-subtle)',
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ApproveIcon />}
                      onClick={() => approveMutation.mutate(article.id)}
                      disabled={approveMutation.isPending}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 1.5,
                        bgcolor: '#2e7d32',
                        '&:hover': { bgcolor: '#1b5e20' },
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RejectIcon />}
                      onClick={() => rejectMutation.mutate(article.id)}
                      disabled={rejectMutation.isPending}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 1.5,
                        borderColor: '#c62828',
                        color: '#c62828',
                        '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.06)' },
                      }}
                    >
                      Reject
                    </Button>
                    <Tooltip title="Full review details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/review/${article.id}`)}
                        sx={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 1.5,
                          color: 'var(--color-primary)',
                          bgcolor: 'var(--color-card-bg)',
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default ReviewQueue;
