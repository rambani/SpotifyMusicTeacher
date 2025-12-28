import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Music, Headphones, RefreshCw, Zap, ArrowRight } from 'lucide-react'

function LandingPage() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  const features = [
    {
      icon: <Headphones className="w-8 h-8" />,
      title: 'Combine Podcasts',
      description: 'Create playlists from multiple podcast shows you love'
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: 'Auto-Refresh',
      description: 'Your playlist updates automatically with new episodes'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Stay Current',
      description: 'Never miss an episode from your favorite shows'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Music className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Smart Podcast
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
              Playlists
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Combine your favorite podcasts into one playlist that automatically
            updates with the latest episodes. Never miss a moment.
          </p>

          {/* CTA Button */}
          <button
            onClick={login}
            className="group inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect with Spotify
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-gray-500 text-sm mt-4">
            Free to use • No credit card required
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 h-full transition-all duration-300 hover:border-green-500/50 hover:bg-gray-800">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Built with Spotify Web API</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
