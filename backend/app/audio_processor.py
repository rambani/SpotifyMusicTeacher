"""Audio processing with Demucs for stem separation."""
import os
import subprocess
import asyncio
from pathlib import Path
from typing import Optional
import logging

from .config import get_settings

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Process audio files using Demucs for stem separation."""

    # Demucs separates into these stems
    STEM_NAMES = ["drums", "bass", "other", "vocals"]

    def __init__(self):
        settings = get_settings()
        self.stems_cache_dir = Path(settings.stems_cache_dir)
        self.demucs_model = settings.demucs_model
        self.stems_cache_dir.mkdir(parents=True, exist_ok=True)

    async def separate_stems(self, audio_path: str, track_id: str) -> dict[str, str]:
        """
        Separate audio file into individual stems using Demucs.

        Args:
            audio_path: Path to the input audio file
            track_id: Unique identifier for caching

        Returns:
            Dictionary mapping stem names to file paths
        """
        output_dir = self.stems_cache_dir / track_id

        # Check if already processed
        if output_dir.exists():
            stems = self._get_cached_stems(output_dir)
            if stems:
                logger.info(f"Using cached stems for {track_id}")
                return stems

        output_dir.mkdir(parents=True, exist_ok=True)

        # Run Demucs separation
        logger.info(f"Separating stems for {track_id} using {self.demucs_model}")

        try:
            # Run demucs as subprocess
            process = await asyncio.create_subprocess_exec(
                "python",
                "-m",
                "demucs",
                "--two-stems=vocals",  # First pass: vocals vs instrumental
                "-n",
                self.demucs_model,
                "-o",
                str(output_dir),
                audio_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                logger.error(f"Demucs failed: {stderr.decode()}")
                # Try with full separation as fallback
                return await self._full_separation(audio_path, track_id, output_dir)

            return self._get_cached_stems(output_dir)

        except Exception as e:
            logger.error(f"Error during stem separation: {e}")
            raise

    async def _full_separation(
        self, audio_path: str, track_id: str, output_dir: Path
    ) -> dict[str, str]:
        """Perform full 4-stem separation."""
        try:
            process = await asyncio.create_subprocess_exec(
                "python",
                "-m",
                "demucs",
                "-n",
                self.demucs_model,
                "-o",
                str(output_dir),
                audio_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                raise RuntimeError(f"Demucs failed: {stderr.decode()}")

            return self._get_cached_stems(output_dir)

        except Exception as e:
            logger.error(f"Full separation failed: {e}")
            raise

    def _get_cached_stems(self, output_dir: Path) -> dict[str, str]:
        """Get stem file paths from cache directory."""
        stems = {}

        # Demucs outputs to: output_dir/model_name/track_name/stem.wav
        for model_dir in output_dir.iterdir():
            if model_dir.is_dir():
                for track_dir in model_dir.iterdir():
                    if track_dir.is_dir():
                        for stem_file in track_dir.glob("*.wav"):
                            stem_name = stem_file.stem
                            stems[stem_name] = str(stem_file)

        return stems

    async def get_stem(self, track_id: str, stem_name: str) -> Optional[str]:
        """
        Get path to a specific stem file.

        Args:
            track_id: Track identifier
            stem_name: Name of stem (drums, bass, vocals, other)

        Returns:
            Path to stem file or None if not found
        """
        output_dir = self.stems_cache_dir / track_id
        stems = self._get_cached_stems(output_dir)
        return stems.get(stem_name)


class AudioDownloader:
    """Download audio from various sources."""

    def __init__(self):
        settings = get_settings()
        self.cache_dir = Path(settings.audio_cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    async def download_from_youtube(
        self, search_query: str, track_id: str
    ) -> Optional[str]:
        """
        Download audio from YouTube using yt-dlp.

        Args:
            search_query: Song name and artist to search for
            track_id: Unique identifier for the file

        Returns:
            Path to downloaded audio file or None
        """
        output_path = self.cache_dir / f"{track_id}.mp3"

        if output_path.exists():
            logger.info(f"Using cached audio for {track_id}")
            return str(output_path)

        try:
            # Use yt-dlp to search and download
            process = await asyncio.create_subprocess_exec(
                "yt-dlp",
                f"ytsearch1:{search_query}",
                "-x",  # Extract audio
                "--audio-format",
                "mp3",
                "--audio-quality",
                "0",
                "-o",
                str(output_path.with_suffix(".%(ext)s")),
                "--no-playlist",
                "--quiet",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                logger.error(f"yt-dlp failed: {stderr.decode()}")
                return None

            # Find the downloaded file
            for ext in [".mp3", ".m4a", ".webm", ".opus"]:
                potential_path = self.cache_dir / f"{track_id}{ext}"
                if potential_path.exists():
                    return str(potential_path)

            return str(output_path) if output_path.exists() else None

        except Exception as e:
            logger.error(f"Error downloading audio: {e}")
            return None

    async def download_preview(self, preview_url: str, track_id: str) -> Optional[str]:
        """
        Download Spotify preview (30 second clip).

        Args:
            preview_url: Spotify preview URL
            track_id: Unique identifier for the file

        Returns:
            Path to downloaded audio file or None
        """
        import httpx

        output_path = self.cache_dir / f"{track_id}_preview.mp3"

        if output_path.exists():
            return str(output_path)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(preview_url)
                if response.status_code == 200:
                    with open(output_path, "wb") as f:
                        f.write(response.content)
                    return str(output_path)
        except Exception as e:
            logger.error(f"Error downloading preview: {e}")

        return None


# Singleton instances
_audio_processor: Optional[AudioProcessor] = None
_audio_downloader: Optional[AudioDownloader] = None


def get_audio_processor() -> AudioProcessor:
    """Get or create AudioProcessor singleton."""
    global _audio_processor
    if _audio_processor is None:
        _audio_processor = AudioProcessor()
    return _audio_processor


def get_audio_downloader() -> AudioDownloader:
    """Get or create AudioDownloader singleton."""
    global _audio_downloader
    if _audio_downloader is None:
        _audio_downloader = AudioDownloader()
    return _audio_downloader
