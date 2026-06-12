import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Skeleton,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analytics';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#388e3c',
  info: '#1565c0',
};

const TRUST_COLORS = ['#d32f2f', '#f57c00', '#f9a825', '#7cb342', '#388e3c'];

const AnalyticsDashboard: React.FC = () => {
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
  });

  const { data: sourceStats, isLoading: sourcesLoading } = useQuery({
    queryKey: ['analytics', 'sources'],
    queryFn: analyticsApi.getSourceStats,
  });

  const { data: trustScores, isLoading: trustLoading } = useQuery({
    queryKey: ['analytics', 'trust-scores'],
    queryFn: analyticsApi.getTrustScores,
  });

  const severityData = overview
    ? Object.entries(overview.articles_by_severity).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const statusData = overview
    ? Object.entries(overview.articles_by_status).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }))
    : [];

  if (overviewError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load analytics data.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700, mb: 3 }}>
        Analytics Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Collected', value: overview?.total_articles ?? 0 },
          { label: 'Verified', value: overview?.verified_count ?? 0 },
          { label: 'Approved', value: overview?.approved_count ?? 0 },
          { label: 'Published', value: overview?.published_count ?? 0 },
          { label: 'Verification Rate', value: `${Math.round(overview?.verification_success_rate ?? 0)}%` },
          { label: 'Avg Trust Score', value: Math.round(overview?.avg_trust_score ?? 0) },
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={stat.label}>
            <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: '#8da9c4', mb: 1 }}>
                  {stat.label}
                </Typography>
                {overviewLoading ? (
                  <Skeleton width={60} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                ) : (
                  <Typography variant="h4" sx={{ color: '#e8f4fd', fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: 360 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Articles by Severity
              </Typography>
              {overviewLoading ? (
                <Skeleton height={260} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {severityData.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#607d8b'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: 360 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Trust Score Distribution
              </Typography>
              {trustLoading ? (
                <Skeleton height={260} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trustScores?.distribution ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="range" stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 12 }} />
                    <YAxis stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(trustScores?.distribution ?? []).map((_, index) => (
                        <Cell key={index} fill={TRUST_COLORS[index % TRUST_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: 360 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Workflow Status
              </Typography>
              {overviewLoading ? (
                <Skeleton height={260} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0078d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Top Intelligence Sources
              </Typography>
              {sourcesLoading ? (
                <Skeleton height={260} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Source', 'Articles', 'Avg Trust', 'Last Collected'].map((header) => (
                          <TableCell key={header} sx={{ color: '#8da9c4', borderBottom: '1px solid rgba(0,120,215,0.2)', fontSize: 12 }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sourceStats?.map((source) => (
                        <TableRow key={source.source_id} sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}>
                          <TableCell sx={{ color: '#c8dff0' }}>{source.name}</TableCell>
                          <TableCell sx={{ color: '#4a9ede' }}>{source.article_count}</TableCell>
                          <TableCell>
                            <Chip
                              label={source.avg_trust_score}
                              size="small"
                              color={source.avg_trust_score >= 70 ? 'success' : source.avg_trust_score >= 40 ? 'warning' : 'error'}
                              sx={{ fontSize: 11, height: 20 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#8da9c4', fontSize: 12 }}>
                            {source.last_collected ? new Date(source.last_collected).toLocaleString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
