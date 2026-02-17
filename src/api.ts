/**
 * API Client for Teenybase Backend
 * Handles authentication and CRUD operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const API_PORT = 8787
const API_BASE = `http://localhost:${API_PORT}/api/v1`
let requestCounter = 0
const logRequest = (message: string) => console.log(`[API] ${message}`)
const logRequestWarn = (message: string) => console.warn(`[API] ${message}`)
const STORAGE_PREFIX = 'streamswipe'
const storageKey = (key: string) => `${STORAGE_PREFIX}:${key}`

// Token storage (in-memory cache, persisted to AsyncStorage)
let authToken: string | null = null
let refreshToken: string | null = null

export interface User {
  id: string
  username: string
  email: string
  name: string
  avatar: string | null
  role: string
  created: string
  updated: string
}

export interface Couple {
  id: string
  inviter_id: string
  partner_id: string | null
  invite_code: string
  status: string
  created: string
  updated: string
}

export interface Swipe {
  id: string
  user_id: string
  couple_id: string
  tmdb_id: number
  media_type: string
  direction: string
  created: string
}

export interface Match {
  id: string
  couple_id: string
  tmdb_id: number
  media_type: string
  movie_data: MovieData
  watched: boolean
  created: string
  updated: string
}

export interface UserServices {
  id: string
  user_id: string
  services: number[]
  created: string
  updated: string
}

export interface MovieData {
  title: string
  poster_path: string | null
  overview: string
  genres: string[]
  vote_average: number
  release_date: string
  runtime?: number
  providers?: { id: number; name: string; logoUrl: string }[]
}

export interface AuthResponse {
  token: string
  refresh_token: string
  verified?: boolean
  record: User
}

export interface ListResponse<T> {
  items: T[]
  total: number
}

// Token and user storage
export const setTokens = async (token: string | null, refresh: string | null = null, user: User | null = null) => {
  authToken = token
  refreshToken = refresh
  try {
    if (token) {
      await AsyncStorage.setItem(storageKey('auth_token'), token)
      if (refresh) await AsyncStorage.setItem(storageKey('refresh_token'), refresh)
      if (user) await AsyncStorage.setItem(storageKey('auth_user'), JSON.stringify(user))
    } else {
      await AsyncStorage.removeItem(storageKey('auth_token'))
      await AsyncStorage.removeItem(storageKey('refresh_token'))
      await AsyncStorage.removeItem(storageKey('auth_user'))
    }
  } catch (error) {
    console.error('Failed to persist tokens:', error)
  }
}

export const loadTokens = async () => {
  try {
    authToken = await AsyncStorage.getItem(storageKey('auth_token'))
    refreshToken = await AsyncStorage.getItem(storageKey('refresh_token'))
  } catch (error) {
    console.error('Failed to load tokens:', error)
    authToken = null
    refreshToken = null
  }
  return { authToken, refreshToken }
}

export const getAuthToken = () => authToken

export const getStoredUser = async (): Promise<User | null> => {
  try {
    const stored = await AsyncStorage.getItem(storageKey('auth_user'))
    if (!stored) return null
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

// Get current user ID from JWT token
export const getCurrentUserId = (): string | null => {
  if (!authToken) return null
  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]))
    return payload.id || payload.uid || null
  } catch {
    return null
  }
}

// API request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const REQUEST_TIMEOUT_MS = 10000
  const requestId = ++requestCounter
  const method = (options.method ?? 'GET').toUpperCase()
  const url = `${API_BASE}${endpoint}`
  const start = Date.now()
  logRequest(`Request ${requestId} start ${method} ${url}`)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null
  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller?.signal,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logRequestWarn(
      `Request ${requestId} failed ${method} ${url} after ${Date.now() - start}ms: ${message}`
    )
    if (controller && (error as Error).name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  logRequest(
    `Request ${requestId} response ${method} ${url} status=${response.status} duration=${
      Date.now() - start
    }ms`
  )
  let data: any
  try {
    data = await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logRequestWarn(
      `Request ${requestId} failed to parse JSON ${method} ${url} after ${
        Date.now() - start
      }ms: ${message}`
    )
    throw error
  }

  if (!response.ok) {
    // Handle validation errors with field-specific messages
    if (data.data && typeof data.data === 'object') {
      const fieldErrors: string[] = []
      for (const [field, value] of Object.entries(data.data)) {
        if (field !== '_errors' && value && typeof value === 'object' && '_errors' in value) {
          const errors = (value as { _errors: string[] })._errors
          if (errors.length > 0) {
            fieldErrors.push(`${field}: ${errors.join(', ')}`)
          }
        }
      }
      if (fieldErrors.length > 0) {
        throw new Error(fieldErrors.join('; '))
      }
    }
    // Handle issues array (zod-style errors)
    if (data.issues && Array.isArray(data.issues)) {
      const messages = data.issues.map((issue: { path?: string[]; message?: string }) => {
        const path = issue.path?.join('.') || 'field'
        return `${path}: ${issue.message || 'invalid'}`
      })
      if (messages.length > 0) {
        throw new Error(messages.join('; '))
      }
    }
    throw new Error(data.message || data.error || 'API Error')
  }

  return data as T
}

// Auth API
export const auth = {
  async signUp(data: {
    username: string
    email: string
    password: string
    passwordConfirm: string
    name: string
  }): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/table/users/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'guest' }),
    })
    await setTokens(result.token, result.refresh_token, result.record)
    return result
  },

  async login(identity: string, password: string): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/table/users/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ identity, password }),
    })
    await setTokens(result.token, result.refresh_token, result.record)
    return result
  },

  async logout(): Promise<void> {
    try {
      await request('/table/users/auth/logout', { method: 'POST' })
    } finally {
      await setTokens(null)
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    if (!refreshToken) throw new Error('No refresh token')
    const result = await request<AuthResponse>('/table/users/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    await setTokens(result.token, result.refresh_token)
    return result
  },

  async getCurrentUser(): Promise<User | null> {
    if (!authToken) return null
    try {
      // Decode JWT to get user ID (basic decode, not verification)
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      const userId = payload.id || payload.uid
      if (!userId) return null
      return await request<User>(`/table/users/view/${userId}`)
    } catch {
      return null
    }
  },
}

// Export default API object
export const api = {
  auth,
  request,
}

export default api
