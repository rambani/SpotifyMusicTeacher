import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessToken) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [accessToken])

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    try {
      const response = await api.get('/api/auth/login')
      window.location.href = response.data.auth_url
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleCallback = (tokens) => {
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    setAccessToken(tokens.access_token)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setAccessToken(null)
    setUser(null)
  }

  const value = {
    user,
    accessToken,
    loading,
    login,
    logout,
    handleCallback,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
