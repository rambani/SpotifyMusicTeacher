import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSmartPlaylists, refreshPlaylist } from '../utils/api'
import { Plus, RefreshCw, Music, ExternalLink, Clock, Loader2 } from 'lucide-react'

function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists()
    }
  }, [isAuthenticated])

  const loadPlaylists = async () => {
    try {
      const data = await getSmartPlaylists()
      setPlaylists(data)
    } catch (error) {
      console.error('Failed to load playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (playlistId) => {
    setRefreshing(playlistId)
    try {
      await refreshPlaylist(playlistId)
      await loadPlaylists()
    } catch (error) {
      console.error('Failed to refresh playlist:', error)
    } finally {
      setRefreshing(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your smart podcast playlists
          </p>
        </div>

        <button
          onClick={() => navigate('/create')}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No playlists yet</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first smart playlist by combining your favorite podcasts into one auto-updating feed.
          </p>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onRefresh={handleRefresh}
              isRefreshing={refreshing === playlist.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlaylistCard({ playlist, onRefresh, isRefreshing }) {
  const podcastCount = playlist.config?.show_ids?.length || 0

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-gray-600/50 transition-all duration-200 group">
      {/* Cover Image */}
      <div className="aspect-video bg-gradient-to-br from-green-500/20 to-purple-500/20 relative overflow-hidden">
        {playlist.image_url ? (
          <img
            src={playlist.image_url}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Refresh overlay */}
        <button
          onClick={() => onRefresh(playlist.id)}
          disabled={isRefreshing}
          className="absolute top-3 right-3 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">
          {playlist.name}
        </h3>

        <p className="text-sm text-gray-400 mb-4">
          {podcastCount} podcast{podcastCount !== 1 ? 's' : ''} • {playlist.tracks_total || 0} episodes
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Auto-refreshes daily</span>
          </div>

          {playlist.uri && (
            <a
              href={`https://open.spotify.com/playlist/${playlist.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
