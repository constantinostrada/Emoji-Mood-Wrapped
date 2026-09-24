'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

import type { WrappedNarrative, WrappedStats } from '@/lib'

import { useWrappedSession } from '../_components/session'
import { buildDeck } from './deck'
import { StoryCard } from './story-card'

/** Horizontal travel, in px, that turns a press into a swipe. */
const SWIPE_PX = 40

/**
 * The Wrapped as stories: one card at a time, tap right half / swipe left to
 * advance, tap left half / swipe right to go back, arrow keys too. Navigation
 * is a plain state change — no transition waits on it — so a tap re-renders
 * the next card in the same frame.
 */
export function WrappedScreen({ stats, narrative }: { stats: WrappedStats; narrative: WrappedNarrative }) {
  const deck = useMemo(() => buildDeck(stats, narrative), [stats, narrative])
  const [index, setIndex] = useState(0)
  const { setWrapped } = useWrappedSession()
  const press = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(deck.length - 1, Math.max(0, i + delta))),
    [deck.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    press.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = press.current
    press.current = null
    if (start === null) return
    // Buttons on the card (restart, replay) handle their own clicks.
    if ((e.target as HTMLElement).closest('button, a')) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = e.currentTarget.getBoundingClientRect()
      go(e.clientX - rect.left >= rect.width / 2 ? 1 : -1)
    }
  }

  // Clearing the session sends /wrapped back to the landing (see page.tsx),
  // where a fresh flow is ready for another chat — no reload involved.
  const restart = useCallback(() => setWrapped(null), [setWrapped])

  const card = deck[index]

  return (
    <main className="fixed inset-0 flex justify-center bg-black" data-participant={stats.participant ?? ''}>
      <div
        role="region"
        aria-roledescription="stories"
        aria-label={`Card ${index + 1} of ${deck.length}`}
        className="relative h-full w-full max-w-md touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (press.current = null)}
      >
        <div
          className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
          role="progressbar"
          aria-label="Wrapped progress"
          aria-valuemin={1}
          aria-valuemax={deck.length}
          aria-valuenow={index + 1}
        >
          {deck.map((c, i) => (
            <span
              key={c.id}
              data-segment={i <= index ? 'seen' : 'unseen'}
              className={`h-1 flex-1 rounded-full transition-colors duration-150 ${i <= index ? 'bg-white' : 'bg-white/35'}`}
            />
          ))}
        </div>

        <div aria-live="polite" className="h-full">
          <StoryCard key={card.id} card={card} onRestart={restart} onReplay={() => setIndex(0)} />
        </div>

        <div className="sr-only">
          <button type="button" onClick={() => go(-1)} disabled={index === 0}>
            Previous card
          </button>
          <button type="button" onClick={() => go(1)} disabled={index === deck.length - 1}>
            Next card
          </button>
        </div>
      </div>
    </main>
  )
}
