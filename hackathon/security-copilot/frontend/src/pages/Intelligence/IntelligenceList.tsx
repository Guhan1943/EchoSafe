import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
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
  Chip,
  LinearProgress,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ClearAll as ClearIcon,
  ArrowForward as ArrowIcon,
  Article as ArticleIcon,
  Feed as FeedIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../../api/articles';
import { sourcesApi } from '../../api/sources';
import { collectorApi } from '../../api/collectorApi';
import { ArticleStatus, ArticleSeverity, ArticleListParams } from '../../types/article';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import SeverityChip from '../../components/Common/SeverityChip';
import StatusChip from '../../components/Common/StatusChip';
import { statusSoftColors } from '../../styles/badges';

const STATUS_QUICK_FILTERS: { label: string; value: ArticleStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'New', value: ArticleStatus.New },
  { label: 'AI Verified', value: ArticleStatus.AiVerified },
  { label: 'Pending Review', value: ArticleStatus.PendingManualReview },
  { label: 'Approved', value: ArticleStatus.Approved },
  { label: 'Published', value: ArticleStatus.Published },
];

const trustColor = (score: number) =>
  score >= 70 ? '#2e7d32' : score >= 40 ? '#f9a825' : '#c62828';

const TrustMeter: React.FC<{ score: number }> = ({ score }) => {
  const color = trustColor(score);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 96 }}>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          bgcolor: `${color}18`,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Typography variant="caption" fontWeight={700} sx={{ color, minWidth: 26, textAlign: 'right' }}>
        {score}
      </Typography>
    </Box>
  );
};

const formatDate = (published: string | null, collected: string) => {
  const raw = published ?? collected;
  const date = new Date(raw);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryParams: ArticleListParams = {
    ...filters,
    search: searchText || undefined,
    skip: page * rowsPerPage,
    limit: rowsPerPage,
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count += 1;
    if (filters.severity) count += 1;
    if (filters.source_id) count += 1;
    if (searchText.trim()) count += 1;
    return count;
  }, [filters, searchText]);

  const handleFilterChange = (key: keyof ArticleListParams, value: string | number | undefined) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    setPage(0);
  };

  if (error) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Alert severity="error">Failed to load articles. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Page header */}
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
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FeedIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Intelligence Feed
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.6 }}>
            Browse collected security articles, filter by severity and status, and open any item for
            verification details.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Tooltip title="Refresh feed">
            <IconButton
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{
                border: '1px solid var(--color-border)',
                borderRadius: 2,
                color: 'var(--color-primary)',
              }}
            >
              <RefreshIcon sx={{ animation: isFetching ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </Tooltip>
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => collectAllMutation.mutate()}
              disabled={collectAllMutation.isPending}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
            >
              {collectAllMutation.isPending ? 'Collecting…' : 'Collect All'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters — collapsed by default */}
      <Box
        sx={{
          mb: 2,
          borderRadius: 2,
          bgcolor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={filtersOpen}
          aria-controls="intelligence-filters-panel"
          onClick={() => setFiltersOpen((open) => !open)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFiltersOpen((open) => !open);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 2.5,
            py: 1.75,
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background-color 0.15s ease',
            '&:hover': { bgcolor: 'var(--color-bg-subtle)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon sx={{ fontSize: 18, color: 'var(--color-primary)' }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Search & filters
            </Typography>
            {activeFilterCount > 0 && (
              <Chip label={`${activeFilterCount} active`} size="small" color="primary" variant="outlined" />
            )}
          </Box>
          <ExpandMoreIcon
            sx={{
              color: 'var(--color-text-secondary)',
              transition: 'transform 0.2s ease',
              transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>

        <Collapse in={filtersOpen} id="intelligence-filters-panel">
          <Box sx={{ px: 2.5, pb: 2.5, pt: 0, borderTop: '1px solid var(--color-border)' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2, mt: 2 }}>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flex: '1 1 240px', minWidth: 200 }}>
            <TextField
              placeholder="Search by title, URL, or content…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--color-text-secondary)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'var(--color-bg-subtle)',
                },
              }}
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filters.severity ?? ''}
              label="Severity"
              onChange={(e) => handleFilterChange('severity', e.target.value as ArticleSeverity)}
              sx={{ borderRadius: 2, bgcolor: 'var(--color-bg-subtle)' }}
            >
              <MenuItem value="">All severities</MenuItem>
              {Object.values(ArticleSeverity).map((s) => (
                <MenuItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={filters.source_id ?? ''}
              label="Source"
              onChange={(e) => handleFilterChange('source_id', e.target.value as number)}
              sx={{ borderRadius: 2, bgcolor: 'var(--color-bg-subtle)' }}
            >
              <MenuItem value="">All sources</MenuItem>
              {sources?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {activeFilterCount > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              Clear all
            </Button>
          )}
        </Box>

        {/* Status quick filters */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {STATUS_QUICK_FILTERS.map(({ label, value }) => {
            const isActive = (filters.status ?? '') === value;
            const chipColor = value ? statusSoftColors[value]?.color : undefined;
            return (
              <Chip
                key={label}
                label={label}
                size="small"
                onClick={() => handleFilterChange('status', value || undefined)}
                sx={{
                  fontWeight: 600,
                  cursor: 'pointer',
                  ...(isActive
                    ? {
                        bgcolor: chipColor ? `${chipColor}20` : 'var(--color-primary)',
                        color: chipColor ?? '#fff',
                        border: chipColor ? `1px solid ${chipColor}40` : 'none',
                        '&:hover': { bgcolor: chipColor ? `${chipColor}30` : 'var(--color-primary-dark)' },
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
          </Box>
        </Collapse>
      </Box>

      {/* Table */}
      <Box
        sx={{
          borderRadius: 2,
          bgcolor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  { label: 'Article', width: '36%' },
                  { label: 'Source', width: '14%' },
                  { label: 'Severity', width: '10%' },
                  { label: 'Status', width: '12%' },
                  { label: 'Trust', width: '12%' },
                  { label: 'Date', width: '10%' },
                  { label: '', width: '6%' },
                ].map(({ label, width }) => (
                  <TableCell
                    key={label || 'actions'}
                    sx={{
                      width,
                      bgcolor: 'var(--color-bg-subtle)',
                      color: 'var(--color-text-secondary)',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      py: 1.5,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} sx={{ borderBottom: '1px solid var(--color-border)' }}>
                          <Skeleton variant={j === 0 ? 'text' : 'rounded'} height={j === 0 ? 28 : 24} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.items.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 8, border: 'none' }}>
                        <Box sx={{ textAlign: 'center', maxWidth: 360, mx: 'auto' }}>
                          <ArticleIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 2, opacity: 0.5 }} />
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            No articles found
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {activeFilterCount > 0
                              ? 'Try adjusting your filters or search terms.'
                              : 'Run Collect All to pull the latest intelligence from your sources.'}
                          </Typography>
                          {activeFilterCount > 0 && (
                            <Button variant="outlined" startIcon={<ClearIcon />} onClick={clearFilters} sx={{ textTransform: 'none' }}>
                              Clear filters
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : data?.items.map((article) => (
                    <TableRow
                      key={article.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: 'rgba(25, 118, 210, 0.04)',
                          '& .row-arrow': { opacity: 1, transform: 'translateX(0)' },
                        },
                        '& td': { borderBottom: '1px solid var(--color-border)' },
                      }}
                      onClick={() => navigate(`/intelligence/${article.id}`)}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Tooltip title={article.title} placement="top-start">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              color: 'var(--color-text-primary)',
                              maxWidth: 420,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.4,
                            }}
                          >
                            {article.title}
                          </Typography>
                        </Tooltip>
                        {article.summary && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mt: 0.25,
                              maxWidth: 420,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {article.summary}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {sources?.find((s) => s.id === article.source_id)?.name ?? `#${article.source_id}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {article.severity ? (
                          <SeverityChip severity={article.severity} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={article.status} />
                      </TableCell>
                      <TableCell>
                        <TrustMeter score={article.trust_score} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(article.published_at, article.collected_at)}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title="Open source URL">
                            <IconButton
                              size="small"
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              component="a"
                              sx={{
                                color: 'var(--color-text-secondary)',
                                '&:hover': { color: 'var(--color-primary)' },
                              }}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <ArrowIcon
                            className="row-arrow"
                            sx={{
                              fontSize: 16,
                              color: 'var(--color-primary)',
                              opacity: 0,
                              transform: 'translateX(-4px)',
                              transition: 'opacity 0.15s ease, transform 0.15s ease',
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>

        {(data?.total ?? 0) > 0 && (
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            sx={{
              borderTop: '1px solid var(--color-border)',
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.8125rem',
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default IntelligenceList;
