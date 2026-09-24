'use client'

/**
 * The one piece of state that crosses screens: the `WrappedStats` the flow
 * produced and the narrative told about it. It lives in React memory only — never storage, never the network —
 * so a reload drops it and the user lands back on the start.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import type { WrappedNarrative, WrappedStats } from '@/lib'

export interface WrappedResult {
  readonly stats: WrappedStats
  readonly narrative: WrappedNarrative
}

interface WrappedSession {
  readonly wrapped: WrappedResult | null
  readonly setWrapped: (wrapped: WrappedResult | null) => void
}

const SessionContext = createContext<WrappedSession | null>(null)

export function WrappedSessionProvider({ children }: { children: ReactNode }) {
  const [wrapped, setWrapped] = useState<WrappedResult | null>(null)
  const value = useMemo(() => ({ wrapped, setWrapped }), [wrapped])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useWrappedSession(): WrappedSession {
  const session = useContext(SessionContext)
  if (session === null) throw new Error('useWrappedSession outside WrappedSessionProvider')
  return session
}
