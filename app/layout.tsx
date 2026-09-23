import type { Metadata } from 'next'
import './globals.css'

import { WrappedSessionProvider } from './_components/session'

export const metadata: Metadata = {
  title: 'Emoji Mood Wrapped',
  description: 'Your WhatsApp chat as a Wrapped. Analyzed in your browser, never uploaded.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WrappedSessionProvider>{children}</WrappedSessionProvider>
      </body>
    </html>
  )
}
