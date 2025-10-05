import os
import uuid
import json
import sqlite3
from typing import Any, Dict, List, Optional

class BuildHistoryRepository:
    def __init__(self, db_path: str | None = None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        self.db_path = db_path or os.path.join(data_dir, "builds.db")
        self._init_db()

    def _connect(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self):
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS retrain_builds (
                    id TEXT PRIMARY KEY,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    status TEXT NOT NULL,
                    attempt_version TEXT,
                    promoted INTEGER,
                    metrics TEXT,
                    previous_version TEXT,
                    previous_metrics TEXT,
                    model_path TEXT
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_retrain_builds_started_at ON retrain_builds(started_at)")
            conn.commit()

    def new_id(self) -> str:
        return str(uuid.uuid4())

    def append(self, record: Dict[str, Any]) -> None:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO retrain_builds (
                    id, started_at, finished_at, status,
                    attempt_version, promoted, metrics,
                    previous_version, previous_metrics, model_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.get("id"),
                record.get("started_at"),
                record.get("finished_at"),
                record.get("status"),
                record.get("attempt_version"),
                1 if record.get("promoted") else 0 if record.get("promoted") is not None else None,
                json.dumps(record.get("metrics")) if record.get("metrics") is not None else None,
                record.get("previous_version"),
                json.dumps(record.get("previous_metrics")) if record.get("previous_metrics") is not None else None,
                record.get("model_path"),
            ))
            conn.commit()

    def list(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, started_at, finished_at, status,
                       attempt_version, promoted, metrics,
                       previous_version, previous_metrics, model_path
                FROM retrain_builds
                ORDER BY datetime(started_at) DESC, id DESC
                LIMIT ?
            """, (limit,))
            rows = cur.fetchall()

        items: List[Dict[str, Any]] = []
        for r in rows:
            items.append({
                "id": r[0],
                "started_at": r[1],
                "finished_at": r[2],
                "status": r[3],
                "attempt_version": r[4],
                "promoted": bool(r[5]) if r[5] is not None else None,
                "metrics": json.loads(r[6]) if r[6] else None,
                "previous_version": r[7],
                "previous_metrics": json.loads(r[8]) if r[8] else None,
                "model_path": r[9],
            })
        return items

    def get(self, build_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, started_at, finished_at, status,
                       attempt_version, promoted, metrics,
                       previous_version, previous_metrics, model_path
                FROM retrain_builds
                WHERE id = ?
                LIMIT 1
            """, (build_id,))
            r = cur.fetchone()

        if not r:
            return None
        return {
            "id": r[0],
            "started_at": r[1],
            "finished_at": r[2],
            "status": r[3],
            "attempt_version": r[4],
            "promoted": bool(r[5]) if r[5] is not None else None,
            "metrics": json.loads(r[6]) if r[6] else None,
            "previous_version": r[7],
            "previous_metrics": json.loads(r[8]) if r[8] else None,
            "model_path": r[9],
        }