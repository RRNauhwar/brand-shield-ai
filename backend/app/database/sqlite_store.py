"""SQLite local fallback storage engine for BrandShield AI.

Provides fully persistent, relational, thread-safe database storage with
NumPy-based vector cosine similarity search when Supabase is not configured.
"""

import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import structlog

logger = structlog.get_logger(__name__)

DATA_DIR_ENV = os.environ.get("DATA_DIR")
if DATA_DIR_ENV:
    DB_DIR = Path(DATA_DIR_ENV)
else:
    DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"

DB_PATH = Path(os.environ.get("SQLITE_DB_PATH", str(DB_DIR / "brandshield_local.db")))

_lock = threading.Lock()
_is_db_initialized = False


def get_connection() -> sqlite3.Connection:
    """Get SQLite database connection with row factory, WAL mode, and tuned cache."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = -64000")
    return conn


def init_sqlite_db(force: bool = False) -> None:
    """Initialize all 14 relational tables and performance indexes in SQLite once."""
    global _is_db_initialized
    if _is_db_initialized and not force:
        return

    with _lock:
        if _is_db_initialized and not force:
            return
        conn = get_connection()
        cursor = conn.cursor()

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            full_name TEXT NOT NULL DEFAULT '',
            avatar_url TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS organisations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            logo_url TEXT,
            is_demo INTEGER DEFAULT 0,
            created_by TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS organisation_members (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            joined_at TEXT,
            email TEXT,
            UNIQUE(organisation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS brand_documents (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_url TEXT,
            file_size INTEGER,
            status TEXT DEFAULT 'ready',
            chunk_count INTEGER DEFAULT 0,
            uploaded_by TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS guideline_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            organisation_id TEXT NOT NULL,
            content TEXT NOT NULL,
            page_number INTEGER,
            chunk_index INTEGER,
            embedding TEXT,
            metadata TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS brand_rules (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            rule_type TEXT NOT NULL,
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            replacement TEXT,
            description TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            created_by TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS brand_assets (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            name TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            file_url TEXT,
            metadata TEXT,
            uploaded_by TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS content_submissions (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            original_content TEXT NOT NULL,
            current_content TEXT NOT NULL,
            content_type TEXT NOT NULL DEFAULT 'text',
            file_url TEXT,
            status TEXT DEFAULT 'draft',
            submitted_by TEXT,
            assigned_reviewer TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_reports (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            organisation_id TEXT NOT NULL,
            overall_score REAL DEFAULT 0,
            total_findings INTEGER DEFAULT 0,
            critical_count INTEGER DEFAULT 0,
            high_count INTEGER DEFAULT 0,
            medium_count INTEGER DEFAULT 0,
            low_count INTEGER DEFAULT 0,
            info_count INTEGER DEFAULT 0,
            summary TEXT,
            engine TEXT DEFAULT 'gemini',
            is_ai_powered INTEGER DEFAULT 1,
            ai_model TEXT DEFAULT 'gemini-2.5-flash',
            processing_time_seconds REAL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS compliance_findings (
            id TEXT PRIMARY KEY,
            audit_id TEXT NOT NULL,
            content_id TEXT NOT NULL,
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            original_text TEXT NOT NULL,
            explanation TEXT NOT NULL,
            guideline_reference TEXT,
            evidence TEXT,
            source_document TEXT,
            source_page INTEGER,
            suggested_correction TEXT,
            confidence REAL DEFAULT 0.5,
            status TEXT DEFAULT 'open',
            engine TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS revision_history (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            finding_id TEXT,
            previous_text TEXT NOT NULL,
            new_text TEXT NOT NULL,
            action TEXT NOT NULL,
            performed_by TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS review_comments (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            user_id TEXT,
            comment TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS approval_records (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            reviewer_id TEXT,
            action TEXT NOT NULL,
            previous_status TEXT,
            new_status TEXT,
            comment TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_data TEXT,
            user_id TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            organisation_id TEXT NOT NULL,
            name TEXT NOT NULL,
            brief TEXT,
            target_audience TEXT,
            objective TEXT,
            channels TEXT,
            status TEXT DEFAULT 'draft',
            overall_score REAL DEFAULT 0,
            total_assets INTEGER DEFAULT 0,
            cross_channel_findings TEXT,
            created_by TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS campaign_assets (
            id TEXT PRIMARY KEY,
            campaign_id TEXT NOT NULL,
            organisation_id TEXT NOT NULL,
            content_id TEXT,
            channel TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            asset_type TEXT DEFAULT 'text',
            file_url TEXT,
            score REAL DEFAULT 0,
            issues_count INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'low',
            audit_id TEXT,
            created_at TEXT
        );
        """)

        # Backward-compatible column additions
        for tbl, col, ctype in [
            ("audit_reports", "engine", "TEXT DEFAULT 'gemini'"),
            ("audit_reports", "is_ai_powered", "INTEGER DEFAULT 1"),
            ("audit_reports", "ai_model", "TEXT DEFAULT 'gemini-2.5-flash'"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}")
            except Exception:
                pass

        # High-performance indexes for zero-latency relational seeks
        cursor.executescript("""
        CREATE INDEX IF NOT EXISTS idx_members_org ON organisation_members(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_members_user ON organisation_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_rules_org ON brand_rules(organisation_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_docs_org ON brand_documents(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_doc ON guideline_chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_org ON guideline_chunks(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_content_org ON content_submissions(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_audits_content ON audit_reports(content_id);
        CREATE INDEX IF NOT EXISTS idx_audits_org ON audit_reports(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_findings_audit ON compliance_findings(audit_id);
        CREATE INDEX IF NOT EXISTS idx_findings_content ON compliance_findings(content_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organisation_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_assets_camp ON campaign_assets(campaign_id);
        """)

        conn.commit()
        conn.close()
        _is_db_initialized = True
        logger.info("Local SQLite storage and performance indexes initialized", path=str(DB_PATH))


def _serialize_val(val: Any) -> Any:
    """Serialize complex types to JSON strings for SQLite."""
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    if isinstance(val, bool):
        return 1 if val else 0
    return val


def _deserialize_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert SQLite row to dictionary, parsing JSON fields."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, str) and (v.startswith("{") or v.startswith("[")):
            try:
                d[k] = json.loads(v)
            except Exception:
                pass
        elif k in ("is_active", "is_demo", "is_ai_powered"):
            d[k] = bool(v)
    return d


def sqlite_execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute raw SQL query with parameters and return list of deserialized dicts."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.commit()
        conn.close()
        return [_deserialize_row(r) for r in rows]


def sqlite_fetch_one(table: str, match: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Fetch single record from SQLite table."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        clauses = []
        params = []
        for k, v in match.items():
            if v is None:
                clauses.append(f"{k} IS NULL")
            else:
                clauses.append(f"{k} = ?")
                params.append(_serialize_val(v))

        where_sql = " AND ".join(clauses) if clauses else "1=1"
        query = f"SELECT * FROM {table} WHERE {where_sql} LIMIT 1"
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        conn.close()
        return _deserialize_row(row) if row else None


def sqlite_fetch_all(
    table: str,
    match: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    desc: bool = False,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Fetch multiple records from SQLite table."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        clauses = []
        params = []
        if match:
            for k, v in match.items():
                if v is None:
                    clauses.append(f"{k} IS NULL")
                else:
                    clauses.append(f"{k} = ?")
                    params.append(_serialize_val(v))

        where_sql = " AND ".join(clauses) if clauses else "1=1"
        order_sql = f" ORDER BY {order_by} {'DESC' if desc else 'ASC'}" if order_by else ""
        limit_sql = f" LIMIT {limit}" if limit else ""

        query = f"SELECT * FROM {table} WHERE {where_sql}{order_sql}{limit_sql}"
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [_deserialize_row(r) for r in rows]


def sqlite_insert_row(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or replace a record into SQLite table."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        clean_data = {k: _serialize_val(v) for k, v in data.items()}
        keys = list(clean_data.keys())
        placeholders = ", ".join(["?"] * len(keys))
        columns = ", ".join(keys)

        query = f"INSERT OR REPLACE INTO {table} ({columns}) VALUES ({placeholders})"
        cursor = conn.cursor()
        cursor.execute(query, list(clean_data.values()))
        conn.commit()
        conn.close()
        return data


def sqlite_update_row(table: str, match: Dict[str, Any], data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update records in SQLite table matching criteria."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        set_clauses = []
        params = []
        for k, v in data.items():
            set_clauses.append(f"{k} = ?")
            params.append(_serialize_val(v))

        where_clauses = []
        for k, v in match.items():
            where_clauses.append(f"{k} = ?")
            params.append(_serialize_val(v))

        set_sql = ", ".join(set_clauses)
        where_sql = " AND ".join(where_clauses)

        query = f"UPDATE {table} SET {set_sql} WHERE {where_sql}"
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()

        # Fetch updated record
        select_query = f"SELECT * FROM {table} WHERE {where_sql} LIMIT 1"
        cursor.execute(select_query, [_serialize_val(v) for v in match.values()])
        row = cursor.fetchone()
        conn.close()
        return _deserialize_row(row) if row else None


def sqlite_delete_rows(table: str, match: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Delete records from SQLite table matching criteria."""
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        where_clauses = []
        params = []
        for k, v in match.items():
            where_clauses.append(f"{k} = ?")
            params.append(_serialize_val(v))

        where_sql = " AND ".join(where_clauses)
        query = f"DELETE FROM {table} WHERE {where_sql}"
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        return [{"deleted": True}]


def sqlite_vector_search(
    query_embedding: List[float],
    match_org_id: str,
    match_count: int = 5,
    match_threshold: float = 0.3,
) -> List[Dict[str, Any]]:
    """
    Execute vector cosine similarity search over stored guideline_chunks in SQLite.
    Computes exact dot-product over normalized vectors via NumPy.
    """
    init_sqlite_db()
    with _lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM guideline_chunks WHERE organisation_id = ?",
            (match_org_id,),
        )
        rows = cursor.fetchall()
        conn.close()

    if not rows:
        return []

    query_vec = np.array(query_embedding, dtype=np.float32)
    q_norm = np.linalg.norm(query_vec)
    if q_norm > 0:
        query_vec = query_vec / q_norm

    scored = []
    for r in rows:
        item = _deserialize_row(r)
        raw_emb = item.get("embedding")
        if not raw_emb:
            continue
        try:
            if isinstance(raw_emb, str):
                emb_list = json.loads(raw_emb)
            else:
                emb_list = raw_emb
            c_vec = np.array(emb_list, dtype=np.float32)
            c_norm = np.linalg.norm(c_vec)
            if c_norm > 0:
                c_vec = c_vec / c_norm
            similarity = float(np.dot(query_vec, c_vec))
            if similarity >= match_threshold:
                item["similarity"] = round(similarity, 4)
                scored.append(item)
        except Exception as e:
            logger.warning("Error calculating chunk cosine similarity", error=str(e))

    scored.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return scored[:match_count]
