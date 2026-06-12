import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  LinearProgress,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  Verified as VerifiedIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  AutoAwesome as GenerateIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi } from '../../api/articles';
import { approvalsApi } from '../../api/approvals';
import { contentApi } from '../../api/content';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { ArticleStatus } from '../../types/article';

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

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

const IntelligenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');

  const articleId = parseInt(id ?? '0', 10);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesApi.getArticle(articleId),
    enabled: !!articleId,
  });

  const verifyMutation = useMutation({
    mutationFn: () => articlesApi.verifyArticle(articleId),
    onSuccess: () => {
      showSuccess('Article verified successfully');
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
    },
    onError: () => showError('Verification failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (notes: string) => approvalsApi.approve(articleId, notes),
    onSuccess: () => {
      showSuccess('Article approved');
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      setApprovalNotes('');
    },
    onError: () => showError('Failed to approve article'),
  });

  const rejectMutation = useMutation({
    mutationFn: (notes: string) => approvalsApi.reject(articleId, notes),
    onSuccess: () => {
      showSuccess('Article rejected');
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      setApprovalNotes('');
    },
    onError: () => showError('Failed to reject article'),
  });

  const generateMutation = useMutation({
    mutationFn: () => contentApi.generateContent(articleId),
    onSuccess: () => {
      showSuccess('Content generated successfully');
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      setTabValue(3);
    },
    onError: () => showError('Content generation failed'),
  });

  const canActOnArticle = user?.role === 'admin' || user?.role === 'analyst';

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={40} width={300} sx={{ bgcolor: 'var(--color-bg-subtle)', mb: 2 }} />
        <Skeleton height={200} sx={{ bgcolor: 'var(--color-bg-subtle)' }} />
      </Box>
    );
  }

  if (error || !article) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load article details.</Alert>
      </Box>
    );
  }

  const vr = article.verification_result;
  const breakdownData = vr?.trust_score_breakdown
    ? Object.entries(vr.trust_score_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: 'var(--color-primary)', mb: 2 }}
        >
          Back
        </Button>
        <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
                  {article.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {article.severity && (
                    <Chip
                      label={article.severity}
                      size="small"
                      sx={{
                        bgcolor: `${severityColor[article.severity]}20`,
                        color: severityColor[article.severity],
                        textTransform: 'capitalize',
                      }}
                    />
                  )}
                  <Chip
                    label={article.status.replace(/_/g, ' ')}
                    size="small"
                    color={statusColor[article.status] ?? 'default'}
                  />
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                    Trust Score: {article.trust_score}/100
                  </Typography>
                  {article.author && (
                    <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                      By {article.author}
                    </Typography>
                  )}
                  {article.published_at && (
                    <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(article.published_at).toLocaleDateString()}
                    </Typography>
                  )}
                  <Link href={article.url} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--color-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <OpenIcon fontSize="small" /> Source
                  </Link>
                </Box>
              </Box>

              {canActOnArticle && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={verifyMutation.isPending ? <CircularProgress size={16} /> : <VerifiedIcon />}
                    onClick={() => verifyMutation.mutate()}
                    disabled={verifyMutation.isPending}
                    sx={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ApproveIcon />}
                    onClick={() => approveMutation.mutate(approvalNotes)}
                    disabled={approveMutation.isPending}
                    sx={{ borderColor: '#388e3c', color: '#388e3c' }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RejectIcon />}
                    onClick={() => rejectMutation.mutate(approvalNotes)}
                    disabled={rejectMutation.isPending}
                    sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={generateMutation.isPending ? <CircularProgress size={16} /> : <GenerateIcon />}
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    sx={{ borderColor: '#7b1fa2', color: '#7b1fa2' }}
                  >
                    Generate Content
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Notes field */}
      {canActOnArticle && (
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Approval Notes (optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'var(--color-text-primary)',
                '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--color-primary)' },
            }}
          />
        </Box>
      )}

      {/* Tabs */}
      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: '1px solid var(--color-border-primary)' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              '& .MuiTab-root': { color: 'var(--color-text-secondary)', textTransform: 'none' },
              '& .Mui-selected': { color: 'var(--color-primary)' },
              '& .MuiTabs-indicator': { bgcolor: 'var(--color-primary)' },
            }}
          >
            <Tab label="Overview" />
            <Tab label="AI Analysis" disabled={!vr} />
            <Tab label="Trust Score" disabled={!vr} />
            <Tab label={`Generated Content (${article.generated_content?.length ?? 0})`} />
          </Tabs>
        </Box>

        <CardContent>
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            {article.summary && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ color: 'var(--color-primary)', fontWeight: 600, mb: 1 }}>
                  Summary
                </Typography>
                <Typography sx={{ color: 'var(--color-text-primary)', lineHeight: 1.7 }}>
                  {article.summary}
                </Typography>
              </Box>
            )}
            <Divider sx={{ borderColor: 'rgba(0,120,215,0.2)', my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: 'var(--color-primary)', fontWeight: 600, mb: 1 }}>
                Content Excerpt
              </Typography>
              <Typography
                sx={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.7,
                  maxHeight: 200,
                  overflow: 'hidden',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: 'linear-gradient(transparent, var(--color-card-bg))',
                  },
                }}
              >
                {article.content ?? 'No content available.'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
                Metadata
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
                {[
                  { label: 'Collected', value: new Date(article.collected_at).toLocaleString() },
                  { label: 'Published', value: article.published_at ? new Date(article.published_at).toLocaleString() : 'N/A' },
                  { label: 'Source ID', value: article.source_id ?? 'N/A' },
                  { label: 'Status', value: article.status },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: 'var(--color-primary)' }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-primary)' }}>{String(value)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </TabPanel>

          {/* AI Analysis Tab */}
          <TabPanel value={tabValue} index={1}>
            {vr ? (
              <Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
                  {[
                    { label: 'Authenticity Score', value: vr.authenticity_score, color: 'var(--color-primary)' },
                    { label: 'Credibility Score', value: vr.credibility_score, color: '#388e3c' },
                    { label: 'Confidence', value: vr.confidence ?? 'N/A', color: '#7b1fa2' },
                    { label: 'Severity', value: vr.severity ?? 'N/A', color: vr.severity ? severityColor[vr.severity] : 'var(--color-text-secondary)' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} sx={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>{label}</Typography>
                        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>
                          {typeof value === 'number' ? `${value}/100` : value}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>

                {vr.business_impact && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#f9a825', fontWeight: 600, mb: 1 }}>Business Impact</Typography>
                    <Typography sx={{ color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{vr.business_impact}</Typography>
                  </Box>
                )}

                {vr.ai_analysis && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: 'var(--color-primary)', fontWeight: 600, mb: 1 }}>AI Analysis</Typography>
                    <Typography sx={{ color: 'var(--color-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{vr.ai_analysis}</Typography>
                  </Box>
                )}

                {vr.recommended_actions && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#388e3c', fontWeight: 600, mb: 1 }}>Recommended Actions</Typography>
                    <Typography sx={{ color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{vr.recommended_actions}</Typography>
                  </Box>
                )}

                {vr.cve_references && vr.cve_references.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#d32f2f', fontWeight: 600, mb: 1 }}>CVE References</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {vr.cve_references.map((cve) => (
                        <Chip
                          key={cve}
                          label={cve}
                          component="a"
                          href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ef5350' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {vr.sources_checked && vr.sources_checked.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'var(--color-primary)', fontWeight: 600, mb: 1 }}>Sources Checked</Typography>
                    <List dense>
                      {vr.sources_checked.map((src, i) => (
                        <ListItem key={i} sx={{ py: 0 }}>
                          <ListItemText
                            primary={src.name}
                            secondary={src.found ? 'Found' : 'Not found'}
                            sx={{
                              '& .MuiListItemText-primary': { color: 'var(--color-text-primary)', fontSize: 14 },
                              '& .MuiListItemText-secondary': { color: src.found ? '#388e3c' : 'var(--color-text-secondary)' },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info">No AI analysis available. Click "Verify" to run AI analysis.</Alert>
            )}
          </TabPanel>

          {/* Trust Score Tab */}
          <TabPanel value={tabValue} index={2}>
            {vr ? (
              <Box>
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h2" sx={{ color: article.trust_score >= 70 ? '#388e3c' : article.trust_score >= 40 ? '#f9a825' : '#d32f2f', fontWeight: 700 }}>
                    {article.trust_score}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Overall Trust Score / 100</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={article.trust_score}
                    sx={{
                      mt: 1,
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'var(--color-bg-subtle)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: article.trust_score >= 70 ? '#388e3c' : article.trust_score >= 40 ? '#f9a825' : '#d32f2f',
                        borderRadius: 5,
                      },
                    }}
                  />
                </Box>

                {breakdownData.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'var(--color-primary)', fontWeight: 600, mb: 2 }}>Score Breakdown</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={breakdownData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} domain={[0, 100]} />
                        <ReTooltip
                          contentStyle={{ background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)', borderRadius: 8 }}
                          labelStyle={{ color: 'var(--color-primary)' }}
                          itemStyle={{ color: 'var(--color-text-primary)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {breakdownData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.value >= 70 ? '#388e3c' : entry.value >= 40 ? '#f9a825' : '#d32f2f'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info">No trust score data available. Run verification first.</Alert>
            )}
          </TabPanel>

          {/* Generated Content Tab */}
          <TabPanel value={tabValue} index={3}>
            {article.generated_content && article.generated_content.length > 0 ? (
              <Box>
                {article.generated_content.map((gc) => (
                  <Accordion
                    key={gc.id}
                    sx={{
                      background: 'rgba(0,120,215,0.05)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '8px !important',
                      mb: 1,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandIcon sx={{ color: 'var(--color-primary)' }} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                          {gc.content_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Typography>
                        <Chip
                          label={gc.is_approved ? 'Approved' : 'Draft'}
                          size="small"
                          color={gc.is_approved ? 'success' : 'default'}
                          sx={{ fontSize: 11, height: 20 }}
                        />
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(gc.updated_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {gc.title && (
                        <Typography variant="subtitle2" sx={{ color: 'var(--color-primary)', mb: 1 }}>
                          {gc.title}
                        </Typography>
                      )}
                      <Typography
                        sx={{
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          fontSize: 14,
                          maxHeight: 300,
                          overflow: 'auto',
                        }}
                      >
                        {gc.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
                  No generated content yet.
                </Typography>
                {canActOnArticle && (
                  <Button
                    variant="outlined"
                    startIcon={generateMutation.isPending ? <CircularProgress size={16} /> : <GenerateIcon />}
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    sx={{ borderColor: '#7b1fa2', color: '#7b1fa2' }}
                  >
                    Generate Content
                  </Button>
                )}
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default IntelligenceDetail;
