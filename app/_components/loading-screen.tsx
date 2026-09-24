'use client'

import { useEffect, useState } from 'react'

import { templateNarrator, toWrappedStats, type ChatAnalysis } from '@/lib'

import { LOADING_LINES } from './copy'
import { loadCardFonts } from './share/card-fonts'
import type { WrappedResult } from './session'
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
  onDone: (wrapped: WrappedResult) => void
}) {
  const [line, setLine] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setLine((n) => (n + 1) % LOADING_LINES.length), LINE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Warm the share card's fonts during the drumroll, so the card is ready the
  // moment the Wrapped appears. A failure here is retried when the card renders.
  useEffect(() => {
    loadCardFonts().catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))
    // The narrator is async so the V2 LLM can replace the templates without
    // this screen changing; the drumroll simply covers however long it takes.
    const work = new Promise<WrappedResult>((resolve, reject) =>
      setTimeout(() => {
        const stats = toWrappedStats(analysis, participant)
        templateNarrator.narrate(stats).then((narrative) => resolve({ stats, narrative }), reject)
      }, 0),
    )
    void Promise.all([work, minimum]).then(([wrapped]) => {
      if (!cancelled) onDone(wrapped)
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
