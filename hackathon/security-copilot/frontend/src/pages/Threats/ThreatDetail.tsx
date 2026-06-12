import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Button, Alert, Skeleton,
  Divider, LinearProgress, List, ListItem, ListItemText, Table, TableHead,
  TableRow, TableCell, TableBody,
} from '@mui/material';
import {
  ArrowBack as BackIcon, OpenInNew as OpenIcon,
  BugReport as CVEIcon, Warning as RiskIcon, Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { threatsApi } from '../../api/threatsApi';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f', high: '#f57c00', medium: '#f9a825', low: '#388e3c',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  cve: '#1565c0', vendor: '#7b1fa2', product: '#0097a7',
  vulnerability_type: '#e65100', threat_indicator: '#c62828',
};

const ThreatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const threatId = Number(id);

  const { data: threat, isLoading, error } = useQuery({
    queryKey: ['threat', threatId],
    queryFn: () => threatsApi.getThreat(threatId),
    enabled: !isNaN(threatId),
  });

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load threat details.</Alert></Box>;
  if (isLoading) return (
    <Box sx={{ p: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}
    </Box>
  );
  if (!threat) return null;

  const ra = threat.risk_assessment;
  const severityColor = SEVERITY_COLORS[threat.severity ?? ''] ?? '#607d8b';
  const cves = threat.entities.filter((e) => e.entity_type === 'cve');
  const vendors = threat.entities.filter((e) => e.entity_type === 'vendor');
  const products = threat.entities.filter((e) => e.entity_type === 'product');
  const vulnTypes = threat.entities.filter((e) => e.entity_type === 'vulnerability_type');

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/threats')} sx={{ color: 'var(--color-primary)', mb: 2 }}>
        Back to Threat Feed
      </Button>

      {/* Header */}
      <Card sx={{ background: 'var(--color-card-bg)', border: `1px solid ${severityColor}40`, borderRadius: 2, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
                {threat.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {threat.severity && (
                  <Chip label={threat.severity.toUpperCase()} size="small" sx={{ bgcolor: `${severityColor}20`, color: severityColor, fontWeight: 700 }} />
                )}
                <Chip label={threat.confidence_level.toUpperCase()} size="small" color={threat.confidence_level === 'verified' || threat.confidence_level === 'high' ? 'success' : 'default'} />
                <Chip label={threat.source_adapter.replace('_', ' ').toUpperCase()} size="small" variant="outlined" sx={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-primary)' }} />
                <Chip label={threat.status} size="small" />
              </Box>
            </Box>
            {threat.url && (
              <Button href={threat.url} target="_blank" rel="noopener" endIcon={<OpenIcon />} size="small" sx={{ color: 'var(--color-primary)' }}>
                Source
              </Button>
            )}
          </Box>

          <Typography sx={{ color: 'var(--color-text-secondary)', mt: 2 }}>
            Collected: {new Date(threat.collected_at).toLocaleString()}
            {threat.published_at && ` · Published: ${new Date(threat.published_at).toLocaleString()}`}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Description */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 1 }}>Description</Typography>
              <Typography sx={{ color: 'var(--color-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {threat.description || 'No description available.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Entities */}
          <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CVEIcon sx={{ color: '#1565c0' }} /> Extracted Entities
              </Typography>

              {cves.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', mb: 1, display: 'block' }}>CVE References</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {cves.map((e) => (
                      <Chip key={e.id} label={e.value} size="small" sx={{ bgcolor: '#1565c020', color: 'var(--color-primary)', fontFamily: 'monospace' }}
                        onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${e.value}`, '_blank')} />
                    ))}
                  </Box>
                </Box>
              )}

              {vulnTypes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', mb: 1, display: 'block' }}>Vulnerability Types</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {vulnTypes.map((e) => (
                      <Chip key={e.id} label={e.value.replace(/_/g, ' ')} size="small" sx={{ bgcolor: '#e6510020', color: '#ff9100' }} />
                    ))}
                  </Box>
                </Box>
              )}

              {vendors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', mb: 1, display: 'block' }}>Affected Vendors</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {vendors.map((e) => (
                      <Chip key={e.id} label={e.value} size="small" sx={{ bgcolor: '#7b1fa220', color: '#ce93d8' }} />
                    ))}
                  </Box>
                </Box>
              )}

              {products.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', mb: 1, display: 'block' }}>Affected Products</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {products.map((e) => (
                      <Chip key={e.id} label={e.value} size="small" sx={{ bgcolor: '#0097a720', color: '#80deea' }} />
                    ))}
                  </Box>
                </Box>
              )}

              {threat.entities.length === 0 && (
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>No entities extracted.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Scores sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Confidence */}
          <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedIcon sx={{ color: 'var(--color-primary)' }} /> Confidence
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h3" sx={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                  {threat.confidence_score}
                </Typography>
                <Box>
                  <Chip label={threat.confidence_level.toUpperCase()} size="small" color={threat.confidence_level === 'verified' || threat.confidence_level === 'high' ? 'success' : 'default'} />
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={threat.confidence_score} sx={{ height: 6, borderRadius: 3, bgcolor: 'var(--color-border-primary)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--color-primary)' }, mb: 2 }} />
              {threat.confidence_reasoning && threat.confidence_reasoning.length > 0 && (
                <List dense>
                  {threat.confidence_reasoning.map((r, i) => (
                    <ListItem key={i} sx={{ py: 0.2, px: 0 }}>
                      <ListItemText primary={r} primaryTypographyProps={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Risk */}
          {ra && (
            <Card sx={{ background: 'var(--color-card-bg)', border: `1px solid ${SEVERITY_COLORS[ra.severity] ?? '#607d8b'}40`, borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RiskIcon sx={{ color: SEVERITY_COLORS[ra.severity] ?? '#607d8b' }} /> Risk Assessment
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="h3" sx={{ color: SEVERITY_COLORS[ra.severity] ?? '#607d8b', fontWeight: 700 }}>
                    {ra.risk_score}
                  </Typography>
                  <Chip label={ra.severity.toUpperCase()} size="small" sx={{ bgcolor: `${SEVERITY_COLORS[ra.severity] ?? '#607d8b'}20`, color: SEVERITY_COLORS[ra.severity] ?? '#607d8b', fontWeight: 700 }} />
                </Box>
                <LinearProgress variant="determinate" value={ra.risk_score} sx={{ height: 6, borderRadius: 3, bgcolor: 'var(--color-bg-subtle)', '& .MuiLinearProgress-bar': { bgcolor: SEVERITY_COLORS[ra.severity] ?? '#607d8b' }, mb: 2 }} />

                <Table size="small">
                  <TableBody>
                    {[
                      ['CVSS Score', ra.cvss_score != null ? ra.cvss_score.toFixed(1) : '—'],
                      ['Exploit Active', ra.exploit_available ? '⚠ Yes' : 'No'],
                      ['Public PoC', ra.public_poc ? '⚠ Yes' : 'No'],
                      ['Vendor Confirmed', ra.vendor_confirmed ? '✓ Yes' : 'No'],
                      ['Mention Velocity (24h)', String(ra.mention_velocity)],
                    ].map(([label, val]) => (
                      <TableRow key={label} sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)', py: 0.5 } }}>
                        <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{label}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 500 }}>{val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {ra.reasons && ra.reasons.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {ra.reasons.map((r, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', color: 'var(--color-text-secondary)', mt: 0.3 }}>• {r}</Typography>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related events */}
          {threat.related_events.length > 0 && (
            <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 1 }}>Related Events</Typography>
                {threat.related_events.map((rel) => (
                  <Box key={rel.event_id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, cursor: 'pointer' }}
                    onClick={() => navigate(`/threats/${rel.event_id}`)}>
                    <Typography variant="body2" sx={{ color: 'var(--color-primary)' }}>Event #{rel.event_id}</Typography>
                    <Chip label={`${(rel.similarity * 100).toFixed(0)}% match`} size="small" sx={{ fontSize: 11, height: 18 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ThreatDetail;
