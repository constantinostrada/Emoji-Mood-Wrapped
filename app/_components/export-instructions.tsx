'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'

import { focusRing } from './ui'

const PLATFORMS = [
  {
    key: 'android',
    label: 'Android',
    steps: [
      <>Open the chat → <b>⋮</b> → <b>More</b> → <b>Export chat</b></>,
      <>Choose <b>Without media</b></>,
      <>Save the <b>.txt</b> and upload it here</>,
    ],
  },
  {
    key: 'ios',
    label: 'iPhone',
    steps: [
      <>Open the chat → tap the <b>name</b> at the top</>,
      <><b>Export chat</b> → <b>Without media</b></>,
      <>Save to Files and upload the <b>.zip</b> — no need to unzip</>,
    ],
  },
] as const

/** Android / iPhone export steps as an accessible tab set. */
export function ExportInstructions({ className = '' }: { className?: string }) {
  const [active, setActive] = useState(0)
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + PLATFORMS.length) % PLATFORMS.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section aria-labelledby={`${id}-title`} className={`rounded-3xl bg-black/25 p-4 text-left ${className}`}>
      <h2 id={`${id}-title`} className="mb-3 text-sm font-bold uppercase tracking-wider text-white/80">
        How to export your chat
      </h2>
      {/* Both tabs stay in the Tab order (not roving) so Tab + Enter alone can switch them. */}
      <div role="tablist" aria-label="Phone" className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1" onKeyDown={onKeyDown}>
        {PLATFORMS.map((p, i) => (
          <button
            key={p.key}
            ref={(el) => {
              tabs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${p.key}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel-${p.key}`}
            onClick={() => setActive(i)}
            className={`min-h-10 rounded-full text-sm font-bold transition ${focusRing} ${
              active === i ? 'bg-white text-violet-700' : 'text-white/80 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {PLATFORMS.map((p, i) => (
        <ol
          key={p.key}
          role="tabpanel"
          id={`${id}-panel-${p.key}`}
          aria-labelledby={`${id}-tab-${p.key}`}
          hidden={active !== i}
          className="space-y-1.5 text-sm"
        >
          {p.steps.map((step, n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">
                {n + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ))}
    </section>
  )
}
