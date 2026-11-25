from pathlib import Path
import os
import ssl
import sys
from urllib.parse import parse_qs, unquote, urlsplit

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
SCHEMA_FILE = PROJECT_ROOT / "supabase" / "schema.sql"


def _database_config(database_url: str) -> dict[str, object]:
    """Parse a PostgreSQL URI into pg8000 connection arguments."""
    try:
        parsed = urlsplit(database_url)
        port = parsed.port or 5432
    except ValueError as exc:
        raise ValueError("DATABASE_URL has an invalid host or port.") from exc

    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must use postgres:// or postgresql://.")

    username = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    database = unquote(parsed.path.lstrip("/"))
    if not parsed.hostname or not username or not password or not database:
        raise ValueError(
            "DATABASE_URL must include a host, username, password, and database name."
        )

    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", ["require"])[-1].lower()
    if sslmode not in {"require", "verify-ca", "verify-full"}:
        raise ValueError(
            "DATABASE_URL sslmode must be require, verify-ca, or verify-full; "
            "unencrypted or downgrade-capable modes are not accepted."
        )

    root_certificate = query.get("sslrootcert", [None])[-1]
    try:
        ssl_context = ssl.create_default_context(cafile=root_certificate)
    except (OSError, ssl.SSLError) as exc:
        raise ValueError("DATABASE_URL sslrootcert could not be loaded.") from exc

    if sslmode == "require":
        # PostgreSQL's require mode always encrypts but does not validate the
        # server identity. Supabase supplies this mode in its connection URI.
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    elif sslmode == "verify-ca":
        ssl_context.check_hostname = False

    return {
        "user": username,
        "password": password,
        "host": parsed.hostname,
        "port": port,
        "database": database,
        # TLS is always used; verify-full additionally validates the hostname.
        "ssl_context": ssl_context,
        "timeout": 15,
        "application_name": "patient-admission-schema-migration",
    }


def _safe_error(exc: Exception, database_url: str) -> str:
    """Return useful driver details without echoing connection credentials."""
    message = str(exc).replace(database_url, "<DATABASE_URL>")
    try:
        password = urlsplit(database_url).password
    except ValueError:
        password = None
    if password:
        message = message.replace(password, "<redacted>")
        message = message.replace(unquote(password), "<redacted>")
    message = " ".join(message.split())
    return message[:500] or "No additional details were provided by the driver."


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env")
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        print(
            "DATABASE_URL is missing. Copy the PostgreSQL connection URI from "
            "Supabase Dashboard > Connect into backend/.env. This is the database "
            "password URI, not the Supabase API key.",
            file=sys.stderr,
        )
        return 2

    try:
        connection_args = _database_config(database_url)
    except ValueError as exc:
        print(f"Invalid DATABASE_URL: {exc}", file=sys.stderr)
        return 2

    if not SCHEMA_FILE.is_file():
        print(f"Schema file not found: {SCHEMA_FILE}", file=sys.stderr)
        return 2

    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")
    if not schema_sql.strip():
        print(f"Schema file is empty: {SCHEMA_FILE}", file=sys.stderr)
        return 2

    try:
        import pg8000.dbapi
    except ImportError:
        print(
            "pg8000 is missing from this Python environment. Activate backend/.venv "
            "and run: python -m pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 2

    try:
        connection = pg8000.dbapi.connect(**connection_args)
    except Exception as exc:
        print(
            "Could not connect to Supabase PostgreSQL. Check DATABASE_URL, the "
            "database password, host/port, TLS support, and network access. "
            f"Details: {type(exc).__name__}: {_safe_error(exc, database_url)}",
            file=sys.stderr,
        )
        return 1

    try:
        cursor = connection.cursor()
        try:
            # With no bound parameters, pg8000 uses PostgreSQL's simple-query
            # protocol, which accepts a complete SQL script. This preserves
            # dollar-quoted PL/pgSQL bodies without splitting on semicolons.
            cursor.execute(schema_sql)
            connection.commit()
        finally:
            cursor.close()
    except Exception as exc:
        try:
            connection.rollback()
        except Exception:
            pass
        print(
            "Connected to PostgreSQL, but applying supabase/schema.sql failed. "
            "The migration transaction was rolled back; check the SQL and the "
            "database user's privileges. "
            f"Details: {type(exc).__name__}: {_safe_error(exc, database_url)}",
            file=sys.stderr,
        )
        return 1
    finally:
        connection.close()

    print("Supabase schema applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
