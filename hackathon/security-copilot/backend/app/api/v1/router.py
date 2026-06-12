from fastapi import APIRouter

from app.api.v1 import (
    auth,
    users,
    sources,
    articles,
    approvals,
    content,
    publishing,
    analytics,
    audit,
    settings,
    collector,
    threats,
    threat_collectors,
)

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(sources.router, prefix="/sources", tags=["Sources"])
router.include_router(articles.router, prefix="/articles", tags=["Articles"])
router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
router.include_router(content.router, prefix="/content", tags=["Content"])
router.include_router(publishing.router, prefix="/publishing", tags=["Publishing"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(audit.router, prefix="/audit", tags=["Audit"])
router.include_router(settings.router, prefix="/settings", tags=["Settings"])
router.include_router(collector.router, prefix="/collector", tags=["Collector"])
router.include_router(threats.router, prefix="/threats", tags=["Threat Intelligence"])
router.include_router(threat_collectors.router, prefix="/collectors", tags=["CTI Collectors"])
