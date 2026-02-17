import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, Image, FlatList, TouchableOpacity, Modal, ScrollView,
  StyleSheet, RefreshControl, Dimensions,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { useCouple } from '../context/CoupleContext'
import { Header, Loading, EmptyState, Button } from '../components/ui'
import { api, Match, ListResponse } from '../api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_GAP = 12
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2

type MatchFilter = 'unwatched' | 'watched'

interface MatchesScreenProps {
  isActive?: boolean
}

export function MatchesScreen({ isActive }: MatchesScreenProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)
  const { couple, isLinked } = useCouple()

  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<MatchFilter>('unwatched')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!couple) {
      setIsLoading(false)
      return
    }

    try {
      const result = await api.request<ListResponse<Match>>(
        `/table/matches/list?where=${encodeURIComponent(`couple_id = '${couple.id}'`)}&order=-created&limit=100`
      )
      setMatches(result.items.map(item => ({
        ...item,
        movie_data: typeof item.movie_data === 'string'
          ? JSON.parse(item.movie_data)
          : item.movie_data,
      })))
    } catch (err) {
      console.log('[MatchesScreen] Error fetching matches:', err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [couple])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  // Refetch when tab becomes active
  useEffect(() => {
    if (isActive && couple) {
      fetchMatches()
    }
  }, [isActive])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMatches()
  }, [fetchMatches])

  const toggleWatched = useCallback(async (match: Match) => {
    try {
      await api.request(`/table/matches/edit/${match.id}`, {
        method: 'POST',
        body: JSON.stringify({ watched: !match.watched }),
      })
      setMatches(prev =>
        prev.map(m => m.id === match.id ? { ...m, watched: !m.watched } : m)
      )
      if (selectedMatch?.id === match.id) {
        setSelectedMatch({ ...selectedMatch, watched: !selectedMatch.watched })
      }
    } catch (err) {
      console.log('[MatchesScreen] Error toggling watched:', err)
    }
  }, [selectedMatch])

  const filteredMatches = matches.filter(m =>
    filter === 'watched' ? m.watched : !m.watched
  )

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Matches" />
        <Loading message="Loading matches..." />
      </View>
    )
  }

  if (!isLinked) {
    return (
      <View style={styles.container}>
        <Header title="Matches" />
        <EmptyState
          title="Link with a partner"
          message="Connect with your partner to start matching on movies together!"
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Matches" />

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unwatched' && styles.filterTabActive]}
          onPress={() => setFilter('unwatched')}
        >
          <Text style={[styles.filterText, filter === 'unwatched' && styles.filterTextActive]}>
            To Watch ({matches.filter(m => !m.watched).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'watched' && styles.filterTabActive]}
          onPress={() => setFilter('watched')}
        >
          <Text style={[styles.filterText, filter === 'watched' && styles.filterTextActive]}>
            Watched ({matches.filter(m => m.watched).length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredMatches.length === 0 ? (
        <EmptyState
          title={filter === 'watched' ? 'Nothing watched yet' : 'No matches yet'}
          message={filter === 'watched'
            ? 'Movies you mark as watched will appear here.'
            : 'Keep swiping! When you both like the same movie, it shows up here.'}
        />
      ) : (
        <FlatList
          data={filteredMatches}
          numColumns={2}
          keyExtractor={item => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const posterUrl = item.movie_data.poster_path
            return (
              <TouchableOpacity
                style={styles.matchCard}
                onPress={() => setSelectedMatch(item)}
                activeOpacity={0.8}
              >
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={styles.matchPoster} resizeMode="cover" />
                ) : (
                  <View style={[styles.matchPoster, styles.noPoster]}>
                    <Icon name="movie-open" size={32} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTitle} numberOfLines={2}>{item.movie_data.title}</Text>
                  {item.watched && (
                    <View style={styles.watchedBadge}>
                      <Icon name="check-circle" size={12} color={colors.success} />
                      <Text style={styles.watchedText}>Watched</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selectedMatch}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        {selectedMatch && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedMatch(null)}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedMatch.movie_data.poster_path && (
                  <Image
                    source={{ uri: selectedMatch.movie_data.poster_path }}
                    style={styles.modalPoster}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.modalTitle}>{selectedMatch.movie_data.title}</Text>

                <View style={styles.modalMeta}>
                  {selectedMatch.movie_data.release_date ? (
                    <Text style={styles.modalMetaText}>{selectedMatch.movie_data.release_date}</Text>
                  ) : null}
                  {selectedMatch.movie_data.vote_average > 0 && (
                    <View style={styles.modalRating}>
                      <Icon name="star" size={14} color="#fbbf24" />
                      <Text style={styles.modalRatingText}>{selectedMatch.movie_data.vote_average}</Text>
                    </View>
                  )}
                </View>

                {selectedMatch.movie_data.genres.length > 0 && (
                  <View style={styles.modalGenres}>
                    {selectedMatch.movie_data.genres.map((g, i) => (
                      <View key={i} style={styles.genrePill}>
                        <Text style={styles.genreText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedMatch.movie_data.overview ? (
                  <Text style={styles.modalOverview}>{selectedMatch.movie_data.overview}</Text>
                ) : null}

                {selectedMatch.movie_data.providers && selectedMatch.movie_data.providers.length > 0 && (
                  <View style={styles.modalProviders}>
                    <Text style={styles.modalProviderLabel}>Available on:</Text>
                    <View style={styles.modalProviderRow}>
                      {selectedMatch.movie_data.providers.map((p) => (
                        <Image
                          key={p.id}
                          source={{ uri: p.logoUrl }}
                          style={styles.modalProviderLogo}
                        />
                      ))}
                    </View>
                  </View>
                )}

                <Button
                  title={selectedMatch.watched ? 'Mark as Unwatched' : 'Mark as Watched'}
                  onPress={() => toggleWatched(selectedMatch)}
                  variant={selectedMatch.watched ? 'secondary' : 'primary'}
                  style={{ marginTop: 20 }}
                />
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
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 8,
      gap: 0,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    filterTabActive: {
      borderBottomColor: colors.primary,
    },
    filterText: {
      fontSize: fonts.xs,
      fontWeight: '500',
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    filterTextActive: {
      color: colors.text,
      fontWeight: '600',
    },
    grid: {
      padding: 16,
    },
    row: {
      gap: GRID_GAP,
    },
    matchCard: {
      width: CARD_WIDTH,
      marginBottom: GRID_GAP,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    matchPoster: {
      width: '100%',
      height: CARD_WIDTH * 1.4,
    },
    noPoster: {
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchInfo: {
      padding: 10,
      backgroundColor: colors.surface,
    },
    matchTitle: {
      fontSize: fonts.sm,
      fontWeight: '500',
      color: colors.text,
      letterSpacing: 0.1,
    },
    watchedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    watchedText: {
      fontSize: fonts.xs,
      color: colors.textMuted,
      fontWeight: '500',
      letterSpacing: 0.3,
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
