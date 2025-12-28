"""FastAPI application for Spotify Music Teacher."""
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from .config import get_settings
from .spotify import get_spotify_client
from .audio_processor import get_audio_processor, get_audio_downloader
from .transcriber import get_transcriber
from .sheet_generator import get_sheet_generator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Request/Response models
class TrackSearchResponse(BaseModel):
    """Response model for track search."""
    tracks: list[dict]
    query: str
    count: int


class TrackDetailResponse(BaseModel):
    """Response model for track details."""
    track: dict
    audio_features: Optional[dict] = None
    audio_analysis: Optional[dict] = None


class ProcessingStatus(BaseModel):
    """Status of audio processing job."""
    track_id: str
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    message: str


class SheetMusicRequest(BaseModel):
    """Request model for sheet music generation."""
    track_id: str
    instrument: str = "piano"
    skill_level: str = "beginner"


class SheetMusicResponse(BaseModel):
    """Response model for sheet music."""
    track_id: str
    instrument: str
    sheet_music: dict
    guitar_tab: Optional[dict] = None
    piano_guide: Optional[dict] = None
    simplified_guide: Optional[dict] = None


# Store processing jobs status
processing_jobs: dict[str, ProcessingStatus] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    settings = get_settings()

    # Create cache directories
    for cache_dir in [settings.audio_cache_dir, settings.stems_cache_dir, settings.midi_cache_dir]:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)

    logger.info("Spotify Music Teacher API started")

    yield

    # Shutdown
    logger.info("Spotify Music Teacher API shutting down")


# Create FastAPI app
app = FastAPI(
    title="Spotify Music Teacher API",
    description="API for generating sheet music and learning guides from Spotify tracks",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Spotify Music Teacher API",
        "version": "1.0.0",
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


# Spotify endpoints
@app.get("/api/search", response_model=TrackSearchResponse)
async def search_tracks(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
):
    """Search for tracks on Spotify."""
    spotify = get_spotify_client()

    if not spotify.is_configured:
        # Return demo data if Spotify is not configured
        return TrackSearchResponse(
            tracks=_get_demo_tracks(q),
            query=q,
            count=len(_get_demo_tracks(q)),
        )

    tracks = spotify.search_tracks(q, limit)
    return TrackSearchResponse(
        tracks=tracks,
        query=q,
        count=len(tracks),
    )


@app.get("/api/tracks/{track_id}", response_model=TrackDetailResponse)
async def get_track(track_id: str):
    """Get detailed information about a track."""
    spotify = get_spotify_client()

    if not spotify.is_configured:
        # Return demo data
        demo = _get_demo_track(track_id)
        if demo:
            return TrackDetailResponse(track=demo)
        raise HTTPException(status_code=404, detail="Track not found")

    track = spotify.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    audio_features = spotify.get_audio_features(track_id)
    audio_analysis = spotify.get_audio_analysis(track_id)

    return TrackDetailResponse(
        track=track,
        audio_features=audio_features,
        audio_analysis=audio_analysis,
    )


# Processing endpoints
@app.post("/api/process/{track_id}")
async def start_processing(
    track_id: str,
    background_tasks: BackgroundTasks,
    use_preview: bool = Query(True, description="Use Spotify preview (faster) or full song"),
):
    """Start processing a track for sheet music generation."""
    spotify = get_spotify_client()

    # Get track info
    if spotify.is_configured:
        track = spotify.get_track(track_id)
    else:
        track = _get_demo_track(track_id)

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Check if already processing
    if track_id in processing_jobs:
        job = processing_jobs[track_id]
        if job.status in ["pending", "processing"]:
            return {"message": "Already processing", "status": job}

    # Create processing job
    processing_jobs[track_id] = ProcessingStatus(
        track_id=track_id,
        status="pending",
        progress=0,
        message="Queued for processing",
    )

    # Start background processing
    background_tasks.add_task(
        _process_track,
        track_id,
        track,
        use_preview,
    )

    return {"message": "Processing started", "status": processing_jobs[track_id]}


@app.get("/api/process/{track_id}/status")
async def get_processing_status(track_id: str):
    """Get the status of a processing job."""
    if track_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="No processing job found")

    return processing_jobs[track_id]


async def _process_track(track_id: str, track: dict, use_preview: bool):
    """Background task to process a track."""
    job = processing_jobs[track_id]

    try:
        # Update status
        job.status = "processing"
        job.progress = 10
        job.message = "Downloading audio..."

        downloader = get_audio_downloader()

        # Download audio
        if use_preview and track.get("preview_url"):
            audio_path = await downloader.download_preview(
                track["preview_url"],
                track_id,
            )
        else:
            # Try to download from YouTube
            search_query = f"{track['name']} {track['artist_names']}"
            audio_path = await downloader.download_from_youtube(
                search_query,
                track_id,
            )

        if not audio_path:
            job.status = "failed"
            job.message = "Failed to download audio"
            return

        job.progress = 30
        job.message = "Separating instruments..."

        # Separate stems (optional - skip for preview)
        processor = get_audio_processor()
        try:
            stems = await processor.separate_stems(audio_path, track_id)
            job.progress = 60
        except Exception as e:
            logger.warning(f"Stem separation failed: {e}, continuing with original audio")
            stems = {"mixed": audio_path}
            job.progress = 50

        job.message = "Transcribing audio to notes..."

        # Transcribe audio
        transcriber = get_transcriber()
        transcription = await transcriber.transcribe_audio(audio_path, track_id)

        job.progress = 90
        job.message = "Generating sheet music..."

        # Store transcription result
        job.progress = 100
        job.status = "completed"
        job.message = "Processing complete"

    except Exception as e:
        logger.error(f"Processing failed: {e}")
        job.status = "failed"
        job.message = str(e)


# Sheet music endpoints
@app.get("/api/sheet-music/{track_id}")
async def get_sheet_music(
    track_id: str,
    instrument: str = Query("piano", description="Target instrument"),
    skill_level: str = Query("beginner", description="Skill level"),
):
    """Get sheet music for a processed track."""
    try:
        # Get track info
        spotify = get_spotify_client()
        is_demo = track_id.startswith("demo_")

        if spotify.is_configured and not is_demo:
            track = spotify.get_track(track_id)
            audio_features = spotify.get_audio_features(track_id)
        else:
            track = _get_demo_track(track_id)
            audio_features = _get_demo_audio_features()

        if not track:
            raise HTTPException(status_code=404, detail="Track not found")

        # Get tempo and time signature from audio features
        tempo = audio_features.get("tempo", 120) if audio_features else 120
        time_sig = audio_features.get("time_signature", 4) if audio_features else 4

        # Generate sheet music
        generator = get_sheet_generator()

        # For demo tracks, always use demo notes
        if is_demo:
            notes = _generate_demo_notes(tempo)
        else:
            # Check if track was processed
            if track_id in processing_jobs:
                job = processing_jobs[track_id]
                if job.status != "completed":
                    # Not processed yet, use demo notes
                    notes = _generate_demo_notes(tempo)
                else:
                    # Try to get real transcription
                    settings = get_settings()
                    audio_cache = Path(settings.audio_cache_dir) / f"{track_id}.mp3"
                    preview_cache = Path(settings.audio_cache_dir) / f"{track_id}_preview.mp3"

                    if audio_cache.exists() or preview_cache.exists():
                        transcriber = get_transcriber()
                        audio_path = str(audio_cache if audio_cache.exists() else preview_cache)
                        transcription = await transcriber.transcribe_audio(audio_path, track_id)
                        notes = transcription.get("notes", [])
                    else:
                        notes = _generate_demo_notes(tempo)
            else:
                # No processing job, use demo notes
                notes = _generate_demo_notes(tempo)

        # Generate different formats
        sheet_music = generator.generate_sheet_music(
            notes,
            tempo=tempo,
            time_signature=(time_sig, 4),
        )

        guitar_tab = generator.generate_guitar_tab(notes, tempo)
        piano_guide = generator.generate_piano_guide(notes, tempo)
        simplified_guide = generator.generate_simplified_guide(
            notes,
            instrument=instrument,
            tempo=tempo,
            skill_level=skill_level,
        )

        return SheetMusicResponse(
            track_id=track_id,
            instrument=instrument,
            sheet_music=sheet_music,
            guitar_tab=guitar_tab,
            piano_guide=piano_guide,
            simplified_guide=simplified_guide,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating sheet music: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate sheet music: {str(e)}")


@app.get("/api/stems/{track_id}")
async def get_stems(track_id: str):
    """Get available stems for a processed track."""
    settings = get_settings()
    stems_dir = Path(settings.stems_cache_dir) / track_id

    if not stems_dir.exists():
        return {"stems": [], "message": "No stems available. Process the track first."}

    processor = get_audio_processor()
    stems = processor._get_cached_stems(stems_dir)

    return {
        "stems": list(stems.keys()),
        "paths": stems,
    }


@app.get("/api/stems/{track_id}/{stem_name}")
async def get_stem_file(track_id: str, stem_name: str):
    """Download a specific stem file."""
    processor = get_audio_processor()
    stem_path = await processor.get_stem(track_id, stem_name)

    if not stem_path or not Path(stem_path).exists():
        raise HTTPException(status_code=404, detail="Stem not found")

    return FileResponse(
        stem_path,
        media_type="audio/wav",
        filename=f"{track_id}_{stem_name}.wav",
    )


# Demo data for when Spotify is not configured
def _get_demo_tracks(query: str) -> list[dict]:
    """Generate demo tracks for testing without Spotify."""
    demos = [
        {
            "id": "demo_1",
            "name": "Demo Song - Easy",
            "artists": [{"id": "artist_1", "name": "Demo Artist"}],
            "artist_names": "Demo Artist",
            "album": {
                "id": "album_1",
                "name": "Demo Album",
                "image_url": "https://via.placeholder.com/300x300.png?text=Demo+Album",
            },
            "duration_ms": 180000,
            "preview_url": None,
            "external_url": "#",
            "popularity": 80,
        },
        {
            "id": "demo_2",
            "name": "Demo Song - Intermediate",
            "artists": [{"id": "artist_2", "name": "Another Artist"}],
            "artist_names": "Another Artist",
            "album": {
                "id": "album_2",
                "name": "Another Album",
                "image_url": "https://via.placeholder.com/300x300.png?text=Another+Album",
            },
            "duration_ms": 240000,
            "preview_url": None,
            "external_url": "#",
            "popularity": 75,
        },
    ]

    # Filter by query
    query_lower = query.lower()
    return [t for t in demos if query_lower in t["name"].lower() or query_lower in t["artist_names"].lower()] or demos


def _get_demo_track(track_id: str) -> Optional[dict]:
    """Get a demo track by ID."""
    demos = _get_demo_tracks("")
    for track in demos:
        if track["id"] == track_id:
            return track
    return demos[0] if demos else None


def _get_demo_audio_features() -> dict:
    """Get demo audio features."""
    return {
        "tempo": 120,
        "key": 0,  # C
        "mode": 1,  # Major
        "time_signature": 4,
        "energy": 0.7,
        "danceability": 0.6,
    }


def _generate_demo_notes(tempo: float = 120) -> list[dict]:
    """Generate demo notes for testing sheet music generation."""
    # Generate a simple C major scale pattern
    notes = []
    beat_duration = 60.0 / tempo

    # C major scale: C D E F G A B C
    scale = [60, 62, 64, 65, 67, 69, 71, 72]  # MIDI notes
    note_names = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]

    time = 0
    for i, (pitch, name) in enumerate(zip(scale, note_names)):
        notes.append({
            "start_time": time,
            "end_time": time + beat_duration,
            "pitch": pitch,
            "velocity": 80,
            "note_name": name,
        })
        time += beat_duration

    # Add descending
    for i, (pitch, name) in enumerate(zip(reversed(scale[:-1]), reversed(note_names[:-1]))):
        notes.append({
            "start_time": time,
            "end_time": time + beat_duration,
            "pitch": pitch,
            "velocity": 80,
            "note_name": name,
        })
        time += beat_duration

    # Add some chords
    chord_times = [time, time + beat_duration * 2, time + beat_duration * 4]
    chords = [
        [(60, "C4"), (64, "E4"), (67, "G4")],  # C major
        [(65, "F4"), (69, "A4"), (72, "C5")],  # F major
        [(67, "G4"), (71, "B4"), (74, "D5")],  # G major
    ]

    for chord_time, chord in zip(chord_times, chords):
        for pitch, name in chord:
            notes.append({
                "start_time": chord_time,
                "end_time": chord_time + beat_duration * 2,
                "pitch": pitch,
                "velocity": 70,
                "note_name": name,
            })

    return notes


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
