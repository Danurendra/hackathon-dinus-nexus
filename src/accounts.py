"""Password hashing and database-backed sessions; no external identity provider."""
import hashlib
import re
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from src.db.models import User, UserSession
from src.db.session import SessionLocal

PASSWORD_ITERATIONS = 600_000


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("Format email tidak valid.")
    return email


def hash_password(password: str) -> str:
    if not 12 <= len(password) <= 128:
        raise ValueError("Password harus 12–128 karakter.")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256" or int(iterations) != PASSWORD_ITERATIONS:
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return secrets.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def as_utc(value: datetime) -> datetime:
    # SQLite test driver drops timezone information; PostgreSQL keeps it.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def public_user(user: User) -> dict:
    return {"user_id": user.user_id, "email": user.email, "display_name": user.display_name}


def authenticate_session(authorization: str | None) -> dict:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 128:
        raise HTTPException(401, "Sesi login tidak valid atau kedaluwarsa.")
    try:
        with SessionLocal() as db:
            row = db.execute(
                select(UserSession, User).join(User, User.user_id == UserSession.user_id)
                .where(UserSession.token_hash == token_digest(token))
            ).first()
            if row is None or not row.User.is_active or as_utc(row.UserSession.expires_at) <= datetime.now(timezone.utc):
                raise HTTPException(401, "Sesi login tidak valid atau kedaluwarsa.")
            return public_user(row.User)
    except SQLAlchemyError:
        raise HTTPException(503, "Layanan autentikasi belum tersedia.") from None
