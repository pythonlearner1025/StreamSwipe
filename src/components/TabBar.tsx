import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'

export type TabName = 'swipe' | 'browse' | 'matches' | 'profile'

interface Tab {
  name: TabName
  label: string
  icon: string
  iconActive: string
}

const tabs: Tab[] = [
  { name: 'swipe', label: 'Discover', icon: 'cards-outline', iconActive: 'cards' },
  { name: 'browse', label: 'Browse', icon: 'view-grid-outline', iconActive: 'view-grid' },
  { name: 'matches', label: 'Matches', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'profile', label: 'Profile', icon: 'account-outline', iconActive: 'account' },
]

interface TabBarProps {
  activeTab: TabName
  onTabPress: (tab: TabName) => void
}

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Icon
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={isActive ? colors.text : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      paddingBottom: 6,
      paddingTop: 6,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    label: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: '500',
      marginTop: 3,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    labelActive: {
      color: colors.text,
      fontWeight: '600',
    },
  })
