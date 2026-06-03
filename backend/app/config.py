from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://quiniesys:quiniesys_pass@postgres:5432/quiniesys"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    ml_engine_url: str = "http://ml-engine:8001"
    api_football_key: str = ""
    football_data_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
