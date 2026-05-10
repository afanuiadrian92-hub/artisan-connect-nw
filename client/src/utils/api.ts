import axios from 'axios'

// Single axios instance used by every page
// Base URL switches automatically between local dev and production
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Attach JWT to every outgoing request automatically
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('trustlink_user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`
      }
    }
  } catch {
    // Corrupted localStorage — ignore
  }
  return config
})

// Handle expired or invalid tokens globally
// Instead of every page checking for 401 individually
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('trustlink_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api