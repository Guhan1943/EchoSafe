import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Link,
  Grid,
  Divider,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as ConfirmIcon,
  Close as CloseIcon,
  Article as ArticleIcon,
  Publish as PublishIcon,
  History as HistoryIcon,
  Hub as HubIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contentApi } from '../../api/content';
import { channelsApi } from '../../api/channelsApi';
import { clientRecipientsApi } from '../../api/clientRecipientsApi';
import GeneratedContentPreview from '../../components/Content/GeneratedContentPreview';
import { GeneratedContent, GeneratedContentUpdate, PublishedContent } from '../../types/content';
import { useNotification } from '../../hooks/useNotification';
import { softBadgeSx } from '../../styles/badges';
import {
  CHANNEL_LABELS,
  CONTENT_TYPE_LABELS,
  channelForType,
  needsRecipients,
} from '../../utils/contentChannels';
import type { AxiosError } from 'axios';

const panelSx = {
  borderRadius: 2,
  bgcolor: 'var(--color-card-bg)',
  border: '1px solid var(--color-border)',
  overflow: 'hidden' as const,
};

const thSx = {
  bgcolor: 'var(--color-bg-subtle)',
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  py: 1.5,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: 'var(--color-bg-subtle)',
  },
};

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box hidden={value !== index} sx={{ pt: 0 }}>
    {value === index && children}
  </Box>
);

const formatDate = (raw: string) => {
  const date = new Date(raw);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const ContentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pubPage, setPubPage] = useState(0);
  const rowsPerPage = 20;

  const [editingContent, setEditingContent] = useState<GeneratedContent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const [publishingContent, setPublishingContent] = useState<GeneratedContent | null>(null);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishBody, setPublishBody] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: generatedContent, isLoading: contentLoading } = useQuery({
    queryKey: ['generated-content', page],
    queryFn: () =>
      contentApi.listContent({ skip: page * rowsPerPage, limit: rowsPerPage, approved_only: true }),
  });

  const { data: publishHistory, isLoading: histLoading } = useQuery({
    queryKey: ['publish-history', pubPage],
    queryFn: () => contentApi.getPublishHistory({ skip: pubPage * rowsPerPage, limit: rowsPerPage }),
  });

  const { data: channelStatus } = useQuery({
    queryKey: ['channel-status'],
    queryFn: channelsApi.list,
  });

  const { data: clientRecipientsData } = useQuery({
    queryKey: ['client-recipients', 'active'],
    queryFn: () => clientRecipientsApi.list(true),
  });

  const activeClients = clientRecipientsData?.items ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GeneratedContentUpdate }) =>
      contentApi.updateContent(id, data),
    onSuccess: () => {
      showSuccess('Content updated successfully');
      setEditingContent(null);
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
    },
    onError: () => showError('Failed to update content'),
  });

  const publishMutation = useMutation({
    mutationFn: ({
      contentId,
      recipientIds,
    }: {
      contentId: number;
      recipientIds?: number[];
    }) => contentApi.publishContent(contentId, { recipient_ids: recipientIds }),
  });

  const closePublishDialog = () => {
    setPublishingContent(null);
    setPublishTitle('');
    setPublishBody('');
    setSelectedRecipientIds([]);
    setIsPublishing(false);
  };

  const openEditor = (content: GeneratedContent) => {
    setEditingContent(content);
    setEditTitle(content.title ?? '');
    setEditBody(content.content);
  };

  const handleSave = () => {
    if (!editingContent) return;
    updateMutation.mutate({
      id: editingContent.id,
      data: { title: editTitle, content: editBody },
    });
  };

  const openPublishDialog = (content: GeneratedContent) => {
    setPublishingContent(content);
    setPublishTitle(content.title ?? '');
    setPublishBody(content.content);
  };

  useEffect(() => {
    if (!publishingContent || !needsRecipients(publishingContent.content_type)) return;
    setSelectedRecipientIds((prev) => {
      if (prev.length > 0) return prev;
      return activeClients.map((c) => c.id);
    });
  }, [publishingContent, activeClients]);

  const handlePublish = async () => {
    if (!publishingContent) return;

    const recipientIds = needsRecipients(publishingContent.content_type)
      ? selectedRecipientIds
      : undefined;

    if (
      needsRecipients(publishingContent.content_type) &&
      (!recipientIds || recipientIds.length === 0)
    ) {
      return;
    }

    setIsPublishing(true);
    try {
      const hasChanges =
        publishTitle !== (publishingContent.title ?? '') ||
        publishBody !== publishingContent.content;

      if (hasChanges) {
        await contentApi.updateContent(publishingContent.id, {
          title: publishTitle,
          content: publishBody,
        });
      }

      const result = await publishMutation.mutateAsync({
        contentId: publishingContent.id,
        recipientIds,
      });

      showSuccess(
        `Published to ${CHANNEL_LABELS[result.platform] ?? result.platform}${
          result.response_message ? `: ${result.response_message}` : ''
        }`
      );
      closePublishDialog();
      queryClient.invalidateQueries({ queryKey: ['publish-history'] });
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      showError(axiosErr.response?.data?.detail ?? 'Failed to publish content');
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleRecipient = (id: number) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAllRecipients = () => {
    setSelectedRecipientIds(activeClients.map((c) => c.id));
  };

  const clearRecipients = () => {
    setSelectedRecipientIds([]);
  };

  const isChannelConnected = (platform: string) => {
    if (platform === 'blog') return true;
    return channelStatus?.find((c) => c.channel_type === platform)?.connected ?? false;
  };

  const linkedInConnected = channelStatus?.find((c) => c.channel_type === 'linkedin')?.connected ?? false;
  const emailConnected = channelStatus?.find((c) => c.channel_type === 'email')?.connected ?? false;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
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
                bgcolor: 'rgba(106, 27, 154, 0.1)',
                color: '#6a1b9a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PublishIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Content Management
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, lineHeight: 1.6 }}>
            Review approved content, edit drafts, and publish to LinkedIn, email, or internal blog channels.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            icon={<LinkedInIcon sx={{ fontSize: '16px !important' }} />}
            label={linkedInConnected ? 'LinkedIn connected' : 'LinkedIn offline'}
            size="small"
            sx={softBadgeSx(linkedInConnected ? '#2e7d32' : '#e65100')}
          />
          <Chip
            icon={<EmailIcon sx={{ fontSize: '16px !important' }} />}
            label={emailConnected ? 'Email connected' : 'Email offline'}
            size="small"
            sx={softBadgeSx(emailConnected ? '#2e7d32' : '#e65100')}
          />
          <Button
            variant="outlined"
            startIcon={<HubIcon />}
            onClick={() => navigate('/publishing-channels')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Channels
          </Button>
        </Box>
      </Box>

      {(!linkedInConnected || !emailConnected) && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Some publishing channels need setup —{' '}
          <Button
            size="small"
            sx={{ p: 0, textTransform: 'none', verticalAlign: 'baseline', fontWeight: 600 }}
            onClick={() => navigate('/publishing-channels')}
          >
            configure in Publishing Channels
          </Button>
        </Alert>
      )}

      {/* Tabs + tables */}
      <Box sx={panelSx}>
        <Box sx={{ borderBottom: '1px solid var(--color-border)', px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                color: 'var(--color-text-secondary)',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
              '& .Mui-selected': { color: 'var(--color-primary)' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab
              icon={<ArticleIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Approved (${generatedContent?.total ?? '…'})`}
            />
            <Tab
              icon={<HistoryIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Published (${publishHistory?.total ?? '…'})`}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 0, sm: 0 } }}>
          {/* Approved content */}
          <TabPanel value={tabValue} index={0}>
            {contentLoading ? (
              <Box sx={{ p: 2.5 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={52} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : generatedContent?.items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                <ArticleIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  No approved content yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
                  Approve an article in the Review Queue, then generate content from the Intelligence Feed.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/intelligence')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Go to Intelligence Feed
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Content', 'Article', 'Type', 'Channel', 'Updated', 'Actions'].map((h) => (
                          <TableCell key={h} sx={thSx}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generatedContent?.items.map((content: GeneratedContent) => {
                        const platform = channelForType(content.content_type);
                        const connected = isChannelConnected(platform);
                        const typeLabel = CONTENT_TYPE_LABELS[content.content_type] ?? content.content_type;
                        return (
                          <TableRow
                            key={content.id}
                            hover
                            sx={{
                              transition: 'background-color 0.15s ease',
                              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' },
                              '& td': { borderBottom: '1px solid var(--color-border)' },
                            }}
                          >
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" fontWeight={700} color="primary">
                                #{content.id}
                              </Typography>
                              {content.title && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: 'block',
                                    maxWidth: 220,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    mt: 0.25,
                                  }}
                                >
                                  {content.title}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                                onClick={() => navigate(`/intelligence/${content.article_id}`)}
                                sx={{
                                  color: 'var(--color-primary)',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  p: 0,
                                  minWidth: 0,
                                }}
                              >
                                #{content.article_id}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {typeLabel}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={connected ? CHANNEL_LABELS[platform] : `${CHANNEL_LABELS[platform] ?? platform} · offline`}
                                size="small"
                                onClick={
                                  platform === 'blog'
                                    ? () => navigate('/blog')
                                    : undefined
                                }
                                sx={{
                                  ...softBadgeSx(connected ? '#2e7d32' : '#e65100'),
                                  ...(platform === 'blog'
                                    ? {
                                        cursor: 'pointer',
                                        '&:hover': { filter: 'brightness(0.95)' },
                                      }
                                    : {}),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(content.updated_at)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Edit content">
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditor(content)}
                                    sx={{
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 1.5,
                                      color: 'var(--color-primary)',
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={!connected}
                                  onClick={() => openPublishDialog(content)}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderRadius: 1.5,
                                    minWidth: 80,
                                    bgcolor: connected ? '#2e7d32' : undefined,
                                    '&:hover': connected ? { bgcolor: '#1b5e20' } : undefined,
                                  }}
                                >
                                  Publish
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
                <TablePagination
                  component="div"
                  count={generatedContent?.total ?? 0}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[20]}
                  sx={{ borderTop: '1px solid var(--color-border)' }}
                />
              </>
            )}
          </TabPanel>

          {/* Published history */}
          <TabPanel value={tabValue} index={1}>
            {histLoading ? (
              <Box sx={{ p: 2.5 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={52} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : publishHistory?.items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                <HistoryIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  No published content yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Published items will appear here with channel status and delivery response.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Publish ID', 'Content', 'Article', 'Channel', 'Status', 'Published', 'Response'].map((h) => (
                          <TableCell key={h} sx={thSx}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {publishHistory?.items.map((pub: PublishedContent) => (
                        <TableRow
                          key={pub.id}
                          hover
                          sx={{
                            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' },
                            '& td': { borderBottom: '1px solid var(--color-border)' },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              #{pub.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="primary">
                              #{pub.generated_content_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                              onClick={() => navigate(`/intelligence/${pub.article_id}`)}
                              sx={{
                                color: 'var(--color-primary)',
                                textTransform: 'none',
                                fontWeight: 600,
                                p: 0,
                                minWidth: 0,
                              }}
                            >
                              #{pub.article_id}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {pub.platform === 'blog' ? (
                              <Chip
                                label={CHANNEL_LABELS[pub.platform] ?? pub.platform}
                                size="small"
                                onClick={() => navigate(`/blog/${pub.id}`)}
                                sx={{
                                  ...softBadgeSx('#6a1b9a'),
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  '&:hover': { filter: 'brightness(0.95)' },
                                }}
                              />
                            ) : (
                              <Typography variant="body2" fontWeight={500}>
                                {CHANNEL_LABELS[pub.platform] ?? pub.platform}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pub.status}
                              size="small"
                              sx={softBadgeSx(pub.status === 'published' ? '#2e7d32' : '#546e7a')}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(pub.published_at)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 240 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {pub.response_message ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <TablePagination
                  component="div"
                  count={publishHistory?.total ?? 0}
                  page={pubPage}
                  onPageChange={(_, p) => setPubPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[20]}
                  sx={{ borderTop: '1px solid var(--color-border)' }}
                />
              </>
            )}
          </TabPanel>
        </Box>
      </Box>

      {/* Edit dialog */}
      <Dialog open={!!editingContent} onClose={() => setEditingContent(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
          Edit content
          {editingContent && (
            <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
              {CONTENT_TYPE_LABELS[editingContent.content_type] ?? editingContent.content_type}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2, ...fieldSx }}
          />
          <TextField
            label="Content"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            fullWidth
            multiline
            rows={14}
            sx={{
              ...fieldSx,
              '& .MuiOutlinedInput-root': {
                ...fieldSx['& .MuiOutlinedInput-root'],
                fontFamily: 'monospace',
                fontSize: 13,
                alignItems: 'flex-start',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--color-border)', px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setEditingContent(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            startIcon={<EditIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Save changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publish fullscreen */}
      <Dialog fullScreen open={!!publishingContent} onClose={closePublishDialog}>
        <AppBar
          elevation={0}
          sx={{
            position: 'relative',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-primary)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={closePublishDialog}>
              <CloseIcon />
            </IconButton>
            <Box sx={{ flex: 1, ml: 1 }}>
              <Typography fontWeight={800} fontSize="1.05rem">
                {publishingContent && `Publish · ${CONTENT_TYPE_LABELS[publishingContent.content_type]}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Edit on the left · live preview on the right
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={
                isPublishing ||
                publishMutation.isPending ||
                !publishBody.trim() ||
                (publishingContent !== null &&
                  needsRecipients(publishingContent.content_type) &&
                  selectedRecipientIds.length === 0)
              }
              startIcon={<ConfirmIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' },
              }}
            >
              {isPublishing || publishMutation.isPending ? 'Publishing…' : 'Publish now'}
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: 'var(--color-bg-default)' }}>
          {publishingContent && (
            <>
              {publishingContent.content_type === 'social_media' && (
                <Alert
                  severity={publishingContent.image_url ? 'success' : 'info'}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  {publishingContent.image_url
                    ? 'Cover image will be attached to the LinkedIn post.'
                    : 'Cover image will be fetched from the source article when publishing.'}
                </Alert>
              )}

              <Grid container spacing={3} sx={{ height: { md: 'calc(100vh - 140px)' } }}>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Edit post
                  </Typography>
                  <TextField
                    label="Title"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2, ...fieldSx }}
                  />
                  <TextField
                    label="Content"
                    value={publishBody}
                    onChange={(e) => setPublishBody(e.target.value)}
                    fullWidth
                    multiline
                    sx={{
                      flex: 1,
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': {
                        ...fieldSx['& .MuiOutlinedInput-root'],
                        fontSize: 14,
                        lineHeight: 1.6,
                        height: '100%',
                        alignItems: 'flex-start',
                      },
                      '& textarea': { minHeight: { xs: 280, md: 'calc(100vh - 280px)' } },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Live preview
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      overflow: 'auto',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'var(--color-card-bg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <GeneratedContentPreview
                      contentType={publishingContent.content_type}
                      title={publishTitle}
                      content={publishBody}
                      imageUrl={publishingContent.image_url}
                    />
                  </Box>
                </Grid>
              </Grid>

              {needsRecipients(publishingContent.content_type) && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ ...panelSx, p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Recipients ({selectedRecipientIds.length} selected)
                      </Typography>
                      <Box>
                        <Button size="small" onClick={selectAllRecipients} sx={{ mr: 1, textTransform: 'none' }}>
                          Select all
                        </Button>
                        <Button size="small" onClick={clearRecipients} sx={{ textTransform: 'none' }}>
                          Clear
                        </Button>
                      </Box>
                    </Box>
                    {activeClients.length === 0 ? (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        No active client emails.{' '}
                        <Link component="button" onClick={() => navigate('/client-mails')}>
                          Add clients in Client Mails
                        </Link>
                      </Alert>
                    ) : (
                      <FormGroup sx={{ maxHeight: 240, overflowY: 'auto' }}>
                        {activeClients.map((client) => (
                          <FormControlLabel
                            key={client.id}
                            control={
                              <Checkbox
                                checked={selectedRecipientIds.includes(client.id)}
                                onChange={() => toggleRecipient(client.id)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {client.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {client.email}
                                  {client.company ? ` · ${client.company}` : ''}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}
                      </FormGroup>
                    )}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ContentManagement;
