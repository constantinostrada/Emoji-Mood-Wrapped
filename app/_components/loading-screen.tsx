'use client'

import { useEffect, useState } from 'react'

import { toWrappedStats, type ChatAnalysis, type WrappedStats } from '@/lib'

import { LOADING_LINES } from './copy'
import { Screen, ScreenHeading, WarningsNote } from './ui'

/** The real work takes milliseconds; the reveal deserves a drumroll. */
export const MIN_LOADING_MS = 3000
export const LINE_INTERVAL_MS = 1200

export function LoadingScreen({
  analysis,
  participant,
  onDone,
}: {
  analysis: ChatAnalysis
  participant: string | null
  onDone: (stats: WrappedStats) => void
}) {
  const [line, setLine] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setLine((n) => (n + 1) % LOADING_LINES.length), LINE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))
    const work = new Promise<WrappedStats>((resolve) =>
      setTimeout(() => resolve(toWrappedStats(analysis, participant)), 0),
    )
    void Promise.all([work, minimum]).then(([stats]) => {
      if (!cancelled) onDone(stats)
    })
    return () => {
      cancelled = true
    }
  }, [analysis, participant, onDone])

  return (
    <Screen>
      <div aria-hidden="true" className="text-center text-8xl motion-safe:animate-bounce">🔮</div>
      <ScreenHeading className="text-center text-3xl">
        {participant === null ? 'Analyzing the whole chat' : `Analyzing ${participant}`}
      </ScreenHeading>
      <p key={line} role="status" aria-live="polite" className="min-h-14 text-center text-xl font-semibold motion-safe:animate-fade-in">
        {LOADING_LINES[line]}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <div className="h-full w-full origin-left animate-fill rounded-full bg-yellow-300" />
      </div>
      <WarningsNote warnings={analysis.warnings} />
    </Screen>
  )
}
