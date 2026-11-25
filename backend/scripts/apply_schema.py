from pathlib import Path
import os
import sys

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
SCHEMA_FILE = PROJECT_ROOT / "supabase" / "schema.sql"


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env")
    database_url = os.getenv("SUPABASE_DB_URL")
    if not database_url:
        print(
            "SUPABASE_DB_URL is missing. Copy the PostgreSQL connection string from "
            "Supabase Dashboard > Connect into backend/.env. The API secret key is not a database password.",
            file=sys.stderr,
        )
        return 2
    if not database_url.startswith(("postgres://", "postgresql://")):
        print("SUPABASE_DB_URL must be a PostgreSQL connection URI.", file=sys.stderr)
        return 2
    if not SCHEMA_FILE.is_file():
        print(f"Schema file not found: {SCHEMA_FILE}", file=sys.stderr)
        return 2

    try:
        import psycopg
    except ImportError:
        print("psycopg is missing. Run pip install -r requirements.txt.", file=sys.stderr)
        return 2

    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")
    try:
        # No parameters are interpolated; send the idempotent schema as one transaction.
        with psycopg.connect(database_url, sslmode="require") as connection:
            connection.execute(schema_sql, prepare=False)
    except Exception as exc:
        print(
            "Schema application failed. Check the DB connection URI, network access, and database privileges "
            f"({type(exc).__name__}).",
            file=sys.stderr,
        )
        return 1

    print("Supabase schema applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
