import axios from 'axios'

const api = axios.create({
  // Empty baseURL = same origin. In dev the Vite proxy forwards /api → Django.
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Plan a trip.
 * @param {{ current_location: string, pickup_location: string, dropoff_location: string, current_cycle_used: number }} tripData
 */
export async function planTrip(tripData) {
  const response = await api.post('/api/trips/plan/', tripData)
  return response.data
}

/**
 * Search known locations for dropdown suggestions.
 * @param {string} query
 * @param {number} [limit=8]
 */
export async function searchLocations(query, limit = 8) {
  const response = await api.get('/api/trips/locations/', {
    params: { q: query, limit },
  })
  return response.data?.results ?? []
}
