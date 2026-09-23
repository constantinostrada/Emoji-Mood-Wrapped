/**
 * Turning an exported `.txt` into `ParseResult`.
 *
 * The whole thing is two passes over the lines. The first only collects
 * headers, because the day/month order can be settled by a date near the end of
 * the file and we need it before building a single `Date`. The second assembles
 * messages, folding in continuation lines.
 */

import { detectFormat, DEFAULT_DATE_ORDER } from './detect-format'
import {
  emptyFileError,
  err,
  MIN_MESSAGES,
  ok,
  tooFewMessagesError,
  unrecognizedFormatError,
  type Result,
} from './errors'
import { matchHeader, type RawHeader } from './header'
import { detectMedia } from './media'
import { isBlank, normalizeExport } from './normalize'
import { splitAuthoredBody } from './system-messages'
import type {
  ChatMessage,
  DateOrder,
  DateRange,
  ParseResult,
  ParseWarning,
  SystemMessage,
} from './types'

export interface ParseOptions {
  /** Applied when no date in the file can prove the order. Default `DMY`. */
  readonly defaultDateOrder?: DateOrder
  /** Minimum user messages required. Default {@link MIN_MESSAGES}. */
  readonly minMessages?: number
}

/** Mutable twin of `ChatMessage`, so continuation lines can extend the text. */
interface Draft {
  timestamp: Date
  author: string | null
  text: string
}

export function parseChat(raw: string, options: ParseOptions = {}): Result<ParseResult> {
  const minMessages = options.minMessages ?? MIN_MESSAGES

  const normalized = normalizeExport(raw)
  if (isBlank(normalized)) return err(emptyFileError())

  // The file's own trailing newline would otherwise become a blank
  // continuation line glued to the last message.
  const lines = normalized.replace(/\n+$/, '').split('\n')

  // Pass 1 — headers only. Kept aligned with `lines` so pass 2 does not rerun
  // the regex on 50k lines.
  const headers: Array<RawHeader | null> = new Array(lines.length)
  const found: RawHeader[] = []
  for (let i = 0; i < lines.length; i++) {
    const h = matchHeader(lines[i])
    headers[i] = h
    if (h !== null) found.push(h)
  }

  if (found.length === 0) return err(unrecognizedFormatError())

  const detection = detectFormat(found, options.defaultDateOrder ?? DEFAULT_DATE_ORDER)
  if (detection === null) return err(unrecognizedFormatError())
  const { format } = detection

  const warnings: ParseWarning[] = []
  if (detection.dateOrderAmbiguous) {
    warnings.push({
      code: 'AMBIGUOUS_DATE_ORDER',
      message:
        `Ninguna fecha del archivo permite distinguir día de mes (todos los valores son 12 o menos). ` +
        `Asumimos el formato ${format.dateOrder === 'DMY' ? 'día/mes' : 'mes/día'}; ` +
        `si tu Wrapped muestra meses raros, es por esto.`,
    })
  }

  // Pass 2 — assemble.
  const messages: ChatMessage[] = []
  const systemMessages: SystemMessage[] = []
  const participants: string[] = []
  const seen = new Set<string>()

  let draft: Draft | null = null
  let leadingGarbage = 0

  const flush = () => {
    if (draft === null) return
    if (draft.author === null) {
      systemMessages.push({ timestamp: draft.timestamp, text: draft.text })
    } else {
      messages.push({
        timestamp: draft.timestamp,
        author: draft.author,
        text: draft.text,
        media: detectMedia(draft.text),
      })
      if (!seen.has(draft.author)) {
        seen.add(draft.author)
        participants.push(draft.author)
      }
    }
    draft = null
  }

  for (let i = 0; i < lines.length; i++) {
    const header = headers[i]

    if (header === null) {
      const line = lines[i]
      if (draft !== null) {
        // A line that does not start with a date belongs to the message above
        // it — that is how multi-line messages survive the export.
        draft.text += '\n' + line
      } else if (line.trim().length > 0) {
        leadingGarbage++
      }
      continue
    }

    flush()
    const authored = splitAuthoredBody(header.body)
    draft = {
      timestamp: buildTimestamp(header, format.dateOrder, format.clock),
      author: authored === null ? null : authored.author,
      text: authored === null ? header.body : authored.text,
    }
  }
  flush()

  if (leadingGarbage > 0) {
    warnings.push({
      code: 'LEADING_GARBAGE',
      message: `Ignoramos ${leadingGarbage} ${
        leadingGarbage === 1 ? 'línea' : 'líneas'
      } al principio del archivo porque aparecen antes del primer mensaje.`,
    })
  }

  if (messages.length < minMessages) {
    return err(tooFewMessagesError(messages.length))
  }

  return ok({
    messages,
    participants,
    dateRange: dateRangeOf(messages),
    format,
    warnings,
    systemMessages,
  })
}

/**
 * Min and max rather than first and last: an export whose date order had to be
 * assumed can come out of order, and a negative range would break every
 * per-day statistic downstream.
 */
function dateRangeOf(messages: readonly ChatMessage[]): DateRange {
  let from = messages[0].timestamp
  let to = messages[0].timestamp
  for (const m of messages) {
    if (m.timestamp < from) from = m.timestamp
    if (m.timestamp > to) to = m.timestamp
  }
  return { from, to }
}

/**
 * Builds a local `Date` from a header. No timezone maths: the export already
 * holds the phone's local time, and shifting it would move midnight messages
 * into the wrong day, which is exactly what the "activity by hour" card reads.
 */
function buildTimestamp(
  header: RawHeader,
  order: DateOrder,
  clock: '12h' | '24h',
): Date {
  const day = order === 'DMY' ? header.first : header.second
  const month = order === 'DMY' ? header.second : header.first

  // Exports only exist from 2009 on, so a 2-digit year is unambiguously 20xx.
  const year = header.yearDigits === 2 ? 2000 + header.year : header.year

  let hour = header.hour
  if (clock === '12h' && header.meridiem !== null) {
    if (header.meridiem === 'p' && hour < 12) hour += 12
    else if (header.meridiem === 'a' && hour === 12) hour = 0
  }

  return new Date(year, month - 1, day, hour, header.minute, header.second_)
}
