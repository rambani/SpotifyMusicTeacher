"""Sheet music and learning guide generation."""
from typing import Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class NoteInfo:
    """Represents a musical note with timing and pitch information."""
    start_time: float
    end_time: float
    pitch: int
    velocity: int
    note_name: str


class SheetMusicGenerator:
    """Generate sheet music data and learning guides."""

    # Standard tuning for guitar (low to high)
    GUITAR_TUNING = [40, 45, 50, 55, 59, 64]  # E2, A2, D3, G3, B3, E4
    GUITAR_STRINGS = ["E", "A", "D", "G", "B", "e"]

    # Piano key range
    PIANO_RANGE = (21, 108)  # A0 to C8

    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    # Durations in beats
    DURATION_MAP = {
        "whole": 4.0,
        "half": 2.0,
        "quarter": 1.0,
        "eighth": 0.5,
        "sixteenth": 0.25,
    }

    def __init__(self):
        pass

    def generate_sheet_music(
        self,
        notes: list[dict],
        tempo: float = 120,
        time_signature: tuple[int, int] = (4, 4),
        key: str = "C",
    ) -> dict:
        """
        Generate sheet music data from notes.

        Args:
            notes: List of note dictionaries with pitch and timing info
            tempo: Tempo in BPM
            time_signature: Time signature tuple (numerator, denominator)
            key: Key signature

        Returns:
            Sheet music data suitable for VexFlow rendering
        """
        if not notes:
            return {"measures": [], "metadata": {}}

        # Convert to NoteInfo objects
        note_infos = [
            NoteInfo(
                start_time=n["start_time"],
                end_time=n["end_time"],
                pitch=n["pitch"],
                velocity=n.get("velocity", 80),
                note_name=n["note_name"],
            )
            for n in notes
        ]

        # Calculate beat duration in seconds
        beat_duration = 60.0 / tempo

        # Group notes into measures
        beats_per_measure = time_signature[0]
        measure_duration = beats_per_measure * beat_duration

        measures = self._group_into_measures(note_infos, measure_duration, beat_duration)

        # Generate VexFlow-compatible data
        vexflow_data = self._to_vexflow_format(measures, time_signature, key)

        return {
            "measures": vexflow_data,
            "metadata": {
                "tempo": tempo,
                "time_signature": f"{time_signature[0]}/{time_signature[1]}",
                "key": key,
                "total_measures": len(measures),
                "total_notes": len(notes),
            },
        }

    def _group_into_measures(
        self,
        notes: list[NoteInfo],
        measure_duration: float,
        beat_duration: float,
    ) -> list[list[dict]]:
        """Group notes into measures."""
        if not notes:
            return []

        measures = []
        current_measure = []
        measure_start = 0.0

        for note in notes:
            # Determine which measure this note belongs to
            measure_idx = int(note.start_time / measure_duration)

            # Fill in empty measures if needed
            while len(measures) <= measure_idx:
                if current_measure:
                    measures.append(current_measure)
                    current_measure = []
                elif measures or measure_idx > 0:
                    measures.append([])
                measure_start = len(measures) * measure_duration

            # Calculate beat position within measure
            beat_in_measure = (note.start_time - measure_start) / beat_duration
            duration_in_beats = (note.end_time - note.start_time) / beat_duration

            # Quantize to nearest subdivision
            beat_in_measure = self._quantize_beat(beat_in_measure)
            duration_in_beats = self._quantize_duration(duration_in_beats)

            current_measure.append({
                "pitch": note.pitch,
                "note_name": note.note_name,
                "beat": beat_in_measure,
                "duration": duration_in_beats,
                "velocity": note.velocity,
            })

        if current_measure:
            measures.append(current_measure)

        return measures

    def _quantize_beat(self, beat: float) -> float:
        """Quantize beat position to nearest 16th note."""
        return round(beat * 4) / 4

    def _quantize_duration(self, duration: float) -> float:
        """Quantize duration to standard note values."""
        # Find closest standard duration
        standard_durations = [4.0, 2.0, 1.5, 1.0, 0.75, 0.5, 0.25, 0.125]
        closest = min(standard_durations, key=lambda x: abs(x - duration))
        return max(0.25, closest)  # Minimum 16th note

    def _to_vexflow_format(
        self,
        measures: list[list[dict]],
        time_signature: tuple[int, int],
        key: str,
    ) -> list[dict]:
        """Convert measures to VexFlow-compatible format."""
        vexflow_measures = []

        for measure_idx, measure in enumerate(measures):
            if not measure:
                # Empty measure - add rest
                vexflow_measures.append({
                    "measure_number": measure_idx + 1,
                    "notes": [{
                        "keys": ["b/4"],
                        "duration": "wr",  # Whole rest
                        "is_rest": True,
                    }],
                })
                continue

            # Sort notes by beat position
            measure = sorted(measure, key=lambda x: x["beat"])

            # Group simultaneous notes (chords)
            grouped_notes = self._group_simultaneous_notes(measure)

            vexflow_notes = []
            for group in grouped_notes:
                # Convert to VexFlow format
                keys = [self._pitch_to_vexflow_key(n["pitch"]) for n in group]
                duration = self._beats_to_vexflow_duration(group[0]["duration"])

                vexflow_notes.append({
                    "keys": keys,
                    "duration": duration,
                    "beat": group[0]["beat"],
                    "is_rest": False,
                })

            vexflow_measures.append({
                "measure_number": measure_idx + 1,
                "notes": vexflow_notes,
            })

        return vexflow_measures

    def _group_simultaneous_notes(
        self, notes: list[dict], threshold: float = 0.05
    ) -> list[list[dict]]:
        """Group notes that occur at the same time into chords."""
        if not notes:
            return []

        groups = [[notes[0]]]
        for note in notes[1:]:
            if abs(note["beat"] - groups[-1][0]["beat"]) < threshold:
                groups[-1].append(note)
            else:
                groups.append([note])

        return groups

    def _pitch_to_vexflow_key(self, pitch: int) -> str:
        """Convert MIDI pitch to VexFlow key format."""
        octave = (pitch // 12) - 1
        note_idx = pitch % 12
        note_name = self.NOTE_NAMES[note_idx].lower().replace("#", "#")
        return f"{note_name}/{octave}"

    def _beats_to_vexflow_duration(self, beats: float) -> str:
        """Convert beat duration to VexFlow duration string."""
        duration_map = {
            4.0: "w",
            3.0: "hd",
            2.0: "h",
            1.5: "qd",
            1.0: "q",
            0.75: "8d",
            0.5: "8",
            0.25: "16",
            0.125: "32",
        }
        return duration_map.get(beats, "q")

    def generate_guitar_tab(
        self,
        notes: list[dict],
        tempo: float = 120,
    ) -> dict:
        """
        Generate guitar tablature from notes.

        Args:
            notes: List of note dictionaries
            tempo: Tempo in BPM

        Returns:
            Guitar tab data
        """
        tab_notes = []

        for note in notes:
            pitch = note["pitch"]
            fret_positions = self._find_guitar_position(pitch)

            if fret_positions:
                # Use the position closest to the nut (easier for beginners)
                best_pos = min(fret_positions, key=lambda x: x["fret"])
                tab_notes.append({
                    "time": note["start_time"],
                    "string": best_pos["string"],
                    "string_name": self.GUITAR_STRINGS[best_pos["string"]],
                    "fret": best_pos["fret"],
                    "note_name": note["note_name"],
                    "duration": note["end_time"] - note["start_time"],
                })

        # Detect chord shapes
        chords = self._detect_guitar_chords(tab_notes)

        return {
            "notes": tab_notes,
            "chords": chords,
            "tempo": tempo,
            "tuning": self.GUITAR_STRINGS,
        }

    def _find_guitar_position(self, pitch: int) -> list[dict]:
        """Find all possible positions on guitar for a pitch."""
        positions = []

        for string_idx, open_pitch in enumerate(self.GUITAR_TUNING):
            fret = pitch - open_pitch
            if 0 <= fret <= 24:  # Valid fret range
                positions.append({
                    "string": string_idx,
                    "fret": fret,
                })

        return positions

    def _detect_guitar_chords(self, tab_notes: list, time_window: float = 0.1) -> list:
        """Detect chord shapes from tab notes."""
        chords = []
        i = 0

        while i < len(tab_notes):
            current_time = tab_notes[i]["time"]
            chord_notes = []

            j = i
            while j < len(tab_notes) and abs(tab_notes[j]["time"] - current_time) < time_window:
                chord_notes.append(tab_notes[j])
                j += 1

            if len(chord_notes) >= 3:
                # Create chord diagram data
                chord_shape = [None] * 6
                for note in chord_notes:
                    chord_shape[note["string"]] = note["fret"]

                # Try to identify the chord
                pitches = sorted(set(
                    self.GUITAR_TUNING[n["string"]] + n["fret"]
                    for n in chord_notes
                ))
                chord_name = self._identify_chord_name(pitches)

                chords.append({
                    "time": current_time,
                    "name": chord_name,
                    "shape": chord_shape,
                    "notes": [n["note_name"] for n in chord_notes],
                })

            i = max(j, i + 1)

        return chords

    def _identify_chord_name(self, pitches: list) -> str:
        """Identify chord name from pitches."""
        if len(pitches) < 3:
            return "Unknown"

        # Get pitch classes
        pitch_classes = sorted(set(p % 12 for p in pitches))
        root = pitch_classes[0]
        root_name = self.NOTE_NAMES[root]

        # Check intervals
        intervals = [(p - root) % 12 for p in pitch_classes]

        # Common chord patterns
        if 4 in intervals and 7 in intervals:
            return f"{root_name}" if 11 not in intervals else f"{root_name}maj7"
        elif 3 in intervals and 7 in intervals:
            return f"{root_name}m" if 10 not in intervals else f"{root_name}m7"
        elif 4 in intervals and 7 in intervals and 10 in intervals:
            return f"{root_name}7"

        return root_name

    def generate_piano_guide(
        self,
        notes: list[dict],
        tempo: float = 120,
    ) -> dict:
        """
        Generate piano learning guide with hand positions.

        Args:
            notes: List of note dictionaries
            tempo: Tempo in BPM

        Returns:
            Piano guide data with hand assignments
        """
        piano_notes = []

        for note in notes:
            pitch = note["pitch"]

            # Assign hand based on pitch (simplified)
            # Middle C (60) as the dividing point
            hand = "left" if pitch < 60 else "right"

            # Suggest finger for beginners
            finger = self._suggest_piano_finger(pitch, hand)

            piano_notes.append({
                "time": note["start_time"],
                "pitch": pitch,
                "note_name": note["note_name"],
                "duration": note["end_time"] - note["start_time"],
                "hand": hand,
                "finger": finger,
                "is_black_key": self._is_black_key(pitch),
            })

        # Detect chord progressions
        chord_progression = self._detect_piano_chords(piano_notes)

        return {
            "notes": piano_notes,
            "chord_progression": chord_progression,
            "tempo": tempo,
            "difficulty_score": self._calculate_difficulty(piano_notes),
        }

    def _is_black_key(self, pitch: int) -> bool:
        """Check if a pitch corresponds to a black key."""
        return (pitch % 12) in [1, 3, 6, 8, 10]

    def _suggest_piano_finger(self, pitch: int, hand: str) -> int:
        """Suggest a finger number for beginners (1=thumb, 5=pinky)."""
        # Simplified finger suggestion based on white/black key
        # Real fingering depends on context
        if self._is_black_key(pitch):
            return 3  # Middle finger for black keys (common)
        return 2  # Index finger for white keys (safe default)

    def _detect_piano_chords(self, notes: list, time_window: float = 0.1) -> list:
        """Detect chord progressions from piano notes."""
        chords = []
        i = 0

        while i < len(notes):
            current_time = notes[i]["time"]
            chord_notes = []

            j = i
            while j < len(notes) and abs(notes[j]["time"] - current_time) < time_window:
                chord_notes.append(notes[j])
                j += 1

            if len(chord_notes) >= 3:
                pitches = sorted(n["pitch"] for n in chord_notes)
                chord_name = self._identify_chord_name(pitches)

                chords.append({
                    "time": current_time,
                    "name": chord_name,
                    "notes": [n["note_name"] for n in chord_notes],
                    "left_hand": [n for n in chord_notes if n["hand"] == "left"],
                    "right_hand": [n for n in chord_notes if n["hand"] == "right"],
                })

            i = max(j, i + 1)

        return chords

    def _calculate_difficulty(self, notes: list) -> dict:
        """Calculate difficulty score for the piece."""
        if not notes:
            return {"score": 0, "level": "Beginner", "factors": []}

        factors = []

        # Check hand coordination
        left_notes = [n for n in notes if n["hand"] == "left"]
        right_notes = [n for n in notes if n["hand"] == "right"]

        if left_notes and right_notes:
            factors.append("Requires both hands")

        # Check for large intervals
        pitches = [n["pitch"] for n in notes]
        max_interval = max(
            abs(pitches[i + 1] - pitches[i])
            for i in range(len(pitches) - 1)
        ) if len(pitches) > 1 else 0

        if max_interval > 12:
            factors.append("Large interval jumps")

        # Check for black keys
        black_key_ratio = sum(1 for n in notes if n["is_black_key"]) / len(notes)
        if black_key_ratio > 0.3:
            factors.append("Many accidentals")

        # Calculate overall score
        score = len(factors) * 2 + (max_interval // 6)
        score = min(10, max(1, score))

        levels = {
            (1, 3): "Beginner",
            (4, 5): "Easy",
            (6, 7): "Intermediate",
            (8, 9): "Advanced",
            (10, 10): "Expert",
        }

        level = "Beginner"
        for (low, high), name in levels.items():
            if low <= score <= high:
                level = name
                break

        return {
            "score": score,
            "level": level,
            "factors": factors,
        }

    def generate_simplified_guide(
        self,
        notes: list[dict],
        instrument: str,
        tempo: float = 120,
        skill_level: str = "beginner",
    ) -> dict:
        """
        Generate a simplified learning guide for any instrument.

        Args:
            notes: List of note dictionaries
            instrument: Target instrument
            tempo: Tempo in BPM
            skill_level: beginner, intermediate, or advanced

        Returns:
            Simplified guide data
        """
        # Simplify based on skill level
        if skill_level == "beginner":
            # Only include main melody notes
            notes = self._extract_melody(notes)
            # Slow down tempo
            tempo = tempo * 0.7

        # Generate appropriate guide based on instrument
        if instrument.lower() in ["guitar", "acoustic guitar", "electric guitar"]:
            base_guide = self.generate_guitar_tab(notes, tempo)
            guide_type = "tab"
        elif instrument.lower() in ["piano", "keyboard", "keys"]:
            base_guide = self.generate_piano_guide(notes, tempo)
            guide_type = "piano"
        else:
            base_guide = self.generate_sheet_music(notes, tempo)
            guide_type = "sheet"

        # Add learning tips
        tips = self._generate_learning_tips(instrument, skill_level)

        return {
            "guide_type": guide_type,
            "instrument": instrument,
            "skill_level": skill_level,
            "tempo": tempo,
            "content": base_guide,
            "tips": tips,
            "practice_sections": self._create_practice_sections(notes, tempo),
        }

    def _extract_melody(self, notes: list) -> list:
        """Extract the main melody from a set of notes."""
        if not notes:
            return []

        # Group notes by time
        time_groups = {}
        for note in notes:
            t = round(note["start_time"], 2)
            if t not in time_groups:
                time_groups[t] = []
            time_groups[t].append(note)

        # Take the highest note at each time (usually melody)
        melody = []
        for t in sorted(time_groups.keys()):
            highest = max(time_groups[t], key=lambda x: x["pitch"])
            melody.append(highest)

        return melody

    def _generate_learning_tips(self, instrument: str, skill_level: str) -> list[str]:
        """Generate learning tips based on instrument and skill level."""
        tips = {
            "guitar": {
                "beginner": [
                    "Focus on pressing strings firmly right behind the frets",
                    "Start with open chords before attempting barre chords",
                    "Practice transitioning between chords slowly at first",
                    "Keep your thumb behind the neck for better reach",
                ],
                "intermediate": [
                    "Work on your strumming patterns",
                    "Practice chord transitions with a metronome",
                    "Try adding hammer-ons and pull-offs for expression",
                ],
            },
            "piano": {
                "beginner": [
                    "Keep your wrists relaxed and curved fingers",
                    "Practice hands separately before combining",
                    "Count out loud while playing",
                    "Start slowly and gradually increase tempo",
                ],
                "intermediate": [
                    "Pay attention to dynamics (soft/loud)",
                    "Practice pedaling separately from notes",
                    "Work on smooth legato transitions",
                ],
            },
        }

        instrument_lower = instrument.lower()
        for key in tips:
            if key in instrument_lower:
                return tips[key].get(skill_level, tips[key]["beginner"])

        return [
            "Start slowly and focus on accuracy",
            "Practice with a metronome",
            "Break difficult sections into smaller parts",
            "Take regular breaks to avoid fatigue",
        ]

    def _create_practice_sections(self, notes: list, tempo: float) -> list[dict]:
        """Create practice sections from the piece."""
        if not notes or len(notes) < 4:
            return []

        # Divide into 4-8 bar sections
        sections = []
        section_length = 8  # seconds
        current_section = []
        section_start = 0

        for note in notes:
            if note["start_time"] - section_start > section_length:
                if current_section:
                    sections.append({
                        "start_time": section_start,
                        "end_time": note["start_time"],
                        "notes": current_section,
                        "note_count": len(current_section),
                    })
                section_start = note["start_time"]
                current_section = []

            current_section.append(note)

        if current_section:
            sections.append({
                "start_time": section_start,
                "end_time": current_section[-1]["end_time"],
                "notes": current_section,
                "note_count": len(current_section),
            })

        return sections


# Singleton instance
_sheet_generator: Optional[SheetMusicGenerator] = None


def get_sheet_generator() -> SheetMusicGenerator:
    """Get or create SheetMusicGenerator singleton."""
    global _sheet_generator
    if _sheet_generator is None:
        _sheet_generator = SheetMusicGenerator()
    return _sheet_generator
