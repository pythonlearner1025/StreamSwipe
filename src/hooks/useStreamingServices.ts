import { useState, useEffect, useCallback } from 'react'
import { api, UserServices, ListResponse, getCurrentUserId } from '../api'
import { useCouple } from '../context/CoupleContext'

export function useStreamingServices() {
  const [myRecord, setMyRecord] = useState<UserServices | null>(null)
  const [partnerServices, setPartnerServices] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { partnerUserId, isLinked } = useCouple()

  const rawServices = myRecord?.services
  const myServices: number[] = Array.isArray(rawServices)
    ? rawServices
    : typeof rawServices === 'string'
      ? JSON.parse(rawServices)
      : []

  const fetchMyServices = useCallback(async () => {
    const uid = getCurrentUserId()
    if (!uid) {
      setIsLoading(false)
      return
    }

    try {
      const result = await api.request<ListResponse<UserServices>>(
        `/table/user_services/list?where=${encodeURIComponent(`user_id = '${uid}'`)}&limit=1`
      )
      if (result.items.length > 0) {
        setMyRecord(result.items[0])
      }
    } catch (err) {
      console.log('[useStreamingServices] Error fetching services:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchPartnerServices = useCallback(async () => {
    if (!partnerUserId || !isLinked) {
      setPartnerServices([])
      return
    }

    try {
      const result = await api.request<ListResponse<UserServices>>(
        `/table/user_services/list?where=${encodeURIComponent(`user_id = '${partnerUserId}'`)}&limit=1`
      )
      if (result.items.length > 0) {
        const raw = result.items[0].services
        setPartnerServices(Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [])
      }
    } catch (err) {
      console.log('[useStreamingServices] Error fetching partner services:', err)
    }
  }, [partnerUserId, isLinked])

  useEffect(() => {
    fetchMyServices()
  }, [fetchMyServices])

  useEffect(() => {
    fetchPartnerServices()
  }, [fetchPartnerServices])

  // Shared services = intersection if partner exists, otherwise user's own
  const sharedServices = isLinked && partnerServices.length > 0
    ? myServices.filter(id => partnerServices.includes(id))
    : myServices

  const updateServices = useCallback(async (serviceIds: number[]) => {
    const uid = getCurrentUserId()
    if (!uid) return

    try {
      if (myRecord) {
        // Update existing record
        await api.request(`/table/user_services/edit/${myRecord.id}`, {
          method: 'POST',
          body: JSON.stringify({ services: JSON.stringify(serviceIds) }),
        })
        setMyRecord({ ...myRecord, services: serviceIds })
      } else {
        // Create new record
        const result = await api.request<UserServices[]>('/table/user_services/insert', {
          method: 'POST',
          body: JSON.stringify({
            values: { user_id: uid, services: JSON.stringify(serviceIds) },
            returning: '*',
          }),
        })
        if (result && result.length > 0) {
          setMyRecord(result[0])
        }
      }
    } catch (err) {
      console.log('[useStreamingServices] Error updating services:', err)
      throw err
    }
  }, [myRecord])

  return {
    myServices,
    partnerServices,
    sharedServices,
    isLoading,
    updateServices,
    refresh: fetchMyServices,
  }
}
