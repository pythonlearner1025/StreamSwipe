import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, Couple, ListResponse, getCurrentUserId } from '../api'

interface CoupleContextType {
  couple: Couple | null
  isLinked: boolean
  isLoading: boolean
  inviteCode: string | null
  partnerUserId: string | null
  generateInviteCode: () => Promise<string>
  joinCouple: (code: string) => Promise<void>
  leaveCouple: () => Promise<void>
  refresh: () => Promise<void>
}

const CoupleContext = createContext<CoupleContextType | undefined>(undefined)

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const [couple, setCouple] = useState<Couple | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCouple = useCallback(async () => {
    const uid = getCurrentUserId()
    if (!uid) {
      setCouple(null)
      setIsLoading(false)
      return
    }

    try {
      const result = await api.request<ListResponse<Couple>>(
        `/table/couples/list?where=${encodeURIComponent(`inviter_id = '${uid}' | partner_id = '${uid}'`)}&limit=1&order=-created`
      )
      if (result.items.length > 0) {
        setCouple(result.items[0])
      } else {
        setCouple(null)
      }
    } catch (err) {
      console.log('[CoupleContext] Error fetching couple:', err)
      setCouple(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCouple()
  }, [fetchCouple])

  const isLinked = couple?.status === 'active'

  const inviteCode = couple?.invite_code ?? null

  const partnerUserId = (() => {
    if (!couple) return null
    const uid = getCurrentUserId()
    return couple.inviter_id === uid ? couple.partner_id : couple.inviter_id
  })()

  const generateInviteCode = useCallback(async (): Promise<string> => {
    const uid = getCurrentUserId()
    if (!uid) throw new Error('Not authenticated')

    // If already have a pending couple, return existing code
    if (couple && couple.status === 'pending' && couple.inviter_id === uid) {
      return couple.invite_code
    }

    const code = generateCode()
    const result = await api.request<Couple[]>('/table/couples/insert', {
      method: 'POST',
      body: JSON.stringify({
        values: {
          inviter_id: uid,
          invite_code: code,
          status: 'pending',
        },
        returning: '*',
      }),
    })

    if (result && result.length > 0) {
      setCouple(result[0])
      return result[0].invite_code
    }
    throw new Error('Failed to create invite')
  }, [couple])

  const joinCouple = useCallback(async (code: string) => {
    const uid = getCurrentUserId()
    if (!uid) throw new Error('Not authenticated')

    // Look up the couple by invite code
    const result = await api.request<ListResponse<Couple>>(
      `/table/couples/list?where=${encodeURIComponent(`invite_code = '${code.toUpperCase()}'`)}&limit=1`
    )

    if (result.items.length === 0) {
      throw new Error('Invalid invite code')
    }

    const foundCouple = result.items[0]

    if (foundCouple.status === 'active') {
      throw new Error('This code has already been used')
    }

    if (foundCouple.inviter_id === uid) {
      throw new Error("You can't join your own invite")
    }

    // Update the couple record
    await api.request(`/table/couples/edit/${foundCouple.id}`, {
      method: 'POST',
      body: JSON.stringify({
        partner_id: uid,
        status: 'active',
      }),
    })

    await fetchCouple()
  }, [fetchCouple])

  const leaveCouple = useCallback(async () => {
    if (!couple) return

    await api.request(`/table/couples/edit/${couple.id}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'dissolved' }),
    })

    setCouple(null)
  }, [couple])

  return (
    <CoupleContext.Provider
      value={{
        couple,
        isLinked,
        isLoading,
        inviteCode,
        partnerUserId,
        generateInviteCode,
        joinCouple,
        leaveCouple,
        refresh: fetchCouple,
      }}
    >
      {children}
    </CoupleContext.Provider>
  )
}

export function useCouple() {
  const context = useContext(CoupleContext)
  if (!context) {
    throw new Error('useCouple must be used within a CoupleProvider')
  }
  return context
}
