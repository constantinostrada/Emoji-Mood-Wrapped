'use client'

/**
 * The one piece of state that crosses screens: the `WrappedStats` the flow
 * produced. It lives in React memory only — never storage, never the network —
 * so a reload drops it and the user lands back on the start.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import type { WrappedStats } from '@/lib'

interface WrappedSession {
  readonly stats: WrappedStats | null
  readonly setStats: (stats: WrappedStats | null) => void
}

const SessionContext = createContext<WrappedSession | null>(null)

export function WrappedSessionProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<WrappedStats | null>(null)
  const value = useMemo(() => ({ stats, setStats }), [stats])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useWrappedSession(): WrappedSession {
  const session = useContext(SessionContext)
  if (session === null) throw new Error('useWrappedSession outside WrappedSessionProvider')
  return session
}
