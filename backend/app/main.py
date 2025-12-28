"""Smart Podcast Playlists - Backend API."""
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from .config import get_settings
from .spotify import get_spotify_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Request/Response models
class CreatePlaylistRequest(BaseModel):
    name: str
    description: str = ""
    show_ids: list[str] = []
    episodes_per_show: int = 3


class SmartPlaylistConfig(BaseModel):
    playlist_id: str
    name: str
    show_ids: list[str]
    episodes_per_show: int = 3
    auto_refresh: bool = True


# In-memory storage for smart playlist configs (would use database in production)
smart_playlists: dict[str, SmartPlaylistConfig] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()

    # Create cache directories
    for cache_dir in [settings.audio_cache_dir, settings.stems_cache_dir, settings.midi_cache_dir]:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)

    logger.info("Smart Podcast Playlists API started")
    yield
    logger.info("Smart Podcast Playlists API shutting down")


# Create FastAPI app
app = FastAPI(
    title="Smart Podcast Playlists API",
    description="Create auto-refreshing podcast playlists on Spotify",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper to get access token from header
def get_access_token(authorization: str = Header(None)) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


# ============ Health & Info ============

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Smart Podcast Playlists API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    spotify = get_spotify_client()
    return {
        "status": "healthy",
        "spotify_configured": spotify.is_configured,
    }


# ============ Authentication ============

@app.get("/api/auth/login")
async def login():
    """Get Spotify authorization URL."""
    spotify = get_spotify_client()
    if not spotify.is_configured:
        raise HTTPException(status_code=500, detail="Spotify not configured")

    auth_url = spotify.get_auth_url()
    return {"auth_url": auth_url}


@app.get("/callback")
async def spotify_callback(code: str = None, error: str = None):
    """Handle Spotify OAuth callback (main callback URL from Spotify)."""
    if error:
        return RedirectResponse(url=f"http://localhost:3000/?error={error}")

    if not code:
        return RedirectResponse(url="http://localhost:3000/?error=no_code")

    spotify = get_spotify_client()
    token_info = spotify.exchange_code(code)

    if not token_info:
        return RedirectResponse(url="http://localhost:3000/?error=token_failed")

    # Redirect to frontend with tokens
    access_token = token_info.get("access_token", "")
    refresh_token = token_info.get("refresh_token", "")
    expires_in = token_info.get("expires_in", 3600)

    return RedirectResponse(
        url=f"http://localhost:3000/callback?access_token={access_token}&refresh_token={refresh_token}&expires_in={expires_in}"
    )


@app.get("/api/auth/callback")
async def auth_callback(code: str = None, error: str = None):
    """Handle Spotify OAuth callback (API version)."""
    return await spotify_callback(code, error)


@app.post("/api/auth/refresh")
async def refresh_access_token(refresh_token: str):
    """Refresh an access token."""
    spotify = get_spotify_client()
    token_info = spotify.refresh_token(refresh_token)

    if not token_info:
        raise HTTPException(status_code=401, detail="Failed to refresh token")

    return token_info


@app.get("/api/auth/me")
async def get_current_user(authorization: str = Header(None)):
    """Get the current user's profile."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify = get_spotify_client()
    user = spotify.get_current_user(access_token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user


# ============ Podcasts ============

@app.get("/api/podcasts/search")
async def search_podcasts(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    authorization: str = Header(None),
):
    """Search for podcasts."""
    access_token = get_access_token(authorization)
    spotify = get_spotify_client()

    shows = spotify.search_podcasts(q, limit, access_token)
    return {"shows": shows, "query": q, "count": len(shows)}


@app.get("/api/podcasts/saved")
async def get_saved_podcasts(authorization: str = Header(None)):
    """Get user's saved podcasts."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify = get_spotify_client()
    shows = spotify.get_user_saved_shows(access_token)
    return {"shows": shows, "count": len(shows)}


@app.get("/api/podcasts/{show_id}")
async def get_podcast(show_id: str, authorization: str = Header(None)):
    """Get a podcast by ID."""
    access_token = get_access_token(authorization)
    spotify = get_spotify_client()

    show = spotify.get_show(show_id, access_token)
    if not show:
        raise HTTPException(status_code=404, detail="Podcast not found")

    return show


@app.get("/api/podcasts/{show_id}/episodes")
async def get_podcast_episodes(
    show_id: str,
    limit: int = Query(10, ge=1, le=50),
    authorization: str = Header(None),
):
    """Get episodes for a podcast."""
    access_token = get_access_token(authorization)
    spotify = get_spotify_client()

    episodes = spotify.get_show_episodes(show_id, limit, access_token)
    return {"episodes": episodes, "count": len(episodes)}


# ============ Playlists ============

@app.get("/api/playlists")
async def get_playlists(authorization: str = Header(None)):
    """Get user's playlists."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify = get_spotify_client()
    playlists = spotify.get_user_playlists(access_token)
    return {"playlists": playlists, "count": len(playlists)}


@app.post("/api/playlists/smart")
async def create_smart_playlist(
    request: CreatePlaylistRequest,
    authorization: str = Header(None),
):
    """Create a smart auto-refreshing podcast playlist."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify = get_spotify_client()

    # Create the playlist
    playlist = spotify.create_playlist(
        access_token,
        name=request.name,
        description=request.description or "Smart podcast playlist - Auto-refreshes with latest episodes",
        public=False,
    )

    if not playlist:
        raise HTTPException(status_code=500, detail="Failed to create playlist")

    # Add initial episodes from selected shows
    all_episode_uris = []
    for show_id in request.show_ids:
        episodes = spotify.get_show_episodes(show_id, request.episodes_per_show, access_token)
        all_episode_uris.extend([ep["uri"] for ep in episodes])

    if all_episode_uris:
        spotify.add_episodes_to_playlist(access_token, playlist["id"], all_episode_uris)

    # Save smart playlist config
    config = SmartPlaylistConfig(
        playlist_id=playlist["id"],
        name=request.name,
        show_ids=request.show_ids,
        episodes_per_show=request.episodes_per_show,
        auto_refresh=True,
    )
    smart_playlists[playlist["id"]] = config

    return {
        "playlist": playlist,
        "config": config,
        "episodes_added": len(all_episode_uris),
    }


@app.get("/api/playlists/smart")
async def get_smart_playlists(authorization: str = Header(None)):
    """Get all smart playlist configurations with playlist info."""
    access_token = get_access_token(authorization)

    # Return configs merged with playlist data
    result = []
    spotify = get_spotify_client()

    for playlist_id, config in smart_playlists.items():
        playlist_data = {
            "id": config.playlist_id,
            "name": config.name,
            "config": {
                "show_ids": config.show_ids,
                "episodes_per_show": config.episodes_per_show,
                "auto_refresh": config.auto_refresh,
            },
            "image_url": None,
            "tracks_total": 0,
            "uri": f"spotify:playlist:{config.playlist_id}",
        }

        # Try to get actual playlist info from Spotify if authenticated
        if access_token:
            try:
                client = spotify.get_user_client(access_token)
                pl = client.playlist(playlist_id, fields="images,tracks.total")
                images = pl.get("images", [])
                playlist_data["image_url"] = images[0].get("url") if images else None
                playlist_data["tracks_total"] = pl.get("tracks", {}).get("total", 0)
            except Exception:
                pass

        result.append(playlist_data)

    return {"playlists": result, "count": len(result)}


@app.post("/api/playlists/{playlist_id}/refresh")
async def refresh_playlist(playlist_id: str, authorization: str = Header(None)):
    """Manually refresh a smart playlist with latest episodes."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    config = smart_playlists.get(playlist_id)
    if not config:
        raise HTTPException(status_code=404, detail="Smart playlist config not found")

    spotify = get_spotify_client()

    # Get current episodes in playlist
    current_items = spotify.get_playlist_items(access_token, playlist_id)
    current_uris = {item["uri"] for item in current_items}

    # Get latest episodes from configured shows
    new_episode_uris = []
    for show_id in config.show_ids:
        episodes = spotify.get_show_episodes(show_id, config.episodes_per_show, access_token)
        for ep in episodes:
            if ep["uri"] not in current_uris:
                new_episode_uris.append(ep["uri"])

    # Add new episodes
    if new_episode_uris:
        spotify.add_episodes_to_playlist(access_token, playlist_id, new_episode_uris)

    return {
        "playlist_id": playlist_id,
        "new_episodes_added": len(new_episode_uris),
        "total_episodes": len(current_items) + len(new_episode_uris),
    }


@app.get("/api/playlists/{playlist_id}/items")
async def get_playlist_items(playlist_id: str, authorization: str = Header(None)):
    """Get items in a playlist."""
    access_token = get_access_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    spotify = get_spotify_client()
    items = spotify.get_playlist_items(access_token, playlist_id)
    return {"items": items, "count": len(items)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
