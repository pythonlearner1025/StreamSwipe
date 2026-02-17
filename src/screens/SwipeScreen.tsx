import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity, Platform,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { useCouple } from '../context/CoupleContext'
import { useStreamingServices } from '../context/StreamingServicesContext'
import { Loading, EmptyState } from '../components/ui'
import { SwipeCard } from '../components/SwipeCard'
import { MatchModal } from '../components/MatchModal'
import { discoverMovies, getMovieWithProviders, MovieWithProviders } from '../services/tmdb'
import { api, Swipe, ListResponse, Match, getCurrentUserId } from '../api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25

interface SwipeScreenProps {
  onNavigateToMatches: () => void
}

export function SwipeScreen({ onNavigateToMatches }: SwipeScreenProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)
  const { couple, isLinked, partnerUserId } = useCouple()
  const { sharedServices, myServices, isLoading: servicesLoading } = useStreamingServices()

  const [movies, setMovies] = useState<MovieWithProviders[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingMovies, setIsLoadingMovies] = useState(true)
  const [swipedIds, setSwipedIds] = useState<Set<number>>(new Set())
  const [matchMovie, setMatchMovie] = useState<MovieWithProviders | null>(null)
  const [error, setError] = useState('')

  const position = useRef(new Animated.ValueXY()).current
  const isAnimating = useRef(false)
  const swipedIdsRef = useRef(swipedIds)
  swipedIdsRef.current = swipedIds

  const activeServices = sharedServices.length > 0 ? sharedServices : myServices

  // Load already-swiped IDs
  useEffect(() => {
    const userId = getCurrentUserId()
    if (!userId) return

    api.request<ListResponse<Swipe>>(
      `/table/swipes/list?where=${encodeURIComponent(`user_id = '${userId}'`)}&limit=500&fields=tmdb_id`
    ).then(result => {
      setSwipedIds(new Set(result.items.map(s => s.tmdb_id)))
    }).catch(() => {})
  }, [])

  // Load movies
  const loadMovies = useCallback(async (pageNum: number, append: boolean = false) => {
    if (activeServices.length === 0) {
      setIsLoadingMovies(false)
      return
    }

    try {
      setError('')
      const result = await discoverMovies(activeServices, pageNum)
      setTotalPages(result.total_pages)

      // Fetch provider details for each movie + filter already swiped
      const moviesWithProviders: MovieWithProviders[] = []
      for (const movie of result.results) {
        if (swipedIdsRef.current.has(movie.id)) continue
        try {
          const detailed = await getMovieWithProviders(movie)
          moviesWithProviders.push(detailed)
        } catch {
          // Skip movies that fail to load details
        }
      }

      if (append) {
        setMovies(prev => [...prev, ...moviesWithProviders])
      } else {
        setMovies(moviesWithProviders)
        setCurrentIndex(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies')
    } finally {
      setIsLoadingMovies(false)
    }
  }, [activeServices])

  useEffect(() => {
    if (!servicesLoading) {
      loadMovies(1)
    }
  }, [servicesLoading, activeServices.length])

  // Load more when running low
  useEffect(() => {
    if (movies.length - currentIndex <= 3 && page < totalPages && !isLoadingMovies) {
      const nextPage = page + 1
      setPage(nextPage)
      loadMovies(nextPage, true)
    }
  }, [currentIndex, movies.length])

  const currentMovie = movies[currentIndex]
  const nextMovie = movies[currentIndex + 1]

  const recordSwipe = useCallback(async (movie: MovieWithProviders, direction: 'left' | 'right') => {
    const userId = getCurrentUserId()
    if (!userId) return

    // If no couple, just track locally (no backend save)
    if (!couple) {
      setSwipedIds(prev => new Set(prev).add(movie.id))
      return
    }

    try {
      // Record the swipe
      await api.request<Swipe[]>('/table/swipes/insert', {
        method: 'POST',
        body: JSON.stringify({
          values: {
            user_id: userId,
            couple_id: couple.id,
            tmdb_id: movie.id,
            media_type: 'movie',
            direction,
          },
          returning: '*',
        }),
      })

      setSwipedIds(prev => new Set(prev).add(movie.id))

      // Check for match if swiped right and have a partner
      if (direction === 'right' && isLinked && partnerUserId) {
        const partnerSwipes = await api.request<ListResponse<Swipe>>(
          `/table/swipes/list?where=${encodeURIComponent(
            `user_id = '${partnerUserId}' & tmdb_id = ${movie.id} & direction = 'right'`
          )}&limit=1`
        )

        if (partnerSwipes.items.length > 0) {
          // It's a match!
          await api.request<Match[]>('/table/matches/insert', {
            method: 'POST',
            body: JSON.stringify({
              values: {
                couple_id: couple.id,
                tmdb_id: movie.id,
                media_type: 'movie',
                movie_data: JSON.stringify({
                  title: movie.title,
                  poster_path: movie.posterUrl,
                  overview: movie.overview,
                  genres: movie.genres,
                  vote_average: movie.rating,
                  release_date: movie.releaseYear,
                  providers: movie.providers,
                }),
              },
              returning: '*',
            }),
          })
          setMatchMovie(movie)
        }
      }
    } catch (err) {
      console.log('[SwipeScreen] Error recording swipe:', err)
    }
  }, [couple, isLinked, partnerUserId])

  const advanceCard = useCallback(() => {
    setCurrentIndex(prev => prev + 1)
    position.setValue({ x: 0, y: 0 })
    isAnimating.current = false
  }, [position])

  // Use a ref so the PanResponder always calls the latest swipe logic
  const swipeRef = useRef<(direction: 'left' | 'right') => void>(() => {})

  const swipeCard = useCallback((direction: 'left' | 'right') => {
    if (isAnimating.current || !currentMovie) return
    isAnimating.current = true

    const toX = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100

    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      recordSwipe(currentMovie, direction)
      advanceCard()
    })
  }, [currentMovie, position, recordSwipe, advanceCard])

  swipeRef.current = swipeCard

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 })
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRef.current('right')
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeRef.current('left')
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start()
        }
      },
    })
  ).current

  const cardRotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  })

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  if (servicesLoading || isLoadingMovies) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreamSwipe</Text>
        </View>
        <Loading message="Loading movies..." />
      </View>
    )
  }

  if (activeServices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreamSwipe</Text>
        </View>
        <EmptyState
          title="Select your services"
          message="Go to your Profile to pick which streaming services you have, then come back to start swiping!"
        />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreamSwipe</Text>
        </View>
        <EmptyState
          title="Something went wrong"
          message={error}
          action={{ label: 'Retry', onPress: () => loadMovies(1) }}
        />
      </View>
    )
  }

  if (!currentMovie) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreamSwipe</Text>
        </View>
        <EmptyState
          title="No more movies!"
          message="You've seen them all. Check back later for new additions."
          action={{ label: 'Refresh', onPress: () => { setPage(1); loadMovies(1) } }}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>StreamSwipe</Text>
        {!isLinked && (
          <Text style={styles.soloHint}>Solo mode</Text>
        )}
      </View>

      <View style={styles.cardContainer}>
        {/* Next card (behind) */}
        {nextMovie && (
          <View style={[styles.cardWrapper, { transform: [{ scale: 0.95 }] }]}>
            <SwipeCard movie={nextMovie} />
          </View>
        )}

        {/* Current card (on top, with gestures) */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: cardRotation },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <SwipeCard movie={currentMovie} />

          {/* LIKE stamp */}
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={styles.stampLikeText}>LIKE</Text>
          </Animated.View>

          {/* NOPE stamp */}
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={styles.stampNopeText}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionNope]}
          onPress={() => swipeCard('left')}
          activeOpacity={0.7}
        >
          <Icon name="close" size={32} color={colors.danger} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionLike]}
          onPress={() => swipeCard('right')}
          activeOpacity={0.7}
        >
          <Icon name="heart" size={32} color={colors.success} />
        </TouchableOpacity>
      </View>

      {/* Match modal */}
      <MatchModal
        movie={matchMovie}
        visible={!!matchMovie}
        onKeepSwiping={() => setMatchMovie(null)}
        onViewMatches={() => {
          setMatchMovie(null)
          onNavigateToMatches()
        }}
      />
    </View>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 56 : 14,
      paddingHorizontal: 20,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: fonts.lg,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    soloHint: {
      fontSize: 9,
      color: colors.textMuted,
      marginLeft: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    cardContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardWrapper: {
      position: 'absolute',
    },
    stamp: {
      position: 'absolute',
      top: 50,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderWidth: 2,
      borderRadius: 3,
    },
    stampLike: {
      left: 24,
      borderColor: colors.primary,
      transform: [{ rotate: '-12deg' }],
    },
    stampLikeText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 2,
    },
    stampNope: {
      right: 24,
      borderColor: colors.danger,
      transform: [{ rotate: '12deg' }],
    },
    stampNopeText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.danger,
      letterSpacing: 2,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 40,
      paddingVertical: 14,
      paddingBottom: 6,
    },
    actionButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    actionNope: {},
    actionLike: {},
  })
