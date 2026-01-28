"""
Application Entry Point
Run the FastAPI server.
"""

import uvicorn
from core.config import config
from api import app

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=config.api_host,
        port=config.api_port,
        workers=config.api_workers,
        reload=True,
    )
