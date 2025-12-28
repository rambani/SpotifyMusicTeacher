import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60 seconds for audio processing
  headers: {
    'Content-Type': 'application/json',
  },
})

// API functions
export const searchTracks = async (query, limit = 20) => {
  const response = await api.get('/search', {
    params: { q: query, limit },
  })
  return response.data
}

export const getTrack = async (trackId) => {
  const response = await api.get(`/tracks/${trackId}`)
  return response.data
}

export const startProcessing = async (trackId, usePreview = true) => {
  const response = await api.post(`/process/${trackId}`, null, {
    params: { use_preview: usePreview },
  })
  return response.data
}

export const getProcessingStatus = async (trackId) => {
  const response = await api.get(`/process/${trackId}/status`)
  return response.data
}

export const getSheetMusic = async (trackId, instrument = 'piano', skillLevel = 'beginner') => {
  const response = await api.get(`/sheet-music/${trackId}`, {
    params: { instrument, skill_level: skillLevel },
  })
  return response.data
}

export const getStems = async (trackId) => {
  const response = await api.get(`/stems/${trackId}`)
  return response.data
}

// Polling helper for processing status
export const pollProcessingStatus = (trackId, onProgress, interval = 1000) => {
  let isPolling = true

  const poll = async () => {
    while (isPolling) {
      try {
        const status = await getProcessingStatus(trackId)
        onProgress(status)

        if (status.status === 'completed' || status.status === 'failed') {
          isPolling = false
          break
        }
      } catch (error) {
        console.error('Polling error:', error)
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  poll()

  // Return cancel function
  return () => {
    isPolling = false
  }
}

export default api
