import type { ChatAnalysis } from '@/lib'

import { focusRing, Screen, ScreenHeading, WarningsNote } from './ui'

const choice = `flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white/15 px-5 text-left text-xl font-bold transition hover:bg-white/25 active:scale-[0.98] ${focusRing}`

export function WhoScreen({
  analysis,
  onPick,
  onBack,
}: {
  analysis: ChatAnalysis
  onPick: (participant: string | null) => void
  onBack: () => void
}) {
  return (
    <Screen>
      <button type="button" onClick={onBack} className={`self-start text-sm font-semibold text-white/80 hover:text-white ${focusRing}`}>
        ← Another chat
      </button>
      <ScreenHeading className="text-center text-4xl">¿Quién sos vos?</ScreenHeading>
      <p className="text-center text-white/85">Who are you in this chat? Be honest, we’ll find out anyway.</p>
      <ul className="space-y-3">
        {analysis.participants.map((name) => (
          <li key={name}>
            <button type="button" onClick={() => onPick(name)} className={choice}>
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/25 text-lg">
                {Array.from(name)[0]?.toUpperCase()}
              </span>
              <span className="truncate">{name}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => onPick(null)} className={`${choice} bg-yellow-300/20 hover:bg-yellow-300/30`}>
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center text-2xl">👥</span>
            <span>Everyone / the whole chat</span>
          </button>
        </li>
      </ul>
      <WarningsNote warnings={analysis.warnings} />
    </Screen>
  )
}
