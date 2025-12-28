import React, { useState, useEffect, useRef } from 'react'

function PianoGuideDisplay({ data }) {
  const [activeNotes, setActiveNotes] = useState(new Set())
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const playIntervalRef = useRef(null)

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No piano guide data available</p>
        <p className="text-sm mt-2">Process a song to generate piano guide</p>
      </div>
    )
  }

  const { notes = [], chord_progression = [], tempo, difficulty_score } = data

  // Get pitch range for piano display
  const pitchRange = getPitchRange(notes)

  // Play/pause simulation
  const togglePlay = () => {
    if (isPlaying) {
      clearInterval(playIntervalRef.current)
      setIsPlaying(false)
      setActiveNotes(new Set())
    } else {
      setIsPlaying(true)
      let time = 0
      playIntervalRef.current = setInterval(() => {
        time += 0.1
        setCurrentTime(time)

        // Find active notes at current time
        const active = new Set(
          notes
            .filter((n) => n.time <= time && n.time + n.duration > time)
            .map((n) => n.pitch)
        )
        setActiveNotes(active)

        // Stop at end
        const maxTime = Math.max(...notes.map((n) => n.time + n.duration))
        if (time > maxTime) {
          clearInterval(playIntervalRef.current)
          setIsPlaying(false)
          setActiveNotes(new Set())
          setCurrentTime(0)
        }
      }, 100)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="p-6 bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Piano Guide</h3>
          <p className="text-gray-500 text-sm">
            Tempo: {tempo} BPM | {notes.length} notes
          </p>
        </div>
        <button
          onClick={togglePlay}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            isPlaying
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isPlaying ? 'Stop' : 'Play Preview'}
        </button>
      </div>

      {/* Piano Keyboard */}
      <div className="mb-8 overflow-x-auto">
        <PianoKeyboard
          minPitch={pitchRange.min}
          maxPitch={pitchRange.max}
          activeNotes={activeNotes}
          notes={notes}
        />
      </div>

      {/* Hand Assignments */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <HandGuide
          title="Left Hand"
          notes={notes.filter((n) => n.hand === 'left')}
          color="blue"
        />
        <HandGuide
          title="Right Hand"
          notes={notes.filter((n) => n.hand === 'right')}
          color="green"
        />
      </div>

      {/* Chord Progression */}
      {chord_progression.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">
            Chord Progression
          </h4>
          <div className="flex flex-wrap gap-3">
            {chord_progression.slice(0, 16).map((chord, i) => (
              <div
                key={i}
                className="bg-white shadow rounded-lg p-4 text-center min-w-[100px]"
              >
                <div className="font-bold text-xl text-gray-800">
                  {chord.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(chord.time)}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {chord.notes.slice(0, 4).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Timeline */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-700 mb-4">
          First 20 Notes
        </h4>
        <div className="bg-white rounded-lg p-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {notes.slice(0, 20).map((note, i) => (
              <NoteCard key={i} note={note} />
            ))}
          </div>
        </div>
      </div>

      {/* Fingering Guide */}
      <div className="bg-white rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-700 mb-4">
          Fingering Guide
        </h4>
        <div className="grid grid-cols-5 gap-4 text-center">
          {[1, 2, 3, 4, 5].map((finger) => (
            <div key={finger} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{finger}</div>
              <div className="text-sm text-gray-500">
                {getFingerName(finger)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Numbers shown on notes indicate suggested fingering
        </p>
      </div>
    </div>
  )
}

function PianoKeyboard({ minPitch, maxPitch, activeNotes, notes }) {
  // Extend range a bit for context
  const start = Math.max(21, minPitch - 5)
  const end = Math.min(108, maxPitch + 5)

  const keys = []
  for (let pitch = start; pitch <= end; pitch++) {
    const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12)
    const isActive = activeNotes.has(pitch)
    const noteData = notes.find((n) => n.pitch === pitch)

    keys.push(
      <div
        key={pitch}
        className={`piano-key ${isBlack ? 'black' : 'white'} ${
          isActive ? 'active' : ''
        }`}
        style={{
          width: isBlack ? '24px' : '40px',
          height: isBlack ? '80px' : '120px',
          marginLeft: isBlack ? '-12px' : '0',
          marginRight: isBlack ? '-12px' : '0',
          zIndex: isBlack ? 2 : 1,
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: '4px',
          borderRadius: '0 0 4px 4px',
          boxShadow: isBlack
            ? '0 2px 4px rgba(0,0,0,0.5)'
            : '0 2px 4px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          transition: 'all 0.1s ease',
        }}
        title={getNoteNameFromPitch(pitch)}
      >
        {/* Show note name on C keys */}
        {pitch % 12 === 0 && (
          <span
            className="text-xs text-gray-500"
            style={{ fontSize: '10px' }}
          >
            {getNoteNameFromPitch(pitch)}
          </span>
        )}
        {/* Show finger number if active */}
        {isActive && noteData?.finger && (
          <span className="text-xs font-bold text-white bg-green-600 rounded-full w-5 h-5 flex items-center justify-center mb-1">
            {noteData.finger}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex items-end justify-center py-4 bg-gray-800 rounded-lg"
      style={{ minWidth: 'max-content' }}
    >
      {keys}
    </div>
  )
}

function HandGuide({ title, notes, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 border-blue-200 text-blue-800',
    green: 'bg-green-100 border-green-200 text-green-800',
  }

  const uniqueNotes = [...new Set(notes.map((n) => n.note_name))].slice(0, 8)

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <h5 className="font-semibold mb-3">{title}</h5>
      <p className="text-sm mb-3">{notes.length} notes total</p>
      <div className="flex flex-wrap gap-2">
        {uniqueNotes.map((noteName, i) => (
          <span
            key={i}
            className="bg-white px-3 py-1 rounded-full text-sm shadow-sm"
          >
            {noteName}
          </span>
        ))}
      </div>
    </div>
  )
}

function NoteCard({ note }) {
  const handColor = note.hand === 'left' ? 'border-blue-400' : 'border-green-400'
  const bgColor = note.is_black_key ? 'bg-gray-800 text-white' : 'bg-white'

  return (
    <div
      className={`p-3 rounded-lg border-2 ${handColor} ${bgColor} min-w-[70px] text-center shadow-sm`}
    >
      <div className="font-bold text-lg">{note.note_name}</div>
      <div className="text-xs opacity-60 mt-1">
        {note.hand === 'left' ? 'L' : 'R'} - {note.finger}
      </div>
      <div className="text-xs opacity-40 mt-1">{formatTime(note.time)}</div>
    </div>
  )
}

// Helper functions
function getPitchRange(notes) {
  if (!notes.length) {
    return { min: 60, max: 72 } // Middle C octave
  }

  const pitches = notes.map((n) => n.pitch)
  return {
    min: Math.min(...pitches),
    max: Math.max(...pitches),
  }
}

function getNoteNameFromPitch(pitch) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(pitch / 12) - 1
  const noteName = noteNames[pitch % 12]
  return `${noteName}${octave}`
}

function getFingerName(finger) {
  const names = ['', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
  return names[finger] || ''
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default PianoGuideDisplay
