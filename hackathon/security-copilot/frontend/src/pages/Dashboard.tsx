import React from 'react';
import {
  Box,
  Grid,
  Typography,
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
  VerifiedUser as VerifiedIcon,
  ArrowForward as ArrowIcon,
  Feed as FeedIcon,
  RateReview as ReviewIcon,
  Hub as HubIcon,
  BarChart as AnalyticsIcon,
  BugReport as ThreatIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analytics';
import { articlesApi } from '../api/articles';
import SeverityChip from '../components/Common/SeverityChip';
import StatusChip from '../components/Common/StatusChip';
import { SEVERITY_COLORS } from '../styles/badges';

interface MetricProps {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

const Metric: React.FC<MetricProps> = ({ label, value, sub, accent, icon, loading, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      p: 2.5,
      borderRadius: 2,
      bgcolor: 'var(--color-card-bg)',
      border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${accent}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      '@media (prefers-reduced-motion: no-preference)': {
        '&:hover': onClick
          ? { boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' }
          : {},
      },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ color: accent, opacity: 0.9, display: 'flex' }}>{icon}</Box>
    </Box>
    {loading ? (
      <Skeleton width={64} height={36} />
    ) : (
      <>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', mt: 0.75, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </>
    )}
  </Box>
);

interface PanelProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ title, action, children }) => (
  <Box
    sx={{
      p: 2.5,
      borderRadius: 2,
      bgcolor: 'var(--color-card-bg)',
      border: '1px solid var(--color-border)',
      height: '100%',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {title}
      </Typography>
      {action}
    </Box>
    {children}
  </Box>
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
    queryFn: () => articlesApi.getArticles({ skip: 0, limit: 8 }),
    refetchInterval: 60000,
  });

  if (overviewError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard data. Please try again.</Alert>
      </Box>
    );
  }

  const pendingReview =
    (overview?.articles_by_status?.pending_manual_review ?? 0) +
    (overview?.articles_by_status?.under_review ?? 0);

  const severityEntries = overview?.articles_by_severity
    ? Object.entries(overview.articles_by_severity).filter(([, count]) => count > 0)
    : [];

  const maxSeverity = Math.max(...severityEntries.map(([, c]) => c), 1);

  const pipeline = [
    {
      label: 'Collected',
      count: overview?.total_articles ?? 0,
      color: '#1976d2',
    },
    {
      label: 'Verified',
      count: overview?.verified_count ?? 0,
      color: '#0288d1',
    },
    {
      label: 'In Review',
      count: pendingReview,
      color: '#f9a825',
    },
    {
      label: 'Approved',
      count: overview?.approved_count ?? 0,
      color: '#388e3c',
    },
    {
      label: 'Published',
      count: overview?.published_count ?? 0,
      color: '#7b1fa2',
    },
  ];

  const quickLinks = [
    { label: 'Intelligence Feed', desc: 'Browse collected articles', path: '/intelligence', icon: <FeedIcon />, color: '#1976d2' },
    { label: 'Review Queue', desc: 'Approve or reject intel', path: '/review', icon: <ReviewIcon />, color: '#f57c00' },
    { label: 'Content', desc: 'Publish generated content', path: '/content', icon: <PublishedIcon />, color: '#7b1fa2' },
    { label: 'Threat Feed', desc: 'CTI events & advisories', path: '/threats', icon: <ThreatIcon />, color: '#c62828' },
    { label: 'Analytics', desc: 'Trends and source stats', path: '/analytics', icon: <AnalyticsIcon />, color: '#00838f' },
    { label: 'Publishing', desc: 'LinkedIn & email channels', path: '/publishing-channels', icon: <HubIcon />, color: '#5e35b1' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Metric
            label="Total Intelligence"
            value={overview?.total_articles ?? 0}
            sub="Articles collected from sources"
            accent="#1976d2"
            icon={<ArticleIcon />}
            loading={overviewLoading}
            onClick={() => navigate('/intelligence')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Metric
            label="Pending Review"
            value={pendingReview}
            sub="Awaiting analyst decision"
            accent="#f9a825"
            icon={<PendingIcon />}
            loading={overviewLoading}
            onClick={() => navigate('/review')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Metric
            label="Approved"
            value={overview?.approved_count ?? 0}
            sub="Ready for content generation"
            accent="#388e3c"
            icon={<ApprovedIcon />}
            loading={overviewLoading}
            onClick={() => navigate('/content')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Metric
            label="Published"
            value={overview?.published_count ?? 0}
            sub="Sent to LinkedIn or email"
            accent="#7b1fa2"
            icon={<PublishedIcon />}
            loading={overviewLoading}
            onClick={() => navigate('/content')}
          />
        </Grid>
      </Grid>

      {/* Quick links */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--color-text-primary)' }}>
        Quick access
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {quickLinks.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.path}>
            <Box
              onClick={() => navigate(link.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid var(--color-border)',
                bgcolor: 'var(--color-card-bg)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  borderColor: link.color,
                  bgcolor: `${link.color}08`,
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${link.color}14`,
                  color: link.color,
                }}
              >
                {link.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {link.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                  {link.desc}
                </Typography>
              </Box>
              <ArrowIcon sx={{ ml: 'auto', fontSize: 18, color: 'var(--color-text-muted)' }} />
            </Box>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Pipeline */}
        <Grid item xs={12} lg={7}>
          <Panel title="Intelligence Pipeline">
            {overviewLoading ? (
              <Skeleton height={120} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {pipeline.map((step, i) => (
                  <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ width: 88, flexShrink: 0, color: 'var(--color-text-secondary)', fontWeight: 500 }}
                    >
                      {step.label}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          overview?.total_articles
                            ? Math.min(100, (step.count / overview.total_articles) * 100)
                            : 0
                        }
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'var(--color-bg-subtle)',
                          '& .MuiLinearProgress-bar': { bgcolor: step.color, borderRadius: 4 },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ width: 36, textAlign: 'right', fontWeight: 700, color: step.color }}
                    >
                      {step.count}
                    </Typography>
                    {i < pipeline.length - 1 && (
                      <ArrowIcon sx={{ fontSize: 14, color: 'var(--color-text-muted)', opacity: 0.5, display: { xs: 'none', sm: 'block' } }} />
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Grid>

        {/* Quality metrics + severity */}
        <Grid item xs={12} lg={5}>
          <Panel title="Quality & Risk">
            {overviewLoading ? (
              <Skeleton height={160} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      Verification rate
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {Math.round(overview?.verification_success_rate ?? 0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={overview?.verification_success_rate ?? 0}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'var(--color-bg-subtle)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'var(--color-primary)', borderRadius: 3 },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      Avg trust score
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#388e3c' }}>
                      {Math.round(overview?.avg_trust_score ?? 0)} / 100
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={overview?.avg_trust_score ?? 0}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(56,142,60,0.12)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#388e3c', borderRadius: 3 },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
                  <VerifiedIcon sx={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                    {overview?.verified_count ?? 0} of {overview?.total_articles ?? 0} articles verified
                  </Typography>
                </Box>

                {severityEntries.length > 0 && (
                  <>
                    <Box sx={{ borderTop: '1px solid var(--color-border)', pt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'var(--color-text-primary)' }}>
                        By severity
                      </Typography>
                      {severityEntries.map(([level, count]) => (
                        <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              width: 64,
                              textTransform: 'capitalize',
                              color: SEVERITY_COLORS[level] ?? 'var(--color-text-secondary)',
                              fontWeight: 600,
                            }}
                          >
                            {level}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(count / maxSeverity) * 100}
                            sx={{
                              flex: 1,
                              height: 5,
                              borderRadius: 3,
                              bgcolor: 'var(--color-bg-subtle)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: SEVERITY_COLORS[level] ?? '#757575',
                                borderRadius: 3,
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ width: 24, textAlign: 'right', fontWeight: 600 }}>
                            {count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>

      {/* Recent intelligence */}
      <Panel
        title="Latest intelligence"
        action={
          <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/intelligence')} sx={{ textTransform: 'none' }}>
            View all
          </Button>
        }
      >
        <Box sx={{ overflowX: 'auto', mx: -0.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Title', 'Severity', 'Status', 'Trust', 'Date'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      color: 'var(--color-text-secondary)',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 12,
                      fontWeight: 600,
                      py: 1,
                    }}
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
                        <TableCell key={j} sx={{ borderBottom: '1px solid var(--color-border)' }}>
                          <Skeleton />
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
                        '&:hover': { bgcolor: 'var(--color-bg-subtle)' },
                        '& td': { borderBottom: '1px solid var(--color-border)' },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          maxWidth: 340,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {article.title}
                      </TableCell>
                      <TableCell>
                        {article.severity ? (
                          <SeverityChip severity={article.severity} />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={article.status} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={article.trust_score}
                            sx={{
                              width: 48,
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'var(--color-bg-subtle)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor:
                                  article.trust_score >= 70
                                    ? '#388e3c'
                                    : article.trust_score >= 40
                                    ? '#f9a825'
                                    : '#c62828',
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {article.trust_score}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {article.published_at
                          ? new Date(article.published_at).toLocaleDateString()
                          : new Date(article.collected_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Box>
  );
};

export default Dashboard;
