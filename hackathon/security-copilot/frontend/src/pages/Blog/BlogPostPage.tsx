import React from 'react';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Chip,
  Skeleton,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '../../api/blogApi';
import { softBadgeSx } from '../../styles/badges';
import { stripHtmlTags } from '../../utils/htmlContent';

const renderBlogContent = (content: string) =>
  content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return (
        <Typography key={i} variant="h4" sx={{ fontWeight: 800, mb: 1.5, fontFamily: 'Georgia, serif' }}>
          {line.replace(/^#\s+/, '')}
        </Typography>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <Typography key={i} variant="h5" sx={{ fontWeight: 700, mt: 3, mb: 1.5, fontFamily: 'Georgia, serif' }}>
          {line.replace(/^##\s+/, '')}
        </Typography>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <Typography key={i} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1, fontFamily: 'Georgia, serif' }}>
          {line.replace(/^###\s+/, '')}
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
            my: 2,
            fontStyle: 'italic',
            color: 'text.secondary',
            lineHeight: 1.7,
          }}
        >
          {line.replace(/^>\s+/, '')}
        </Box>
      );
    }
    if (line.startsWith('---') || line.startsWith('*Published') || line.startsWith('*Tags')) {
      return (
        <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', my: 1 }}>
          {line.replace(/^\*|\*$/g, '')}
        </Typography>
      );
    }
    if (line.trim() === '') return <Box key={i} sx={{ height: 12 }} />;
    return (
      <Typography key={i} paragraph sx={{ mb: 1.5, lineHeight: 1.85, fontFamily: 'Georgia, serif', fontSize: '1.05rem' }}>
        {line}
      </Typography>
    );
  });

const severityColor = (severity: string | null) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#c62828';
    case 'high':
      return '#e65100';
    case 'medium':
      return '#f9a825';
    case 'low':
      return '#2e7d32';
    default:
      return '#546e7a';
  }
};

const formatDate = (raw: string) =>
  new Date(raw).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const BlogPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const publishedId = Number(id);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', publishedId],
    queryFn: () => blogApi.getPost(publishedId),
    enabled: Number.isFinite(publishedId) && publishedId > 0,
  });

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Skeleton width={120} height={32} sx={{ mb: 3 }} />
        <Skeleton width="80%" height={48} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={24} sx={{ mb: 4 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={20} sx={{ mb: 1 }} />
        ))}
      </Container>
    );
  }

  if (isError || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Post not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This blog post may have been removed or is not published yet.
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/blog')}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Back to blog
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 5 } }}>
      <Button
        component={RouterLink}
        to="/blog"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
      >
        All posts
      </Button>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={post.content_type_label} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          {post.severity && (
            <Chip label={post.severity} size="small" sx={softBadgeSx(severityColor(post.severity))} />
          )}
          {post.trust_score != null && (
            <Chip
              label={`Trust ${post.trust_score}%`}
              size="small"
              sx={softBadgeSx('#1565c0')}
            />
          )}
        </Box>

        <Typography
          variant="h3"
          fontWeight={800}
          sx={{ mb: 1.5, letterSpacing: '-0.03em', lineHeight: 1.2 }}
        >
          {post.title}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Published {formatDate(post.published_at)}
        </Typography>
      </Box>

      {post.article_summary && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 4,
            borderRadius: 2,
            bgcolor: '#e3f2fd',
            border: '1px solid rgba(25, 118, 210, 0.2)',
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            Intelligence summary
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.7 }}>
            {stripHtmlTags(post.article_summary)}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ mb: 4 }} />

      <Box>{renderBlogContent(stripHtmlTags(post.content))}</Box>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Source article #{post.article_id}
          {post.article_title ? ` · ${post.article_title}` : ''}
        </Typography>
        <Button
          component={RouterLink}
          to={`/intelligence/${post.article_id}`}
          size="small"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          View intelligence
        </Button>
      </Box>
    </Container>
  );
};

export default BlogPostPage;
