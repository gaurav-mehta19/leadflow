from functools import lru_cache
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ASYNC_POSTGRES_SCHEME = "postgresql+asyncpg://"


def require_async_postgres_url(value: str) -> str:
    if not value.startswith(ASYNC_POSTGRES_SCHEME):
        raise ValueError(f"must start with {ASYNC_POSTGRES_SCHEME}")
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "LeadFlow API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    database_url: str
    test_database_url: str | None = None
    db_pool_size: int = Field(default=5, ge=1)
    db_max_overflow: int = Field(default=5, ge=0)
    db_echo: bool = False
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    default_timezone: str = "Asia/Kolkata"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["console", "json"] = "console"

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        return require_async_postgres_url(value)

    @field_validator("test_database_url")
    @classmethod
    def validate_test_database_url(cls, value: str | None) -> str | None:
        return None if value is None else require_async_postgres_url(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("default_timezone")
    @classmethod
    def validate_default_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError(f"'{value}' is not a valid IANA time zone") from error
        return value

    @field_validator("api_v1_prefix")
    @classmethod
    def validate_prefix(cls, value: str) -> str:
        if not value.startswith("/") or value.endswith("/"):
            raise ValueError("must start with '/' and must not end with '/'")
        return value

    @property
    def default_zone(self) -> ZoneInfo:
        return ZoneInfo(self.default_timezone)


@lru_cache
def get_settings() -> Settings:
    return Settings()
