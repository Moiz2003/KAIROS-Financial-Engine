"""
Application Entry Point
Run the FastAPI server.
"""

import os
import uvicorn
from core.config import config
from api import app

if __name__ == "__main__":
    reload_enabled = os.getenv("API_RELOAD", "true").lower() == "true"

    server_kwargs = {
        "host": config.api_host,
        "port": config.api_port,
    }

    # Industry-standard local dev: reload enabled, single worker.
    # Uvicorn does not support reload + workers together.
    if reload_enabled:
        server_kwargs["reload"] = True
    else:
        server_kwargs["workers"] = config.api_workers

    uvicorn.run("api:app", **server_kwargs)
