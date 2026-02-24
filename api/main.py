"""
Flight Scraper API — FastAPI application entry point.

Single-user, no auth. Designed for local use.

Run from the project root:
    uvicorn api.main:app --reload --port 8000

Docs available at:
    http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .dependencies import ensure_default_user
from .routes import deals, preferences


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure the default local user exists in MongoDB."""
    ensure_default_user()
    yield


app = FastAPI(
    title="Flight Scraper API",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from the Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4173", "http://localhost:5173"],
    allow_methods=["GET", "PUT"],
    allow_headers=["*"],
)

app.include_router(deals.router)
app.include_router(preferences.router)


@app.get("/health")
def health():
    return {"status": "ok"}
