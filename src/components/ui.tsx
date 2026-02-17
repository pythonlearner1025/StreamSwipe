import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'

// Button
interface ButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  style?: ViewStyle
}

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: ButtonProps) {
  const { colors, fonts } = useTheme()
  const styles = createButtonStyles(colors, fonts)

  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'danger' && styles.buttonDanger,
    variant === 'ghost' && styles.buttonGhost,
    disabled && styles.buttonDisabled,
    style,
  ]

  const textStyles = [
    styles.buttonText,
    variant === 'ghost' && styles.buttonTextGhost,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'danger' && styles.buttonTextDanger,
  ]

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const createButtonStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    button: {
      paddingVertical: 13,
      paddingHorizontal: 24,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.surfaceHover,
    },
    buttonDanger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    buttonGhost: {
      backgroundColor: 'transparent',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      color: '#fff',
      fontSize: fonts.sm,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    buttonTextGhost: {
      color: colors.primary,
    },
    buttonTextSecondary: {
      color: colors.text,
    },
    buttonTextDanger: {
      color: colors.danger,
    },
  })

// Input
interface InputProps extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors, fonts } = useTheme()
  const styles = createInputStyles(colors, fonts)

  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const createInputStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: fonts.xs,
      marginBottom: 6,
      fontWeight: '500',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      paddingVertical: 13,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: fonts.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputError: {
      borderColor: colors.danger,
    },
    errorText: {
      color: colors.danger,
      fontSize: fonts.xs,
      marginTop: 4,
    },
  })

// Card
interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
}

export function Card({ children, style, onPress }: CardProps) {
  const { colors } = useTheme()
  const styles = createCardStyles(colors)

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    )
  }
  return <View style={[styles.card, style]}>{children}</View>
}

const createCardStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 6,
      padding: 16,
    },
  })

// Loading Spinner
export function Loading({ message }: { message?: string }) {
  const { colors, fonts } = useTheme()
  const styles = createLoadingStyles(colors, fonts)

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  )
}

const createLoadingStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.textSecondary,
      marginTop: 12,
      fontSize: fonts.sm,
    },
  })

// Empty State
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message?: string
  action?: { label: string; onPress: () => void }
}) {
  const { colors, fonts } = useTheme()
  const styles = createEmptyStateStyles(colors, fonts)

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {message && <Text style={styles.emptyStateMessage}>{message}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  )
}

const createEmptyStateStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyStateTitle: {
      color: colors.text,
      fontSize: fonts.xl,
      fontWeight: '600',
      textAlign: 'center',
    },
    emptyStateMessage: {
      color: colors.textSecondary,
      fontSize: fonts.sm,
      textAlign: 'center',
      marginTop: 8,
    },
  })

// Header
interface HeaderProps {
  title: string
  leftAction?: { label: string; onPress: () => void }
  rightAction?: { label: string; onPress: () => void }
}

export function Header({ title, leftAction, rightAction }: HeaderProps) {
  const { colors, fonts } = useTheme()
  const styles = createHeaderStyles(colors, fonts)

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {leftAction && (
          <TouchableOpacity onPress={leftAction.onPress}>
            <Text style={styles.headerAction}>{leftAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSide}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress}>
            <Text style={styles.headerAction}>{rightAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const createHeaderStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      paddingTop: Platform.OS === 'ios' ? 56 : 14,
      backgroundColor: colors.background,
    },
    headerTitle: {
      color: colors.text,
      fontSize: fonts.lg,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    headerSide: {
      width: 60,
    },
    headerAction: {
      color: colors.primary,
      fontSize: fonts.sm,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
  })
