from __future__ import annotations
from typing import List, Literal, Optional
from pathlib import Path
from typing import ClassVar
import logging
from functools import cached_property
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field, SecretStr, PostgresDsn, RedisDsn, ValidationError

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        validate_default=True,
    )

    # Environment
    ENV: Literal["development", "staging", "production"] = "development"
    ENVIRONMENT: str = Field(default="development", alias="ENV")

    # Server
    PORT: int = Field(3001, ge=1024, le=65535)

    # Database
    POSTGRES_URL: Optional[str] = None
    DATABASE_URL: PostgresDsn = Field(...)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str, values) -> str:
        if not v and values.data.get("POSTGRES_URL"):
            return values.data["POSTGRES_URL"]
        return v

    # Redis
    REDIS_URL: RedisDsn = Field(RedisDsn("redis://red-d4drfv7gi27c73btk900:6379"))

    # JWT
    JWT_ALGORITHM: Literal["RS256", "HS256"] = "RS256"
    JWT_SECRET_ALGORITHM: Literal["HS256"] = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(15, ge=1, le=60)
    JWT_EXPIRATION_HOURS: int = Field(2, ge=1, le=24)
    JWT_PRIVATE_KEY_PATH: ClassVar[Path] = Path("/secrets/jwt_private.pem")
    JWT_PUBLIC_KEY_PATH: ClassVar[Path] = Path("/secrets/jwt_public.pem")
    JWT_SECRET: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)), min_length=32)
    REFRESH_TOKEN_SIGNING_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)), min_length=32)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, ge=1, le=90)

    # Security
    INSTITUTE_SECRET_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)), min_length=32)
    ENCRYPTION_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(44)), min_length=44, max_length=44)
    INSTITUTE_SALT: str = Field("k7fX9Qp2Wm3S8rB1Zt4LhE6jC0NvUyKd", min_length=16)
    CSRF_SECRET_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)), min_length=32)
    SESSION_SECRET_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)), min_length=32)
    ARGON2_TIME_COST: int = Field(3, ge=1, le=10)
    ARGON2_MEMORY_COST: int = Field(131072, ge=1024, le=1048576)
    ARGON2_PARALLELISM: int = Field(4, ge=1, le=8)

    # Login / Account policies
    MAX_FAILED_ATTEMPTS: int = Field(5, ge=1, le=20)
    MAX_LOGIN_ATTEMPTS: int = Field(3, ge=1, le=20)
    LOCKOUT_DURATION_MINUTES: int = Field(15, ge=1, le=1440)
    LOGIN_LOCKOUT_MINUTES: int = Field(15, ge=1, le=1440)
    DEFAULT_SESSION_TIMEOUT: int = Field(30, ge=1, le=1440)
    DEFAULT_PASSWORD_EXPIRATION_DAYS: int = Field(90, ge=1, le=365)

    # Rate Limiting
    RATE_LIMIT_PER_IP: str = "100/minute"
    RATE_LIMIT_PER_USER: str = "20/minute"
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 900

    # CORS & Hosts
    CORS_ORIGINS: str = ""
    ALLOWED_ORIGINS: List[str] = Field(default_factory=list)
    ALLOWED_HOSTS: List[str] = Field(default_factory=lambda: ["*"])
    COOKIE_DOMAIN: str = ".onrender.com"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = Field(default_factory=lambda: ["GET", "POST", "PUT", "PATCH", "OPTIONS"])
    CORS_ALLOW_HEADERS: List[str] = Field(
        default_factory=lambda: [
            "Authorization",
            "Content-Type",
            "Set-Cookie",
            "X-CSRF-Token",
            "Access-Control-Allow-Headers",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
        ]
    )
    CORS_EXPOSE_HEADERS: List[str] = Field(default_factory=lambda: ["Set-Cookie"])

    # Frontend / Domains
    FRONTEND_URL: str = "https://assets-system-sigma.vercel.app"
    DEV_DOMAIN: str = "dev.auth.local"
    DEV_FRONTEND_DOMAIN: str = "dev.frontend.local"

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(16)), alias="SMTP_PASSWORD")

    # Admin Defaults
    DEFAULT_ADMIN_EMAIL: Optional[str] = "dummygeecode@gmail.com"
    DEFAULT_ADMIN_USERNAME: Optional[str] = "admin"
    DEFAULT_ADMIN_PASSWORD: Optional[str] = "Admin@12345"

    # MFA / 2FA
    MFA_ISSUER_NAME: str = "GovernmentAuthSystem"
    TWO_FACTOR_CODE_EXPIRATION_MINUTES: int = 10

    # ID generation / entropy
    ID_ENTROPY_BITS: int = Field(128, ge=80, le=256)
    ISOLATED_MASTER_PASSWORD_DB_URL: Optional[str] = None

    # Session scheduler
    SESSION_TIMEOUT_CHECK_INTERVAL_MINUTES: int = Field(5, ge=1, le=60)
    SESSION_CLEANUP_INTERVAL_MINUTES: int = Field(30, ge=5, le=1440)

    if not JWT_PRIVATE_KEY_PATH.exists():
        fallback = Path(__file__).parent.parent / "secrets"
        JWT_PRIVATE_KEY_PATH = fallback / "jwt_private.pem"
        JWT_PUBLIC_KEY_PATH = fallback / "jwt_public.pem"

    @cached_property
    def cors_origins_list(self) -> List[str]:
        origins = set()
        if self.CORS_ORIGINS:
            origins.update(o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip())
        origins.update(self.ALLOWED_ORIGINS)
        if not origins:
            if self.ENV == "development":
                origins.update([
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://127.0.0.1:3000",
                    "http://10.241.18.55:3000",
                    "http://10.241.18.55:3001",
                    "http://192.168.74.3:3000",
                    "http://192.168.74.102:3000",
                    "https://ardhi-ems.vercel.app",
                    "https://ardhi-assets.onrender.com",
                    "https://assets-system-sigma.vercel.app",
                    f"http://{self.DEV_DOMAIN}",
                    f"http://{self.DEV_FRONTEND_DOMAIN}",
                ])
            elif self.ENV in ("staging", "production"):
                origins.add("https://ardhi-assets.onrender.com")
        return list(origins)

    @cached_property
    def jwt_private_key(self) -> Optional[str]:
        return self._load_key(self.JWT_PRIVATE_KEY_PATH, "private") if self.JWT_ALGORITHM == "RS256" else None

    @cached_property
    def jwt_public_key(self) -> Optional[str]:
        return self._load_key(self.JWT_PUBLIC_KEY_PATH, "public") if self.JWT_ALGORITHM == "RS256" else None

    def _load_key(self, path: Path, key_type: Literal["private", "public"]) -> Optional[str]:
        if not path.is_file():
            logger.error(f"JWT {key_type} key MISSING: {path}")
            return None
        try:
            content = path.read_text(encoding="utf-8").strip()
            if not content:
                logger.error(f"JWT {key_type} key EMPTY: {path}")
                return None
            logger.info(f"JWT {key_type} key LOADED: {path}")
            return content
        except Exception as exc:
            logger.error(f"JWT {key_type} key READ FAILED: {path} | {exc}")
            return None

    @field_validator("JWT_ALGORITHM")
    @classmethod
    def validate_jwt_setup(cls, v: str, values) -> str:
        data = values.data
        if v == "RS256":
            priv_path = data.get("JWT_PRIVATE_KEY_PATH")
            pub_path = data.get("JWT_PUBLIC_KEY_PATH")
            if not (priv_path and pub_path):
                return v
            priv_ok = Path(priv_path).is_file() and Path(priv_path).read_text().strip()
            pub_ok = Path(pub_path).is_file() and Path(pub_path).read_text().strip()
            if not (priv_ok and pub_ok):
                raise ValueError("RS256 requires valid jwt_private.pem and jwt_public.pem")
        else:
            secret = data.get("JWT_SECRET")
            if not secret or len(secret.get_secret_value()) < 32:
                raise ValueError("JWT_SECRET must be >= 32 characters for HS256")
        return v

try:
    settings = Settings() # type: ignore
    logger.info(f"Settings loaded | ENV={settings.ENV} | CORS={len(settings.cors_origins_list)} origins")
except ValidationError as exc:
    logger.critical("FATAL: Configuration validation failed")
    for err in exc.errors():
        loc = " -> ".join(str(loc) for loc in err["loc"])
        logger.critical(f"  [{loc}] {err['msg']} ({err.get('ctx', '')})")
    raise SystemExit(1) from exc
