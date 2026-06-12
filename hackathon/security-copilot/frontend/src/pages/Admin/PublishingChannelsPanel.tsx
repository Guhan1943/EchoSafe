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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import ArticleIcon from '@mui/icons-material/Article';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LinkIcon from '@mui/icons-material/Link';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsApi, type EmailConnectPayload, type EncryptionType } from '../../api/channelsApi';
import { useNotification } from '../../hooks/useNotification';
import type { AxiosError } from 'axios';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: 'var(--color-bg-subtle)',
  },
};

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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

const MediumIcon = () => (
  <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1, color: '#000' }}>M</Typography>
);

const COMING_SOON_PUBLISHERS = [
  {
    name: 'X',
    apiLabel: 'X API',
    description: 'Publish short security alerts and thread summaries to your X profile feed.',
    icon: <XIcon sx={{ color: '#000', fontSize: 22 }} />,
  },
  {
    name: 'Facebook',
    apiLabel: 'Meta Graph API',
    description: 'Share advisories and link posts to your Facebook Page audience.',
    icon: <FacebookIcon sx={{ color: '#1877F2', fontSize: 22 }} />,
  },
  {
    name: 'Instagram',
    apiLabel: 'Instagram Business',
    description: 'Post visual security alerts and carousel briefs via Instagram Business.',
    icon: <InstagramIcon sx={{ color: '#E4405F', fontSize: 22 }} />,
  },
  {
    name: 'Telegram',
    apiLabel: 'Bot API',
    description: 'Broadcast intelligence updates to Telegram channels and subscriber groups.',
    icon: <TelegramIcon sx={{ color: '#26A5E4', fontSize: 22 }} />,
  },
  {
    name: 'Medium',
    apiLabel: 'Medium API',
    description: 'Publish long-form technical analysis and executive briefs as Medium articles.',
    icon: <MediumIcon />,
  },
  {
    name: 'Slack',
    apiLabel: 'Slack Webhooks',
    description: 'Deliver advisories to client Slack workspaces and internal response channels.',
    icon: <HubOutlinedIcon sx={{ color: '#4A154B', fontSize: 22 }} />,
  },
] as const;

interface PublisherCardProps {
  name: string;
  apiLabel: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  linkedName?: string;
  linkedEmail?: string;
  onLink: () => void;
  onUnlink?: () => void;
  linkLoading?: boolean;
  linkLabel?: string;
  hideUnlink?: boolean;
  comingSoon?: boolean;
}

const PublisherCard: React.FC<PublisherCardProps> = ({
  name,
  apiLabel,
  description,
  icon,
  connected,
  linkedName,
  linkedEmail,
  onLink,
  onUnlink,
  linkLoading,
  linkLabel = 'Link Account',
  hideUnlink,
  comingSoon,
}) => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      border: '1px solid var(--color-border)',
      bgcolor: 'var(--color-card-bg)',
      overflow: 'hidden',
    }}
  >
    <Box sx={{ p: 2.5, flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: 'var(--color-bg-paper)',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {apiLabel}
          </Typography>
        </Box>
        {connected && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#4caf50',
              flexShrink: 0,
              mt: 0.5,
              boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.25)',
            }}
          />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
        {description}
      </Typography>
    </Box>

    <Divider />

    <Box
      sx={{
        px: 2,
        py: 1.5,
        minHeight: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        bgcolor: 'var(--color-bg-subtle)',
      }}
    >
      {connected && linkedName ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.75rem',
                fontWeight: 700,
                bgcolor: 'var(--color-primary)',
              }}
            >
              {initials(linkedName)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {linkedName}
              </Typography>
              {linkedEmail && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {linkedEmail}
                </Typography>
              )}
            </Box>
          </Box>
          {!hideUnlink && onUnlink && (
            <Tooltip title="Unlink account">
              <IconButton size="small" onClick={onUnlink} sx={{ color: '#c62828', flexShrink: 0 }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      ) : (
        <>
          <Chip
            label={comingSoon ? 'Coming Soon' : 'Not Linked'}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 600,
              borderColor: comingSoon ? '#1565c0' : '#e65100',
              color: comingSoon ? '#1565c0' : '#e65100',
              bgcolor: comingSoon ? 'rgba(21, 101, 192, 0.06)' : 'transparent',
            }}
          />
          <Tooltip title={comingSoon ? 'This integration is not available yet' : ''} disableHoverListener={!comingSoon}>
            <span>
              <Button
                variant="contained"
                size="small"
                startIcon={<LinkIcon />}
                onClick={onLink}
                disabled={linkLoading || comingSoon}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  px: 2,
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {linkLabel}
              </Button>
            </span>
          </Tooltip>
        </>
      )}
    </Box>
  </Box>
);

const PublishingChannelsPanel: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailConnectPayload>(defaultEmail);

  const { data: emailStatus, refetch: refetchEmail, isFetching: emailFetching } = useQuery({
    queryKey: ['email-channel-status'],
    queryFn: channelsApi.emailStatus,
  });

  const { data: linkedInStatus, refetch: refetchLinkedIn, isFetching: linkedInFetching } = useQuery({
    queryKey: ['linkedin-channel-status'],
    queryFn: channelsApi.linkedInStatus,
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['email-channel-status'] });
    queryClient.invalidateQueries({ queryKey: ['linkedin-channel-status'] });
    queryClient.invalidateQueries({ queryKey: ['channel-status'] });
  };

  const handleRefresh = () => {
    refetchEmail();
    refetchLinkedIn();
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
      setEmailDialogOpen(false);
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
      showSuccess('Local email connected via Mailpit');
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
    if (!mailpitReady) {
      autoMailpitAttempted.current = true;
      connectMailpitMutation.mutate();
    }
  }, [emailStatus, mailpitReady, connectMailpitMutation]);

  const emailSettingsForm = (
    <>
      {mailpitReady && isDev ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          Local Mailpit is connected. Publish from Content Management; view messages in Mailpit.
        </Alert>
      ) : (
        <Alert severity={mailpitReady ? 'success' : 'warning'} sx={{ mb: 2, borderRadius: 2 }}>
          {isDev
            ? 'Use Mailpit in local dev — Gmail/Outlook are blocked from Docker.'
            : 'Gmail/Outlook need app passwords with STARTTLS on port 587.'}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {isDev && (
          <Button
            variant="contained"
            onClick={() => connectMailpitMutation.mutate()}
            disabled={connectMailpitMutation.isPending || mailpitReady}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#2e7d32' }}
          >
            {mailpitReady ? 'Mailpit Connected' : 'Connect Mailpit'}
          </Button>
        )}
        {showAdvancedSmtp && (
          <Button size="small" variant="outlined" onClick={() => applyPreset('mailpit')} sx={{ textTransform: 'none' }}>
            Mailpit preset
          </Button>
        )}
        {!isDev && (
          <>
            <Button size="small" variant="outlined" onClick={() => applyPreset('gmail')} sx={{ textTransform: 'none' }}>
              Gmail
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyPreset('outlook')} sx={{ textTransform: 'none' }}>
              Outlook
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
                sx={fieldSx}
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
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Username"
                value={emailForm.username}
                onChange={(e) => setEmailForm({ ...emailForm, username: e.target.value })}
                fullWidth
                size="small"
                sx={fieldSx}
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
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sender Email"
                value={emailForm.sender_email}
                onChange={(e) => setEmailForm({ ...emailForm, sender_email: e.target.value })}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sender Name"
                value={emailForm.sender_name}
                onChange={(e) => setEmailForm({ ...emailForm, sender_name: e.target.value })}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Encryption"
                value={emailForm.encryption}
                onChange={(e) => onEncryptionChange(e.target.value as EncryptionType)}
                fullWidth
                size="small"
                helperText="STARTTLS (587) or SSL (465) for Gmail/Outlook; NONE for Mailpit"
                sx={fieldSx}
              >
                {(['NONE', 'STARTTLS', 'TLS', 'SSL'] as const).map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt === 'TLS' ? 'TLS (same as STARTTLS)' : opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {isDev && formUsesExternalSmtp && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'warning.main' }}>
              Gmail/Outlook are disabled in local dev. Use Mailpit instead.
            </Typography>
          )}
        </>
      )}
    </>
  );

  const refreshing = emailFetching || linkedInFetching;

  const cardGrid = (
    <Grid container spacing={2.5} alignItems="stretch">
      <Grid item xs={12} md={4}>
        <PublisherCard
          name="LinkedIn"
          apiLabel="LinkedIn API"
          description="Publish posts and share security intelligence directly to your professional profile feed."
          icon={<LinkedInIcon sx={{ color: '#0A66C2', fontSize: 22 }} />}
          connected={Boolean(linkedInStatus?.connected)}
          linkedName={linkedInStatus?.profile_name ?? 'LinkedIn Account'}
          linkedEmail={linkedInStatus?.author_urn}
          onLink={() => connectLinkedInOAuthMutation.mutate()}
          onUnlink={() => disconnectLinkedInMutation.mutate()}
          linkLoading={connectLinkedInOAuthMutation.isPending}
        />
      </Grid>

      {COMING_SOON_PUBLISHERS.map((publisher) => (
        <Grid item xs={12} md={4} key={publisher.name}>
          <PublisherCard
            name={publisher.name}
            apiLabel={publisher.apiLabel}
            description={publisher.description}
            icon={publisher.icon}
            connected={false}
            onLink={() => {}}
            comingSoon
          />
        </Grid>
      ))}

      <Grid item xs={12} md={4}>
        <PublisherCard
          name="Email"
          apiLabel="SMTP"
          description="Send email and newsletter content to clients. Supports Mailpit in dev and SMTP in production."
          icon={<EmailIcon sx={{ color: '#2e7d32', fontSize: 22 }} />}
          connected={Boolean(emailStatus?.connected)}
          linkedName={emailStatus?.sender_name ?? emailStatus?.username ?? 'SMTP Account'}
          linkedEmail={
            emailStatus?.connected
              ? `${emailStatus.sender_email ?? ''} · ${emailStatus.smtp_host}:${emailStatus.smtp_port}`
              : undefined
          }
          onLink={() => setEmailDialogOpen(true)}
          onUnlink={() => disconnectEmailMutation.mutate()}
          linkLabel="Link Account"
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <PublisherCard
          name="Blog"
          apiLabel="Internal Platform"
          description="Publish blog articles, executive briefs, and technical analysis to the internal EchoSafe platform."
          icon={<ArticleIcon sx={{ color: '#6a1b9a', fontSize: 22 }} />}
          connected
          linkedName="EchoSafe Internal"
          linkedEmail="Always available · no OAuth required"
          onLink={() => {}}
          hideUnlink
        />
      </Grid>
    </Grid>
  );

  return (
    <>
      {embedded ? (
        cardGrid
      ) : (
        <Box
          sx={{
            borderRadius: 2,
            border: '1px solid var(--color-border)',
            bgcolor: 'var(--color-card-bg)',
            p: { xs: 2.5, md: 3 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, letterSpacing: '-0.02em' }}>
                Linked Publishers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Link publishing accounts via OAuth and SMTP configuration.
              </Typography>
            </Box>
            <Tooltip title="Refresh status">
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 1.5,
                  color: 'text.secondary',
                }}
              >
                <RefreshIcon
                  sx={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
          {cardGrid}
        </Box>
      )}

      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
          Link Email Account (SMTP)
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>{emailSettingsForm}</DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--color-border)', gap: 1 }}>
          <Button onClick={() => setEmailDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={() => testEmailMutation.mutate()}
            disabled={testEmailMutation.isPending || (isDev && formUsesExternalSmtp)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Test connection
          </Button>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={() => connectEmailMutation.mutate()}
            disabled={connectEmailMutation.isPending || (isDev && formUsesExternalSmtp)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Link Account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PublishingChannelsPanel;
