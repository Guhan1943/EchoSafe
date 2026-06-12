import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Article as ArticleIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as ApprovedIcon,
  Publish as PublishedIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analytics';
import { articlesApi } from '../api/articles';

const severityColor: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#388e3c',
  info: '#1565c0',
};

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info' | 'primary' | 'secondary'> = {
  new: 'default',
  ai_verified: 'info',
  pending_manual_review: 'warning',
  approved: 'success',
  published: 'primary',
  rejected: 'error',
  under_review: 'warning',
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading }) => (
  <Card
    sx={{
      background: 'rgba(13, 27, 42, 0.9)',
      border: `1px solid ${color}40`,
      borderRadius: 2,
      '&:hover': { borderColor: color, boxShadow: `0 0 15px ${color}30` },
      transition: 'all 0.2s',
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" sx={{ color: '#8da9c4', mb: 1 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8f4fd' }}>
              {value}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            background: `${color}20`,
            color: color,
            display: 'flex',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    refetchInterval: 30000,
  });

  const { data: recentArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles', 'recent'],
    queryFn: () => articlesApi.getArticles({ skip: 0, limit: 10 }),
    refetchInterval: 60000,
  });

  if (overviewError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard data. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700 }}>
          Security Intelligence Overview
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Articles"
            value={overview?.total_articles ?? 0}
            icon={<ArticleIcon />}
            color="#0078d4"
            loading={overviewLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Review"
            value={overview?.articles_by_status?.pending_manual_review ?? 0}
            icon={<PendingIcon />}
            color="#f9a825"
            loading={overviewLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Approved"
            value={overview?.approved_count ?? 0}
            icon={<ApprovedIcon />}
            color="#388e3c"
            loading={overviewLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Published"
            value={overview?.published_count ?? 0}
            icon={<PublishedIcon />}
            color="#7b1fa2"
            loading={overviewLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Verification Success Rate */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'rgba(13, 27, 42, 0.9)',
              border: '1px solid rgba(0, 120, 215, 0.2)',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingIcon sx={{ color: '#0078d4' }} />
                <Typography variant="h6" sx={{ color: '#e8f4fd' }}>
                  AI Verification Rate
                </Typography>
              </Box>
              {overviewLoading ? (
                <Skeleton height={60} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              ) : (
                <>
                  <Typography variant="h3" sx={{ color: '#0078d4', fontWeight: 700, mb: 1 }}>
                    {Math.round(overview?.verification_success_rate ?? 0)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={overview?.verification_success_rate ?? 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(0,120,215,0.15)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#0078d4', borderRadius: 4 },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#8da9c4', mt: 1, display: 'block' }}>
                    {overview?.verified_count ?? 0} of {overview?.total_articles ?? 0} articles verified
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#8da9c4', mb: 1 }}>
                      Avg Trust Score
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={overview?.avg_trust_score ?? 0}
                      sx={{
                        height: 6,
                        borderRadius: 4,
                        bgcolor: 'rgba(56,142,60,0.15)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#388e3c', borderRadius: 4 },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#388e3c' }}>
                      {Math.round(overview?.avg_trust_score ?? 0)} / 100
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              background: 'rgba(13, 27, 42, 0.9)',
              border: '1px solid rgba(0, 120, 215, 0.2)',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Intelligence Feed', path: '/intelligence', color: '#0078d4' },
                  { label: 'Review Queue', path: '/review', color: '#f9a825' },
                  { label: 'Content Management', path: '/content', color: '#7b1fa2' },
                  { label: 'Analytics', path: '/analytics', color: '#388e3c' },
                  { label: 'Manage Sources', path: '/sources', color: '#0097a7' },
                  { label: 'Admin Panel', path: '/admin', color: '#f44336' },
                ].map((action) => (
                  <Grid item xs={12} sm={6} key={action.path}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(action.path)}
                      sx={{
                        borderColor: `${action.color}40`,
                        color: action.color,
                        justifyContent: 'flex-start',
                        py: 1,
                        '&:hover': { borderColor: action.color, bgcolor: `${action.color}10` },
                      }}
                    >
                      {action.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Articles Table */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: 'rgba(13, 27, 42, 0.9)',
              border: '1px solid rgba(0, 120, 215, 0.2)',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#e8f4fd' }}>
                  Recent Intelligence
                </Typography>
                <Button size="small" onClick={() => navigate('/intelligence')} sx={{ color: '#0078d4' }}>
                  View All
                </Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Title', 'Severity', 'Status', 'Trust Score', 'Date'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ color: '#8da9c4', borderBottom: '1px solid rgba(0,120,215,0.2)', fontSize: 12 }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {articlesLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <TableCell key={j} sx={{ borderBottom: '1px solid rgba(0,120,215,0.1)' }}>
                                <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : recentArticles?.items.map((article) => (
                          <TableRow
                            key={article.id}
                            hover
                            onClick={() => navigate(`/intelligence/${article.id}`)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(0,120,215,0.05)' },
                              '& td': { borderBottom: '1px solid rgba(0,120,215,0.1)' },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: '#c8dff0',
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {article.title}
                            </TableCell>
                            <TableCell>
                              {article.severity ? (
                                <Chip
                                  label={article.severity}
                                  size="small"
                                  sx={{
                                    bgcolor: `${severityColor[article.severity]}20`,
                                    color: severityColor[article.severity],
                                    fontSize: 11,
                                    height: 20,
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#8da9c4' }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={article.status.replace(/_/g, ' ')}
                                size="small"
                                color={statusColor[article.status] ?? 'default'}
                                sx={{ fontSize: 11, height: 20 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={article.trust_score}
                                  sx={{
                                    width: 50,
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor:
                                        article.trust_score >= 70
                                          ? '#388e3c'
                                          : article.trust_score >= 40
                                          ? '#f9a825'
                                          : '#d32f2f',
                                    },
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: '#8da9c4' }}>
                                  {article.trust_score}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: '#8da9c4', fontSize: 12 }}>
                              {article.published_at
                                ? new Date(article.published_at).toLocaleDateString()
                                : new Date(article.collected_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
