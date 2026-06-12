# Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ audit_logs : creates
    users ||--o{ approvals : performs
    users ||--o{ published_content : publishes

    sources ||--o{ articles : provides

    articles ||--o| verification_results : has
    articles ||--o{ approvals : receives
    articles ||--o{ generated_content : produces
    articles ||--o{ published_content : publishes

    generated_content ||--o| published_content : becomes

    users {
        int id PK
        string email UK
        string hashed_password
        string role
        bool is_active
    }

    sources {
        int id PK
        string name
        string url
        string source_type
        bool is_active
    }

    articles {
        int id PK
        int source_id FK
        string title
        string url UK
        string status
        string severity
        int trust_score
    }

    verification_results {
        int id PK
        int article_id FK UK
        int authenticity_score
        int credibility_score
        json cve_references
        json trust_score_breakdown
    }

    generated_content {
        int id PK
        int article_id FK
        string content_type
        text content
    }

    published_content {
        int id PK
        int generated_content_id FK
        int article_id FK
        string platform
    }

    audit_logs {
        int id PK
        int user_id FK
        string action
        string resource_type
        json details
    }

    settings {
        int id PK
        string key UK
        string value
    }
```

## Tables

| Table | Description |
|-------|-------------|
| `users` | Platform users with embedded role (admin/analyst/viewer) |
| `sources` | Intelligence source configuration |
| `articles` | Collected intelligence items |
| `verification_results` | AI analysis, CVE refs, trust breakdown |
| `generated_content` | Stakeholder-specific generated content |
| `published_content` | Publish history |
| `approvals` | Analyst approval/rejection records |
| `audit_logs` | Immutable audit trail |
| `settings` | System configuration (AI model, API keys) |

## Article Status Flow

```
new → ai_verified → pending_manual_review → approved → published
                  ↘ rejected
                  ↘ under_review
```

## Migrations

Alembic migration `001_initial_schema.py` defines the canonical schema. At runtime, `init_db()` also calls `create_all()` for local development convenience.
