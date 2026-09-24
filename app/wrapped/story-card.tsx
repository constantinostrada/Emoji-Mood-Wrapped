import type { CSSProperties } from 'react'

import { primaryButton, secondaryButton } from '../_components/ui'
import { DISCLAIMER, isFinalCard, type Card, type Viz } from './deck'

/**
 * One full-screen card. It is remounted on every change (keyed by id), which
 * replays the entry animations; they only touch `transform` and `opacity` so
 * the compositor can run them at 60 fps without layout work.
 */
export function StoryCard({
  card,
  onRestart,
  onReplay,
}: {
  card: Card
  onRestart: () => void
  onReplay: () => void
}) {
  return (
    <article
      data-card={card.id}
      data-variant={card.variant}
      className="flex h-full min-h-0 flex-col"
      style={{ background: card.background }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-hidden px-6 pt-10 pb-2">
        <p className="motion-safe:animate-card-in text-sm font-bold uppercase tracking-[0.2em] text-white/80">
          {card.kicker}
        </p>
        <div
          aria-hidden="true"
          className="motion-safe:animate-pop text-7xl leading-none drop-shadow-lg sm:text-8xl"
        >
          {card.emoji}
        </div>
        <h2 className="motion-safe:animate-card-in text-3xl font-black leading-tight tracking-tight text-balance">
          {card.headline}
        </h2>
        {card.value !== undefined && (
          <p className="motion-safe:animate-card-in-late text-5xl font-black tracking-tight text-yellow-200 break-words">
            {card.value}
          </p>
        )}
        {card.body !== undefined && (
          <p className="motion-safe:animate-card-in-late text-lg font-medium leading-snug text-white/90">
            {card.body}
          </p>
        )}
        {card.viz !== undefined && <Visual viz={card.viz} />}
        {card.aside !== undefined && (
          <p className="motion-safe:animate-card-in-late rounded-2xl bg-black/20 px-4 py-3 text-base font-semibold text-white/90">
            {card.aside}
          </p>
        )}
        {isFinalCard(card) && (
          <>
            <ul className="motion-safe:animate-card-in-late space-y-1 text-lg font-medium text-white/90">
              {card.summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <dl className="motion-safe:animate-card-in-late grid grid-cols-3 gap-2 text-center">
              {card.summary.highlights.map((h) => (
                <div key={h.label} className="rounded-2xl bg-black/20 px-2 py-3">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-white/75">{h.label}</dt>
                  <dd className="text-sm font-black leading-tight">{h.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2 pt-1">
              <button type="button" onClick={onRestart} className={primaryButton}>
                Analyze another chat
              </button>
              <button type="button" onClick={onReplay} className={secondaryButton}>
                Watch again
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="shrink-0 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-sm font-semibold text-white">
        <span className="inline-block rounded-2xl bg-black/30 px-3 py-1 text-balance">{DISCLAIMER}</span>
      </footer>
    </article>
  )
}

function delay(i: number): CSSProperties {
  return { animationDelay: `${120 + i * 35}ms` }
}

/** A meter filled to `percent`; the animation grows it from 0 to `--fill`. */
function fill(percent: number, i: number): CSSProperties {
  return { '--fill': percent / 100, transform: 'scaleX(var(--fill))', ...delay(i) } as CSSProperties
}

function Visual({ viz }: { viz: Viz }) {
  switch (viz.kind) {
    case 'bars': {
      const max = Math.max(1, ...viz.bars.map((b) => b.value))
      return (
        <div aria-hidden="true" className="flex h-28 items-end gap-[3px]">
          {viz.bars.map((bar, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
              <div
                className={`motion-safe:animate-grow-up origin-bottom rounded-t-sm ${bar.highlight ? 'bg-yellow-300' : 'bg-white/45'}`}
                style={{ height: `${Math.max(4, (bar.value / max) * 100)}%`, ...delay(i) }}
              />
              <span className={`h-3 text-center text-[0.6rem] font-bold leading-3 ${viz.compact ? 'text-white/70' : 'text-white'}`}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      )
    }
    case 'ranking':
      return (
        <ol className="space-y-1.5">
          {viz.items.map((item, i) => (
            <li
              key={item.label}
              className="motion-safe:animate-card-in flex items-center gap-3 rounded-xl bg-black/20 px-3 py-1.5"
              style={delay(i * 2)}
            >
              <span className="w-5 text-sm font-black text-white/70">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xl font-bold">{item.label}</span>
              <span className="text-sm font-bold text-white/80">{item.count}</span>
            </li>
          ))}
        </ol>
      )
    case 'chips':
      return (
        <ul className="flex flex-wrap gap-2">
          {viz.items.map((item, i) => (
            <li
              key={item.label}
              className="motion-safe:animate-pop rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold"
              style={delay(i * 2)}
            >
              {item.label} <span className="text-yellow-200">{item.count}</span>
            </li>
          ))}
        </ul>
      )
    case 'meters':
      return (
        <ul className="space-y-4">
          {viz.items.map((item, i) => (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-bold">{item.label}</span>
                <span className="text-3xl font-black text-yellow-200">{item.percent}%</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/30">
                <div
                  className="motion-safe:animate-grow-right h-full origin-left rounded-full bg-yellow-300"
                  style={fill(item.percent, i * 4)}
                />
              </div>
              <p className="mt-1 text-sm text-white/80">{item.caption}</p>
            </li>
          ))}
        </ul>
      )
    case 'share':
      return (
        <div>
          <div className="h-4 overflow-hidden rounded-full bg-black/30">
            <div
              className="motion-safe:animate-grow-right h-full origin-left rounded-full bg-yellow-300"
              style={fill(viz.percent, 0)}
            />
          </div>
          <p className="mt-1 text-sm text-white/80">{viz.caption}</p>
        </div>
      )
  }
}
