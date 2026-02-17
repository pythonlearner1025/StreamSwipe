import { createContext, useContext, ReactNode } from 'react'
import { useStreamingServices as useStreamingServicesHook } from '../hooks/useStreamingServices'

type StreamingServicesContextType = ReturnType<typeof useStreamingServicesHook>

const StreamingServicesContext = createContext<StreamingServicesContextType | undefined>(undefined)

export function StreamingServicesProvider({ children }: { children: ReactNode }) {
  const services = useStreamingServicesHook()
  return (
    <StreamingServicesContext.Provider value={services}>
      {children}
    </StreamingServicesContext.Provider>
  )
}

export function useStreamingServices() {
  const context = useContext(StreamingServicesContext)
  if (!context) {
    throw new Error('useStreamingServices must be used within a StreamingServicesProvider')
  }
  return context
}
