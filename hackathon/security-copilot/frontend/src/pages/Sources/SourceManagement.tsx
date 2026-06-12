import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as CollectIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sourcesApi } from '../../api/sources';
import { Source, SourceCreate, SourceUpdate, SourceType } from '../../types/source';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

const sourceTypeOptions: { value: SourceType; label: string }[] = [
  { value: 'rss_feed', label: 'RSS Feed' },
  { value: 'news_site', label: 'News Site' },
  { value: 'vendor_blog', label: 'Vendor Blog' },
  { value: 'threat_feed', label: 'Threat Feed' },
];

const defaultForm: SourceCreate = {
  name: '',
  url: '',
  source_type: 'rss_feed',
  is_active: true,
  polling_interval_minutes: 60,
};

const SourceManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [addOpen, setAddOpen] = useState(false);
  const [editSource, setEditSource] = useState<Source | null>(null);
  const [deleteSource, setDeleteSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState<SourceCreate>(defaultForm);

  const { data: sources, isLoading, error } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.getSources(),
  });

  const createMutation = useMutation({
    mutationFn: (data: SourceCreate) => sourcesApi.createSource(data),
    onSuccess: () => {
      showSuccess('Source created successfully');
      setAddOpen(false);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: () => showError('Failed to create source'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SourceUpdate }) => sourcesApi.updateSource(id, data),
    onSuccess: () => {
      showSuccess('Source updated');
      setEditSource(null);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: () => showError('Failed to update source'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.deleteSource(id),
    onSuccess: () => {
      showSuccess('Source deleted');
      setDeleteSource(null);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: () => showError('Failed to delete source'),
  });

  const collectMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.collectSource(id),
    onSuccess: (result) => {
      showSuccess(`Collected ${result.collected} articles (${result.errors} errors)`);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: () => showError('Collection failed'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      sourcesApi.updateSource(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: () => showError('Failed to update source status'),
  });

  const openEdit = (source: Source) => {
    setEditSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      source_type: source.source_type,
      is_active: source.is_active,
      polling_interval_minutes: source.polling_interval_minutes,
    });
  };

  const handleFormChange = (field: keyof SourceCreate, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (editSource) {
      updateMutation.mutate({ id: editSource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formFields = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField
        label="Source Name"
        value={formData.name}
        onChange={(e) => handleFormChange('name', e.target.value)}
        fullWidth
        required
        size="small"
        sx={{ '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' } }, '& .MuiInputLabel-root': { color: 'var(--color-primary)' } }}
      />
      <TextField
        label="URL"
        value={formData.url}
        onChange={(e) => handleFormChange('url', e.target.value)}
        fullWidth
        required
        size="small"
        sx={{ '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' } }, '& .MuiInputLabel-root': { color: 'var(--color-primary)' } }}
      />
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ color: 'var(--color-primary)' }}>Source Type</InputLabel>
        <Select
          value={formData.source_type}
          label="Source Type"
          onChange={(e) => handleFormChange('source_type', e.target.value as SourceType)}
          sx={{ color: 'var(--color-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,120,215,0.3)' } }}
        >
          {sourceTypeOptions.map(({ value, label }) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Polling Interval (minutes)"
        type="number"
        value={formData.polling_interval_minutes}
        onChange={(e) => handleFormChange('polling_interval_minutes', parseInt(e.target.value, 10))}
        fullWidth
        size="small"
        inputProps={{ min: 5, max: 1440 }}
        sx={{ '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' } }, '& .MuiInputLabel-root': { color: 'var(--color-primary)' } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={formData.is_active ?? true}
          onChange={(e) => handleFormChange('is_active', e.target.checked)}
          sx={{ '& .Mui-checked': { color: '#388e3c' } }}
        />
        <Typography sx={{ color: 'var(--color-text-primary)', fontSize: 14 }}>Active</Typography>
      </Box>
    </Box>
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load sources.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
          Source Management
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setFormData(defaultForm); setAddOpen(true); }}
            sx={{ bgcolor: 'var(--color-primary)', '&:hover': { bgcolor: '#006cc1' } }}
          >
            Add Source
          </Button>
        )}
      </Box>

      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Name', 'URL', 'Type', 'Status', 'Interval', 'Last Polled', 'Actions'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)', fontSize: 12, fontWeight: 600 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} sx={{ borderBottom: '1px solid rgba(0,120,215,0.1)' }}>
                          <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : sources?.map((source) => (
                    <TableRow
                      key={source.id}
                      sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}
                    >
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{source.name}</TableCell>
                      <TableCell
                        sx={{
                          color: 'var(--color-primary)',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}
                      >
                        <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                          {source.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={source.source_type.replace(/_/g, ' ')}
                          size="small"
                          sx={{ bgcolor: 'var(--color-border-primary)', color: 'var(--color-primary)', fontSize: 11, height: 20 }}
                        />
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Switch
                            size="small"
                            checked={source.is_active}
                            onChange={(e) => toggleActiveMutation.mutate({ id: source.id, is_active: e.target.checked })}
                            sx={{ '& .Mui-checked': { color: '#388e3c' } }}
                          />
                        ) : source.is_active ? (
                          <ActiveIcon sx={{ color: '#388e3c', fontSize: 20 }} />
                        ) : (
                          <InactiveIcon sx={{ color: '#d32f2f', fontSize: 20 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{source.polling_interval_minutes}m</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {source.last_polled_at
                          ? new Date(source.last_polled_at).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Collect Now">
                            <IconButton
                              size="small"
                              onClick={() => collectMutation.mutate(source.id)}
                              disabled={collectMutation.isPending}
                              sx={{ color: 'var(--color-primary)' }}
                            >
                              <CollectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEdit(source)} sx={{ color: '#f9a825' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => setDeleteSource(source)} sx={{ color: '#d32f2f' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={addOpen || !!editSource}
        onClose={() => { setAddOpen(false); setEditSource(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
          {editSource ? 'Edit Source' : 'Add Source'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>{formFields}</DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--color-border-primary)', px: 3, py: 2 }}>
          <Button onClick={() => { setAddOpen(false); setEditSource(null); }} sx={{ color: 'var(--color-text-secondary)' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.url}
            sx={{ bgcolor: 'var(--color-primary)', '&:hover': { bgcolor: '#006cc1' } }}
          >
            {editSource ? 'Save Changes' : 'Add Source'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteSource}
        onClose={() => setDeleteSource(null)}
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)' }}>Delete Source</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'var(--color-text-primary)' }}>
            Are you sure you want to delete <strong>{deleteSource?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSource(null)} sx={{ color: 'var(--color-text-secondary)' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => deleteSource && deleteMutation.mutate(deleteSource.id)}
            disabled={deleteMutation.isPending}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SourceManagement;
