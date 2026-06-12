from app.schemas.analytics import (
    ArticlesBySeverity,
    ArticlesByStatus,
    OverviewResponse,
    SourceStatsResponse,
    TrustScoreDistributionResponse,
    TrustScoreRange,
)
from app.schemas.approval import (
    ApprovalBase,
    ApprovalCreate,
    ApprovalListResponse,
    ApprovalResponse,
)
from app.schemas.article import (
    ArticleDetailResponse,
    ArticleListResponse,
    ArticleResponse,
    VerificationResultResponse,
)
from app.schemas.audit import AuditLogListResponse, AuditLogResponse
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.content import (
    GeneratedContentResponse,
    GeneratedContentUpdate,
    PublishedContentListResponse,
    PublishedContentResponse,
)
from app.schemas.settings import SettingResponse, SettingUpdate
from app.schemas.source import SourceBase, SourceCreate, SourceResponse, SourceUpdate
from app.schemas.user import UserBase, UserCreate, UserResponse, UserUpdate

__all__ = [
    # auth
    "TokenResponse",
    "LoginRequest",
    "ChangePasswordRequest",
    # user
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    # source
    "SourceBase",
    "SourceCreate",
    "SourceUpdate",
    "SourceResponse",
    # article
    "ArticleResponse",
    "ArticleListResponse",
    "VerificationResultResponse",
    "ArticleDetailResponse",
    # approval
    "ApprovalBase",
    "ApprovalCreate",
    "ApprovalResponse",
    "ApprovalListResponse",
    # content
    "GeneratedContentResponse",
    "GeneratedContentUpdate",
    "PublishedContentResponse",
    "PublishedContentListResponse",
    # analytics
    "ArticlesBySeverity",
    "ArticlesByStatus",
    "OverviewResponse",
    "SourceStatsResponse",
    "TrustScoreRange",
    "TrustScoreDistributionResponse",
    # audit
    "AuditLogResponse",
    "AuditLogListResponse",
    # settings
    "SettingResponse",
    "SettingUpdate",
]
