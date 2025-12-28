import React, { useState } from 'react'

function GuitarTabDisplay({ data }) {
  const [showChords, setShowChords] = useState(true)

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No guitar tab data available</p>
        <p className="text-sm mt-2">Process a song to generate guitar tabs</p>
      </div>
    )
  }

  const { notes = [], chords = [], tempo, tuning = ['E', 'A', 'D', 'G', 'B', 'e'] } = data

  // Group notes by time for tab display
  const groupedNotes = groupNotesByTime(notes)

  return (
    <div className="p-6 bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Guitar Tablature</h3>
          <p className="text-gray-400 text-sm">
            Standard Tuning: {tuning.join(' ')} | Tempo: {tempo} BPM
          </p>
        </div>
        <button
          onClick={() => setShowChords(!showChords)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showChords
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {showChords ? 'Hide' : 'Show'} Chords
        </button>
      </div>

      {/* Chord Diagrams */}
      {showChords && chords.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-semibold mb-4 text-gray-300">
            Chords Used
          </h4>
          <div className="flex flex-wrap gap-4">
            {getUniqueChords(chords).map((chord, i) => (
              <ChordDiagram key={i} chord={chord} />
            ))}
          </div>
        </div>
      )}

      {/* Tab Display */}
      <div className="guitar-tab font-mono overflow-x-auto">
        {/* Render tab in sections */}
        {renderTabSections(groupedNotes, tuning)}
      </div>

      {/* Individual Notes Reference */}
      {notes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4 text-gray-300">
            Note Sequence
          </h4>
          <div className="flex flex-wrap gap-2">
            {notes.slice(0, 30).map((note, i) => (
              <span
                key={i}
                className="bg-gray-800 px-3 py-1 rounded text-sm"
                title={`String ${note.string_name}, Fret ${note.fret}`}
              >
                {note.note_name}
                <span className="text-gray-500 ml-1">
                  ({note.string_name}:{note.fret})
                </span>
              </span>
            ))}
            {notes.length > 30 && (
              <span className="text-gray-500 px-3 py-1">
                +{notes.length - 30} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reading Guide */}
      <div className="mt-8 pt-6 border-t border-gray-700 text-sm text-gray-400">
        <h4 className="font-semibold mb-2 text-gray-300">How to Read</h4>
        <ul className="space-y-1">
          <li>• Each line represents a guitar string (top = high e, bottom = low E)</li>
          <li>• Numbers indicate which fret to press</li>
          <li>• 0 = open string (no fret pressed)</li>
          <li>• Numbers stacked vertically are played together (chord)</li>
        </ul>
      </div>
    </div>
  )
}

function ChordDiagram({ chord }) {
  const { name, shape = [] } = chord
  const frets = 5
  const strings = 6

  return (
    <div className="chord-diagram bg-gray-800 p-4 rounded-lg">
      <div className="text-center font-bold mb-2 text-green-400">{name}</div>

      <div className="relative" style={{ width: '80px', height: '100px' }}>
        {/* Nut */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300" />

        {/* Frets */}
        {[...Array(frets)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-gray-600"
            style={{ top: `${((i + 1) / frets) * 100}%` }}
          />
        ))}

        {/* Strings */}
        {[...Array(strings)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-500"
            style={{ left: `${(i / (strings - 1)) * 100}%` }}
          />
        ))}

        {/* Finger positions */}
        {shape.map((fret, stringIndex) => {
          if (fret === null || fret === undefined) {
            // X mark for muted string
            return (
              <div
                key={stringIndex}
                className="absolute text-red-400 text-xs font-bold"
                style={{
                  left: `${(stringIndex / (strings - 1)) * 100}%`,
                  top: '-16px',
                  transform: 'translateX(-50%)',
                }}
              >
                ×
              </div>
            )
          }

          if (fret === 0) {
            // O mark for open string
            return (
              <div
                key={stringIndex}
                className="absolute text-green-400 text-xs font-bold"
                style={{
                  left: `${(stringIndex / (strings - 1)) * 100}%`,
                  top: '-16px',
                  transform: 'translateX(-50%)',
                }}
              >
                ○
              </div>
            )
          }

          // Finger dot
          return (
            <div
              key={stringIndex}
              className="absolute w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold"
              style={{
                left: `${(stringIndex / (strings - 1)) * 100}%`,
                top: `${((fret - 0.5) / frets) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {fret}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper functions
function groupNotesByTime(notes, threshold = 0.1) {
  if (!notes.length) return []

  const groups = []
  let currentGroup = [notes[0]]

  for (let i = 1; i < notes.length; i++) {
    if (Math.abs(notes[i].time - currentGroup[0].time) < threshold) {
      currentGroup.push(notes[i])
    } else {
      groups.push(currentGroup)
      currentGroup = [notes[i]]
    }
  }

  if (currentGroup.length) {
    groups.push(currentGroup)
  }

  return groups
}

function getUniqueChords(chords) {
  const seen = new Set()
  return chords.filter((chord) => {
    if (seen.has(chord.name)) return false
    seen.add(chord.name)
    return true
  })
}

function renderTabSections(groupedNotes, tuning) {
  if (!groupedNotes.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No tab data to display
      </div>
    )
  }

  const notesPerLine = 16
  const sections = []

  for (let i = 0; i < groupedNotes.length; i += notesPerLine) {
    const sectionNotes = groupedNotes.slice(i, i + notesPerLine)
    sections.push(
      <div key={i} className="mb-6">
        {renderTabSection(sectionNotes, tuning)}
      </div>
    )
  }

  return sections
}

function renderTabSection(noteGroups, tuning) {
  // Reverse tuning for display (high string at top)
  const displayTuning = [...tuning].reverse()

  // Create string lines
  const lines = displayTuning.map((stringName, displayIndex) => {
    const stringIndex = tuning.length - 1 - displayIndex

    const notePositions = noteGroups.map((group, groupIndex) => {
      const noteOnString = group.find((n) => n.string === stringIndex)
      if (noteOnString) {
        const fret = noteOnString.fret.toString().padStart(2, '-')
        return fret
      }
      return '--'
    })

    return (
      <div key={stringIndex} className="flex items-center">
        <span className="w-6 text-green-400 font-bold">{stringName}</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-300 tracking-widest">
          {notePositions.join('-')}
        </span>
        <span className="text-gray-600">|</span>
      </div>
    )
  })

  return <div className="font-mono text-sm">{lines}</div>
}

export default GuitarTabDisplay
