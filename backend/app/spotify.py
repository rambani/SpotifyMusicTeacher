"""Spotify API integration."""
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from typing import Optional
from .config import get_settings


class SpotifyClient:
    """Client for interacting with Spotify API."""

    def __init__(self):
        settings = get_settings()
        self._client: Optional[spotipy.Spotify] = None

        if settings.spotify_client_id and settings.spotify_client_secret:
            auth_manager = SpotifyClientCredentials(
                client_id=settings.spotify_client_id,
                client_secret=settings.spotify_client_secret,
            )
            self._client = spotipy.Spotify(auth_manager=auth_manager)

    @property
    def is_configured(self) -> bool:
        """Check if Spotify credentials are configured."""
        return self._client is not None

    def search_tracks(self, query: str, limit: int = 20) -> list[dict]:
        """
        Search for tracks on Spotify.

        Args:
            query: Search query string
            limit: Maximum number of results

        Returns:
            List of track information dictionaries
        """
        if not self._client:
            return []

        results = self._client.search(q=query, type="track", limit=limit)
        tracks = []

        for item in results.get("tracks", {}).get("items", []):
            tracks.append(self._parse_track(item))

        return tracks

    def get_track(self, track_id: str) -> Optional[dict]:
        """
        Get detailed information about a specific track.

        Args:
            track_id: Spotify track ID

        Returns:
            Track information dictionary or None
        """
        if not self._client:
            return None

        try:
            track = self._client.track(track_id)
            return self._parse_track(track)
        except Exception:
            return None

    def get_audio_features(self, track_id: str) -> Optional[dict]:
        """
        Get audio features for a track.

        Args:
            track_id: Spotify track ID

        Returns:
            Audio features dictionary or None
        """
        if not self._client:
            return None

        try:
            features = self._client.audio_features([track_id])
            if features and features[0]:
                return {
                    "tempo": features[0].get("tempo"),
                    "key": features[0].get("key"),
                    "mode": features[0].get("mode"),  # 0 = minor, 1 = major
                    "time_signature": features[0].get("time_signature"),
                    "energy": features[0].get("energy"),
                    "danceability": features[0].get("danceability"),
                    "instrumentalness": features[0].get("instrumentalness"),
                    "acousticness": features[0].get("acousticness"),
                }
            return None
        except Exception:
            return None

    def get_audio_analysis(self, track_id: str) -> Optional[dict]:
        """
        Get detailed audio analysis for a track.

        Args:
            track_id: Spotify track ID

        Returns:
            Audio analysis dictionary or None
        """
        if not self._client:
            return None

        try:
            analysis = self._client.audio_analysis(track_id)
            return {
                "duration": analysis.get("track", {}).get("duration"),
                "tempo": analysis.get("track", {}).get("tempo"),
                "key": analysis.get("track", {}).get("key"),
                "mode": analysis.get("track", {}).get("mode"),
                "time_signature": analysis.get("track", {}).get("time_signature"),
                "sections": [
                    {
                        "start": s.get("start"),
                        "duration": s.get("duration"),
                        "tempo": s.get("tempo"),
                        "key": s.get("key"),
                        "mode": s.get("mode"),
                    }
                    for s in analysis.get("sections", [])
                ],
                "beats": [
                    {"start": b.get("start"), "duration": b.get("duration")}
                    for b in analysis.get("beats", [])[:100]  # Limit for performance
                ],
            }
        except Exception:
            return None

    def _parse_track(self, track: dict) -> dict:
        """Parse Spotify track data into simplified format."""
        album = track.get("album", {})
        artists = track.get("artists", [])

        # Get the best available image
        images = album.get("images", [])
        image_url = images[0].get("url") if images else None

        return {
            "id": track.get("id"),
            "name": track.get("name"),
            "artists": [{"id": a.get("id"), "name": a.get("name")} for a in artists],
            "artist_names": ", ".join(a.get("name", "") for a in artists),
            "album": {
                "id": album.get("id"),
                "name": album.get("name"),
                "image_url": image_url,
            },
            "duration_ms": track.get("duration_ms"),
            "preview_url": track.get("preview_url"),
            "external_url": track.get("external_urls", {}).get("spotify"),
            "popularity": track.get("popularity"),
        }


# Singleton instance
_spotify_client: Optional[SpotifyClient] = None


def get_spotify_client() -> SpotifyClient:
    """Get or create Spotify client singleton."""
    global _spotify_client
    if _spotify_client is None:
        _spotify_client = SpotifyClient()
    return _spotify_client
