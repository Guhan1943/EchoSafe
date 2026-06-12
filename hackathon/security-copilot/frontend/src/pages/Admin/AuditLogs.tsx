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
  TablePagination,
  TextField,
  Button,
  Chip,
  Skeleton,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import { ExpandMore as ExpandIcon, ExpandLess as CollapseIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/auditApi';
import type { AuditLog } from '../../types/audit';

const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(25);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, resourceFilter, userIdFilter],
    queryFn: () =>
      auditApi.getAuditLogs({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        action: actionFilter || undefined,
        resource_type: resourceFilter || undefined,
        user_id: userIdFilter ? Number(userIdFilter) : undefined,
      }),
  });

  const toggleExpanded = (id: number) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 3 }}>
        Audit Logs
      </Typography>

      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Action"
            size="small"
            value={actionFilter}
            onChange={(e) => {
              setPage(0);
              setActionFilter(e.target.value);
            }}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)' } }}
          />
          <TextField
            label="Resource Type"
            size="small"
            value={resourceFilter}
            onChange={(e) => {
              setPage(0);
              setResourceFilter(e.target.value);
            }}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)' } }}
          />
          <TextField
            label="User ID"
            size="small"
            value={userIdFilter}
            onChange={(e) => {
              setPage(0);
              setUserIdFilter(e.target.value);
            }}
            sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)' } }}
          />
          <Button variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={{ color: 'var(--color-primary)', borderColor: 'var(--color-border-primary)' }}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load audit logs.</Alert>}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Time', 'User', 'Action', 'Resource', 'IP', 'Details'].map((header) => (
                    <TableCell
                      key={header}
                      sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)', fontSize: 12 }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex} sx={{ borderBottom: '1px solid rgba(0,120,215,0.08)' }}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.items.map((log: AuditLog) => (
                      <React.Fragment key={log.id}>
                        <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(0,120,215,0.08)' } }}>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: 12 }}>
                            {log.user_id ? `#${log.user_id}` : 'System'}
                          </TableCell>
                          <TableCell>
                            <Chip label={log.action} size="small" sx={{ fontSize: 11, height: 20 }} />
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-primary)', fontSize: 12 }}>
                            {log.resource_type ?? '—'}
                            {log.resource_id ? ` #${log.resource_id}` : ''}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{log.ip_address ?? '—'}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => toggleExpanded(log.id)} sx={{ color: 'var(--color-primary)' }}>
                              {expandedId === log.id ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 0, borderBottom: '1px solid rgba(0,120,215,0.08)' }}>
                            <Collapse in={expandedId === log.id}>
                              <Box
                                component="pre"
                                sx={{
                                  m: 1,
                                  p: 2,
                                  bgcolor: 'rgba(0,0,0,0.25)',
                                  borderRadius: 1,
                                  color: 'var(--color-text-primary)',
                                  fontSize: 12,
                                  overflowX: 'auto',
                                }}
                              >
                                {JSON.stringify(log.details ?? {}, null, 2)}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25]}
            sx={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-primary)' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditLogs;
