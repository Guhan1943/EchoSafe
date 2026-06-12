import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Alert,
  MenuItem,
  Grid,
  Divider,
} from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsApi, type EmailConnectPayload, type EncryptionType } from '../../api/channelsApi';
import { useNotification } from '../../hooks/useNotification';
import type { AxiosError } from 'axios';

const defaultEmail: EmailConnectPayload = {
  smtp_host: 'mailpit',
  smtp_port: 1025,
  username: 'dev',
  password: 'dev',
  sender_email: 'security@localhost',
  sender_name: 'Security Intelligence',
  encryption: 'NONE',
};

const SMTP_PRESETS: Record<string, Partial<EmailConnectPayload>> = {
  mailpit: {
    smtp_host: 'mailpit',
    smtp_port: 1025,
    username: 'dev',
    password: 'dev',
    sender_email: 'security@localhost',
    encryption: 'NONE',
  },
  gmail: {
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    encryption: 'STARTTLS',
  },
  outlook: {
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    encryption: 'STARTTLS',
  },
};

const isDev = import.meta.env.VITE_ENVIRONMENT !== 'production';

const isExternalSmtpHost = (host: string) =>
  /gmail|googlemail|office365|outlook|live\.com|yahoo/i.test(host);

const isMailpitConnected = (status?: { connected?: boolean; smtp_host?: string }) =>
  Boolean(status?.connected && status.smtp_host?.includes('mailpit'));

const PublishingChannelsPanel: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  const [emailForm, setEmailForm] = useState<EmailConnectPayload>(defaultEmail);

  const { data: emailStatus } = useQuery({
    queryKey: ['email-channel-status'],
    queryFn: channelsApi.emailStatus,
  });

  useEffect(() => {
    if (emailStatus?.connected && emailStatus.smtp_host) {
      setEmailForm((prev) => ({
        ...prev,
        smtp_host: emailStatus.smtp_host ?? prev.smtp_host,
        smtp_port: emailStatus.smtp_port ?? prev.smtp_port,
        username: emailStatus.username ?? prev.username,
        sender_email: emailStatus.sender_email ?? prev.sender_email,
        sender_name: emailStatus.sender_name ?? prev.sender_name,
        encryption: (emailStatus.encryption as EncryptionType) ?? prev.encryption,
      }));
    }
  }, [emailStatus]);

  const mailpitReady = isMailpitConnected(emailStatus);
  const formUsesExternalSmtp = isExternalSmtpHost(emailForm.smtp_host);
  const showAdvancedSmtp = !isDev || !mailpitReady;

  const { data: linkedInStatus } = useQuery({
    queryKey: ['linkedin-channel-status'],
    queryFn: channelsApi.linkedInStatus,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['email-channel-status'] });
    queryClient.invalidateQueries({ queryKey: ['linkedin-channel-status'] });
    queryClient.invalidateQueries({ queryKey: ['channel-status'] });
  };

  const applyPreset = (key: keyof typeof SMTP_PRESETS) => {
    setEmailForm((prev) => ({ ...prev, ...SMTP_PRESETS[key] }));
  };

  const onEncryptionChange = (encryption: EncryptionType) => {
    setEmailForm((prev) => {
      let smtp_port = prev.smtp_port;
      if (encryption === 'SSL' && smtp_port === 587) smtp_port = 465;
      if (encryption === 'STARTTLS' && smtp_port === 465) smtp_port = 587;
      if (encryption === 'NONE' && prev.smtp_host === 'mailpit') smtp_port = 1025;
      return { ...prev, encryption, smtp_port };
    });
  };

  const onError = (err: AxiosError<{ detail?: string }>) => {
    showError(err.response?.data?.detail ?? 'Operation failed');
  };

  const testEmailMutation = useMutation({
    mutationFn: () => channelsApi.testEmail(emailForm),
    onSuccess: () => showSuccess('SMTP connection test passed'),
    onError,
  });

  const connectEmailMutation = useMutation({
    mutationFn: () => channelsApi.connectEmail(emailForm),
    onSuccess: () => {
      showSuccess('Email channel connected');
      setEmailForm((f) => ({ ...f, password: '' }));
      invalidate();
    },
    onError,
  });

  const disconnectEmailMutation = useMutation({
    mutationFn: channelsApi.disconnectEmail,
    onSuccess: () => {
      showSuccess('Email channel disconnected');
      invalidate();
    },
    onError,
  });

  const connectLinkedInOAuthMutation = useMutation({
    mutationFn: channelsApi.getLinkedInOAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError,
  });

  const disconnectLinkedInMutation = useMutation({
    mutationFn: channelsApi.disconnectLinkedIn,
    onSuccess: () => {
      showSuccess('LinkedIn channel disconnected');
      invalidate();
    },
    onError,
  });

  const connectMailpitMutation = useMutation({
    mutationFn: channelsApi.connectMailpit,
    onSuccess: (status) => {
      showSuccess('Local email connected via Mailpit — view inbox at http://localhost:8025');
      setEmailForm((prev) => ({
        ...prev,
        smtp_host: status.smtp_host ?? 'mailpit',
        smtp_port: status.smtp_port ?? 1025,
        encryption: (status.encryption as EncryptionType) ?? 'NONE',
        sender_email: status.sender_email ?? prev.sender_email,
      }));
      invalidate();
    },
    onError,
  });

  const autoMailpitAttempted = useRef(false);
  useEffect(() => {
    if (!isDev || autoMailpitAttempted.current || emailStatus === undefined) return;
    const needsMailpit = !mailpitReady;
    if (needsMailpit) {
      autoMailpitAttempted.current = true;
      connectMailpitMutation.mutate();
    }
  }, [emailStatus, mailpitReady, connectMailpitMutation]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity="info">
        Connect publishing channels here. Social Media content publishes to LinkedIn. Email and Newsletter content sends via SMTP.
      </Alert>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'var(--color-text-primary)' }}>
            LinkedIn
          </Typography>
          <Chip
            label={linkedInStatus?.connected ? 'Connected' : 'Offline'}
            size="small"
            color={linkedInStatus?.connected ? 'success' : 'default'}
          />
        </Box>
        {linkedInStatus?.connected ? (
          <Box sx={{ mb: 2 }}>
            {linkedInStatus.profile_name && (
              <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', mb: 0.5 }}>
                Signed in as {linkedInStatus.profile_name}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              Author URN: {linkedInStatus.author_urn}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
            Sign in with LinkedIn to publish social media content. OAuth callback uses port 5000 as configured in your LinkedIn app.
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {!linkedInStatus?.connected && (
            <Button
              variant="contained"
              startIcon={<LinkedInIcon />}
              disabled={connectLinkedInOAuthMutation.isPending}
              onClick={() => connectLinkedInOAuthMutation.mutate()}
              sx={{ bgcolor: '#0A66C2', '&:hover': { bgcolor: '#004182' } }}
            >
              Connect with LinkedIn
            </Button>
          )}
          {linkedInStatus?.connected && (
            <>
              <Button
                variant="outlined"
                startIcon={<LinkedInIcon />}
                disabled={connectLinkedInOAuthMutation.isPending}
                onClick={() => connectLinkedInOAuthMutation.mutate()}
              >
                Reconnect
              </Button>
              <Button color="error" onClick={() => disconnectLinkedInMutation.mutate()}>
                Disconnect
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Divider />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'var(--color-text-primary)' }}>
            Email (SMTP)
          </Typography>
          <Chip
            label={emailStatus?.connected ? 'Connected' : 'Offline'}
            size="small"
            color={emailStatus?.connected ? 'success' : 'default'}
          />
        </Box>
        {emailStatus?.connected && (
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
            {emailStatus.sender_email} via {emailStatus.smtp_host}:{emailStatus.smtp_port}
          </Typography>
        )}
        {mailpitReady && isDev ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>Email is ready.</strong> Local Mailpit is connected — you do not need Gmail.
            Publish email/newsletter content from Content Management; messages appear in the Mailpit inbox.
          </Alert>
        ) : (
          <Alert severity={mailpitReady ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {isDev ? (
              <>
                Gmail/Outlook do not work from Docker on this network. Click{' '}
                <strong>Connect Local Email (Mailpit)</strong> below — do not use Test Connection with Gmail.
              </>
            ) : (
              <>Configure SMTP for production. Gmail/Outlook need app passwords with STARTTLS on port 587.</>
            )}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {isDev && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => connectMailpitMutation.mutate()}
                disabled={connectMailpitMutation.isPending || mailpitReady}
              >
                {mailpitReady ? 'Mailpit Connected' : 'Connect Local Email (Mailpit)'}
              </Button>
              {mailpitReady && (
                <Button
                  variant="outlined"
                  component="a"
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Mailpit Inbox
                </Button>
              )}
            </>
          )}
          {showAdvancedSmtp && (
            <Button size="small" variant="outlined" onClick={() => applyPreset('mailpit')}>
              Mailpit preset
            </Button>
          )}
          {!isDev && (
            <>
              <Button size="small" variant="outlined" onClick={() => applyPreset('gmail')}>
                Gmail preset
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset('outlook')}>
                Outlook preset
              </Button>
            </>
          )}
        </Box>
        {showAdvancedSmtp && (
        <>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              label="SMTP Host"
              value={emailForm.smtp_host}
              onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Port"
              type="number"
              value={emailForm.smtp_port}
              onChange={(e) => setEmailForm({ ...emailForm, smtp_port: Number(e.target.value) })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Username"
              value={emailForm.username}
              onChange={(e) => setEmailForm({ ...emailForm, username: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Password"
              type="password"
              value={emailForm.password}
              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
              fullWidth
              size="small"
              placeholder={emailStatus?.connected ? 'Leave blank to keep saved password' : ''}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Sender Email"
              value={emailForm.sender_email}
              onChange={(e) => setEmailForm({ ...emailForm, sender_email: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Sender Name"
              value={emailForm.sender_name}
              onChange={(e) => setEmailForm({ ...emailForm, sender_name: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Encryption"
              value={emailForm.encryption}
              onChange={(e) => onEncryptionChange(e.target.value as EncryptionType)}
              fullWidth
              size="small"
              helperText="Use STARTTLS (587) or SSL (465) for Gmail/Outlook; NONE for Mailpit"
            >
              {(['NONE', 'STARTTLS', 'TLS', 'SSL'] as const).map((opt) => (
                <MenuItem key={opt} value={opt}>{opt === 'TLS' ? 'TLS (same as STARTTLS)' : opt}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => testEmailMutation.mutate()}
            disabled={testEmailMutation.isPending || (isDev && formUsesExternalSmtp)}
          >
            Test Connection
          </Button>
          <Button
            variant="contained"
            onClick={() => connectEmailMutation.mutate()}
            disabled={connectEmailMutation.isPending || (isDev && formUsesExternalSmtp)}
          >
            Save & Connect
          </Button>
          {emailStatus?.connected && (
            <Button color="error" onClick={() => disconnectEmailMutation.mutate()}>
              Disconnect
            </Button>
          )}
        </Box>
        {isDev && formUsesExternalSmtp && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
            Gmail/Outlook are disabled in local dev. Use Mailpit instead.
          </Typography>
        )}
        </>
        )}
      </Box>
    </Box>
  );
};

export default PublishingChannelsPanel;
