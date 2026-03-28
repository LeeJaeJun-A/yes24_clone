from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://yes24:yes24@localhost:5432/yes24"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    secret_key: str = "yes24-clone-secret-key-for-sessions"
    session_cookie_name: str = "ASP.NET_SessionId"
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
