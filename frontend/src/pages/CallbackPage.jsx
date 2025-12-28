import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleCallback } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    // Backend redirects here with tokens after exchanging the code with Spotify
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('Authorization was denied. Please try again.')
      return
    }

    if (accessToken && refreshToken) {
      // Store tokens and redirect to dashboard
      handleCallback({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      navigate('/dashboard')
    } else {
      setError('Authentication failed. No tokens received.')
    }
  }, [searchParams, handleCallback, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-full transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Connecting to Spotify...</p>
      </div>
    </div>
  )
}

export default CallbackPage
