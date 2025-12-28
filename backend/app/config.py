"""Application configuration."""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Spotify API credentials
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://localhost:8000/callback"

    # Application settings
    app_name: str = "Spotify Music Teacher"
    debug: bool = True

    # Audio processing settings
    audio_cache_dir: str = "./cache/audio"
    stems_cache_dir: str = "./cache/stems"
    midi_cache_dir: str = "./cache/midi"

    # Demucs settings
    demucs_model: str = "htdemucs"  # htdemucs, htdemucs_ft, mdx_extra

    # CORS settings
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
