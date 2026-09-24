/**
 * The share card's data model and the pure pieces of exporting it.
 *
 * `ShareSummary` is the seam with the Wrapped screen: its final card exposes
 * this summary and the share card only draws it. Everything here is DOM-free —
 * text measuring and the browser's share/download APIs are passed in — so the
 * layout and share decisions stay testable in Node.
 */

import type { WrappedStats } from './types'

export interface ShareStat {
  /** Already formatted for display, e.g. "12,408". */
  readonly value: string
  readonly label: string
}

export interface ShareSummary {
  /** The Wrapped's headline, e.g. "Ana's Wrapped". */
  readonly title: string
  /** The one emoji that represents the result, drawn big. */
  readonly emoji: string
  readonly stats: readonly [ShareStat, ShareStat, ShareStat]
  /** A short, playful non-medical diagnosis. */
  readonly diagnosis: string
  /** `YYYY-MM-DD`, inclusive. */
  readonly dateRange: { readonly from: string; readonly to: string }
}

export const APP_NAME = 'Emoji Mood Wrapped'

export const SHARE_DISCLAIMER =
  'For entertainment only. Not a medical or psychological diagnosis. Your chat never left your device.'

/** Stand-in until the Wrapped cards piece exposes its own summary. */
export const SAMPLE_SUMMARY: ShareSummary = {
  title: 'Your Chaos Wrapped',
  emoji: '😂',
  stats: [
    { value: '12,408', label: 'messages' },
    { value: '3,127', label: 'jajajas' },
    { value: '1:37 AM', label: 'peak hour' },
  ],
  diagnosis: 'Acute Jajaja Syndrome with chronic 💀 overuse. Prognosis: unbearably fun.',
  dateRange: { from: '2025-09-24', to: '2026-09-23' },
}

/**
 * A naive summary built straight from `WrappedStats`, so /wrapped has
 * something real to share until the Wrapped cards piece lands with the proper
 * title and diagnosis.
 */
export function summaryFromStats(stats: WrappedStats): ShareSummary {
  const n = (value: number) => value.toLocaleString('en-US')
  const laughRate = stats.messages.total === 0 ? 0 : stats.laughs.total / stats.messages.total
  return {
    title: stats.participant === null ? 'The Chat’s Wrapped' : `${stats.participant}’s Wrapped`,
    emoji: stats.emojis.top[0]?.emoji ?? '🫥',
    stats: [
      { value: n(stats.messages.total), label: 'messages' },
      { value: n(stats.laughs.total), label: 'laughs' },
      { value: formatHour(stats.activity.busiestHour), label: 'peak hour' },
    ],
    diagnosis:
      laughRate > 0.1
        ? 'Terminal case of the giggles. Keep away from serious meetings.'
        : 'Suspiciously composed. Possibly laughing on the inside.',
    dateRange: { from: stats.period.firstDay, to: stats.period.lastDay },
  }
}

function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12} ${hour < 12 ? 'AM' : 'PM'}`
}

/** "24 Sep 2025 – 23 Sep 2026"; the year is only repeated when it changes. */
export function formatDateRange({ from, to }: ShareSummary['dateRange']): string {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const month = (m: number) =>
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
  const end = `${td} ${month(tm)} ${ty}`
  if (from === to) return end
  return fy === ty ? `${fd} ${month(fm)} – ${end}` : `${fd} ${month(fm)} ${fy} – ${end}`
}

/** `emoji-mood-wrapped-2026-09-24.png`, dated with the local day of export. */
export function shareFileName(now: Date = new Date()): string {
  const pad = (v: number) => String(v).padStart(2, '0')
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `emoji-mood-wrapped-${day}.png`
}

// ---------------------------------------------------------------------------
// Text layout
// ---------------------------------------------------------------------------

/** Width of `text` at font size `size`, in the same units as `maxWidth`. */
export type MeasureText = (text: string, size: number) => number

/**
 * Greedy word wrap. A single word wider than the line is kept whole on its own
 * line; the caller shrinks the font when that happens (see {@link fitText}).
 */
export function wrapLines(text: string, maxWidth: number, size: number, measure: MeasureText): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (line !== '' && measure(candidate, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line !== '') lines.push(line)
  return lines
}

/**
 * The largest size from `maxSize` down to `minSize` at which `text` wraps into
 * at most `maxLines` lines that all fit `maxWidth`. At `minSize` it gives up
 * shrinking and truncates the last line with an ellipsis instead.
 */
export function fitText(
  text: string,
  opts: { maxWidth: number; maxLines: number; maxSize: number; minSize: number; step?: number },
  measure: MeasureText,
): { size: number; lines: string[] } {
  const step = opts.step ?? 4
  for (let size = opts.maxSize; size >= opts.minSize; size -= step) {
    const lines = wrapLines(text, opts.maxWidth, size, measure)
    if (lines.length <= opts.maxLines && lines.every((l) => measure(l, size) <= opts.maxWidth)) {
      return { size, lines }
    }
  }
  const size = opts.minSize
  const all = wrapLines(text, opts.maxWidth, size, measure)
  const lines = all.slice(0, opts.maxLines)
  const last = lines.length - 1
  if (last >= 0 && (all.length > opts.maxLines || measure(lines[last], size) > opts.maxWidth)) {
    // Trim by code point so a surrogate pair (emoji) is never split in half.
    const chars = Array.from(lines[last])
    while (chars.length > 0 && measure(`${chars.join('')}…`, size) > opts.maxWidth) chars.pop()
    lines[last] = `${chars.join('').trimEnd()}…`
  }
  return { size, lines }
}

// ---------------------------------------------------------------------------
// Share or download
// ---------------------------------------------------------------------------

/** The slice of `navigator` plus a download fallback that sharing needs. */
export interface ShareEnvironment {
  readonly canShare?: (data: { files: File[] }) => boolean
  readonly share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>
  readonly download: (file: File) => void
}

/**
 * - `shared`: the native share sheet took the file.
 * - `cancelled`: the sheet opened and the person closed it — not an error.
 * - `downloaded`: no file sharing here, so the PNG was downloaded instead and
 *   the UI should explain how to share it by hand.
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

export async function shareOrDownload(file: File, env: ShareEnvironment): Promise<ShareOutcome> {
  const canShareFiles =
    typeof env.share === 'function' &&
    typeof env.canShare === 'function' &&
    safeCanShare(env.canShare, file)

  if (canShareFiles) {
    try {
      await env.share!({ files: [file], title: APP_NAME })
      return 'shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      // Anything else (NotAllowedError when the gesture expired, a flaky
      // platform share target…) falls through to the download, so the button
      // never ends up doing nothing.
    }
  }
  env.download(file)
  return 'downloaded'
}

function safeCanShare(canShare: NonNullable<ShareEnvironment['canShare']>, file: File): boolean {
  try {
    return canShare({ files: [file] })
  } catch {
    return false
  }
}

function isAbort(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}
