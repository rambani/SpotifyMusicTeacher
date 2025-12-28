import React from 'react'
import { Link } from 'react-router-dom'
import { Music, Guitar, Piano } from 'lucide-react'

function Header() {
  return (
    <header className="bg-spotify-black border-b border-spotify-gray">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-spotify-green p-2 rounded-full">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Spotify Music Teacher</h1>
              <p className="text-xs text-spotify-light">Learn any song</p>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/?instrument=guitar"
              className="flex items-center gap-2 text-spotify-light hover:text-white transition-colors"
            >
              <Guitar className="w-5 h-5" />
              <span className="hidden sm:inline">Guitar</span>
            </Link>
            <Link
              to="/?instrument=piano"
              className="flex items-center gap-2 text-spotify-light hover:text-white transition-colors"
            >
              <Piano className="w-5 h-5" />
              <span className="hidden sm:inline">Piano</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
