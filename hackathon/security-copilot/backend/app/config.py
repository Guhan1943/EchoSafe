from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/security_copilot"
    SECRET_KEY: str = "change-me-in-production-secret-key-at-least-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ENVIRONMENT: str = "development"
    ENCRYPTION_KEY: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    PROJECT_NAME: str = "Security Intelligence"
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = "http://localhost:5000/auth/linkedin/callback"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
