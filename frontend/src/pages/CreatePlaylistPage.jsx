import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { searchPodcasts, getSavedPodcasts, createSmartPlaylist } from '../utils/api'
import { Search, X, Plus, Check, ArrowLeft, Loader2, Headphones } from 'lucide-react'

function CreatePlaylistPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [playlistName, setPlaylistName] = useState('')
  const [selectedPodcasts, setSelectedPodcasts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [savedPodcasts, setSavedPodcasts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [episodesPerShow, setEpisodesPerShow] = useState(3)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedPodcasts()
    }
  }, [isAuthenticated])

  const loadSavedPodcasts = async () => {
    setLoading(true)
    try {
      const data = await getSavedPodcasts()
      setSavedPodcasts(data)
    } catch (error) {
      console.error('Failed to load saved podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const data = await searchPodcasts(searchQuery)
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const togglePodcast = (podcast) => {
    const isSelected = selectedPodcasts.some(p => p.id === podcast.id)
    if (isSelected) {
      setSelectedPodcasts(selectedPodcasts.filter(p => p.id !== podcast.id))
    } else {
      setSelectedPodcasts([...selectedPodcasts, podcast])
    }
  }

  const handleCreate = async () => {
    if (!playlistName.trim() || selectedPodcasts.length === 0) return

    setCreating(true)
    try {
      await createSmartPlaylist({
        name: playlistName,
        show_ids: selectedPodcasts.map(p => p.id),
        episodes_per_show: episodesPerShow
      })
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to create playlist:', error)
      alert('Failed to create playlist. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <StepIndicator number={1} title="Select Podcasts" active={step === 1} completed={step > 1} />
        <div className="flex-1 h-px bg-gray-700"></div>
        <StepIndicator number={2} title="Name & Create" active={step === 2} completed={false} />
      </div>

      {/* Step 1: Select Podcasts */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Select Podcasts</h1>
            <p className="text-gray-400">Choose the podcasts you want to combine into a single playlist</p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for podcasts..."
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </form>

          {/* Selected Podcasts */}
          {selectedPodcasts.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-green-400 mb-3">
                Selected ({selectedPodcasts.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedPodcasts.map(podcast => (
                  <button
                    key={podcast.id}
                    onClick={() => togglePodcast(podcast)}
                    className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm hover:bg-green-500/30 transition-colors"
                  >
                    {podcast.name}
                    <X className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map(podcast => (
                  <PodcastItem
                    key={podcast.id}
                    podcast={podcast}
                    selected={selectedPodcasts.some(p => p.id === podcast.id)}
                    onToggle={() => togglePodcast(podcast)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saved Podcasts */}
          {searchResults.length === 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Your Followed Podcasts</h3>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
              ) : savedPodcasts.length === 0 ? (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
                  <Headphones className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No followed podcasts found. Use search to find podcasts!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPodcasts.map(podcast => (
                    <PodcastItem
                      key={podcast.id}
                      podcast={podcast}
                      selected={selectedPodcasts.some(p => p.id === podcast.id)}
                      onToggle={() => togglePodcast(podcast)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={selectedPodcasts.length === 0}
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Continue
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Name & Create */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Name Your Playlist</h1>
            <p className="text-gray-400">Give your smart playlist a name and configure settings</p>
          </div>

          {/* Playlist Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="My Podcast Mix"
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Episodes per show */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Latest episodes per podcast
            </label>
            <select
              value={episodesPerShow}
              onChange={(e) => setEpisodesPerShow(Number(e.target.value))}
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value={1}>1 episode</option>
              <option value={2}>2 episodes</option>
              <option value={3}>3 episodes</option>
              <option value={5}>5 episodes</option>
              <option value={10}>10 episodes</option>
            </select>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Podcasts</span>
                <span className="text-white">{selectedPodcasts.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Episodes per podcast</span>
                <span className="text-white">{episodesPerShow}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total episodes</span>
                <span className="text-white font-medium">{selectedPodcasts.length * episodesPerShow}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Your playlist will automatically update with the latest episodes from each podcast.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleCreate}
              disabled={!playlistName.trim() || creating}
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-colors"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Playlist
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StepIndicator({ number, title, active, completed }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        completed ? 'bg-green-500 text-black' :
        active ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'
      }`}>
        {completed ? <Check className="w-4 h-4" /> : number}
      </div>
      <span className={`text-sm font-medium ${active || completed ? 'text-white' : 'text-gray-500'}`}>
        {title}
      </span>
    </div>
  )
}

function PodcastItem({ podcast, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all ${
        selected
          ? 'bg-green-500/10 border-green-500/50'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
      }`}
    >
      {/* Image */}
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
        {podcast.image_url ? (
          <img src={podcast.image_url} alt={podcast.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Headphones className="w-6 h-6 text-gray-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <h4 className="text-white font-medium truncate">{podcast.name}</h4>
        <p className="text-sm text-gray-400 truncate">{podcast.publisher}</p>
      </div>

      {/* Selection indicator */}
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'bg-green-500 border-green-500' : 'border-gray-600'
      }`}>
        {selected && <Check className="w-4 h-4 text-black" />}
      </div>
    </button>
  )
}

export default CreatePlaylistPage
