import React from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Skeleton, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { threatsApi } from '../../api/threatsApi';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f', high: '#f57c00', medium: '#f9a825', low: '#388e3c',
};

const SOURCE_LABELS: Record<string, string> = {
  github_advisory: 'GitHub', nvd_cve: 'NVD', cisa: 'CISA', cert_feed: 'CERT/CC',
};

const ThreatDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['threat-stats'],
    queryFn: threatsApi.getStats,
    refetchInterval: 60000,
  });

  const { data: highRisk, isLoading: hrLoading } = useQuery({
    queryKey: ['threats-high-risk'],
    queryFn: () => threatsApi.getHighRisk({ min_risk: 50, limit: 10 }),
    refetchInterval: 60000,
  });

  const { data: trending, isLoading: trendLoading } = useQuery({
    queryKey: ['threats-trending'],
    queryFn: () => threatsApi.getTrending({ hours: 24, limit: 8 }),
    refetchInterval: 60000,
  });

  const { data: health } = useQuery({
    queryKey: ['collector-health'],
    queryFn: threatsApi.getCollectorHealth,
  });

  const collectMutation = useMutation({
    mutationFn: () => threatsApi.runCollectors({}),
    onSuccess: (result) => {
      showSuccess(`Collected ${result.total_inserted} new threats`);
      queryClient.invalidateQueries({ queryKey: ['threat-stats'] });
      queryClient.invalidateQueries({ queryKey: ['threats-high-risk'] });
    },
    onError: () => showError('Collection failed'),
  });

  const isAnalyst = user?.role === 'analyst' || user?.role === 'admin';

  const severityChartData = Object.entries(stats?.by_severity ?? {}).map(([k, v]) => ({ name: k, count: v }));
  const sourceChartData = Object.entries(stats?.by_source ?? {}).map(([k, v]) => ({
    name: SOURCE_LABELS[k] ?? k, count: v,
  }));

  if (statsError) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load CTI dashboard.</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700 }}>Threat Intelligence Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAnalyst && (
            <Button variant="contained" onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending}
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>
              {collectMutation.isPending ? 'Collecting…' : 'Run Collectors'}
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate('/threats')} sx={{ color: '#4a9ede', borderColor: 'rgba(0,120,215,0.4)' }}>
            View All Threats
          </Button>
        </Box>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Threats', value: stats?.total ?? 0, color: '#0078d4' },
          { label: 'Duplicates Filtered', value: stats?.duplicates ?? 0, color: '#8da9c4' },
          { label: 'Critical', value: stats?.by_severity?.critical ?? 0, color: '#d32f2f' },
          { label: 'High', value: stats?.by_severity?.high ?? 0, color: '#f57c00' },
          { label: 'Verified Confidence', value: stats?.by_confidence?.verified ?? 0, color: '#388e3c' },
          { label: 'CISA KEV', value: stats?.by_source?.cisa ?? 0, color: '#7b1fa2' },
        ].map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={card.label}>
            <Card sx={{ background: 'rgba(13,27,42,0.9)', border: `1px solid ${card.color}30`, borderRadius: 2 }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="body2" sx={{ color: '#8da9c4', mb: 0.5, fontSize: 12 }}>{card.label}</Typography>
                {statsLoading ? (
                  <Skeleton width={60} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                ) : (
                  <Typography variant="h4" sx={{ color: card.color, fontWeight: 700 }}>{card.value}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Severity distribution */}
        <Grid item xs={12} md={5}>
          <Card sx={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: 300 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 1 }}>Severity Distribution</Typography>
              {statsLoading ? <Skeleton height={220} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={severityChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {severityChartData.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#607d8b'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Source breakdown */}
        <Grid item xs={12} md={7}>
          <Card sx={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, height: 300 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 1 }}>Threats by Source</Typography>
              {statsLoading ? <Skeleton height={220} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sourceChartData}>
                    <XAxis dataKey="name" stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 12 }} />
                    <YAxis stroke="#8da9c4" tick={{ fill: '#8da9c4', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f57c00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* High risk */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(211,47,47,0.3)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>High Risk Threats</Typography>
              {hrLoading ? <Skeleton height={200} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} /> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Title', 'Severity', 'Risk'].map((h) => (
                          <TableCell key={h} sx={{ color: '#8da9c4', borderBottom: '1px solid rgba(0,120,215,0.2)', fontSize: 11 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {highRisk?.map((t) => (
                        <TableRow key={t.id} hover sx={{ cursor: 'pointer', '& td': { borderBottom: '1px solid rgba(0,120,215,0.06)' } }}
                          onClick={() => navigate(`/threats/${t.id}`)}>
                          <TableCell sx={{ color: '#c8dff0', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</TableCell>
                          <TableCell>
                            {t.severity && <Chip label={t.severity} size="small" sx={{ fontSize: 10, height: 18, bgcolor: `${SEVERITY_COLORS[t.severity] ?? '#607d8b'}20`, color: SEVERITY_COLORS[t.severity] ?? '#607d8b' }} />}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LinearProgress variant="determinate" value={t.risk_score} sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f' } }} />
                              <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 700 }}>{t.risk_score}</Typography>
                            </Box>
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

        {/* Collector health */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>Collector Health</Typography>
              {(health as any[])?.map((h: any) => (
                <Box key={h.name ?? h.adapter} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(0,120,215,0.08)' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#c8dff0' }}>
                      {SOURCE_LABELS[h.name ?? h.adapter] ?? (h.name ?? h.adapter)}
                    </Typography>
                    {h.last_success && (
                      <Typography variant="caption" sx={{ color: '#8da9c4' }}>
                        Last: {new Date(h.last_success).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={h.healthy ? 'Healthy' : h.reachable === false ? 'Unreachable' : 'Error'}
                    size="small"
                    color={h.healthy ? 'success' : 'error'}
                    sx={{ fontSize: 11, height: 20 }}
                  />
                </Box>
              ))}
              {!health && <Typography variant="body2" sx={{ color: '#8da9c4' }}>Loading health status…</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ThreatDashboard;
