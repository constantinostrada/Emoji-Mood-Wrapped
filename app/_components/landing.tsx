import { ExportInstructions } from './export-instructions'
import { PrivacyNote, primaryButton, ScreenHeading } from './ui'

export function Landing({ onStart, focusHeading }: { onStart: () => void; focusHeading: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-5 py-6 text-center">
      <div aria-hidden="true" className="text-7xl motion-safe:animate-wobble">😵‍💫</div>
      <ScreenHeading focusOnMount={focusHeading} className="text-4xl leading-none sm:text-5xl">
        Emoji Mood Wrapped
      </ScreenHeading>
      <p className="text-lg font-medium text-white/90">
        Your WhatsApp chat, turned into a brutally honest Wrapped. Your emojis have been talking. 👀
      </p>
      <button type="button" onClick={onStart} className={primaryButton}>
        Analyze my chat <span aria-hidden="true">→</span>
      </button>
      <PrivacyNote />
      <ExportInstructions className="w-full" />
    </main>
  )
}
