'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'

import { analyzeExport, checkFileSize, decodeChatFile, type ChatAnalysis } from '@/lib'

import { intakeErrorCopy, parseErrorCopy, READ_FAILED_COPY, type ErrorCopy } from './copy'
import { ExportInstructions } from './export-instructions'
import { focusRing, primaryButton, PrivacyNote, Screen, ScreenHeading, secondaryButton } from './ui'

type Status = { kind: 'idle' } | { kind: 'reading' } | { kind: 'error'; copy: ErrorCopy }

/**
 * Reads the dropped file with the browser's File API and analyses it right
 * here. There is no fetch anywhere in this flow: the bytes never leave memory.
 */
export function UploadScreen({
  onAnalyzed,
  onBack,
}: {
  onAnalyzed: (analysis: ChatAnalysis) => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // A file dropped next to the zone would otherwise make the browser open it
  // and navigate away from the app.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => e.preventDefault()
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  useEffect(() => {
    if (status.kind === 'error') errorRef.current?.focus()
  }, [status])

  async function handleFile(file: File | undefined) {
    if (!file) return
    // Reset so picking the same file again still fires `change`.
    if (input.current) input.current.value = ''

    const sizeError = checkFileSize(file.size)
    if (sizeError) {
      setStatus({ kind: 'error', copy: intakeErrorCopy(sizeError) })
      return
    }

    setStatus({ kind: 'reading' })
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await file.arrayBuffer())
    } catch {
      setStatus({ kind: 'error', copy: READ_FAILED_COPY })
      return
    }

    const decoded = decodeChatFile(file.name, bytes, file.type)
    if (!decoded.ok) {
      setStatus({ kind: 'error', copy: intakeErrorCopy(decoded.error) })
      return
    }

    // Let the "reading" state paint before the synchronous analysis runs.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const analysis = analyzeExport(decoded.text)
    if (!analysis.ok) {
      setStatus({ kind: 'error', copy: parseErrorCopy(analysis.error) })
      return
    }
    onAnalyzed(analysis.value)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  const reading = status.kind === 'reading'

  return (
    <Screen>
      <button type="button" onClick={onBack} className={`self-start text-sm font-semibold text-white/80 hover:text-white ${focusRing}`}>
        ← Back
      </button>
      <ScreenHeading className="text-center text-3xl">Drop your chat here</ScreenHeading>
      <PrivacyNote />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-busy={reading}
        className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-8 text-center transition ${
          dragging ? 'scale-[1.02] border-yellow-300 bg-white/20' : 'border-white/50 bg-white/10'
        }`}
      >
        <div aria-hidden="true" className={`text-6xl ${reading ? 'motion-safe:animate-spin' : 'motion-safe:animate-wobble'}`}>
          {reading ? '🌀' : '📥'}
        </div>
        <p className="font-semibold">
          {reading ? 'Opening your chat…' : 'Drag your .txt or iPhone .zip here'}
        </p>
        <p className="text-sm text-white/70">or</p>
        <button type="button" disabled={reading} onClick={() => input.current?.click()} className={`${primaryButton} disabled:opacity-60`}>
          Choose file
        </button>
        <input
          ref={input}
          type="file"
          accept=".txt,.zip,text/plain,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <p className="text-xs text-white/60">.txt or .zip · up to 20 MB</p>
      </div>

      {status.kind === 'error' && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="space-y-2 rounded-3xl bg-rose-950/60 p-5 outline-none ring-2 ring-rose-300/60">
          <p className="text-lg font-extrabold">
            <span aria-hidden="true">{status.copy.emoji} </span>
            {status.copy.title}
          </p>
          <p className="text-sm text-white/90">{status.copy.message}</p>
          <button type="button" onClick={() => input.current?.click()} className={secondaryButton}>
            Try another file
          </button>
        </div>
      )}

      <details open={status.kind === 'error' && status.copy.showExportHelp} className="group">
        <summary className={`cursor-pointer text-center text-sm font-semibold text-white/80 ${focusRing}`}>
          How do I export my chat?
        </summary>
        <ExportInstructions className="mt-3" />
      </details>
    </Screen>
  )
}
