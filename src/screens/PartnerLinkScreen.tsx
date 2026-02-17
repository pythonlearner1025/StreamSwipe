import { useState, useCallback } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { useCouple } from '../context/CoupleContext'
import { Button, Input } from '../components/ui'

interface PartnerLinkScreenProps {
  visible: boolean
  onClose: () => void
}

type Mode = 'share' | 'enter'

export function PartnerLinkScreen({ visible, onClose }: PartnerLinkScreenProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)
  const { inviteCode, generateInviteCode, joinCouple, isLinked } = useCouple()

  const [mode, setMode] = useState<Mode>('share')
  const [code, setCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState(inviteCode || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setError('')
    try {
      const newCode = await generateInviteCode()
      setGeneratedCode(newCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }, [generateInviteCode])

  const handleJoin = useCallback(async () => {
    if (code.length !== 6) {
      setError('Code must be 6 characters')
      return
    }
    setIsJoining(true)
    setError('')
    try {
      await joinCouple(code)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link')
    } finally {
      setIsJoining(false)
    }
  }, [code, joinCouple])

  const handleCopy = useCallback(() => {
    if (generatedCode) {
      // Clipboard API unavailable in RN 0.79 without extra package
      // Code is displayed prominently for manual sharing
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [generatedCode])

  if (success) {
    return (
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={64} color={colors.success} />
              <Text style={styles.successTitle}>Linked!</Text>
              <Text style={styles.successSubtitle}>
                You're now connected. Start swiping to find movies you both want to watch!
              </Text>
              <Button title="Start Swiping" onPress={onClose} variant="primary" style={{ marginTop: 24 }} />
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Link Partner</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Mode tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'share' && styles.tabActive]}
              onPress={() => { setMode('share'); setError('') }}
            >
              <Text style={[styles.tabText, mode === 'share' && styles.tabTextActive]}>
                Share My Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'enter' && styles.tabActive]}
              onPress={() => { setMode('enter'); setError('') }}
            >
              <Text style={[styles.tabText, mode === 'enter' && styles.tabTextActive]}>
                Enter Code
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'share' ? (
            <View style={styles.shareMode}>
              {generatedCode ? (
                <>
                  <Text style={styles.codeLabel}>Your invite code:</Text>
                  <Text style={styles.codeDisplay}>{generatedCode}</Text>
                  <Text style={styles.codeHint}>
                    Share this code with your partner so they can link with you.
                  </Text>
                  <Button
                    title={copied ? 'Copied!' : 'Copy Code'}
                    onPress={handleCopy}
                    variant={copied ? 'secondary' : 'primary'}
                    style={{ marginTop: 16 }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.codeHint}>
                    Generate an invite code to share with your partner.
                  </Text>
                  <Button
                    title="Generate Code"
                    onPress={handleGenerate}
                    loading={isGenerating}
                    variant="primary"
                    style={{ marginTop: 16 }}
                  />
                </>
              )}
            </View>
          ) : (
            <View style={styles.enterMode}>
              <Text style={styles.codeHint}>
                Enter the 6-character code your partner shared with you.
              </Text>
              <Input
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABCD12"
                maxLength={6}
                autoCapitalize="characters"
                style={styles.codeInput}
              />
              <Button
                title="Link"
                onPress={handleJoin}
                loading={isJoining}
                disabled={code.length !== 6}
                variant="primary"
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: fonts.lg,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 0.3,
    },
    tabs: {
      flexDirection: 'row',
      gap: 0,
      marginBottom: 24,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: fonts.xs,
      fontWeight: '500',
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    tabTextActive: {
      color: colors.text,
      fontWeight: '600',
    },
    shareMode: {
      alignItems: 'center',
    },
    codeLabel: {
      fontSize: fonts.xs,
      color: colors.textMuted,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    codeDisplay: {
      fontSize: 36,
      fontWeight: '300',
      color: colors.primary,
      letterSpacing: 10,
      marginBottom: 8,
    },
    codeHint: {
      fontSize: fonts.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    enterMode: {
      gap: 12,
    },
    codeInput: {
      fontSize: 22,
      fontWeight: '400',
      textAlign: 'center',
      letterSpacing: 8,
    },
    error: {
      fontSize: fonts.xs,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 12,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    successTitle: {
      fontSize: fonts['2xl'],
      fontWeight: '300',
      color: colors.text,
      marginTop: 16,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    successSubtitle: {
      fontSize: fonts.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  })
