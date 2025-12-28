import React from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, Music2 } from 'lucide-react'

function TrackCard({ track, instrument }) {
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Link
      to={`/track/${track.id}?instrument=${instrument}`}
      className="group block bg-spotify-gray rounded-lg overflow-hidden hover:bg-spotify-gray/80 transition-all duration-300 hover:shadow-xl hover:shadow-spotify-green/10"
    >
      <div className="relative aspect-square">
        {track.album?.image_url ? (
          <img
            src={track.album.image_url}
            alt={track.album.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-spotify-black flex items-center justify-center">
            <Music2 className="w-16 h-16 text-spotify-gray" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-spotify-green rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform shadow-lg">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white truncate group-hover:text-spotify-green transition-colors">
          {track.name}
        </h3>
        <p className="text-sm text-spotify-light truncate mt-1">
          {track.artist_names}
        </p>

        <div className="flex items-center justify-between mt-3 text-xs text-spotify-light">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(track.duration_ms)}
          </span>
          {track.popularity && (
            <span className="bg-spotify-black px-2 py-1 rounded">
              {track.popularity}% popular
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default TrackCard
