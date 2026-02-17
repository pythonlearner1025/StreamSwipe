import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, ThemeColors, FontSizes } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useCouple } from '../context/CoupleContext'
import { useStreamingServices } from '../context/StreamingServicesContext'
import { Header, Button, Card } from '../components/ui'
import { STREAMING_SERVICES } from '../services/tmdb'

interface ProfileScreenProps {
  onLogout: () => void
  onLinkPartner: () => void
}

export function ProfileScreen({ onLogout, onLinkPartner }: ProfileScreenProps) {
  const { colors, fonts } = useTheme()
  const styles = createStyles(colors, fonts)
  const { user } = useAuth()
  const { isLinked, leaveCouple } = useCouple()
  const { myServices, updateServices } = useStreamingServices()

  const [savingServices, setSavingServices] = useState(false)

  const toggleService = useCallback(async (serviceId: number) => {
    const current = [...myServices]
    const index = current.indexOf(serviceId)
    if (index >= 0) {
      current.splice(index, 1)
    } else {
      current.push(serviceId)
    }
    setSavingServices(true)
    try {
      await updateServices(current)
    } catch (err) {
      console.log('[ProfileScreen] Error updating services:', err)
    } finally {
      setSavingServices(false)
    }
  }, [myServices, updateServices])

  const handleUnlink = useCallback(() => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure? Your match history will be preserved, but you won\'t be able to create new matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCouple()
            } catch (err) {
              console.log('[ProfileScreen] Error unlinking:', err)
            }
          },
        },
      ]
    )
  }, [leaveCouple])

  return (
    <View style={styles.container}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Partner status */}
        <Card style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <Icon
              name={isLinked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLinked ? colors.danger : colors.textMuted}
            />
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerLabel}>
                {isLinked ? 'Linked with partner' : 'No partner yet'}
              </Text>
              <Text style={styles.partnerStatus}>
                {isLinked
                  ? 'Swipe on movies together!'
                  : 'Link with someone to start matching.'}
              </Text>
            </View>
          </View>
          {isLinked ? (
            <Button title="Unlink Partner" onPress={handleUnlink} variant="ghost" />
          ) : (
            <Button title="Link Partner" onPress={onLinkPartner} variant="primary" />
          )}
        </Card>

        {/* Streaming services */}
        <Text style={styles.sectionTitle}>My Streaming Services</Text>
        <Text style={styles.sectionSubtitle}>
          Select the services you have — movies will be filtered to what you can actually watch.
        </Text>
        <View style={styles.servicesGrid}>
          {STREAMING_SERVICES.map((service) => {
            const isSelected = myServices.includes(service.id)
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceChip,
                  isSelected && styles.serviceChipActive,
                ]}
                onPress={() => toggleService(service.id)}
                activeOpacity={0.7}
                disabled={savingServices}
              >
                <Icon
                  name={service.icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text style={[
                  styles.serviceChipText,
                  isSelected && styles.serviceChipTextActive,
                ]}>
                  {service.name}
                </Text>
                {isSelected && (
                  <Icon name="check-circle" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Account info */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card>
          {user && (
            <>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Username</Text>
                <Text style={styles.accountValue}>{user.username}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Email</Text>
                <Text style={styles.accountValue}>{user.email}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Member since</Text>
                <Text style={styles.accountValue}>
                  {new Date(user.created).toLocaleDateString()}
                </Text>
              </View>
            </>
          )}
        </Card>

        <Button
          title="Sign Out"
          onPress={onLogout}
          variant="danger"
          style={{ marginTop: 20 }}
        />

        <Text style={styles.version}>StreamSwipe v1.0.0</Text>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: ThemeColors, fonts: FontSizes) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    partnerCard: {
      marginBottom: 24,
    },
    partnerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    partnerInfo: {
      marginLeft: 12,
      flex: 1,
    },
    partnerLabel: {
      fontSize: fonts.base,
      fontWeight: '600',
      color: colors.text,
    },
    partnerStatus: {
      fontSize: fonts.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: fonts.xs,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sectionSubtitle: {
      fontSize: fonts.xs,
      color: colors.textMuted,
      marginBottom: 12,
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 28,
    },
    serviceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 4,
      backgroundColor: colors.surface,
    },
    serviceChipActive: {
      backgroundColor: colors.primary + '20',
    },
    serviceChipText: {
      fontSize: fonts.xs,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    serviceChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    accountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    accountLabel: {
      fontSize: fonts.xs,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    accountValue: {
      fontSize: fonts.sm,
      color: colors.text,
      fontWeight: '400',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 9,
      marginTop: 28,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  })
