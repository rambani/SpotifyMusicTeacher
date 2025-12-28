import React, { useEffect, useRef, useState } from 'react'
import { Vex } from 'vexflow'

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow

function SheetMusicDisplay({ data }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || !data?.measures?.length) return

    try {
      // Clear previous content
      containerRef.current.innerHTML = ''

      const width = containerRef.current.clientWidth || 800
      const measureWidth = 200
      const measuresPerLine = Math.floor(width / measureWidth) || 4
      const staveHeight = 120
      const margin = 40

      // Create renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)

      // Calculate total height needed
      const numLines = Math.ceil(data.measures.length / measuresPerLine)
      const totalHeight = numLines * staveHeight + margin * 2

      renderer.resize(width, totalHeight)
      const context = renderer.getContext()
      context.setFont('Arial', 10)

      // Draw measures
      data.measures.forEach((measure, measureIndex) => {
        const lineIndex = Math.floor(measureIndex / measuresPerLine)
        const posInLine = measureIndex % measuresPerLine

        const x = margin + posInLine * measureWidth
        const y = margin + lineIndex * staveHeight

        // Create stave
        const stave = new Stave(x, y, measureWidth - 10)

        // Add clef and time signature to first measure of each line
        if (posInLine === 0) {
          stave.addClef('treble')
          if (lineIndex === 0) {
            stave.addTimeSignature(data.metadata?.time_signature || '4/4')
          }
        }

        stave.setContext(context).draw()

        // Create notes
        if (measure.notes && measure.notes.length > 0) {
          const staveNotes = measure.notes.map((note) => {
            if (note.is_rest) {
              return new StaveNote({
                keys: ['b/4'],
                duration: note.duration + 'r',
              })
            }

            const staveNote = new StaveNote({
              keys: note.keys,
              duration: note.duration,
            })

            // Add accidentals
            note.keys.forEach((key, keyIndex) => {
              if (key.includes('#')) {
                staveNote.addModifier(new Accidental('#'), keyIndex)
              } else if (key.includes('b') && key.length > 2) {
                staveNote.addModifier(new Accidental('b'), keyIndex)
              }
            })

            return staveNote
          })

          // Create voice and add notes
          const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false)
          voice.addTickables(staveNotes)

          // Format and draw
          new Formatter().joinVoices([voice]).format([voice], measureWidth - 60)
          voice.draw(context, stave)
        }
      })
    } catch (err) {
      console.error('VexFlow rendering error:', err)
      setError('Failed to render sheet music')
    }
  }, [data])

  if (!data?.measures?.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No sheet music data available</p>
        <p className="text-sm mt-2">Process a song to generate sheet music</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="sheet-music-container p-4">
      {/* Metadata */}
      <div className="mb-4 text-gray-600 text-sm flex gap-4">
        <span>Tempo: {data.metadata?.tempo} BPM</span>
        <span>Time: {data.metadata?.time_signature}</span>
        <span>Key: {data.metadata?.key}</span>
        <span>{data.metadata?.total_notes} notes</span>
      </div>

      {/* VexFlow container */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
        style={{ minHeight: '200px' }}
      />

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <div className="flex flex-wrap gap-4">
          <span>w = whole note</span>
          <span>h = half note</span>
          <span>q = quarter note</span>
          <span>8 = eighth note</span>
          <span>16 = sixteenth note</span>
        </div>
      </div>
    </div>
  )
}

export default SheetMusicDisplay
