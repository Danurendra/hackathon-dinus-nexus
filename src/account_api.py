"""Login email/password and revocable sessions stored in PostgreSQL."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

from src.accounts import authenticate_session, as_utc, hash_password, normalize_email, public_user, token_digest, verify_password
from src.db.models import User, UserSession
from src.db.session import SessionLocal

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
# Match the password work for unknown emails, without storing a dummy account.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(24))


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_valid(cls, value: str) -> str:
        return normalize_email(value)


@router.post("/login")
def login(body: LoginInput, response: Response):
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(timezone.utc)
    try:
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == body.email).with_for_update())
            valid = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
            if user and user.locked_until and as_utc(user.locked_until) > now:
                raise HTTPException(401, "Email atau password tidak cocok. Coba lagi nanti bila akses terkunci sementara.")
            if not user or not user.is_active or not valid:
                if user and user.is_active:
                    if user.locked_until and as_utc(user.locked_until) <= now:
                        user.failed_logins = 0
                    user.failed_logins += 1
                    if user.failed_logins >= 5:
                        user.locked_until = now + timedelta(minutes=15)
                    db.commit()
                raise HTTPException(401, "Email atau password tidak cocok. Coba lagi nanti bila akses terkunci sementara.")
            user.failed_logins = 0
            user.locked_until = None
            db.execute(delete(UserSession).where(UserSession.expires_at <= now))
            token = secrets.token_urlsafe(32)
            expires_at = now + timedelta(hours=8)
            db.add(UserSession(token_hash=token_digest(token), user_id=user.user_id, expires_at=expires_at))
            db.commit()
            return {"user": public_user(user), "access_token": token, "token_type": "bearer", "expires_at": expires_at.isoformat()}
    except SQLAlchemyError:
        raise HTTPException(503, "Layanan autentikasi belum tersedia. Periksa database dan migrasi.") from None


@router.get("/me")
def me(response: Response, authorization: str | None = Header(default=None)):
    response.headers["Cache-Control"] = "no-store"
    return {"user": authenticate_session(authorization)}


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None)):
    # Idempotent for expired/revoked tokens, but never revoke other sessions.
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 128:
        raise HTTPException(401, "Sesi login tidak valid.")
    try:
        with SessionLocal() as db:
            db.execute(delete(UserSession).where(UserSession.token_hash == token_digest(token)))
            db.commit()
    except SQLAlchemyError:
        raise HTTPException(503, "Sesi belum dapat dicabut. Silakan coba lagi.") from None
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
