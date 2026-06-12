import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Skeleton,
  Button,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '../../api/blogApi';
import { softBadgeSx } from '../../styles/badges';

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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const BlogLandingPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => blogApi.listPosts({ limit: 50 }),
  });

  const posts = data?.items ?? [];
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 45%, #1976d2 100%)',
          color: '#fff',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="overline"
            sx={{ opacity: 0.85, letterSpacing: '0.12em', fontWeight: 700 }}
          >
            EchoSafe Internal
          </Typography>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mt: 1, mb: 1.5, letterSpacing: '-0.03em', maxWidth: 720 }}
          >
            Security intelligence, published for your team
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, maxWidth: 560, lineHeight: 1.6 }}>
            Blog articles, executive briefs, and technical analysis — curated from verified threat
            intelligence.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, mt: featured ? -4 : 0 }}>
        {isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="rounded" height={220} />
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              px: 3,
              borderRadius: 3,
              border: '1px dashed var(--color-border)',
              bgcolor: '#fff',
            }}
          >
            <ArticleIcon sx={{ fontSize: 56, color: 'var(--color-text-muted)', mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              No blog posts yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
              Publish blog, executive brief, or technical analysis content from Content Management to see
              it here.
            </Typography>
            <Button
              component={RouterLink}
              to="/content"
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Go to Content Management
            </Button>
          </Box>
        ) : (
          <>
            {featured && (
              <Card
                sx={{
                  mb: 4,
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 32px rgba(13, 71, 161, 0.12)',
                }}
              >
                <CardActionArea component={RouterLink} to={`/blog/${featured.id}`}>
                  <Grid container>
                    <Grid item xs={12} md={7}>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            label="Featured"
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: 'var(--color-primary)', color: '#fff' }}
                          />
                          <Chip
                            label={featured.content_type_label}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                          {featured.severity && (
                            <Chip
                              label={featured.severity}
                              size="small"
                              sx={softBadgeSx(severityColor(featured.severity))}
                            />
                          )}
                        </Box>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, letterSpacing: '-0.02em' }}>
                          {featured.title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                          {featured.excerpt}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(featured.published_at)}
                        </Typography>
                      </CardContent>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={5}
                      sx={{
                        bgcolor: 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)',
                        background: 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 200,
                        p: 4,
                      }}
                    >
                      <ArticleIcon sx={{ fontSize: 80, color: 'var(--color-primary)', opacity: 0.35 }} />
                    </Grid>
                  </Grid>
                </CardActionArea>
              </Card>
            )}

            <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
              Latest posts
            </Typography>

            <Grid container spacing={3}>
              {rest.map((post) => (
                <Grid item xs={12} sm={6} lg={4} key={post.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 2.5,
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardActionArea
                      component={RouterLink}
                      to={`/blog/${post.id}`}
                      sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <CardContent sx={{ flex: 1, p: 2.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                          <Chip
                            label={post.content_type_label}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                          />
                          {post.severity && (
                            <Chip
                              label={post.severity}
                              size="small"
                              sx={softBadgeSx(severityColor(post.severity))}
                            />
                          )}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, lineHeight: 1.4 }}>
                          {post.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            lineHeight: 1.65,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {post.excerpt}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(post.published_at)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {rest.length > 0 && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button
                  component={RouterLink}
                  to="/content"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Publish more from Content Management
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default BlogLandingPage;
