import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Paper, Skeleton } from '@mui/material';
import apiClient from '../../api/client';

interface GeneratedContentPreviewProps {
  contentType: string;
  title?: string | null;
  content: string;
  imageUrl?: string | null;
}

const monoSx = {
  fontFamily: '"Roboto Mono", "Consolas", monospace',
  fontSize: 13,
  lineHeight: 1.7,
  whiteSpace: 'pre-wrap' as const,
  color: 'var(--color-text-primary)',
};

const useProxiedImage = (imageUrl?: string | null) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setSrc(null);
      setFailed(false);
      return undefined;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    apiClient
      .get('/content/image-proxy', { params: { url: imageUrl }, responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return { src, loading, failed };
};

const EmailPreview: React.FC<{ content: string }> = ({ content }) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid var(--color-border-primary)',
      borderRadius: 2,
      overflow: 'hidden',
      bgcolor: '#fafafa',
    }}
  >
    <Box sx={{ px: 2, py: 1, bgcolor: '#eef2f7', borderBottom: '1px solid #dde3ea' }}>
      <Chip label="Email Draft" size="small" color="primary" sx={{ mb: 0.5 }} />
      <Typography variant="caption" sx={{ display: 'block', color: 'var(--color-text-secondary)' }}>
        Ready to send via SMTP
      </Typography>
    </Box>
    <Box sx={{ p: 2.5, ...monoSx }}>{content}</Box>
  </Paper>
);

const LinkedInPreview: React.FC<{ content: string; title?: string | null; imageUrl?: string | null }> = ({
  content,
  title,
  imageUrl,
}) => {
  const { src, loading, failed } = useProxiedImage(imageUrl);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 560,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', borderBottom: '1px solid var(--color-border-primary)' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: '#0a66c2',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          SC
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
            Security Intelligence
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
            Cybersecurity · Just now
          </Typography>
        </Box>
      </Box>

      {imageUrl && (
        <Box sx={{ bgcolor: '#f3f2ef' }}>
          {loading && <Skeleton variant="rectangular" height={280} />}
          {!loading && src && (
            <Box
              component="img"
              src={src}
              alt="Post cover"
              sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
            />
          )}
          {!loading && failed && (
            <Box sx={{ p: 2, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Cover image unavailable
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        {title && (
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1, color: 'var(--color-text-primary)' }}>
            {title.replace(/^LinkedIn Post:\s*/i, '')}
          </Typography>
        )}
        <Typography sx={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
          {content}
        </Typography>
      </Box>
    </Paper>
  );
};

const BlogPreview: React.FC<{ content: string; imageUrl?: string | null }> = ({ content, imageUrl }) => {
  const { src, loading } = useProxiedImage(imageUrl);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1, bgcolor: '#f5f7fa', borderBottom: '1px solid var(--color-border-primary)' }}>
        <Chip label="Blog Article" size="small" sx={{ bgcolor: '#7b1fa2', color: '#fff' }} />
      </Box>
      {imageUrl && src && !loading && (
        <Box component="img" src={src} alt="Article cover" sx={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
      )}
      <Box
        sx={{
          p: 3,
          fontSize: 15,
          lineHeight: 1.8,
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {content.split('\n').map((line, i) => {
          if (line.startsWith('# ')) {
            return (
              <Typography key={i} variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: 'inherit' }}>
                {line.replace(/^#\s+/, '')}
              </Typography>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <Typography key={i} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1, fontFamily: 'inherit' }}>
                {line.replace(/^##\s+/, '')}
              </Typography>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <Box
                key={i}
                sx={{
                  borderLeft: '4px solid var(--color-primary)',
                  pl: 2,
                  my: 1.5,
                  fontStyle: 'italic',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {line.replace(/^>\s+/, '')}
              </Box>
            );
          }
          if (line.startsWith('---') || line.startsWith('*Published') || line.startsWith('*Tags')) {
            return (
              <Typography key={i} variant="caption" sx={{ display: 'block', color: 'var(--color-text-secondary)', my: 0.5 }}>
                {line.replace(/^\*|\*$/g, '')}
              </Typography>
            );
          }
          if (line.trim() === '') return <Box key={i} sx={{ height: 8 }} />;
          return (
            <Typography key={i} paragraph sx={{ mb: 1, fontFamily: 'inherit', fontSize: 'inherit' }}>
              {line}
            </Typography>
          );
        })}
      </Box>
    </Paper>
  );
};

const NewsletterPreview: React.FC<{ content: string }> = ({ content }) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid var(--color-border-primary)',
      borderRadius: 2,
      overflow: 'hidden',
      bgcolor: '#fffef8',
    }}
  >
    <Box sx={{ px: 2, py: 1, bgcolor: '#fff3cd', borderBottom: '1px solid #f0e6b2' }}>
      <Chip label="Newsletter Template" size="small" sx={{ bgcolor: '#f9a825', color: '#fff' }} />
    </Box>
    <Box sx={{ p: 2.5, ...monoSx, fontSize: 12.5 }}>{content}</Box>
  </Paper>
);

const GeneratedContentPreview: React.FC<GeneratedContentPreviewProps> = ({
  contentType,
  title,
  content,
  imageUrl,
}) => {
  switch (contentType) {
    case 'email':
      return <EmailPreview content={content} />;
    case 'social_media':
      return <LinkedInPreview content={content} title={title} imageUrl={imageUrl} />;
    case 'blog':
      return <BlogPreview content={content} imageUrl={imageUrl} />;
    case 'newsletter':
      return <NewsletterPreview content={content} />;
    default:
      return (
        <Box sx={{ ...monoSx, p: 2, border: '1px solid var(--color-border-primary)', borderRadius: 2 }}>
          {content}
        </Box>
      );
  }
};

export default GeneratedContentPreview;
