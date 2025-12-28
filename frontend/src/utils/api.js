import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth header to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const response = await axios.post('/api/auth/refresh', null, {
            params: { refresh_token: refreshToken }
          })
          localStorage.setItem('access_token', response.data.access_token)
          error.config.headers.Authorization = `Bearer ${response.data.access_token}`
          return axios(error.config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Podcast API functions
export const searchPodcasts = async (query, limit = 20) => {
  const response = await api.get('/api/podcasts/search', {
    params: { q: query, limit }
  })
  return response.data.shows || []
}

export const getSavedPodcasts = async () => {
  const response = await api.get('/api/podcasts/saved')
  return response.data.shows || []
}

export const getPodcast = async (showId) => {
  const response = await api.get(`/api/podcasts/${showId}`)
  return response.data
}

export const getPodcastEpisodes = async (showId, limit = 10) => {
  const response = await api.get(`/api/podcasts/${showId}/episodes`, {
    params: { limit }
  })
  return response.data
}

// Playlist API functions
export const getPlaylists = async () => {
  const response = await api.get('/api/playlists')
  return response.data
}

export const createSmartPlaylist = async (data) => {
  const response = await api.post('/api/playlists/smart', data)
  return response.data
}

export const getSmartPlaylists = async () => {
  const response = await api.get('/api/playlists/smart')
  return response.data.playlists || []
}

export const refreshPlaylist = async (playlistId) => {
  const response = await api.post(`/api/playlists/${playlistId}/refresh`)
  return response.data
}

export const getPlaylistItems = async (playlistId) => {
  const response = await api.get(`/api/playlists/${playlistId}/items`)
  return response.data
}
