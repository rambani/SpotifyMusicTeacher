"""Audio to MIDI transcription using Basic-Pitch."""
import os
from pathlib import Path
from typing import Optional
import logging
import numpy as np

from .config import get_settings

logger = logging.getLogger(__name__)


class MusicTranscriber:
    """Transcribe audio to MIDI and musical notation."""

    # Note names for reference
    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    # Key mapping from Spotify's integer to name
    KEY_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"]

    def __init__(self):
        settings = get_settings()
        self.midi_cache_dir = Path(settings.midi_cache_dir)
        self.midi_cache_dir.mkdir(parents=True, exist_ok=True)

    async def transcribe_audio(self, audio_path: str, track_id: str) -> dict:
        """
        Transcribe audio file to MIDI and extract musical information.

        Args:
            audio_path: Path to audio file
            track_id: Unique identifier for caching

        Returns:
            Dictionary containing transcription data
        """
        midi_path = self.midi_cache_dir / f"{track_id}.mid"

        try:
            # Import basic_pitch here to avoid loading TensorFlow at startup
            from basic_pitch.inference import predict
            from basic_pitch import ICASSP_2022_MODEL_PATH

            logger.info(f"Transcribing audio: {audio_path}")

            # Run Basic-Pitch prediction
            model_output, midi_data, note_events = predict(
                audio_path,
                ICASSP_2022_MODEL_PATH,
            )

            # Save MIDI file
            midi_data.write(str(midi_path))

            # Extract note information
            notes = self._extract_notes(note_events)

            # Analyze musical content
            analysis = self._analyze_notes(notes)

            return {
                "midi_path": str(midi_path),
                "notes": notes[:500],  # Limit for response size
                "total_notes": len(notes),
                "analysis": analysis,
            }

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            # Return a simplified fallback
            return await self._fallback_transcription(audio_path, track_id)

    async def _fallback_transcription(self, audio_path: str, track_id: str) -> dict:
        """Fallback transcription method using librosa for basic pitch detection."""
        try:
            import librosa

            y, sr = librosa.load(audio_path)

            # Extract pitches using pyin
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)

            # Get the most prominent pitches
            notes = []
            hop_length = 512
            for i in range(pitches.shape[1]):
                index = magnitudes[:, i].argmax()
                pitch = pitches[index, i]
                if pitch > 0:
                    time = i * hop_length / sr
                    midi_note = int(librosa.hz_to_midi(pitch))
                    notes.append({
                        "start_time": round(time, 3),
                        "end_time": round(time + 0.1, 3),
                        "pitch": midi_note,
                        "velocity": int(magnitudes[index, i] * 127),
                        "note_name": self._midi_to_note_name(midi_note),
                    })

            # Deduplicate and limit
            notes = self._deduplicate_notes(notes)[:500]

            return {
                "midi_path": None,
                "notes": notes,
                "total_notes": len(notes),
                "analysis": self._analyze_notes(notes),
            }

        except Exception as e:
            logger.error(f"Fallback transcription failed: {e}")
            return {
                "midi_path": None,
                "notes": [],
                "total_notes": 0,
                "analysis": {},
            }

    def _extract_notes(self, note_events: list) -> list[dict]:
        """Extract note information from Basic-Pitch output."""
        notes = []
        for event in note_events:
            start_time, end_time, pitch, velocity, _ = event
            notes.append({
                "start_time": round(float(start_time), 3),
                "end_time": round(float(end_time), 3),
                "pitch": int(pitch),
                "velocity": int(velocity * 127),
                "note_name": self._midi_to_note_name(int(pitch)),
            })
        return sorted(notes, key=lambda x: x["start_time"])

    def _deduplicate_notes(self, notes: list) -> list:
        """Remove duplicate notes that are too close together."""
        if not notes:
            return []

        deduped = [notes[0]]
        for note in notes[1:]:
            last = deduped[-1]
            if (note["start_time"] - last["start_time"] > 0.05 or
                note["pitch"] != last["pitch"]):
                deduped.append(note)
        return deduped

    def _midi_to_note_name(self, midi_note: int) -> str:
        """Convert MIDI note number to note name."""
        octave = (midi_note // 12) - 1
        note_index = midi_note % 12
        return f"{self.NOTE_NAMES[note_index]}{octave}"

    def _analyze_notes(self, notes: list) -> dict:
        """Analyze notes to extract musical patterns."""
        if not notes:
            return {}

        pitches = [n["pitch"] for n in notes]

        # Calculate pitch distribution
        pitch_counts = {}
        for p in pitches:
            note_name = self._midi_to_note_name(p)
            base_note = note_name[:-1]  # Remove octave
            pitch_counts[base_note] = pitch_counts.get(base_note, 0) + 1

        # Find most common notes
        sorted_pitches = sorted(pitch_counts.items(), key=lambda x: -x[1])
        top_notes = [p[0] for p in sorted_pitches[:5]]

        # Estimate key based on note distribution
        estimated_key = self._estimate_key(pitch_counts)

        # Calculate note range
        min_pitch = min(pitches)
        max_pitch = max(pitches)

        # Detect chords (simplified)
        chords = self._detect_chords(notes)

        return {
            "pitch_range": {
                "min": min_pitch,
                "max": max_pitch,
                "min_name": self._midi_to_note_name(min_pitch),
                "max_name": self._midi_to_note_name(max_pitch),
            },
            "top_notes": top_notes,
            "estimated_key": estimated_key,
            "note_distribution": dict(sorted_pitches[:12]),
            "detected_chords": chords[:20],  # Limit chord output
        }

    def _estimate_key(self, pitch_counts: dict) -> str:
        """Estimate the key based on note distribution."""
        # Simplified key detection based on note frequency
        # A proper implementation would use more sophisticated algorithms
        if not pitch_counts:
            return "Unknown"

        # Major key profiles (relative weights of scale degrees)
        major_profile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
        minor_profile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

        best_key = "C"
        best_score = -1

        for key_idx, key_name in enumerate(self.NOTE_NAMES):
            # Calculate correlation with major profile
            score = 0
            for note, count in pitch_counts.items():
                note_idx = self.NOTE_NAMES.index(note) if note in self.NOTE_NAMES else -1
                if note_idx >= 0:
                    relative_idx = (note_idx - key_idx) % 12
                    score += count * major_profile[relative_idx]

            if score > best_score:
                best_score = score
                best_key = key_name

        return f"{best_key} Major"

    def _detect_chords(self, notes: list, time_window: float = 0.1) -> list[dict]:
        """Detect chords from simultaneous notes."""
        if not notes:
            return []

        chords = []
        i = 0

        while i < len(notes):
            current_time = notes[i]["start_time"]
            chord_notes = []

            # Collect notes within time window
            j = i
            while j < len(notes) and notes[j]["start_time"] - current_time < time_window:
                chord_notes.append(notes[j])
                j += 1

            if len(chord_notes) >= 3:
                # Identify chord
                pitches = sorted(set(n["pitch"] % 12 for n in chord_notes))
                chord_name = self._identify_chord(pitches, chord_notes[0]["pitch"])
                if chord_name:
                    chords.append({
                        "time": current_time,
                        "chord": chord_name,
                        "notes": [n["note_name"] for n in chord_notes],
                    })

            i = j if j > i else i + 1

        return chords

    def _identify_chord(self, pitches: list, root_pitch: int) -> Optional[str]:
        """Identify chord type from pitch classes."""
        if len(pitches) < 3:
            return None

        # Chord templates (intervals from root)
        chord_types = {
            (0, 4, 7): "Major",
            (0, 3, 7): "Minor",
            (0, 4, 7, 11): "Maj7",
            (0, 3, 7, 10): "Min7",
            (0, 4, 7, 10): "7",
            (0, 3, 6): "Dim",
            (0, 4, 8): "Aug",
            (0, 5, 7): "Sus4",
            (0, 2, 7): "Sus2",
        }

        root_class = root_pitch % 12
        root_name = self.NOTE_NAMES[root_class]

        # Try each pitch as potential root
        for i, root in enumerate(pitches):
            intervals = tuple(sorted((p - root) % 12 for p in pitches))
            if intervals in chord_types:
                return f"{self.NOTE_NAMES[root]}{chord_types[intervals]}"

        return f"{root_name}(?)"


# Singleton instance
_transcriber: Optional[MusicTranscriber] = None


def get_transcriber() -> MusicTranscriber:
    """Get or create MusicTranscriber singleton."""
    global _transcriber
    if _transcriber is None:
        _transcriber = MusicTranscriber()
    return _transcriber
