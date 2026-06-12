# User Guide

## Getting Started

1. Open http://localhost:3000
2. Sign in with your credentials (default admin: `admin@copilot.local` / `Admin123!`)
3. Use the sidebar to navigate between sections

## Dashboard

The dashboard shows a high-level overview: total articles collected, items pending review, approval/publish counts, and AI verification rate. Recent intelligence appears in the table below.

## Intelligence Feed

Browse collected cybersecurity articles. Use filters for status, severity, and source. Click **Collect All** to trigger an immediate RSS collection run.

### Article Detail

From an article page you can:

1. **Verify** — Run AI verification and trust scoring
2. **Review** — Approve or reject (analyst/admin)
3. **Generate Content** — Create executive brief, customer advisory, technical analysis, newsletter, and social media drafts
4. **Publish** — Publish approved content internally

## Review Queue

Analysts see articles in `pending_manual_review` or `under_review` status. Review AI analysis, trust score breakdown, and validation evidence before approving or rejecting.

## Content Management

- **Generated Content** tab lists all AI-generated content across articles
- **Published** tab shows publish history
- Edit, export, or publish content directly from this page

## Analytics

View collection metrics, severity distribution, trust score histogram, workflow status breakdown, and per-source performance.

## Viewer Role

Viewers can access the dashboard, analytics, and intelligence feed but only see **approved** and **published** articles.
