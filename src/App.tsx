import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CoupleProvider } from './context/CoupleContext'
import { StreamingServicesProvider } from './context/StreamingServicesContext'
import { Loading } from './components/ui'
import { TabBar, TabName } from './components/TabBar'
import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'
import { SwipeScreen } from './screens/SwipeScreen'
import { BrowseScreen } from './screens/BrowseScreen'
import { MatchesScreen } from './screens/MatchesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { PartnerLinkScreen } from './screens/PartnerLinkScreen'

type AuthScreen = 'login' | 'signup'

function AuthenticatedContent() {
  const { colors } = useTheme()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabName>('swipe')
  const [showPartnerLink, setShowPartnerLink] = useState(false)

  const handleLogout = async () => {
    await logout()
    setActiveTab('swipe')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.tabPage, activeTab !== 'swipe' && styles.hidden]}>
          <SwipeScreen onNavigateToMatches={() => setActiveTab('matches')} />
        </View>
        <View style={[styles.tabPage, activeTab !== 'browse' && styles.hidden]}>
          <BrowseScreen />
        </View>
        <View style={[styles.tabPage, activeTab !== 'matches' && styles.hidden]}>
          <MatchesScreen isActive={activeTab === 'matches'} />
        </View>
        <View style={[styles.tabPage, activeTab !== 'profile' && styles.hidden]}>
          <ProfileScreen
            onLogout={handleLogout}
            onLinkPartner={() => setShowPartnerLink(true)}
          />
        </View>
      </View>
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
      <PartnerLinkScreen
        visible={showPartnerLink}
        onClose={() => setShowPartnerLink(false)}
      />
    </View>
  )
}

function AppRoot() {
  const { colors } = useTheme()
  const { isLoading, isActionLoading, isAuthenticated, login, signUp } = useAuth()
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Loading message="Loading..." />
      </View>
    )
  }

  if (!isAuthenticated) {
    if (authScreen === 'signup') {
      return (
        <SignupScreen
          onSignup={async (data) => {
            await signUp(data)
          }}
          onNavigateToLogin={() => setAuthScreen('login')}
          isLoading={isActionLoading}
          onBack={() => setAuthScreen('login')}
        />
      )
    }

    return (
      <LoginScreen
        onLogin={async (email, password) => {
          await login(email, password)
        }}
        onNavigateToSignup={() => setAuthScreen('signup')}
        isLoading={isActionLoading}
        onGuestLogin={async () => {
          await login('guest', 'guest123')
        }}
      />
    )
  }

  return (
    <CoupleProvider>
      <StreamingServicesProvider>
        <AuthenticatedContent />
      </StreamingServicesProvider>
    </CoupleProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabPage: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
})
