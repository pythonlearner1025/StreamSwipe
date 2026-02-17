import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, Image, FlatList, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { useStreamingServices } from '../context/StreamingServicesContext'
import { Header, Loading, EmptyState } from '../components/ui'
import { discoverMovies, getMovieWithProviders, MovieWithProviders, getImageUrl } from '../services/tmdb'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const NUM_COLUMNS = 3
const GRID_GAP = 2
const CELL_WIDTH = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
const CELL_HEIGHT = CELL_WIDTH * 1.5

export function BrowseScreen() {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)
  const { myServices, sharedServices, isLoading: servicesLoading } = useStreamingServices()

  const [movies, setMovies] = useState<MovieWithProviders[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<MovieWithProviders | null>(null)
  const [error, setError] = useState('')

  const activeServices = sharedServices.length > 0 ? sharedServices : myServices

  const loadMovies = useCallback(async (pageNum: number, append: boolean = false) => {
    if (activeServices.length === 0) {
      setIsLoading(false)
      return
    }

    try {
      setError('')
      if (append) setIsLoadingMore(true)

      const result = await discoverMovies(activeServices, pageNum)
      setTotalPages(result.total_pages)

      const enriched: MovieWithProviders[] = []
      for (const movie of result.results) {
        try {
          const detailed = await getMovieWithProviders(movie)
          enriched.push(detailed)
        } catch {
          // Skip failed movies
          enriched.push({
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            posterUrl: getImageUrl(movie.poster_path, 'w342'),
            backdropUrl: getImageUrl(movie.backdrop_path, 'w780'),
            genres: [],
            releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : '',
            rating: Math.round(movie.vote_average * 10) / 10,
            providers: [],
          })
        }
      }

      if (append) {
        setMovies(prev => [...prev, ...enriched])
      } else {
        setMovies(enriched)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [activeServices])

  useEffect(() => {
    if (!servicesLoading) {
      loadMovies(1)
    }
  }, [servicesLoading, activeServices.length])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && page < totalPages) {
      const nextPage = page + 1
      setPage(nextPage)
      loadMovies(nextPage, true)
    }
  }, [isLoadingMore, page, totalPages, loadMovies])

  if (servicesLoading || isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Browse" />
        <Loading message="Loading movies..." />
      </View>
    )
  }

  if (activeServices.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Browse" />
        <EmptyState
          title="Select your services"
          message="Go to your Profile to pick which streaming services you have."
        />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Browse" />
        <EmptyState
          title="Something went wrong"
          message={error}
          action={{ label: 'Retry', onPress: () => { setIsLoading(true); loadMovies(1) } }}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Browse" />
      <FlatList
        data={movies}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => String(item.id)}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cell}
            onPress={() => setSelectedMovie(item)}
            activeOpacity={0.8}
          >
            {item.posterUrl ? (
              <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
            ) : (
              <View style={[styles.poster, styles.noPoster]}>
                <Icon name="movie-open" size={24} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.titleOverlay}>
              <Text style={styles.cellTitle} numberOfLines={2}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Detail modal */}
      <Modal visible={!!selectedMovie} transparent animationType="slide" statusBarTranslucent>
        {selectedMovie && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedMovie(null)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedMovie.posterUrl && (
                  <Image
                    source={{ uri: selectedMovie.posterUrl }}
                    style={styles.modalPoster}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.modalTitle}>{selectedMovie.title}</Text>

                <View style={styles.modalMeta}>
                  {selectedMovie.releaseYear ? (
                    <Text style={styles.modalMetaText}>{selectedMovie.releaseYear}</Text>
                  ) : null}
                  {selectedMovie.rating > 0 && (
                    <View style={styles.modalRating}>
                      <Icon name="star" size={14} color="#fbbf24" />
                      <Text style={styles.modalRatingText}>{selectedMovie.rating}</Text>
                    </View>
                  )}
                </View>

                {selectedMovie.genres.length > 0 && (
                  <View style={styles.modalGenres}>
                    {selectedMovie.genres.map((g, i) => (
                      <View key={i} style={styles.genrePill}>
                        <Text style={styles.genreText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedMovie.overview ? (
                  <Text style={styles.modalOverview}>{selectedMovie.overview}</Text>
                ) : null}

                {selectedMovie.providers.length > 0 && (
                  <View style={styles.modalProviders}>
                    <Text style={styles.modalProviderLabel}>Available on:</Text>
                    <View style={styles.modalProviderRow}>
                      {selectedMovie.providers.map((p) => (
                        <Image
                          key={p.id}
                          source={{ uri: p.logoUrl }}
                          style={styles.modalProviderLogo}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    grid: {
      paddingBottom: 16,
    },
    row: {
      gap: GRID_GAP,
    },
    cell: {
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
      marginBottom: GRID_GAP,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    noPoster: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    titleOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 4,
      paddingVertical: 3,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    cellTitle: {
      fontSize: 9,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      padding: 20,
      maxHeight: '85%',
    },
    modalClose: {
      alignSelf: 'flex-end',
      padding: 4,
      marginBottom: 8,
    },
    modalPoster: {
      width: '100%',
      height: 200,
      borderRadius: 4,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: fonts.xl,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.2,
    },
    modalMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    modalMetaText: {
      fontSize: fonts.sm,
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    modalRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    modalRatingText: {
      fontSize: fonts.sm,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    modalGenres: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    genrePill: {
      backgroundColor: colors.surfaceHover,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 3,
    },
    genreText: {
      fontSize: fonts.xs,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    modalOverview: {
      fontSize: fonts.base,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    modalProviders: {
      marginTop: 16,
    },
    modalProviderLabel: {
      fontSize: fonts.xs,
      color: colors.textMuted,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    modalProviderRow: {
      flexDirection: 'row',
      gap: 6,
    },
    modalProviderLogo: {
      width: 36,
      height: 36,
      borderRadius: 4,
    },
  })
