"""
Admin Routes — privileged operations restricted to the ADMIN role.

Endpoints:
  POST /api/admin/backup  — dump critical MongoDB collections to a local JSON file (NFR10)
"""

import json
import os
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import require_admin
from core.database import Database
from core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

_BACKUP_COLLECTIONS = ["users", "trades", "positions", "user_progress", "portfolio"]
_BACKUP_DIR = os.getenv("BACKUP_DIR", "./backups")


def _serialize(obj):
    """JSON default handler for BSON/datetime types."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


@router.post("/backup", status_code=201)
async def create_backup(current_user: dict = Depends(require_admin)) -> dict:
    """
    NFR10: Dump all critical collections to a timestamped JSON file.

    Writes to BACKUP_DIR (default: ./backups). Each collection is a top-level
    key in the JSON output. ObjectId and datetime values are serialised to
    strings. Returns the backup file path and per-collection document counts.
    """
    os.makedirs(_BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"kairos_backup_{timestamp}.json"
    filepath = os.path.join(_BACKUP_DIR, filename)

    backup_data: dict = {}
    counts: dict = {}

    for collection_name in _BACKUP_COLLECTIONS:
        try:
            col = Database.get_collection(collection_name)
            docs = await col.find({}).to_list(length=None)
            backup_data[collection_name] = docs
            counts[collection_name] = len(docs)
            logger.info("Backup: read %d documents from '%s'", len(docs), collection_name)
        except Exception as exc:
            logger.error("Backup: failed to read collection '%s': %s", collection_name, exc)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to read collection '{collection_name}': {exc}",
            )

    try:
        with open(filepath, "w", encoding="utf-8") as fh:
            json.dump(backup_data, fh, default=_serialize, ensure_ascii=False, indent=2)
    except OSError as exc:
        logger.error("Backup: failed to write file %s: %s", filepath, exc)
        raise HTTPException(status_code=500, detail=f"Failed to write backup file: {exc}")

    logger.info(
        "Backup complete: %s (triggered by %s)", filepath, current_user.get("sub")
    )
    return {
        "status": "ok",
        "file": filepath,
        "timestamp": timestamp,
        "collections": counts,
        "total_documents": sum(counts.values()),
    }
