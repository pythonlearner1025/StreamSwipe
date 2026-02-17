/**
 * TMDB API Service
 * Handles all movie/TV data fetching from The Movie Database
 */

import { TMDB_API_KEY } from '../config'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

export interface StreamingService {
  id: number
  name: string
  icon: string // MaterialCommunityIcons name
}

export const STREAMING_SERVICES: StreamingService[] = [
  { id: 8, name: 'Netflix', icon: 'netflix' },
  { id: 9, name: 'Prime Video', icon: 'amazon' },
  { id: 15, name: 'Hulu', icon: 'hulu' },
  { id: 337, name: 'Disney+', icon: 'play-circle' },
  { id: 384, name: 'Max', icon: 'play-box' },
  { id: 350, name: 'Apple TV+', icon: 'apple' },
  { id: 386, name: 'Paramount+', icon: 'star-circle' },
  { id: 387, name: 'Peacock', icon: 'bird' },
]

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  genre_ids: number[]
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
}

export interface TMDBMovieDetails {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  genres: { id: number; name: string }[]
  release_date: string
  vote_average: number
  runtime: number
  'watch/providers'?: {
    results?: {
      US?: {
        flatrate?: { provider_id: number; provider_name: string; logo_path: string }[]
      }
    }
  }
}

export interface TMDBDiscoverResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export interface MovieWithProviders {
  id: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  genres: string[]
  releaseYear: string
  rating: number
  providers: { id: number; name: string; logoUrl: string }[]
}

// Genre ID -> name mapping (TMDB standard)
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const allParams = { api_key: TMDB_API_KEY, ...params }
  const qs = Object.entries(allParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const url = `${TMDB_BASE}${endpoint}?${qs}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null
  return `${IMG_BASE}/${size}${path}`
}

export function getProviderLogoUrl(path: string): string {
  return `${IMG_BASE}/w92${path}`
}

export async function discoverMovies(providerIds: number[], page: number = 1): Promise<TMDBDiscoverResponse> {
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    page: String(page),
    watch_region: 'US',
    'vote_count.gte': '50',
  }
  if (providerIds.length > 0) {
    params.with_watch_providers = providerIds.join('|')
    params.with_watch_monetization_types = 'flatrate'
  }
  return tmdbFetch<TMDBDiscoverResponse>('/discover/movie', params)
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: 'watch/providers',
  })
}

// In-memory cache for movie details
const detailsCache = new Map<number, MovieWithProviders>()

export async function getMovieWithProviders(movie: TMDBMovie): Promise<MovieWithProviders> {
  const cached = detailsCache.get(movie.id)
  if (cached) return cached

  try {
    const details = await getMovieDetails(movie.id)
    const usProviders = details['watch/providers']?.results?.US?.flatrate || []

    const result: MovieWithProviders = {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterUrl: getImageUrl(movie.poster_path, 'w500'),
      backdropUrl: getImageUrl(movie.backdrop_path, 'w780'),
      genres: movie.genre_ids.map(id => GENRE_MAP[id] || 'Other').slice(0, 3),
      releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : '',
      rating: Math.round(movie.vote_average * 10) / 10,
      providers: usProviders.map(p => ({
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: getProviderLogoUrl(p.logo_path),
      })),
    }

    detailsCache.set(movie.id, result)
    return result
  } catch {
    // Fallback without provider details
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterUrl: getImageUrl(movie.poster_path, 'w500'),
      backdropUrl: getImageUrl(movie.backdrop_path, 'w780'),
      genres: movie.genre_ids.map(id => GENRE_MAP[id] || 'Other').slice(0, 3),
      releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : '',
      rating: Math.round(movie.vote_average * 10) / 10,
      providers: [],
    }
  }
}

export function getServiceById(id: number): StreamingService | undefined {
  return STREAMING_SERVICES.find(s => s.id === id)
}
