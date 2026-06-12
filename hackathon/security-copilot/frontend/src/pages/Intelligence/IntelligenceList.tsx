import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Skeleton,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../../api/articles';
import { sourcesApi } from '../../api/sources';
import { collectorApi } from '../../api/collectorApi';
import { ArticleStatus, ArticleSeverity, ArticleListParams } from '../../types/article';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

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

const IntelligenceList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filters, setFilters] = useState<ArticleListParams>({});
  const [searchText, setSearchText] = useState('');

  const queryParams: ArticleListParams = {
    ...filters,
    search: searchText || undefined,
    skip: page * rowsPerPage,
    limit: rowsPerPage,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['articles', queryParams],
    queryFn: () => articlesApi.getArticles(queryParams),
  });

  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.getSources(),
  });

  const collectAllMutation = useMutation({
    mutationFn: collectorApi.collectAll,
    onSuccess: (result) => {
      showSuccess(`Collection complete: ${result.sources_processed} sources processed`);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: () => showError('Failed to collect from all sources'),
  });

  const handleFilterChange = (key: keyof ArticleListParams, value: string | number | undefined) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load articles. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700 }}>
          Intelligence Feed
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} sx={{ color: '#4a9ede' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => collectAllMutation.mutate()}
              disabled={collectAllMutation.isPending}
              sx={{ borderColor: 'rgba(0,120,215,0.4)', color: '#4a9ede' }}
            >
              Collect All
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Bar */}
      <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ flex: '1 1 200px' }}>
              <TextField
                placeholder="Search articles..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#4a9ede', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#e8f4fd',
                    '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,120,215,0.6)' },
                    '&.Mui-focused fieldset': { borderColor: '#0078d4' },
                  },
                }}
              />
            </Box>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: '#4a9ede' }}>Status</InputLabel>
              <Select
                value={filters.status ?? ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value as ArticleStatus)}
                sx={{ color: '#e8f4fd', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,120,215,0.3)' } }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.values(ArticleStatus).map((s) => (
                  <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ color: '#4a9ede' }}>Severity</InputLabel>
              <Select
                value={filters.severity ?? ''}
                label="Severity"
                onChange={(e) => handleFilterChange('severity', e.target.value as ArticleSeverity)}
                sx={{ color: '#e8f4fd', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,120,215,0.3)' } }}
              >
                <MenuItem value="">All Severities</MenuItem>
                {Object.values(ArticleSeverity).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: '#4a9ede' }}>Source</InputLabel>
              <Select
                value={filters.source_id ?? ''}
                label="Source"
                onChange={(e) => handleFilterChange('source_id', e.target.value as number)}
                sx={{ color: '#e8f4fd', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,120,215,0.3)' } }}
              >
                <MenuItem value="">All Sources</MenuItem>
                {sources?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              size="small"
              onClick={() => { setFilters({}); setSearchText(''); setPage(0); }}
              sx={{ color: '#8da9c4' }}
            >
              Clear
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Title', 'Source', 'Severity', 'Status', 'Trust Score', 'Date', 'Actions'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ color: '#8da9c4', borderBottom: '1px solid rgba(0,120,215,0.2)', fontSize: 12, fontWeight: 600 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} sx={{ borderBottom: '1px solid rgba(0,120,215,0.1)' }}>
                          <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.items.map((article) => (
                    <TableRow
                      key={article.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(0,120,215,0.05)' },
                        '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' },
                      }}
                      onClick={() => navigate(`/intelligence/${article.id}`)}
                    >
                      <TableCell
                        sx={{
                          color: '#c8dff0',
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {article.title}
                      </TableCell>
                      <TableCell sx={{ color: '#8da9c4', fontSize: 12 }}>
                        {sources?.find((s) => s.id === article.source_id)?.name ?? `#${article.source_id}`}
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
                              textTransform: 'capitalize',
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
                          <Box
                            sx={{
                              width: 40,
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${article.trust_score}%`,
                                bgcolor:
                                  article.trust_score >= 70
                                    ? '#388e3c'
                                    : article.trust_score >= 40
                                    ? '#f9a825'
                                    : '#d32f2f',
                                borderRadius: 2,
                              }}
                            />
                          </Box>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Open in new tab">
                          <IconButton
                            size="small"
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            component="a"
                            sx={{ color: '#4a9ede' }}
                          >
                            <OpenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ color: '#8da9c4', borderTop: '1px solid rgba(0,120,215,0.2)' }}
        />
      </Card>
    </Box>
  );
};

export default IntelligenceList;
