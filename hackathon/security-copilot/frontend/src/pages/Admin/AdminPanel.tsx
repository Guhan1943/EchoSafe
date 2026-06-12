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
  FormControlLabel,
  Chip,
  Skeleton,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserCreate, type UserUpdate } from '../../api/usersApi';
import { settingsApi } from '../../api/settingsApi';
import type { User } from '../../types/auth';
import type { Setting } from '../../types/settings';
import { useAuth } from '../../hooks/useAuth';
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

const roleColor: Record<User['role'], 'error' | 'warning' | 'info'> = {
  admin: 'error',
  analyst: 'warning',
  viewer: 'info',
};

const defaultUserForm: UserCreate = {
  email: '',
  password: '',
  full_name: '',
  role: 'viewer',
};

const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserCreate>(defaultUserForm);
  const [editForm, setEditForm] = useState<UserUpdate>({});
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({});

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => usersApi.createUser(data),
    onSuccess: () => {
      showSuccess('User created successfully');
      setAddOpen(false);
      setUserForm(defaultUserForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => showError('Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      showSuccess('User updated successfully');
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => showError('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      showSuccess('User deleted successfully');
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => showError('Failed to delete user'),
  });

  const settingsMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          settingsApi.updateSetting(key, { value })
        )
      );
    },
    onSuccess: () => {
      showSuccess('Settings updated successfully');
      setSettingEdits({});
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => showError('Failed to update settings'),
  });

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      email: user.email,
      full_name: user.full_name ?? '',
      role: user.role,
      is_active: user.is_active,
    });
  };

  const maskSecret = (key: string, value: string | null) => {
    if (!value) return '';
    if (key.includes('api_key') || key.includes('secret')) {
      return '••••••••••••';
    }
    return value;
  };

  const handleSettingChange = (setting: Setting, value: string) => {
    setSettingEdits((prev) => ({ ...prev, [setting.key]: value }));
  };

  const getSettingValue = (setting: Setting) =>
    settingEdits[setting.key] ?? setting.value ?? '';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: '#e8f4fd', fontWeight: 700, mb: 3 }}>
        Administration
      </Typography>

      <Card sx={{ background: 'rgba(13, 27, 42, 0.9)', border: '1px solid rgba(0,120,215,0.2)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: '1px solid rgba(0,120,215,0.2)' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              '& .MuiTab-root': { color: '#8da9c4', textTransform: 'none' },
              '& .Mui-selected': { color: '#0078d4' },
              '& .MuiTabs-indicator': { bgcolor: '#0078d4' },
            }}
          >
            <Tab label="Users" />
            <Tab label="System Settings" icon={<SettingsIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{ bgcolor: '#0078d4', '&:hover': { bgcolor: '#006cc1' } }}
              >
                Add User
              </Button>
            </Box>

            {usersError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load users.</Alert>}

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map((header) => (
                      <TableCell
                        key={header}
                        sx={{ color: '#8da9c4', borderBottom: '1px solid rgba(0,120,215,0.2)', fontSize: 12 }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 5 }).map((__, cellIndex) => (
                            <TableCell key={cellIndex} sx={{ borderBottom: '1px solid rgba(0,120,215,0.08)' }}>
                              <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : users?.map((user) => (
                        <TableRow key={user.id} sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}>
                          <TableCell sx={{ color: '#c8dff0' }}>{user.full_name || '—'}</TableCell>
                          <TableCell sx={{ color: '#4a9ede' }}>{user.email}</TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small" color={roleColor[user.role]} sx={{ fontSize: 11, height: 20 }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={user.is_active ? 'success' : 'default'}
                              sx={{ fontSize: 11, height: 20 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEdit(user)} sx={{ color: '#4a9ede' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={user.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete'}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={user.id === currentUser?.id}
                                  onClick={() => setDeleteUser(user)}
                                  sx={{ color: '#f44336' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            {settingsLoading ? (
              <Box>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} height={72} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1 }} />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {settings?.map((setting) => (
                  <TextField
                    key={setting.key}
                    label={setting.key.replace(/_/g, ' ')}
                    value={
                      setting.key.includes('api_key') && !settingEdits[setting.key]
                        ? maskSecret(setting.key, setting.value)
                        : getSettingValue(setting)
                    }
                    onChange={(event) => handleSettingChange(setting, event.target.value)}
                    helperText={setting.description ?? undefined}
                    fullWidth
                    type={setting.key.includes('api_key') ? 'password' : 'text'}
                    sx={{
                      '& .MuiOutlinedInput-root': { color: '#e8f4fd', '& fieldset': { borderColor: 'rgba(0,120,215,0.3)' } },
                      '& .MuiInputLabel-root': { color: '#4a9ede' },
                      '& .MuiFormHelperText-root': { color: '#8da9c4' },
                    }}
                  />
                ))}
                <Box>
                  <Button
                    variant="contained"
                    disabled={Object.keys(settingEdits).length === 0 || settingsMutation.isPending}
                    onClick={() => settingsMutation.mutate(settingEdits)}
                    sx={{ bgcolor: '#0078d4', '&:hover': { bgcolor: '#006cc1' } }}
                  >
                    Save Settings
                  </Button>
                </Box>
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: '#e8f4fd' }}>Create User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} fullWidth />
          <TextField label="Full Name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} fullWidth />
          <TextField label="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} fullWidth />
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#4a9ede' }}>Role</InputLabel>
            <Select
              value={userForm.role}
              label="Role"
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserCreate['role'] })}
              sx={{ color: '#e8f4fd' }}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="analyst">Analyst</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} sx={{ color: '#8da9c4' }}>Cancel</Button>
          <Button variant="contained" onClick={() => createMutation.mutate(userForm)} disabled={createMutation.isPending}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: '#e8f4fd' }}>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth />
          <TextField label="Full Name" value={editForm.full_name ?? ''} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} fullWidth />
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#4a9ede' }}>Role</InputLabel>
            <Select
              value={editForm.role ?? 'viewer'}
              label="Role"
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserUpdate['role'] })}
              sx={{ color: '#e8f4fd' }}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="analyst">Analyst</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={editForm.is_active ?? true}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ color: '#c8dff0' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)} sx={{ color: '#8da9c4' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => editUser && updateMutation.mutate({ id: editUser.id, data: editForm })}
            disabled={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,120,215,0.3)' } }}
      >
        <DialogTitle sx={{ color: '#e8f4fd' }}>Delete User</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#c8dff0' }}>
            Delete {deleteUser?.email}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)} sx={{ color: '#8da9c4' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
