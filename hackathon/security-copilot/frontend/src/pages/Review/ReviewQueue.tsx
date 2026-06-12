import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../../api/articles';
import { approvalsApi } from '../../api/approvals';
import { ArticleStatus } from '../../types/article';
import { useNotification } from '../../hooks/useNotification';

const severityColor: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#388e3c',
  info: '#1565c0',
};

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
      showSuccess('Article rejected'),
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: () => showError('Failed to reject'),
  });

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load review queue.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
            Review Queue
          </Typography>
          {data && (
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              {data.total} article{data.total !== 1 ? 's' : ''} pending review
            </Typography>
          )}
        </Box>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => { if (v) setFilter(v); }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': { color: 'var(--color-text-secondary)', borderColor: 'rgba(0,120,215,0.3)' },
            '& .Mui-selected': { color: 'var(--color-primary)', bgcolor: 'var(--color-border-primary) !important' },
          }}
        >
          <ToggleButton value="pending_manual_review">Pending Review</ToggleButton>
          <ToggleButton value="under_review">Under Review</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)' }}>
                <CardContent>
                  <Skeleton height={24} sx={{ bgcolor: 'var(--color-bg-subtle)', mb: 1 }} />
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={60} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : data?.items.length === 0 ? (
        <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: 'var(--color-primary)', fontSize: 48, mb: 2 }}>✓</Typography>
            <Typography variant="h6" sx={{ color: 'var(--color-text-primary)' }}>Queue is empty</Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              No articles are currently {filter === 'pending_manual_review' ? 'pending review' : 'under review'}.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {data?.items.map((article) => (
            <Grid item xs={12} sm={6} lg={4} key={article.id}>
              <Card
                sx={{
                  background: 'var(--color-card-bg)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { borderColor: 'rgba(0,120,215,0.5)', boxShadow: '0 0 15px rgba(0,120,215,0.1)' },
                  transition: 'all 0.2s',
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {article.severity && (
                      <Chip
                        label={article.severity}
                        size="small"
                        sx={{
                          bgcolor: `${severityColor[article.severity]}20`,
                          color: severityColor[article.severity],
                          fontSize: 11,
                          height: 20,
                          textTransform: 'capitalize',
                        }}
                      />
                    )}
                    <Chip
                      label={`Trust: ${article.trust_score}`}
                      size="small"
                      sx={{
                        bgcolor: article.trust_score >= 70 ? 'rgba(56,142,60,0.15)' : article.trust_score >= 40 ? 'rgba(249,168,37,0.15)' : 'rgba(211,47,47,0.15)',
                        color: article.trust_score >= 70 ? '#388e3c' : article.trust_score >= 40 ? '#f9a825' : '#d32f2f',
                        fontSize: 11,
                        height: 20,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}
                  >
                    {article.title}
                  </Typography>
                  {article.summary && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--color-text-secondary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        mb: 1,
                      }}
                    >
                      {article.summary}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Trust Score</Typography>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>{article.trust_score}/100</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={article.trust_score}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: article.trust_score >= 70 ? '#388e3c' : article.trust_score >= 40 ? '#f9a825' : '#d32f2f',
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'var(--color-primary)', mt: 1, display: 'block' }}>
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString()
                      : `Collected: ${new Date(article.collected_at).toLocaleDateString()}`}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ApproveIcon />}
                    onClick={() => approveMutation.mutate(article.id)}
                    disabled={approveMutation.isPending}
                    sx={{ borderColor: '#388e3c', color: '#388e3c', flex: 1, '&:hover': { bgcolor: 'rgba(56,142,60,0.1)' } }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RejectIcon />}
                    onClick={() => rejectMutation.mutate(article.id)}
                    disabled={rejectMutation.isPending}
                    sx={{ borderColor: '#d32f2f', color: '#d32f2f', flex: 1, '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/review/${article.id}`)}
                    sx={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-primary)' }}
                  >
                    Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ReviewQueue;
