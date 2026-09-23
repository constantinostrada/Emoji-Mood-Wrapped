export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-4xl font-bold tracking-tight">Emoji Mood Wrapped</h1>
      <p className="text-lg opacity-80">
        Subí un export de WhatsApp y mirá tu año en emojis. Nada sale de tu
        navegador.
      </p>
      <p className="text-sm opacity-60">
        El motor de parseo y estadísticas vive en <code>lib/</code>. La interfaz
        llega en las siguientes piezas.
      </p>
    </main>
  )
}
