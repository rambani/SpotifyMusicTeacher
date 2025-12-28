import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Music,
  Guitar,
  Piano,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react'
import {
  getTrack,
  startProcessing,
  getProcessingStatus,
  getSheetMusic,
  pollProcessingStatus,
} from '../utils/api'
import SheetMusicDisplay from '../components/SheetMusicDisplay'
import GuitarTabDisplay from '../components/GuitarTabDisplay'
import PianoGuideDisplay from '../components/PianoGuideDisplay'

function TrackPage() {
  const { trackId } = useParams()
  const [searchParams] = useSearchParams()
  const instrument = searchParams.get('instrument') || 'piano'

  const [track, setTrack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState(null)

  const [sheetMusic, setSheetMusic] = useState(null)
  const [selectedView, setSelectedView] = useState('simplified')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [tipsExpanded, setTipsExpanded] = useState(true)

  // Load track data
  useEffect(() => {
    const loadTrack = async () => {
      try {
        setLoading(true)
        const data = await getTrack(trackId)
        setTrack(data)
      } catch (err) {
        console.error('Failed to load track:', err)
        setError('Failed to load track information')
      } finally {
        setLoading(false)
      }
    }

    loadTrack()
  }, [trackId])

  // Handle processing
  const handleProcess = async () => {
    try {
      setProcessing(true)
      setError(null)

      // Start processing
      await startProcessing(trackId, true)

      // Poll for status
      const cancel = pollProcessingStatus(trackId, (status) => {
        setProcessingStatus(status)

        if (status.status === 'completed') {
          loadSheetMusic()
          setProcessing(false)
        } else if (status.status === 'failed') {
          setError(status.message || 'Processing failed')
          setProcessing(false)
        }
      })

      // Cleanup on unmount
      return () => cancel()
    } catch (err) {
      console.error('Processing error:', err)
      setError('Failed to start processing')
      setProcessing(false)
    }
  }

  // Load sheet music
  const loadSheetMusic = useCallback(async () => {
    try {
      const data = await getSheetMusic(trackId, instrument, skillLevel)
      setSheetMusic(data)
    } catch (err) {
      console.error('Failed to load sheet music:', err)
      // Try loading anyway (might have demo data)
      try {
        const data = await getSheetMusic(trackId, instrument, skillLevel)
        setSheetMusic(data)
      } catch {
        setError('Failed to generate sheet music')
      }
    }
  }, [trackId, instrument, skillLevel])

  // Load sheet music on mount or when skill level changes
  useEffect(() => {
    if (!loading) {
      loadSheetMusic()
    }
  }, [loading, skillLevel, loadSheetMusic])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-spotify-green animate-spin" />
      </div>
    )
  }

  if (error && !track) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-red-400 text-xl mb-4">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-spotify-green hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to search
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-spotify-light hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to search
      </Link>

      {/* Track Info */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="w-48 h-48 flex-shrink-0">
          {track?.track?.album?.image_url ? (
            <img
              src={track.track.album.image_url}
              alt={track.track.album.name}
              className="w-full h-full rounded-lg shadow-2xl"
            />
          ) : (
            <div className="w-full h-full bg-spotify-gray rounded-lg flex items-center justify-center">
              <Music className="w-16 h-16 text-spotify-light" />
            </div>
          )}
        </div>

        <div className="flex-grow">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {track?.track?.name}
          </h1>
          <p className="text-xl text-spotify-light mb-4">
            {track?.track?.artist_names}
          </p>

          {/* Audio Features */}
          {track?.audio_features && (
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="bg-spotify-gray px-3 py-1 rounded-full">
                Tempo: {Math.round(track.audio_features.tempo)} BPM
              </span>
              <span className="bg-spotify-gray px-3 py-1 rounded-full">
                Key: {getKeyName(track.audio_features.key, track.audio_features.mode)}
              </span>
              <span className="bg-spotify-gray px-3 py-1 rounded-full">
                Time: {track.audio_features.time_signature}/4
              </span>
            </div>
          )}

          {/* Processing button */}
          <div className="mt-6">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="bg-spotify-green text-white px-6 py-3 rounded-full font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing... {processingStatus?.progress || 0}%
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Analyze Song
                </>
              )}
            </button>
            {processingStatus?.message && (
              <p className="text-sm text-spotify-light mt-2">
                {processingStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* View selector */}
        <div className="flex bg-spotify-gray rounded-lg overflow-hidden">
          <ViewButton
            active={selectedView === 'simplified'}
            onClick={() => setSelectedView('simplified')}
            icon={<Lightbulb className="w-4 h-4" />}
            label="Guide"
          />
          <ViewButton
            active={selectedView === 'sheet'}
            onClick={() => setSelectedView('sheet')}
            icon={<Music className="w-4 h-4" />}
            label="Sheet"
          />
          <ViewButton
            active={selectedView === 'guitar'}
            onClick={() => setSelectedView('guitar')}
            icon={<Guitar className="w-4 h-4" />}
            label="Tab"
          />
          <ViewButton
            active={selectedView === 'piano'}
            onClick={() => setSelectedView('piano')}
            icon={<Piano className="w-4 h-4" />}
            label="Piano"
          />
        </div>

        {/* Skill level selector */}
        <select
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value)}
          className="bg-spotify-gray text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotify-green"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Sheet Music Display */}
      {sheetMusic ? (
        <div className="space-y-6">
          {/* Learning Tips */}
          {sheetMusic.simplified_guide?.tips && (
            <div className="bg-spotify-gray rounded-lg overflow-hidden">
              <button
                onClick={() => setTipsExpanded(!tipsExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-spotify-gray/80 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Lightbulb className="w-5 h-5 text-spotify-green" />
                  Learning Tips
                </span>
                {tipsExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {tipsExpanded && (
                <div className="px-6 pb-4">
                  <ul className="space-y-2">
                    {sheetMusic.simplified_guide.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-spotify-light">
                        <span className="text-spotify-green">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Difficulty */}
          {sheetMusic.piano_guide?.difficulty_score && (
            <div className="bg-spotify-gray rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-spotify-light">Difficulty:</span>
                <span className="font-semibold">
                  {sheetMusic.piano_guide.difficulty_score.level}
                  <span className="text-spotify-light ml-2">
                    ({sheetMusic.piano_guide.difficulty_score.score}/10)
                  </span>
                </span>
              </div>
              {sheetMusic.piano_guide.difficulty_score.factors?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {sheetMusic.piano_guide.difficulty_score.factors.map((factor, i) => (
                    <span key={i} className="text-xs bg-spotify-black px-2 py-1 rounded">
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main content based on view */}
          <div className="bg-white rounded-lg overflow-hidden">
            {selectedView === 'sheet' && (
              <SheetMusicDisplay data={sheetMusic.sheet_music} />
            )}
            {selectedView === 'guitar' && (
              <GuitarTabDisplay data={sheetMusic.guitar_tab} />
            )}
            {selectedView === 'piano' && (
              <PianoGuideDisplay data={sheetMusic.piano_guide} />
            )}
            {selectedView === 'simplified' && (
              <SimplifiedGuide data={sheetMusic.simplified_guide} />
            )}
          </div>

          {/* Practice Sections */}
          {sheetMusic.simplified_guide?.practice_sections?.length > 0 && (
            <div className="bg-spotify-gray rounded-lg p-6">
              <h3 className="font-semibold mb-4">Practice Sections</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sheetMusic.simplified_guide.practice_sections.map((section, i) => (
                  <div
                    key={i}
                    className="bg-spotify-black p-4 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Section {i + 1}</span>
                      <span className="text-xs text-spotify-light">
                        {section.note_count} notes
                      </span>
                    </div>
                    <div className="text-sm text-spotify-light">
                      {formatTime(section.start_time)} - {formatTime(section.end_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-spotify-gray rounded-lg p-12 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-spotify-light" />
          <p className="text-xl text-spotify-light mb-4">
            Click "Analyze Song" to generate sheet music and learning guides
          </p>
          <p className="text-sm text-spotify-light">
            Or explore the demo content below
          </p>
        </div>
      )}
    </div>
  )
}

function ViewButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-2 transition-colors ${
        active
          ? 'bg-spotify-green text-white'
          : 'text-spotify-light hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function SimplifiedGuide({ data }) {
  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        No guide data available
      </div>
    )
  }

  return (
    <div className="p-6 text-gray-800">
      <h3 className="text-xl font-bold mb-4">
        {data.instrument} Guide - {data.skill_level}
      </h3>

      <div className="mb-6">
        <p className="text-gray-600">
          Tempo: {Math.round(data.tempo)} BPM
          {data.skill_level === 'beginner' && ' (slowed down for practice)'}
        </p>
      </div>

      {/* Content based on guide type */}
      {data.guide_type === 'tab' && data.content?.chords?.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Chord Progression</h4>
          <div className="flex flex-wrap gap-3">
            {data.content.chords.slice(0, 12).map((chord, i) => (
              <div
                key={i}
                className="bg-gray-100 px-4 py-2 rounded-lg text-center"
              >
                <div className="font-bold text-lg">{chord.name}</div>
                <div className="text-xs text-gray-500">
                  {formatTime(chord.time)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.guide_type === 'piano' && data.content?.chord_progression?.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Chord Progression</h4>
          <div className="flex flex-wrap gap-3">
            {data.content.chord_progression.slice(0, 12).map((chord, i) => (
              <div
                key={i}
                className="bg-gray-100 px-4 py-2 rounded-lg text-center"
              >
                <div className="font-bold text-lg">{chord.name}</div>
                <div className="text-xs text-gray-500">
                  {chord.notes.slice(0, 4).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note preview */}
      {data.content?.notes?.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">First Notes to Learn</h4>
          <div className="flex flex-wrap gap-2">
            {data.content.notes.slice(0, 20).map((note, i) => (
              <span
                key={i}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
              >
                {note.note_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getKeyName(key, mode) {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const modeName = mode === 1 ? 'Major' : 'Minor'
  return `${keys[key] || 'C'} ${modeName}`
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default TrackPage
