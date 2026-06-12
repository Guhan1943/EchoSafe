import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Publish as PublishIcon,
  Download as DownloadIcon,
  CheckCircle as ConfirmIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contentApi } from '../../api/content';
import { GeneratedContent, GeneratedContentUpdate, PublishedContent } from '../../types/content';
import { useNotification } from '../../hooks/useNotification';

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

const contentTypeLabel: Record<string, string> = {
  executive_brief: 'Executive Brief',
  customer_advisory: 'Customer Advisory',
  technical_analysis: 'Technical Analysis',
  newsletter: 'Newsletter',
  social_media: 'Social Media',
};

const ContentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pubPage, setPubPage] = useState(0);
  const rowsPerPage = 20;

  // Editor dialog state
  const [editingContent, setEditingContent] = useState<GeneratedContent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Publish confirm dialog state
  const [publishingContent, setPublishingContent] = useState<GeneratedContent | null>(null);

  const { data: generatedContent, isLoading: contentLoading } = useQuery({
    queryKey: ['generated-content', page],
    queryFn: () => contentApi.listContent({ skip: page * rowsPerPage, limit: rowsPerPage }),
  });

  const { data: publishHistory, isLoading: histLoading } = useQuery({
    queryKey: ['publish-history', pubPage],
    queryFn: () => contentApi.getPublishHistory({ skip: pubPage * rowsPerPage, limit: rowsPerPage }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GeneratedContentUpdate }) =>
      contentApi.updateContent(id, data),
    onSuccess: () => {
      showSuccess('Content updated successfully');
      setEditingContent(null);
      queryClient.invalidateQueries({ queryKey: ['publish-history'] });
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
    },
    onError: () => showError('Failed to update content'),
  });

  const publishMutation = useMutation({
    mutationFn: (contentId: number) => contentApi.publishContent(contentId),
    onSuccess: () => {
      showSuccess('Content published successfully');
      setPublishingContent(null);
      queryClient.invalidateQueries({ queryKey: ['publish-history'] });
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
    },
    onError: () => showError('Failed to publish content'),
  });

  const exportMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const blob = await contentApi.exportContent(contentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-${contentId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => showError('Failed to export content'),
  });

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 3 }}>
        Content Management
      </Typography>

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
            <Tab label="Generated Content" />
            <Tab label="Published" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Generated Content Tab */}
          <TabPanel value={tabValue} index={0}>
            {contentLoading ? (
              <Box>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1 }} />
                ))}
              </Box>
            ) : generatedContent?.items.length === 0 ? (
              <Alert severity="info">
                No generated content yet. Approve an article and generate content from the{' '}
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
                        {['ID', 'Article', 'Type', 'Approved', 'Updated', 'Actions'].map((h) => (
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
                      {generatedContent?.items.map((content: GeneratedContent) => (
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
                            {contentTypeLabel[content.content_type] ?? content.content_type}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={content.is_approved ? 'Yes' : 'No'}
                              size="small"
                              color={content.is_approved ? 'success' : 'default'}
                              sx={{ fontSize: 11, height: 20 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                            {new Date(content.updated_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditor(content)} sx={{ color: 'var(--color-primary)' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Publish">
                              <IconButton
                                size="small"
                                onClick={() => setPublishingContent(content)}
                                sx={{ color: '#388e3c' }}
                              >
                                <PublishIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                onClick={() => exportMutation.mutate(content.id)}
                                sx={{ color: 'var(--color-primary)' }}
                              >
                                <DownloadIcon fontSize="small" />
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

          {/* Published Tab */}
          <TabPanel value={tabValue} index={1}>
            {histLoading ? (
              <Box>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1 }} />
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
                        {['ID', 'Content ID', 'Article', 'Platform', 'Status', 'Published At'].map((h) => (
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
                        <TableRow
                          key={pub.id}
                          sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}
                        >
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
                          <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: 13 }}>{pub.platform}</TableCell>
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

      {/* Edit Dialog */}
      <Dialog
        open={!!editingContent}
        onClose={() => setEditingContent(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' },
        }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
          Edit Content — {editingContent && contentTypeLabel[editingContent.content_type]}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            size="small"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' } },
              '& .MuiInputLabel-root': { color: 'var(--color-primary)' },
            }}
          />
          <TextField
            label="Content"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            fullWidth
            multiline
            rows={12}
            sx={{
              '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' }, fontFamily: 'monospace', fontSize: 13 },
              '& .MuiInputLabel-root': { color: 'var(--color-primary)' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--color-border-primary)', px: 3, py: 2 }}>
          <Button onClick={() => setEditingContent(null)} sx={{ color: 'var(--color-text-secondary)' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            startIcon={<EditIcon />}
            sx={{ bgcolor: 'var(--color-primary)', '&:hover': { bgcolor: '#006cc1' } }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publish Confirm Dialog */}
      <Dialog
        open={!!publishingContent}
        onClose={() => setPublishingContent(null)}
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)' }}>Confirm Publish</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'var(--color-text-primary)' }}>
            Are you sure you want to publish this content? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishingContent(null)} sx={{ color: 'var(--color-text-secondary)' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => publishingContent && publishMutation.mutate(publishingContent.id)}
            disabled={publishMutation.isPending}
            startIcon={<ConfirmIcon />}
            sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContentManagement;
