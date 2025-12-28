import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import TrackPage from './pages/TrackPage'

function App() {
  return (
    <div className="min-h-screen bg-spotify-dark">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/track/:trackId" element={<TrackPage />} />
        </Routes>
      </main>
      <footer className="text-center py-6 text-spotify-light text-sm">
        <p>Spotify Music Teacher - Learn any song with AI-generated guides</p>
        <p className="mt-2 text-xs opacity-60">
          Powered by Demucs, Basic-Pitch, and VexFlow
        </p>
      </footer>
    </div>
  )
}

export default App
