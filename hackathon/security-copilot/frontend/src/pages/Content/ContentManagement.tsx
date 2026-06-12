import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contentApi } from '../../api/content';
import { channelsApi } from '../../api/channelsApi';
import { clientRecipientsApi } from '../../api/clientRecipientsApi';
import GeneratedContentPreview from '../../components/Content/GeneratedContentPreview';
import { GeneratedContent, GeneratedContentUpdate, PublishedContent } from '../../types/content';
import { useNotification } from '../../hooks/useNotification';
import {
  CHANNEL_LABELS,
  CONTENT_TYPE_LABELS,
  channelForType,
  needsRecipients,
} from '../../utils/contentChannels';
import type { AxiosError } from 'axios';

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
        Content Management
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
        Only approved content is shown. Social Media → LinkedIn · Email/Newsletter → SMTP · Blog → Internal.
      </Typography>

      {(!linkedInConnected || !emailConnected) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Publishing channels need setup:{' '}
          {!linkedInConnected && 'LinkedIn '}
          {!emailConnected && 'SMTP Email '}
          —{' '}
          <Button
            size="small"
            sx={{ p: 0, textTransform: 'none', verticalAlign: 'baseline' }}
            onClick={() => navigate('/publishing-channels')}
          >
            Configure Publishing Channels
          </Button>
        </Alert>
      )}

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
            <Tab label="Approved Content" />
            <Tab label="Published" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tabValue} index={0}>
            {contentLoading ? (
              <Box>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton height={48} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : generatedContent?.items.length === 0 ? (
              <Alert severity="info">
                No approved content yet. Approve an article in the Review Queue, then generate content from the{' '}
                <Button
                  size="small"
                  sx={{ p: 0, color: 'var(--color-primary)', textTransform: 'none' }}
                  onClick={() => navigate('/intelligence')}
                >
                  Intelligence Feed
                </Button>
                .
              </Alert>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['ID', 'Article', 'Type', 'Channel', 'Updated', 'Actions'].map((h) => (
                          <TableCell
                            key={h}
                            sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)', fontSize: 12 }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generatedContent?.items.map((content: GeneratedContent) => {
                        const platform = channelForType(content.content_type);
                        const connected = isChannelConnected(platform);
                        return (
                          <TableRow
                            key={content.id}
                            sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}
                          >
                            <TableCell sx={{ color: 'var(--color-primary)' }}>#{content.id}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                sx={{ color: 'var(--color-primary)', p: 0, textTransform: 'none', fontSize: 12 }}
                                onClick={() => navigate(`/intelligence/${content.article_id}`)}
                              >
                                Article #{content.article_id}
                              </Button>
                            </TableCell>
                            <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: 13 }}>
                              {CONTENT_TYPE_LABELS[content.content_type] ?? content.content_type}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={connected ? CHANNEL_LABELS[platform] : `${CHANNEL_LABELS[platform] ?? platform} (offline)`}
                                size="small"
                                color={connected ? 'success' : 'warning'}
                                sx={{ fontSize: 11, height: 20 }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                              {new Date(content.updated_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEditor(content)} sx={{ color: 'var(--color-primary)' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={!connected}
                                  onClick={() => openPublishDialog(content)}
                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 72,
                                    color: connected ? '#388e3c' : 'text.disabled',
                                    borderColor: connected ? '#388e3c' : undefined,
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
                  sx={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-primary)' }}
                />
              </>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {histLoading ? (
              <Box>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton height={48} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : publishHistory?.items.length === 0 ? (
              <Alert severity="info">No published content yet.</Alert>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['ID', 'Content', 'Article', 'Channel', 'Status', 'Published At', 'Response'].map((h) => (
                          <TableCell
                            key={h}
                            sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)', fontSize: 12 }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {publishHistory?.items.map((pub: PublishedContent) => (
                        <TableRow key={pub.id} sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>#{pub.id}</TableCell>
                          <TableCell sx={{ color: 'var(--color-primary)', fontSize: 12 }}>#{pub.generated_content_id}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              sx={{ color: 'var(--color-primary)', p: 0, textTransform: 'none', fontSize: 12 }}
                              onClick={() => navigate(`/intelligence/${pub.article_id}`)}
                            >
                              Article #{pub.article_id}
                            </Button>
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: 13 }}>
                            {CHANNEL_LABELS[pub.platform] ?? pub.platform}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pub.status}
                              size="small"
                              color={pub.status === 'published' ? 'success' : 'default'}
                              sx={{ fontSize: 11, height: 20 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                            {new Date(pub.published_at).toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 11, maxWidth: 200 }}>
                            {pub.response_message ?? '—'}
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
                  sx={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-primary)' }}
                />
              </>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingContent}
        onClose={() => setEditingContent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
          Edit Content — {editingContent && (CONTENT_TYPE_LABELS[editingContent.content_type] ?? editingContent.content_type)}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--color-primary)' } }}
          />
          <TextField
            label="Content"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            fullWidth
            multiline
            rows={12}
            sx={{ '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: 13 }, '& .MuiInputLabel-root': { color: 'var(--color-primary)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--color-border-primary)', px: 3, py: 2 }}>
          <Button onClick={() => setEditingContent(null)} sx={{ color: 'var(--color-text-secondary)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={updateMutation.isPending} startIcon={<EditIcon />}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        fullScreen
        open={!!publishingContent}
        onClose={closePublishDialog}
      >
        <AppBar
          sx={{
            position: 'relative',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-primary)',
            borderBottom: '1px solid var(--color-border-primary)',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={closePublishDialog} sx={{ color: 'var(--color-text-primary)' }}>
              <CloseIcon />
            </IconButton>
            <Typography sx={{ flex: 1, ml: 1, fontWeight: 700, fontSize: '1.1rem' }}>
              {publishingContent && `Publish ${CONTENT_TYPE_LABELS[publishingContent.content_type]}`}
            </Typography>
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
              sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
            >
              {isPublishing || publishMutation.isPending ? 'Publishing…' : 'Publish'}
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: 'var(--color-bg-primary)' }}>
          {publishingContent && (
            <>
              {publishingContent.content_type === 'social_media' && (
                <Alert severity={publishingContent.image_url ? 'success' : 'info'} sx={{ mb: 2 }}>
                  {publishingContent.image_url
                    ? 'Cover image will be attached to the LinkedIn post.'
                    : 'Cover image will be fetched from the source article when publishing.'}
                </Alert>
              )}

              <Grid container spacing={3} sx={{ height: { md: 'calc(100vh - 140px)' } }}>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', mb: 1.5, fontWeight: 600 }}>
                    Edit post
                  </Typography>
                  <TextField
                    label="Title"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--color-primary)' },
                    }}
                  />
                  <TextField
                    label="Content"
                    value={publishBody}
                    onChange={(e) => setPublishBody(e.target.value)}
                    fullWidth
                    multiline
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: 'var(--color-text-primary)',
                        fontSize: 14,
                        lineHeight: 1.6,
                        height: '100%',
                        alignItems: 'flex-start',
                      },
                      '& textarea': { minHeight: { xs: 280, md: 'calc(100vh - 280px)' } },
                      '& .MuiInputLabel-root': { color: 'var(--color-primary)' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', mb: 1.5, fontWeight: 600 }}>
                    Preview
                  </Typography>
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
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
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)' }}>
                        Send to clients ({selectedRecipientIds.length} selected)
                      </Typography>
                      <Box>
                        <Button size="small" onClick={selectAllRecipients} sx={{ mr: 1 }}>
                          Select all
                        </Button>
                        <Button size="small" onClick={clearRecipients}>
                          Clear
                        </Button>
                      </Box>
                    </Box>
                    {activeClients.length === 0 ? (
                      <Alert severity="warning">
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
                                <Typography variant="body2" sx={{ color: 'var(--color-text-primary)' }}>
                                  {client.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
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
