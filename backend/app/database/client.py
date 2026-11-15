"""Database client initialization and unified database operation helpers.

Supports Supabase PostgreSQL + pgvector when configured, with automatic,
robust local SQLite relational + NumPy vector storage fallback.
"""

from typing import Any, Dict, List, Optional
import structlog
from supabase import Client, create_client

from app.core.config import get_settings
from app.database.sqlite_store import (
    DB_PATH,
    init_sqlite_db,
    sqlite_fetch_one,
    sqlite_fetch_all,
    sqlite_insert_row,
    sqlite_update_row,
    sqlite_delete_rows,
    sqlite_vector_search,
    sqlite_execute_query,
)

logger = structlog.get_logger(__name__)

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None

# Ensure SQLite schema is prepared at import
init_sqlite_db()


def get_supabase_client() -> Optional[Client]:
    """Get or initialize standard Supabase client (anon key)."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        logger.error("Failed to initialize Supabase client", error=str(e))
        return None


def get_supabase_admin_client() -> Optional[Client]:
    """Get or initialize Supabase admin/service-role client."""
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    settings = get_settings()
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
    if not settings.SUPABASE_URL or not key:
        return None

    try:
        _supabase_admin_client = create_client(settings.SUPABASE_URL, key)
        return _supabase_admin_client
    except Exception as e:
        logger.error("Failed to initialize Supabase admin client", error=str(e))
        return None


async def check_database_connection() -> Dict[str, Any]:
    """Check connectivity to database (Supabase or local SQLite)."""
    client = get_supabase_admin_client() or get_supabase_client()
    if client:
        try:
            response = client.table("organisations").select("id").limit(1).execute()
            return {
                "status": "connected",
                "backend": "supabase_postgresql",
                "message": "Connected to Supabase PostgreSQL",
                "count": len(response.data) if response.data else 0,
            }
        except Exception as e:
            logger.warning("Supabase ping failed, falling back to local SQLite", error=str(e))

    # Test local SQLite
    try:
        init_sqlite_db()
        orgs = sqlite_fetch_all("organisations", limit=1)
        return {
            "status": "connected",
            "backend": "sqlite_local",
            "message": "Connected to local persistent database",
            "database_file": str(DB_PATH),
            "organisations_count": len(orgs),
        }
    except Exception as e:
        logger.error("SQLite check failed", error=str(e))
        return {
            "status": "error",
            "backend": "none",
            "message": str(e),
        }


# --- Unified Database Helper Functions ---

def fetch_one(table: str, match: Dict[str, Any], client: Optional[Client] = None) -> Optional[Dict[str, Any]]:
    """Fetch a single record from a table matching criteria."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            query = cli.table(table).select("*")
            for k, v in match.items():
                if v is not None:
                    query = query.eq(k, v)
            response = query.limit(1).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.debug("Supabase fetch_one failed, trying SQLite", error=str(e))

    return sqlite_fetch_one(table, match)


def fetch_all(
    table: str,
    match: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    desc: bool = False,
    limit: Optional[int] = None,
    client: Optional[Client] = None,
) -> List[Dict[str, Any]]:
    """Fetch multiple records from a table matching criteria."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            query = cli.table(table).select("*")
            if match:
                for k, v in match.items():
                    if v is not None:
                        query = query.eq(k, v)
            if order_by:
                query = query.order(order_by, desc=desc)
            if limit:
                query = query.limit(limit)
            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.debug("Supabase fetch_all failed, trying SQLite", error=str(e))

    return sqlite_fetch_all(table, match, order_by, desc, limit)


def insert_row(table: str, data: Dict[str, Any], client: Optional[Client] = None) -> Optional[Dict[str, Any]]:
    """Insert a single record into a table."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            response = cli.table(table).insert(data).execute()
            if response.data and len(response.data) > 0:
                # Also mirror into SQLite for local resilience
                try:
                    sqlite_insert_row(table, data)
                except Exception:
                    pass
                return response.data[0]
        except Exception as e:
            logger.debug("Supabase insert_row failed, falling back to SQLite", error=str(e))

    return sqlite_insert_row(table, data)


def update_row(
    table: str,
    match: Dict[str, Any],
    data: Dict[str, Any],
    client: Optional[Client] = None,
) -> Optional[Dict[str, Any]]:
    """Update records in a table matching criteria."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            query = cli.table(table).update(data)
            for k, v in match.items():
                if v is not None:
                    query = query.eq(k, v)
            response = query.execute()
            if response.data and len(response.data) > 0:
                try:
                    sqlite_update_row(table, match, data)
                except Exception:
                    pass
                return response.data[0]
        except Exception as e:
            logger.debug("Supabase update_row failed, falling back to SQLite", error=str(e))

    return sqlite_update_row(table, match, data)


def delete_rows(table: str, match: Dict[str, Any], client: Optional[Client] = None) -> List[Dict[str, Any]]:
    """Delete records matching criteria."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            query = cli.table(table).delete()
            for k, v in match.items():
                if v is not None:
                    query = query.eq(k, v)
            response = query.execute()
            try:
                sqlite_delete_rows(table, match)
            except Exception:
                pass
            return response.data or []
        except Exception as e:
            logger.debug("Supabase delete_rows failed, falling back to SQLite", error=str(e))

    return sqlite_delete_rows(table, match)


def call_rpc(fn_name: str, params: Dict[str, Any], client: Optional[Client] = None) -> Any:
    """Execute a database RPC function (Supabase pgvector or SQLite NumPy cosine search)."""
    cli = client or get_supabase_admin_client()
    if cli:
        try:
            response = cli.rpc(fn_name, params).execute()
            if response.data is not None:
                return response.data
        except Exception as e:
            logger.debug("Supabase call_rpc failed, falling back to SQLite vector search", error=str(e))

    if fn_name == "match_guideline_chunks":
        return sqlite_vector_search(
            query_embedding=params.get("query_embedding", []),
            match_org_id=params.get("match_org_id", ""),
            match_count=params.get("match_count", 5),
            match_threshold=params.get("match_threshold", 0.3),
        )

    return []


def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute SQL query via SQLite storage engine."""
    return sqlite_execute_query(query, params)

