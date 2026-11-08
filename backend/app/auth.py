"""Auth0 token verification + UBC-email enforcement.

Flow: the frontend logs the user in with Auth0 (passwordless email code), then sends
`Authorization: Bearer <access token>` on every request. We verify the token's
signature against Auth0's public keys, fetch the verified email, and require a UBC address.
"""
import logging
import os

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from . import models
from .database import get_db  # importing database also loads .env

UBC_SUFFIXES = ("@student.ubc.ca", "@alum.ubc.ca", "@students.cs.ubc.ca", "@ubc.ca")

bearer = HTTPBearer(auto_error=False)
_jwk_client: PyJWKClient | None = None
_email_cache: dict[str, str] = {}  # token subject -> verified email

_diagnostic_log = logging.getLogger('ubcver.auth_diagnostic')


def diagnose_current_user(event: str) -> None:
    """Owner-enabled outcome only: never claims, URL, dependency data or payload."""
    if os.getenv('AUTH_REQUEST_DIAGNOSTICS', '').strip().lower() in ('1', 'true', 'yes'):
        _diagnostic_log.info('auth lookup: %s', event)


def is_ubc_email(email: str) -> bool:
    return email.lower().endswith(UBC_SUFFIXES)


def _config() -> tuple[str, str]:
    domain, audience = os.getenv("AUTH0_DOMAIN", ""), os.getenv("AUTH0_AUDIENCE", "")
    if not domain or not audience:
        raise HTTPException(500, "Server auth is not configured (AUTH0_DOMAIN / AUTH0_AUDIENCE).")
    return domain, audience


def _verify(token: str) -> dict:
    global _jwk_client
    domain, audience = _config()
    if _jwk_client is None:
        _jwk_client = PyJWKClient(f"https://{domain}/.well-known/jwks.json")
    try:
        key = _jwk_client.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["RS256"], audience=audience, issuer=f"https://{domain}/")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")


def _fetch_email(token: str, sub: str) -> str:
    """Ask Auth0 who this token belongs to (needs the `email` scope). Cached per user."""
    if sub in _email_cache:
        return _email_cache[sub]
    domain, _ = _config()
    r = httpx.get(f"https://{domain}/userinfo", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    if r.status_code != 200:
        raise HTTPException(401, "Could not read email from Auth0")
    info = r.json()
    if not info.get("email") or not info.get("email_verified"):
        raise HTTPException(403, "Email is not verified")
    _email_cache[sub] = info["email"].lower()
    return _email_cache[sub]


def current_email(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    """Verified UBC email of the caller, or 401/403."""
    if creds is None:
        raise HTTPException(401, "Not logged in")
    claims = _verify(creds.credentials)
    email = _fetch_email(creds.credentials, claims["sub"])
    if not is_ubc_email(email):
        raise HTTPException(403, "A UBC email is required")
    return email


def current_user(email: str = Depends(current_email), db: Session = Depends(get_db)) -> models.User:
    """The caller's profile. 404 means: logged in, but profile not created yet."""
    diagnose_current_user('current_user: dependency entered')
    user = db.query(models.User).filter_by(email=email).first()
    diagnose_current_user(f'current_user: profile {"found" if user else "not found"}')
    if not user:
        raise HTTPException(404, "Profile not found")
    return user
