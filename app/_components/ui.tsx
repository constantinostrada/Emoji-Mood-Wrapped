'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import type { ParseWarning } from '@/lib'

import { warningCopy } from './copy'

/** Shared focus ring: visible on keyboard focus only. */
export const focusRing =
  'focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-300'

export const primaryButton = `inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-lg font-extrabold text-violet-700 shadow-xl shadow-fuchsia-900/40 transition active:scale-95 motion-safe:hover:scale-105 ${focusRing}`

export const secondaryButton = `inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 px-5 font-semibold text-white transition hover:bg-white/10 ${focusRing}`

/**
 * A screen's heading. It takes focus when the screen mounts, so keyboard and
 * screen-reader users land at the top of each new step.
 */
export function ScreenHeading({
  children,
  focusOnMount = true,
  className = '',
}: {
  children: ReactNode
  focusOnMount?: boolean
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])
  return (
    <h1 ref={ref} tabIndex={-1} className={`font-black tracking-tight outline-none ${className}`}>
      {children}
    </h1>
  )
}

export function PrivacyNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-2 text-sm text-white/90 ${className}`}>
      <span aria-hidden="true">🔒</span>
      <span>
        Your chat is analyzed <strong>in your browser</strong> and never leaves your device.
      </span>
    </p>
  )
}

/** Parser warnings: worth a mention, never a reason to stop. */
export function WarningsNote({ warnings }: { warnings: readonly ParseWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1 rounded-2xl bg-black/20 px-4 py-3 text-xs text-white/80">
      {warnings.map((w) => (
        <li key={w.code} className="flex gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>{warningCopy(w)}</span>
        </li>
      ))}
    </ul>
  )
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-6">
      {children}
    </main>
  )
}
