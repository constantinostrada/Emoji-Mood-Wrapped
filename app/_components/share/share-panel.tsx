'use client'

import { useCallback, useEffect, useState } from 'react'

import { shareFileName, type ShareSummary } from '@/lib'

import { primaryButton, secondaryButton } from '../ui'
import { downloadFile, shareFile } from './browser-share'
import { renderShareCard } from './render-card'

type State =
  | { readonly status: 'generating' }
  | { readonly status: 'ready'; readonly file: File; readonly url: string; readonly ms: number }
  | { readonly status: 'error' }

/**
 * Preview + Share + Download for the share card.
 *
 * The PNG is generated as soon as the panel mounts, not on click: Safari only
 * lets `navigator.share` run inside a fresh user gesture, and awaiting fonts and
 * PNG encoding between the tap and the call would spend it.
 */
export function SharePanel({
  summary,
  render = renderShareCard,
}: {
  summary: ShareSummary
  /** Injectable so the dev preview can force a failure. */
  render?: (summary: ShareSummary) => Promise<Blob>
}) {
  const [state, setState] = useState<State>({ status: 'generating' })
  const [attempt, setAttempt] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    setState({ status: 'generating' })
    setHint(null)
    const started = performance.now()
    render(summary)
      .then((blob) => {
        if (cancelled) return
        const file = new File([blob], shareFileName(), { type: 'image/png' })
        url = URL.createObjectURL(file)
        setState({ status: 'ready', file, url, ms: Math.round(performance.now() - started) })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Share card generation failed', error)
        setState({ status: 'error' })
      })
    return () => {
      cancelled = true
      if (url !== null) URL.revokeObjectURL(url)
    }
  }, [summary, render, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const onShare = useCallback(async () => {
    if (state.status !== 'ready' || sharing) return
    setSharing(true)
    try {
      const outcome = await shareFile(state.file)
      setHint(
        outcome === 'downloaded'
          ? 'Your browser can’t share images directly, so we saved it to your downloads. Open WhatsApp or Instagram, start a status or story, and pick it from your gallery.'
          : null,
      )
    } finally {
      setSharing(false)
    }
  }, [state, sharing])

  const onDownload = useCallback(() => {
    if (state.status !== 'ready') return
    downloadFile(state.file)
    setHint('Saved to your downloads. Post it as a WhatsApp status or an Instagram story from your gallery.')
  }, [state])

  const generating = state.status === 'generating'
  const busy = generating || sharing

  return (
    <section
      aria-labelledby="share-heading"
      data-share-status={state.status}
      data-generation-ms={state.status === 'ready' ? state.ms : undefined}
      className="flex flex-col items-center gap-4"
    >
      <h2 id="share-heading" className="text-xl font-extrabold">
        Share your Wrapped
      </h2>

      <div className="relative aspect-[9/16] w-full max-w-64 overflow-hidden rounded-3xl bg-white/10 shadow-2xl shadow-fuchsia-950/40">
        {state.status === 'ready' && (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, nothing for next/image to optimise
          <img src={state.url} alt="Preview of your share card" className="h-full w-full object-cover" />
        )}
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 motion-safe:animate-pulse">
            <span className="text-5xl motion-safe:animate-wobble" aria-hidden="true">
              🎨
            </span>
            <span className="text-sm font-semibold">Generating…</span>
          </div>
        )}
        {state.status === 'error' && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <span className="text-5xl" aria-hidden="true">
              🫠
            </span>
            <p className="text-sm font-semibold">We couldn’t make your image. Give it another go.</p>
            <button type="button" onClick={retry} className={secondaryButton}>
              Retry
            </button>
          </div>
        )}
      </div>

      {state.status !== 'error' && (
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onShare}
            disabled={busy}
            aria-busy={busy}
            className={`${primaryButton} disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100`}
          >
            {generating ? 'Generating…' : 'Share'}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={generating}
            aria-busy={generating}
            className={`${secondaryButton} disabled:cursor-wait disabled:opacity-70`}
          >
            {generating ? 'Generating…' : 'Download'}
          </button>
        </div>
      )}

      <p aria-live="polite" className="min-h-5 text-center text-sm text-white/90">
        {hint}
      </p>
    </section>
  )
}
