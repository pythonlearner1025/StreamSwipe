import { View, Text, Image, Modal, StyleSheet, Dimensions } from 'react-native'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { Button } from './ui'
import { MovieWithProviders, getImageUrl } from '../services/tmdb'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface MatchModalProps {
  movie: MovieWithProviders | null
  visible: boolean
  onKeepSwiping: () => void
  onViewMatches: () => void
}

export function MatchModal({ movie, visible, onKeepSwiping, onViewMatches }: MatchModalProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)

  if (!movie) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.matchText}>It's a Match!</Text>
          <Text style={styles.subtitle}>
            You both want to watch
          </Text>

          {movie.posterUrl && (
            <Image
              source={{ uri: movie.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          )}

          <Text style={styles.movieTitle}>{movie.title}</Text>

          {movie.providers.length > 0 && (
            <View style={styles.providerRow}>
              <Text style={styles.availableText}>Available on:</Text>
              <View style={styles.providers}>
                {movie.providers.slice(0, 4).map((p) => (
                  <Image
                    key={p.id}
                    source={{ uri: p.logoUrl }}
                    style={styles.providerLogo}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.buttons}>
            <Button
              title="View Matches"
              onPress={onViewMatches}
              variant="primary"
              style={styles.button}
            />
            <Button
              title="Keep Swiping"
              onPress={onKeepSwiping}
              variant="ghost"
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    content: {
      alignItems: 'center',
      width: '100%',
    },
    matchText: {
      fontSize: 36,
      fontWeight: '300',
      color: colors.primary,
      marginBottom: 4,
      textAlign: 'center',
      letterSpacing: 4,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: fonts.sm,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 28,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    poster: {
      width: SCREEN_WIDTH * 0.45,
      height: SCREEN_WIDTH * 0.45 * 1.5,
      borderRadius: 6,
      marginBottom: 20,
    },
    movieTitle: {
      fontSize: fonts.xl,
      fontWeight: '600',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    providerRow: {
      alignItems: 'center',
      marginBottom: 28,
    },
    availableText: {
      fontSize: fonts.xs,
      color: 'rgba(255,255,255,0.35)',
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    providers: {
      flexDirection: 'row',
      gap: 6,
    },
    providerLogo: {
      width: 32,
      height: 32,
      borderRadius: 4,
    },
    buttons: {
      width: '100%',
      gap: 8,
      marginTop: 8,
    },
    button: {
      width: '100%',
    },
  })
