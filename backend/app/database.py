import os
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()


@lru_cache(maxsize=1)
def get_supabase() -> Any:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=503,
            detail="Database is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env.",
        )
    try:
        from supabase import create_client
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Supabase SDK is not installed. Run pip install -r requirements.txt.",
        ) from exc
    try:
        return create_client(url, key)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not connect to the configured database.") from exc
