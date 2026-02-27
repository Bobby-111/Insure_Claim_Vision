"""
database.py — SQLite claim session store
Stores each claim analysis result as a JSON blob indexed by claim_id.
Lightweight and zero-dependency beyond stdlib.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "claims.db")
_lock = threading.Lock()


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with _lock:
        conn = _get_connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS claims (
                claim_id    TEXT PRIMARY KEY,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                status      TEXT NOT NULL,
                payload     TEXT NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()
    logger.info(f"Database initialised at {DB_PATH}")


def save_claim(claim_id: str, status: str, payload: dict) -> None:
    """Persist a claim result."""
    with _lock:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO claims (claim_id, status, payload)
            VALUES (?, ?, ?)
            """,
            (claim_id, status, json.dumps(payload)),
        )
        conn.commit()
        conn.close()


def get_claim(claim_id: str) -> Optional[dict]:
    """Retrieve a claim by ID. Returns None if not found."""
    with _lock:
        conn = _get_connection()
        row = conn.execute(
            "SELECT payload FROM claims WHERE claim_id = ?",
            (claim_id,),
        ).fetchone()
        conn.close()
    if row is None:
        return None
    return json.loads(row["payload"])


def list_claims(limit: int = 50) -> list[dict]:
    """Return the most-recent N claim summaries."""
    with _lock:
        conn = _get_connection()
        rows = conn.execute(
            "SELECT claim_id, created_at, status FROM claims ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        conn.close()
    return [dict(r) for r in rows]
