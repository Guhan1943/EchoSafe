import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, LinearProgress, Skeleton, Alert, Tooltip, IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, BugReport as ThreatIcon,
  Warning as HighRiskIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { threatsApi } from '../../api/threatsApi';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import type { ThreatSeverity } from '../../types/threat';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#388e3c',
};

const CONFIDENCE_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  verified: 'success',
  high: 'success',
  medium: 'warning',
  low: 'default',
};

const SOURCE_LABELS: Record<string, string> = {
  github_advisory: 'GitHub',
  nvd_cve: 'NVD',
  cisa: 'CISA',
  cert_feed: 'CERT/CC',
};

const ThreatFeed: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['threats', page, search, severityFilter, sourceFilter, confidenceFilter],
    queryFn: () =>
      threatsApi.listThreats({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        severity: severityFilter || undefined,
        source_adapter: sourceFilter || undefined,
        confidence_level: confidenceFilter || undefined,
        is_duplicate: false,
      }),
  });

  const collectMutation = useMutation({
    mutationFn: () => threatsApi.runCollectors({}),
    onSuccess: (result) => {
      showSuccess(
        `Collection complete: ${result.total_inserted} new threats, ` +
        `${result.total_duplicates} duplicates`
      );
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    },
    onError: () => showError('Collection failed'),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const isAnalyst = user?.role === 'analyst' || user?.role === 'admin';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThreatIcon sx={{ color: '#f57c00', fontSize: 28 }} />
          <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
            Threat Intelligence Feed
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            sx={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-primary)' }}
          >
            Refresh
          </Button>
          {isAnalyst && (
            <Button
              variant="contained"
              startIcon={<ThreatIcon />}
              onClick={() => collectMutation.mutate()}
              disabled={collectMutation.isPending}
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}
            >
              {collectMutation.isPending ? 'Collecting…' : 'Run Collectors'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search threats…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-secondary)', fontSize: 18 }} /></InputAdornment>,
                sx: { color: 'var(--color-text-primary)' },
              }}
              sx={{ minWidth: 220 }}
            />
            <Button type="submit" variant="outlined" size="small" sx={{ color: 'var(--color-primary)', borderColor: 'var(--color-border-primary)' }}>Search</Button>
          </Box>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ color: 'var(--color-primary)' }}>Severity</InputLabel>
            <Select value={severityFilter} label="Severity" onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }} sx={{ color: 'var(--color-text-primary)' }}>
              <MenuItem value="">All</MenuItem>
              {['critical', 'high', 'medium', 'low'].map((s) => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: 'var(--color-primary)' }}>Source</InputLabel>
            <Select value={sourceFilter} label="Source" onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }} sx={{ color: 'var(--color-text-primary)' }}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: 'var(--color-primary)' }}>Confidence</InputLabel>
            <Select value={confidenceFilter} label="Confidence" onChange={(e) => { setConfidenceFilter(e.target.value); setPage(0); }} sx={{ color: 'var(--color-text-primary)' }}>
              <MenuItem value="">All</MenuItem>
              {['verified', 'high', 'medium', 'low'].map((l) => <MenuItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</MenuItem>)}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load threat feed.</Alert>}

      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Title', 'Source', 'Severity', 'Risk', 'Confidence', 'CVEs', 'Collected'].map((h) => (
                    <TableCell key={h} sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)', fontSize: 12, px: 2, py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j} sx={{ borderBottom: '1px solid rgba(0,120,215,0.06)' }}>
                            <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.items.map((threat) => {
                      const cves = [];
                      return (
                        <TableRow
                          key={threat.id}
                          hover
                          onClick={() => navigate(`/threats/${threat.id}`)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,120,215,0.05)' }, '& td': { borderBottom: '1px solid rgba(0,120,215,0.06)' } }}
                        >
                          <TableCell sx={{ color: 'var(--color-text-primary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {(threat.risk_score >= 75) && <HighRiskIcon sx={{ color: '#d32f2f', fontSize: 14 }} />}
                              {threat.title}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ px: 2 }}>
                            <Chip label={SOURCE_LABELS[threat.source_adapter] ?? threat.source_adapter} size="small" sx={{ fontSize: 11, height: 20 }} />
                          </TableCell>
                          <TableCell sx={{ px: 2 }}>
                            {threat.severity ? (
                              <Chip label={threat.severity} size="small" sx={{ bgcolor: `${SEVERITY_COLORS[threat.severity] ?? '#607d8b'}20`, color: SEVERITY_COLORS[threat.severity] ?? '#607d8b', fontSize: 11, height: 20 }} />
                            ) : <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>—</Typography>}
                          </TableCell>
                          <TableCell sx={{ px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={threat.risk_score} sx={{ width: 48, height: 4, borderRadius: 2, bgcolor: 'var(--color-bg-subtle)', '& .MuiLinearProgress-bar': { bgcolor: threat.risk_score >= 75 ? '#d32f2f' : threat.risk_score >= 50 ? '#f57c00' : '#f9a825' } }} />
                              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>{threat.risk_score}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ px: 2 }}>
                            <Chip label={threat.confidence_level} size="small" color={CONFIDENCE_COLORS[threat.confidence_level] ?? 'default'} sx={{ fontSize: 11, height: 20 }} />
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-primary)', fontSize: 12, px: 2 }}>
                            —
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 11, px: 2, whiteSpace: 'nowrap' }}>
                            {new Date(threat.collected_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[20]}
            sx={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-primary)' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default ThreatFeed;
