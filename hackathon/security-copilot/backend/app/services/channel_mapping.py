"""Map content types to publishing platforms."""

CONTENT_TYPE_PLATFORMS: dict[str, str] = {
    "social_media": "linkedin",
    "email": "email",
    "newsletter": "email",
    "blog": "blog",
    # legacy types
    "customer_advisory": "email",
    "executive_brief": "blog",
    "technical_analysis": "blog",
}

PUBLISHABLE_TYPES = {"social_media", "email", "newsletter", "blog", "customer_advisory", "executive_brief", "technical_analysis"}


def platform_for_content_type(content_type: str) -> str:
    return CONTENT_TYPE_PLATFORMS.get(content_type, "internal")


def channel_label(platform: str) -> str:
    labels = {
        "linkedin": "LinkedIn",
        "email": "Email (SMTP)",
        "blog": "Blog (Internal)",
        "internal": "Internal",
    }
    return labels.get(platform, platform.title())
