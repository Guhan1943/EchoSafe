import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Skeleton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Grid,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  RateReview as ReviewIcon,
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
import { useNotification } from '../../hooks/useNotification';

const severityColor: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#388e3c',
  info: '#1565c0',
};

const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const articleId = parseInt(id ?? '0', 10);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesApi.getArticle(articleId),
    enabled: !!articleId,
  });

  const approveMutation = useMutation({
    mutationFn: () => approvalsApi.approve(articleId, notes),
    onSuccess: () => {
      showSuccess('Article approved successfully');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      navigate('/review');
    },
    onError: () => showError('Failed to approve article'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => approvalsApi.reject(articleId, notes),
    onSuccess: () => {
      showSuccess('Article rejected');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      navigate('/review');
    },
    onError: () => showError('Failed to reject article'),
  });

  const underReviewMutation = useMutation({
    mutationFn: () => approvalsApi.underReview(articleId, notes),
    onSuccess: () => {
      showSuccess('Article marked as under review');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      navigate('/review');
    },
    onError: () => showError('Failed to update status'),
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={40} width={300} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />
        <Skeleton height={300} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      </Box>
    );
  }

  if (error || !article) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load article for review.</Alert>
      </Box>
    );
  }

  const vr = article.verification_result;
  const breakdownData = vr?.trust_score_breakdown
    ? Object.entries(vr.trust_score_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const isPending = approveMutation.isPending || rejectMutation.isPending || underReviewMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/review')} sx={{ color: '#4a9ede', mb: 2 }}>
        Back to Queue
      </Button>

      {/* Article Header */}
      <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, mb: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700, mb: 1 }}>
            {article.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {article.severity && (
              <Chip
                label={article.severity}
                size="small"
                sx={{ bgcolor: `${severityColor[article.severity]}20`, color: severityColor[article.severity], textTransform: 'capitalize' }}
              />
            )}
            <Chip label={`Trust: ${article.trust_score}/100`} size="small" sx={{ bgcolor: 'rgba(0,120,215,0.15)', color: '#4a9ede' }} />
            {article.author && (
              <Typography variant="caption" sx={{ color: '#8da9c4', alignSelf: 'center' }}>By {article.author}</Typography>
            )}
            <Link href={article.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#4a9ede', fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <OpenIcon fontSize="small" /> View Source
            </Link>
          </Box>

          {article.summary && (
            <Typography sx={{ color: '#c8dff0', lineHeight: 1.7, mb: 2 }}>
              {article.summary}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* AI Verification Results */}
        <Grid item xs={12} lg={8}>
          {vr ? (
            <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>AI Verification Results</Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {[
                    { label: 'Authenticity', value: vr.authenticity_score, color: '#0078d4' },
                    { label: 'Credibility', value: vr.credibility_score, color: '#388e3c' },
                  ].map(({ label, value, color }) => (
                    <Grid item xs={6} key={label}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: `${color}10`, borderRadius: 2, border: `1px solid ${color}30` }}>
                        <Typography variant="caption" sx={{ color: '#8da9c4' }}>{label}</Typography>
                        <Typography variant="h4" sx={{ color, fontWeight: 700 }}>{value}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={value}
                          sx={{
                            mt: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {vr.business_impact && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#f9a825', mb: 0.5 }}>Business Impact</Typography>
                    <Typography sx={{ color: '#c8dff0', fontSize: 14, lineHeight: 1.6 }}>{vr.business_impact}</Typography>
                  </Box>
                )}

                {vr.ai_analysis && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#4a9ede', mb: 0.5 }}>Analysis</Typography>
                    <Typography sx={{ color: '#c8dff0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{vr.ai_analysis}</Typography>
                  </Box>
                )}

                {vr.cve_references && vr.cve_references.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', mb: 1 }}>CVE References</Typography>
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
                          size="small"
                          sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ef5350' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {vr.sources_checked && vr.sources_checked.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#4a9ede', mb: 0.5 }}>Sources Checked</Typography>
                    <List dense>
                      {vr.sources_checked.map((src, i) => (
                        <ListItem key={i} sx={{ py: 0 }}>
                          <ListItemText
                            primary={src.name}
                            secondary={src.found ? 'Confirmed' : 'Not found'}
                            sx={{
                              '& .MuiListItemText-primary': { color: '#c8dff0', fontSize: 13 },
                              '& .MuiListItemText-secondary': { color: src.found ? '#388e3c' : '#8da9c4', fontSize: 12 },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              No AI verification has been run on this article yet. Navigate to the Intelligence detail page to run verification.
            </Alert>
          )}

          {/* Trust Score Breakdown */}
          {breakdownData.length > 0 && (
            <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                  Trust Score Breakdown
                </Typography>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h2" sx={{ color: article.trust_score >= 70 ? '#388e3c' : article.trust_score >= 40 ? '#f9a825' : '#d32f2f', fontWeight: 700 }}>
                    {article.trust_score}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8da9c4' }}>/ 100 Total Trust Score</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={breakdownData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#8da9c4', fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: '#8da9c4', fontSize: 11 }} domain={[0, 100]} />
                    <ReTooltip
                      contentStyle={{ background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)', borderRadius: 8 }}
                      labelStyle={{ color: '#4a9ede' }}
                      itemStyle={{ color: '#c8dff0' }}
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
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Approval Panel */}
        <Grid item xs={12} lg={4}>
          <Card
            sx={{
              background: 'rgba(13, 27, 42, 0.9)',
              border: '1px solid rgba(0,120,215,0.2)',
              borderRadius: 2,
              position: { lg: 'sticky' },
              top: { lg: 24 },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ color: '#e8f4fd', mb: 2 }}>
                Review Decision
              </Typography>

              <Typography variant="caption" sx={{ color: '#8da9c4' }}>Status</Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={article.status.replace(/_/g, ' ')}
                  size="small"
                  sx={{ bgcolor: 'rgba(0,120,215,0.15)', color: '#4a9ede' }}
                />
              </Box>

              <Divider sx={{ borderColor: 'rgba(0,120,215,0.2)', mb: 2 }} />

              <TextField
                label="Notes"
                placeholder="Add review notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={4}
                fullWidth
                size="small"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#e8f4fd',
                    '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,120,215,0.5)' },
                  },
                  '& .MuiInputLabel-root': { color: '#4a9ede' },
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isPending ? <CircularProgress size={16} /> : <ApproveIcon />}
                  onClick={() => approveMutation.mutate()}
                  disabled={isPending}
                  sx={{
                    bgcolor: '#388e3c',
                    '&:hover': { bgcolor: '#2e7d32' },
                    '&:disabled': { bgcolor: 'rgba(56,142,60,0.3)' },
                  }}
                >
                  Approve
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={isPending ? <CircularProgress size={16} /> : <ReviewIcon />}
                  onClick={() => underReviewMutation.mutate()}
                  disabled={isPending}
                  sx={{ borderColor: '#f9a825', color: '#f9a825', '&:hover': { bgcolor: 'rgba(249,168,37,0.1)' } }}
                >
                  Mark Under Review
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={isPending ? <CircularProgress size={16} /> : <RejectIcon />}
                  onClick={() => rejectMutation.mutate()}
                  disabled={isPending}
                  sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}
                >
                  Reject
                </Button>
              </Box>

              {/* Previous Approvals */}
              {article.approvals && article.approvals.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ borderColor: 'rgba(0,120,215,0.2)', mb: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ color: '#8da9c4', mb: 1 }}>
                    Approval History
                  </Typography>
                  {article.approvals.map((approval) => (
                    <Box
                      key={approval.id}
                      sx={{ mb: 1, p: 1, bgcolor: 'rgba(0,120,215,0.05)', borderRadius: 1 }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={approval.action}
                          size="small"
                          color={approval.action === 'approved' ? 'success' : approval.action === 'rejected' ? 'error' : 'warning'}
                          sx={{ fontSize: 10, height: 18 }}
                        />
                        <Typography variant="caption" sx={{ color: '#8da9c4' }}>
                          {new Date(approval.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {approval.notes && (
                        <Typography variant="caption" sx={{ color: '#c8dff0', display: 'block', mt: 0.5 }}>
                          {approval.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReviewDetail;
