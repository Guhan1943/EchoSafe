import React from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import scoringDoc from '../../content/scoring-system-explained.md?raw';
import MermaidDiagram from './MermaidDiagram';

interface ScoringSystemInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const text = String(children).replace(/\n$/, '');
    if (className?.includes('language-mermaid')) {
      return <MermaidDiagram chart={text} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <Box component="div">{children}</Box>;
  },
};

const ScoringSystemInfoDialog: React.FC<ScoringSystemInfoDialogProps> = ({ open, onClose }) => (
  <Dialog fullScreen open={open} onClose={onClose}>
    <AppBar
      sx={{
        position: 'sticky',
        bgcolor: 'var(--color-card-bg)',
        color: 'var(--color-text-primary)',
        borderBottom: '1px solid var(--color-border-primary)',
        boxShadow: 'none',
      }}
    >
      <Toolbar variant="dense">
        <IconButton edge="start" onClick={onClose} sx={{ color: 'var(--color-text-primary)' }}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
    </AppBar>

    <Box sx={{ overflow: 'auto', bgcolor: 'var(--color-bg-primary)' }}>
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: 3,
          py: 3,
          color: 'var(--color-text-primary)',
          fontSize: 14,
          lineHeight: 1.7,
          '& h1': { fontSize: '1.75rem', fontWeight: 700, mt: 0, mb: 2 },
          '& h2': { fontSize: '1.25rem', fontWeight: 700, mt: 3, mb: 1.5 },
          '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 2, mb: 1 },
          '& p, & li': { mb: 1 },
          '& ul, & ol': { pl: 3, mb: 1.5 },
          '& hr': { border: 'none', borderTop: '1px solid var(--color-border-primary)', my: 2 },
          '& table': { width: '100%', borderCollapse: 'collapse', mb: 2, fontSize: 13 },
          '& th, & td': { border: '1px solid var(--color-border-primary)', px: 1.5, py: 1, textAlign: 'left' },
          '& th': { fontWeight: 600 },
          '& code': { fontFamily: 'monospace', fontSize: '0.9em' },
          '& pre code': { display: 'block', whiteSpace: 'pre-wrap', p: 2, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 },
          '& a': { color: 'var(--color-primary)' },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {scoringDoc}
        </ReactMarkdown>
      </Box>
    </Box>
  </Dialog>
);

export default ScoringSystemInfoDialog;
