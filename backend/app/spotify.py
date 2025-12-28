"""Spotify API integration with OAuth for user authentication."""
import os
import logging
from typing import Optional
from urllib.parse import urlencode

import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials

from .config import get_settings

logger = logging.getLogger(__name__)


class SpotifyClient:
    """Client for interacting with Spotify API."""

    # Scopes needed for our app
    SCOPES = [
        "user-read-email",
        "user-read-private",
        "user-library-read",
        "user-follow-read",
        "playlist-read-private",
        "playlist-read-collaborative",
        "playlist-modify-public",
        "playlist-modify-private",
    ]

    def __init__(self):
        settings = get_settings()
        self._client: Optional[spotipy.Spotify] = None
        self._user_clients: dict[str, spotipy.Spotify] = {}
        self.client_id = settings.spotify_client_id
        self.client_secret = settings.spotify_client_secret
        self.redirect_uri = settings.spotify_redirect_uri

        # Initialize client credentials client for public searches
        if self.client_id and self.client_secret:
            auth_manager = SpotifyClientCredentials(
                client_id=self.client_id,
                client_secret=self.client_secret,
            )
            self._client = spotipy.Spotify(auth_manager=auth_manager)

    @property
    def is_configured(self) -> bool:
        """Check if Spotify credentials are configured."""
        return self._client is not None

    def get_auth_url(self, state: str = None) -> str:
        """
        Get Spotify authorization URL for user login.

        Args:
            state: Optional state parameter for security

        Returns:
            Authorization URL to redirect user to
        """
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.SCOPES),
            "show_dialog": "true",
        }
        if state:
            params["state"] = state

        return f"https://accounts.spotify.com/authorize?{urlencode(params)}"

    def exchange_code(self, code: str) -> Optional[dict]:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from Spotify callback

        Returns:
            Token info dict or None if failed
        """
        try:
            import requests

            response = requests.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Token exchange failed: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Token exchange error: {e}")
            return None

    def refresh_token(self, refresh_token: str) -> Optional[dict]:
        """Refresh an access token."""
        try:
            import requests

            response = requests.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None

    def get_user_client(self, access_token: str) -> spotipy.Spotify:
        """Get a Spotify client for a specific user."""
        return spotipy.Spotify(auth=access_token)

    def get_current_user(self, access_token: str) -> Optional[dict]:
        """Get the current user's profile."""
        try:
            client = self.get_user_client(access_token)
            user = client.current_user()
            return {
                "id": user.get("id"),
                "name": user.get("display_name"),
                "email": user.get("email"),
                "image": user.get("images", [{}])[0].get("url") if user.get("images") else None,
                "country": user.get("country"),
                "product": user.get("product"),  # premium, free, etc.
            }
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    # Podcast methods
    def search_podcasts(self, query: str, limit: int = 20, access_token: str = None) -> list[dict]:
        """Search for podcasts/shows."""
        try:
            client = self.get_user_client(access_token) if access_token else self._client
            if not client:
                return []

            results = client.search(q=query, type="show", limit=limit)
            shows = []

            for item in results.get("shows", {}).get("items", []):
                if item:
                    shows.append(self._parse_show(item))

            return shows
        except Exception as e:
            logger.error(f"Podcast search error: {e}")
            return []

    def get_show(self, show_id: str, access_token: str = None) -> Optional[dict]:
        """Get a podcast show by ID."""
        try:
            client = self.get_user_client(access_token) if access_token else self._client
            if not client:
                return None

            show = client.show(show_id)
            return self._parse_show(show)
        except Exception as e:
            logger.error(f"Get show error: {e}")
            return None

    def get_show_episodes(self, show_id: str, limit: int = 10, access_token: str = None) -> list[dict]:
        """Get episodes for a podcast show."""
        try:
            client = self.get_user_client(access_token) if access_token else self._client
            if not client:
                return []

            results = client.show_episodes(show_id, limit=limit)
            episodes = []

            for item in results.get("items", []):
                if item:
                    episodes.append(self._parse_episode(item))

            return episodes
        except Exception as e:
            logger.error(f"Get episodes error: {e}")
            return []

    def get_user_saved_shows(self, access_token: str, limit: int = 50) -> list[dict]:
        """Get user's saved/followed podcasts."""
        try:
            client = self.get_user_client(access_token)
            results = client.current_user_saved_shows(limit=limit)
            shows = []

            for item in results.get("items", []):
                if item and item.get("show"):
                    shows.append(self._parse_show(item["show"]))

            return shows
        except Exception as e:
            logger.error(f"Get saved shows error: {e}")
            return []

    # Playlist methods
    def get_user_playlists(self, access_token: str, limit: int = 50) -> list[dict]:
        """Get user's playlists."""
        try:
            client = self.get_user_client(access_token)
            results = client.current_user_playlists(limit=limit)
            playlists = []

            for item in results.get("items", []):
                if item:
                    playlists.append(self._parse_playlist(item))

            return playlists
        except Exception as e:
            logger.error(f"Get playlists error: {e}")
            return []

    def create_playlist(self, access_token: str, name: str, description: str = "", public: bool = False) -> Optional[dict]:
        """Create a new playlist."""
        try:
            client = self.get_user_client(access_token)
            user = client.current_user()
            user_id = user["id"]

            playlist = client.user_playlist_create(
                user=user_id,
                name=name,
                public=public,
                description=description,
            )

            return self._parse_playlist(playlist)
        except Exception as e:
            logger.error(f"Create playlist error: {e}")
            return None

    def add_episodes_to_playlist(self, access_token: str, playlist_id: str, episode_uris: list[str]) -> bool:
        """Add episodes to a playlist."""
        try:
            client = self.get_user_client(access_token)
            client.playlist_add_items(playlist_id, episode_uris)
            return True
        except Exception as e:
            logger.error(f"Add episodes error: {e}")
            return False

    def remove_episodes_from_playlist(self, access_token: str, playlist_id: str, episode_uris: list[str]) -> bool:
        """Remove episodes from a playlist."""
        try:
            client = self.get_user_client(access_token)
            client.playlist_remove_all_occurrences_of_items(playlist_id, episode_uris)
            return True
        except Exception as e:
            logger.error(f"Remove episodes error: {e}")
            return False

    def get_playlist_items(self, access_token: str, playlist_id: str, limit: int = 100) -> list[dict]:
        """Get items in a playlist."""
        try:
            client = self.get_user_client(access_token)
            results = client.playlist_items(playlist_id, limit=limit)
            items = []

            for item in results.get("items", []):
                track = item.get("track")
                if track and track.get("type") == "episode":
                    items.append(self._parse_episode(track))

            return items
        except Exception as e:
            logger.error(f"Get playlist items error: {e}")
            return []

    # Parsing methods
    def _parse_show(self, show: dict) -> dict:
        """Parse podcast show data."""
        images = show.get("images", [])
        return {
            "id": show.get("id"),
            "name": show.get("name"),
            "publisher": show.get("publisher"),
            "description": show.get("description", "")[:200],
            "image_url": images[0].get("url") if images else None,
            "total_episodes": show.get("total_episodes"),
            "uri": show.get("uri"),
        }

    def _parse_episode(self, episode: dict) -> dict:
        """Parse podcast episode data."""
        images = episode.get("images", [])
        return {
            "id": episode.get("id"),
            "name": episode.get("name"),
            "description": episode.get("description", "")[:200],
            "duration_ms": episode.get("duration_ms"),
            "release_date": episode.get("release_date"),
            "image_url": images[0].get("url") if images else None,
            "uri": episode.get("uri"),
            "external_url": episode.get("external_urls", {}).get("spotify"),
        }

    def _parse_playlist(self, playlist: dict) -> dict:
        """Parse playlist data."""
        images = playlist.get("images", [])
        return {
            "id": playlist.get("id"),
            "name": playlist.get("name"),
            "description": playlist.get("description"),
            "image_url": images[0].get("url") if images else None,
            "owner": playlist.get("owner", {}).get("display_name"),
            "tracks_total": playlist.get("tracks", {}).get("total", 0),
            "public": playlist.get("public"),
            "uri": playlist.get("uri"),
        }

    # Legacy methods for backwards compatibility
    def search_tracks(self, query: str, limit: int = 20) -> list[dict]:
        """Search for tracks on Spotify."""
        if not self._client:
            return []

        try:
            results = self._client.search(q=query, type="track", limit=limit)
            tracks = []

            for item in results.get("tracks", {}).get("items", []):
                tracks.append(self._parse_track(item))

            return tracks
        except Exception as e:
            logger.error(f"Track search error: {e}")
            return []

    def get_track(self, track_id: str) -> Optional[dict]:
        """Get a track by ID."""
        if not self._client:
            return None

        try:
            track = self._client.track(track_id)
            return self._parse_track(track)
        except Exception:
            return None

    def _parse_track(self, track: dict) -> dict:
        """Parse Spotify track data into simplified format."""
        album = track.get("album", {})
        artists = track.get("artists", [])
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

    def get_audio_features(self, track_id: str) -> Optional[dict]:
        """Get audio features (returns defaults due to API restrictions)."""
        return {
            "tempo": 120,
            "key": 0,
            "mode": 1,
            "time_signature": 4,
            "energy": 0.5,
            "danceability": 0.5,
            "instrumentalness": 0.0,
            "acousticness": 0.5,
        }


# Singleton instance
_spotify_client: Optional[SpotifyClient] = None


def get_spotify_client() -> SpotifyClient:
    """Get or create Spotify client singleton."""
    global _spotify_client
    if _spotify_client is None:
        _spotify_client = SpotifyClient()
    return _spotify_client
