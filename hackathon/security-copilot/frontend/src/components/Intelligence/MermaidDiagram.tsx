import React, { useEffect, useId, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import mermaid from 'mermaid';

let mermaidInitialized = false;

const initMermaid = () => {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#e3f2fd',
      primaryTextColor: '#1a1a1a',
      primaryBorderColor: '#0078d7',
      lineColor: '#0078d7',
      secondaryColor: '#f5f7fa',
      tertiaryColor: '#fff',
      fontFamily: 'Roboto, sans-serif',
    },
    flowchart: { curve: 'basis', padding: 16 },
    securityLevel: 'loose',
  });
  mermaidInitialized = true;
};

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    initMermaid();
    let cancelled = false;
    setError(false);
    setSvg('');

    mermaid
      .render(`mermaid-${id}-${Date.now()}`, chart.trim())
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <Box
        sx={{
          my: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: 'rgba(211,47,47,0.06)',
          border: '1px solid rgba(211,47,47,0.3)',
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
        }}
      >
        {chart}
      </Box>
    );
  }

  if (!svg) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        my: 2,
        p: { xs: 1.5, md: 2.5 },
        borderRadius: 2,
        bgcolor: 'rgba(0,120,215,0.04)',
        border: '1px solid var(--color-border-primary)',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        '& svg': { maxWidth: '100%', height: 'auto' },
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;
