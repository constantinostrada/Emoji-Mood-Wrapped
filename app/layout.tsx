import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Emoji Mood Wrapped',
  description: 'Tu año de chats, en emojis. Todo se procesa en tu navegador.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
