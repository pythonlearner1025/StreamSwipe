import { View, Text, Image, StyleSheet, Dimensions } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { MovieWithProviders } from '../services/tmdb'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 32
const CARD_HEIGHT = CARD_WIDTH * 1.4

interface SwipeCardProps {
  movie: MovieWithProviders
}

export function SwipeCard({ movie }: SwipeCardProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)

  return (
    <View style={styles.card}>
      {movie.posterUrl ? (
        <Image
          source={{ uri: movie.posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.noPoster]}>
          <Icon name="movie-open" size={64} color={colors.textMuted} />
        </View>
      )}

      {/* Gradient overlay - stacked Views */}
      <View style={styles.gradientContainer}>
        <View style={[styles.gradientStep, { opacity: 0.05 }]} />
        <View style={[styles.gradientStep, { opacity: 0.15 }]} />
        <View style={[styles.gradientStep, { opacity: 0.3 }]} />
        <View style={[styles.gradientStep, { opacity: 0.55 }]} />
        <View style={[styles.gradientStep, { opacity: 0.75 }]} />
        <View style={[styles.gradientStep, { opacity: 0.9 }]} />
      </View>

      {/* Movie info overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>

        <View style={styles.metaRow}>
          {movie.releaseYear ? (
            <Text style={styles.metaText}>{movie.releaseYear}</Text>
          ) : null}
          {movie.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Icon name="star" size={14} color="#fbbf24" />
              <Text style={styles.ratingText}>{movie.rating}</Text>
            </View>
          )}
        </View>

        {movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.map((genre, i) => (
              <View key={i} style={styles.genrePill}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {movie.providers.length > 0 && (
          <View style={styles.providerRow}>
            {movie.providers.slice(0, 4).map((provider) => (
              <Image
                key={provider.id}
                source={{ uri: provider.logoUrl }}
                style={styles.providerLogo}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export { CARD_WIDTH, CARD_HEIGHT }

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    poster: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    noPoster: {
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradientContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '55%',
    },
    gradientStep: {
      flex: 1,
      backgroundColor: '#000',
    },
    infoOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
    },
    title: {
      fontSize: fonts['2xl'],
      fontWeight: '700',
      color: '#fff',
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    metaText: {
      fontSize: fonts.sm,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '400',
      letterSpacing: 0.3,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ratingText: {
      fontSize: fonts.sm,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '400',
    },
    genreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    genrePill: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 3,
    },
    genreText: {
      fontSize: fonts.xs,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    providerRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    providerLogo: {
      width: 28,
      height: 28,
      borderRadius: 4,
    },
  })
