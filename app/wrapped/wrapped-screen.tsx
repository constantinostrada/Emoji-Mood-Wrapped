import Link from 'next/link'

import type { WrappedStats } from '@/lib'

/**
 * Placeholder for the Wrapped cards, which are their own piece of work. It only
 * proves the seam: this component receives the chosen scope's `WrappedStats`.
 */
export function WrappedScreen({ stats }: { stats: WrappedStats }) {
  const who = stats.participant ?? 'The whole chat'
  const topEmoji = stats.emojis.top[0]?.emoji ?? '🫥'

  return (
    <main
      data-participant={stats.participant ?? ''}
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10"
    >
      <p className="text-sm font-semibold uppercase tracking-widest text-fuchsia-300">Your Wrapped</p>
      <h1 className="text-4xl font-black tracking-tight">{who}</h1>
      <p className="text-8xl" aria-hidden="true">{topEmoji}</p>
      <dl className="grid grid-cols-2 gap-3 text-center">
        <Stat label="Messages" value={stats.messages.total} />
        <Stat label="Emojis" value={stats.emojis.total} />
        <Stat label="Laughs" value={stats.laughs.total} />
        <Stat label="Longest streak (days)" value={stats.streak.longestDays} />
      </dl>
      <Link
        href="/"
        className="rounded-full border border-white/30 px-6 py-3 text-center font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
      >
        Analyze another chat
      </Link>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="text-3xl font-bold">{value.toLocaleString()}</dd>
    </div>
  )
}
