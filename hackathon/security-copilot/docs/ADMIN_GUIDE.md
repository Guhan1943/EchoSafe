# Admin Guide

## Admin Panel

Navigate to **Admin** in the sidebar.

### User Management

- **Create users** with email, password, name, and role (admin/analyst/viewer)
- **Edit users** — change role, name, email, or active status
- **Delete users** — cannot delete your own account

### System Settings

Configure platform behavior:

| Setting | Description |
|---------|-------------|
| `openai_model` | OpenAI model for verification and content generation |
| `openai_api_key` | API key for AI features (falls back to heuristics if empty) |
| `max_articles_per_collection` | Cap per source per collection run |

Settings can also be set via environment variables in `docker-compose.yml`.

## Source Management

Navigate to **Sources** to:

- Add/edit/delete intelligence sources
- Toggle active/inactive status
- Trigger manual collection for a single source
- Configure polling interval

Default seeded sources: The Hacker News, BleepingComputer, SecurityWeek, Dark Reading, Krebs on Security.

## Audit Logs

Navigate to **Audit** to view the immutable audit trail. Filter by action, resource type, or user ID. Expand rows to see full JSON details.

Logged events include: logins, user CRUD, article verification, approvals, content generation, publishing, and settings changes.

## Override Approvals

Admins have analyst privileges and can approve/reject any article in the review queue. Status can also be updated directly from article detail.

## Security Notes

- Change the default admin password immediately in production
- Set a strong `SECRET_KEY` environment variable
- Store `OPENAI_API_KEY` securely; never commit `.env` files
- Review audit logs regularly for anomalous activity
