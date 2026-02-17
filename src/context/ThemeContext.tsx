import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// HBO Max-inspired dark cinematic palette
const darkColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1c1c1c',
  border: '#1f1f1f',
  text: '#e5e5e5',
  textSecondary: '#808080',
  textMuted: '#525252',
  primary: '#b48efa',
  primaryHover: '#9b6fe8',
  danger: '#e5484d',
  dangerHover: '#cd2b31',
  success: '#30a46c',
}

const lightColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1c1c1c',
  border: '#1f1f1f',
  text: '#e5e5e5',
  textSecondary: '#808080',
  textMuted: '#525252',
  primary: '#b48efa',
  primaryHover: '#9b6fe8',
  danger: '#e5484d',
  dangerHover: '#cd2b31',
  success: '#30a46c',
}

export type ThemeColors = typeof darkColors

export type ThemeMode = 'light' | 'dark' | 'system'

export type FontSizeOption = 'small' | 'medium' | 'large'

// Font size scales for different size options
const fontSizes = {
  small: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 26,
  },
  medium: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 19,
    '2xl': 24,
    '3xl': 32,
  },
  large: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
  },
}

export type FontSizes = typeof fontSizes.medium

interface Settings {
  themeMode: ThemeMode
  notificationsEnabled: boolean
  autoSave: boolean
  fontSize: FontSizeOption
}

interface ThemeContextType {
  colors: ThemeColors
  fonts: FontSizes
  isDark: boolean
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  themeMode: 'system',
  notificationsEnabled: true,
  autoSave: true,
  fontSize: 'medium',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const SETTINGS_KEY = '@app_settings'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY)
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoaded(true)
    }
  }

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  // Always dark — cinematic app
  const isDark = true
  const colors = darkColors
  const fonts = fontSizes[settings.fontSize]

  // Don't render until settings are loaded to prevent flash
  if (!isLoaded) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ colors, fonts, isDark, settings, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// For backwards compatibility - returns current theme colors
export function useColors() {
  const { colors } = useTheme()
  return colors
}