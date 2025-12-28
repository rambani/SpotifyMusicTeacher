import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Music, Loader2 } from 'lucide-react'
import TrackCard from '../components/TrackCard'
import { searchTracks } from '../utils/api'

function HomePage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const instrument = searchParams.get('instrument') || 'piano'

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const result = await searchTracks(query)
      setTracks(result.tracks || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search tracks. Please try again.')
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  // Load demo tracks on mount
  useEffect(() => {
    const loadDemoTracks = async () => {
      try {
        const result = await searchTracks('demo')
        setTracks(result.tracks || [])
      } catch (err) {
        console.error('Failed to load demo tracks:', err)
      }
    }
    loadDemoTracks()
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Learn to Play <span className="text-spotify-green">Any Song</span>
        </h1>
        <p className="text-xl text-spotify-light max-w-2xl mx-auto">
          Search for your favorite songs on Spotify, and we'll generate
          sheet music, guitar tabs, and piano guides to help you learn.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song or artist..."
            className="w-full px-6 py-4 pl-14 bg-spotify-gray text-white rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-spotify-green placeholder-spotify-light"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-spotify-light" />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-spotify-green text-white px-6 py-2 rounded-full font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {tracks.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {hasSearched ? 'Search Results' : 'Demo Songs'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                instrument={instrument}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {hasSearched && tracks.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Music className="w-16 h-16 mx-auto mb-4 text-spotify-gray" />
          <p className="text-xl text-spotify-light">No tracks found</p>
          <p className="text-spotify-light mt-2">Try a different search term</p>
        </div>
      )}

      {/* Features Section */}
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <FeatureCard
          title="Sheet Music"
          description="Get traditional notation for any song, perfect for reading music"
          icon="music"
        />
        <FeatureCard
          title="Guitar Tabs"
          description="Easy-to-read tablature showing exactly where to place your fingers"
          icon="guitar"
        />
        <FeatureCard
          title="Piano Guide"
          description="Visual piano roll with hand positions and finger suggestions"
          icon="piano"
        />
      </div>
    </div>
  )
}

function FeatureCard({ title, description, icon }) {
  const icons = {
    music: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    guitar: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    piano: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  }

  return (
    <div className="bg-spotify-gray p-6 rounded-xl text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-spotify-green/20 rounded-full mb-4 text-spotify-green">
        {icons[icon]}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-spotify-light">{description}</p>
    </div>
  )
}

export default HomePage
