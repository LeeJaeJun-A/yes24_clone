from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://yes24:yes24@localhost:5432/yes24"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    # JWT secret — override via JWT_SECRET env var in production
    secret_key: str = "yes24-clone-secret-key-change-in-production"
    jwt_secret: str = ""  # alias for secret_key, takes priority if set
    session_cookie_name: str = "ASP.NET_SessionId"
    debug: bool = False

    @property
    def effective_secret_key(self) -> str:
        return self.jwt_secret if self.jwt_secret else self.secret_key

    class Config:
        env_file = ".env"


settings = Settings()
