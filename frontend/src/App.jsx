import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import CreatePlaylistPage from './pages/CreatePlaylistPage'
import CallbackPage from './pages/CallbackPage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create" element={<CreatePlaylistPage />} />
            <Route path="/callback" element={<CallbackPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App
