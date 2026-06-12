import React from 'react';
import { Box, Typography, CircularProgress, LinearProgress, Tooltip } from '@mui/material';

interface TrustScoreGaugeProps {
  score: number;
  variant?: 'circular' | 'linear';
  size?: number;
  showLabel?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score <= 40) return '#D32F2F';       // red
  if (score <= 60) return '#F57C00';       // orange
  if (score <= 79) return '#F9A825';       // yellow
  return '#388E3C';                         // green
};

const getScoreLabel = (score: number): string => {
  if (score <= 40) return 'Low Trust';
  if (score <= 60) return 'Moderate';
  if (score <= 79) return 'Good';
  return 'High Trust';
};

const TrustScoreGauge: React.FC<TrustScoreGaugeProps> = ({
  score,
  variant = 'circular',
  size = 60,
  showLabel = true,
}) => {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  if (variant === 'linear') {
    return (
      <Tooltip title={`${label}: ${clampedScore}/100`}>
        <Box sx={{ width: '100%' }}>
          {showLabel && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Trust Score
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color }}>
                {clampedScore}
              </Typography>
            </Box>
          )}
          <LinearProgress
            variant="determinate"
            value={clampedScore}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
                borderRadius: 4,
              },
            }}
          />
          {showLabel && (
            <Typography variant="caption" sx={{ color, mt: 0.5, display: 'block' }}>
              {label}
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  }

  // Circular variant
  return (
    <Tooltip title={`${label}: ${clampedScore}/100`}>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          {/* Background circle */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={size}
            thickness={4}
            sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }}
          />
          {/* Score arc */}
          <CircularProgress
            variant="determinate"
            value={clampedScore}
            size={size}
            thickness={4}
            sx={{ color }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color, fontSize: size * 0.22 }}
            >
              {clampedScore}
            </Typography>
          </Box>
        </Box>
        {showLabel && (
          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
            {label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default TrustScoreGauge;
