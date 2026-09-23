/**
 * Turning the file the user dropped into the export text the parser reads.
 *
 * Android shares a bare `.txt`; iOS shares a `.zip` holding `_chat.txt` (plus
 * media, when the user did not pick "without media"). Both end up here as raw
 * bytes read in the browser — nothing in this module does I/O, so the file
 * never leaves the device.
 */

import { unzipSync } from 'fflate'

/** Largest file (or unpacked chat inside a zip) we agree to read. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024

export type IntakeErrorCode =
  /** Over {@link MAX_FILE_BYTES}, either as uploaded or once unzipped. */
  | 'FILE_TOO_LARGE'
  /** Neither a `.txt` nor a zip. */
  | 'UNSUPPORTED_FILE'
  /** A zip with no `.txt` inside. */
  | 'NO_CHAT_IN_ZIP'

export interface IntakeError {
  readonly code: IntakeErrorCode
  readonly details?: { readonly size: number; readonly limit: number }
}

export type IntakeResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: IntakeError }

/**
 * Checked before the file is read at all, so an oversized upload costs nothing.
 * Returns `null` when the size is acceptable.
 */
export function checkFileSize(size: number): IntakeError | null {
  return size > MAX_FILE_BYTES ? tooLarge(size) : null
}

/**
 * Bytes of an uploaded file to export text. Zips are recognised by their magic
 * number rather than their name, since iOS names them after the chat.
 */
export function decodeChatFile(
  name: string,
  bytes: Uint8Array,
  mimeType = '',
): IntakeResult {
  const sizeError = checkFileSize(bytes.byteLength)
  if (sizeError) return { ok: false, error: sizeError }

  if (isZip(bytes)) return extractFromZip(bytes)

  if (/\.txt$/i.test(name) || mimeType.startsWith('text/')) {
    return { ok: true, text: decodeUtf8(bytes) }
  }

  return { ok: false, error: { code: 'UNSUPPORTED_FILE' } }
}

function extractFromZip(bytes: Uint8Array): IntakeResult {
  let oversized: number | null = null

  let entries: Record<string, Uint8Array>
  try {
    // Only `.txt` entries are inflated: an iOS export with media can hold
    // hundreds of megabytes of photos we have no use for.
    entries = unzipSync(bytes, {
      filter: (file) => {
        if (!isChatEntry(file.name)) return false
        if (file.originalSize > MAX_FILE_BYTES) {
          oversized = file.originalSize
          return false
        }
        return true
      },
    })
  } catch {
    return { ok: false, error: { code: 'UNSUPPORTED_FILE' } }
  }

  const names = Object.keys(entries)
  if (names.length === 0) {
    return oversized === null
      ? { ok: false, error: { code: 'NO_CHAT_IN_ZIP' } }
      : { ok: false, error: tooLarge(oversized) }
  }

  // iOS always calls it `_chat.txt`; otherwise take the largest text file.
  const chosen =
    names.find((n) => basename(n) === '_chat.txt') ??
    names.reduce((a, b) => (entries[b].byteLength > entries[a].byteLength ? b : a))

  return { ok: true, text: decodeUtf8(entries[chosen]) }
}

function isChatEntry(path: string): boolean {
  // macOS-made zips carry `__MACOSX/._name.txt` resource forks: not text.
  return /\.txt$/i.test(path) && !path.startsWith('__MACOSX/') && !basename(path).startsWith('._')
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function decodeUtf8(bytes: Uint8Array): string {
  // Keep the BOM: `normalizeExport` owns stripping it, and this stays byte-faithful.
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
}

function tooLarge(size: number): IntakeError {
  return { code: 'FILE_TOO_LARGE', details: { size, limit: MAX_FILE_BYTES } }
}
