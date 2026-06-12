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
  Switch,
  FormControlLabel,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientRecipientsApi } from '../../api/clientRecipientsApi';
import type {
  ClientRecipient,
  ClientRecipientCreate,
} from '../../types/clientRecipient';
import { useNotification } from '../../hooks/useNotification';
import type { AxiosError } from 'axios';

const defaultForm: ClientRecipientCreate = {
  name: '',
  email: '',
  company: '',
  is_active: true,
};

const ClientMailsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editRecipient, setEditRecipient] = useState<ClientRecipient | null>(null);
  const [deleteRecipient, setDeleteRecipient] = useState<ClientRecipient | null>(null);
  const [formData, setFormData] = useState<ClientRecipientCreate>(defaultForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-recipients'],
    queryFn: () => clientRecipientsApi.list(),
  });

  const recipients = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: ClientRecipientCreate) => clientRecipientsApi.create(payload),
    onSuccess: () => {
      showSuccess('Client added');
      setAddOpen(false);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['client-recipients'] });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      showError(err.response?.data?.detail ?? 'Failed to add client');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ClientRecipientCreate }) =>
      clientRecipientsApi.update(id, payload),
    onSuccess: () => {
      showSuccess('Client updated');
      setEditRecipient(null);
      queryClient.invalidateQueries({ queryKey: ['client-recipients'] });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      showError(err.response?.data?.detail ?? 'Failed to update client');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientRecipientsApi.delete(id),
    onSuccess: () => {
      showSuccess('Client removed');
      setDeleteRecipient(null);
      queryClient.invalidateQueries({ queryKey: ['client-recipients'] });
    },
    onError: () => showError('Failed to remove client'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      clientRecipientsApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-recipients'] });
    },
    onError: () => showError('Failed to update client status'),
  });

  const openEdit = (recipient: ClientRecipient) => {
    setEditRecipient(recipient);
    setFormData({
      name: recipient.name,
      email: recipient.email,
      company: recipient.company ?? '',
      is_active: recipient.is_active,
    });
  };

  const handleFormChange = (field: keyof ClientRecipientCreate, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      company: formData.company?.trim() || null,
    };
    if (editRecipient) {
      updateMutation.mutate({ id: editRecipient.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formFields = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField
        label="Client name"
        value={formData.name}
        onChange={(e) => handleFormChange('name', e.target.value)}
        fullWidth
        required
      />
      <TextField
        label="Email address"
        type="email"
        value={formData.email}
        onChange={(e) => handleFormChange('email', e.target.value)}
        fullWidth
        required
      />
      <TextField
        label="Company (optional)"
        value={formData.company ?? ''}
        onChange={(e) => handleFormChange('company', e.target.value)}
        fullWidth
      />
      <FormControlLabel
        control={
          <Switch
            checked={formData.is_active ?? true}
            onChange={(e) => handleFormChange('is_active', e.target.checked)}
          />
        }
        label="Active — receives email when publishing"
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
            Client Mails
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
            Manage customer email recipients. When you publish email or newsletter content, it is sent to active clients.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Client
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load client recipients.
        </Alert>
      )}

      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : recipients.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <EmailIcon sx={{ fontSize: 48, color: 'var(--color-text-secondary)', mb: 2 }} />
              <Typography sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
                No client emails yet. Add customers who should receive published security updates.
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                Add first client
              </Button>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id} hover>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {recipient.name}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)' }}>{recipient.email}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)' }}>
                      {recipient.company || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={recipient.is_active ? <ActiveIcon /> : <InactiveIcon />}
                        label={recipient.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={recipient.is_active ? 'success' : 'default'}
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: recipient.id,
                            is_active: !recipient.is_active,
                          })
                        }
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(recipient)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteRecipient(recipient)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen || !!editRecipient} onClose={() => { setAddOpen(false); setEditRecipient(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editRecipient ? 'Edit Client' : 'Add Client'}</DialogTitle>
        <DialogContent>{formFields}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddOpen(false); setEditRecipient(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              !formData.name.trim() ||
              !formData.email.trim() ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {editRecipient ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteRecipient} onClose={() => setDeleteRecipient(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove client?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteRecipient?.name}</strong> ({deleteRecipient?.email}) from the mailing list?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRecipient(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteRecipient && deleteMutation.mutate(deleteRecipient.id)}
            disabled={deleteMutation.isPending}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientMailsPage;
