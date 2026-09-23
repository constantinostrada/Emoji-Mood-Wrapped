/**
 * Recognising the one line shape everything else hangs off: the message header.
 *
 * Android:  `5/3/24, 14:03 - Ana: hola`
 * iOS:      `[5/3/24, 2:03:22 p. m.] Ana: hola`
 *
 * The bracket is the platform tell. Everything else (day/month order, 12h vs
 * 24h, seconds, 2- vs 4-digit year) varies per phone and is sniffed separately
 * in `detect-format.ts`.
 */

import type { Platform } from './types'

/** `5/3/24`, `05-03-2024`, `5.3.24` — the separator is not stable either. */
const DATE = String.raw`(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})`
/** `14:03`, `2:03:22`. */
const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?`
/** ` p. m.`, `PM`, `a.m.` — absent on 24h clocks. */
const MERIDIEM = String.raw`(?:\s*([ap])\.?\s?m\.?)?`

const ANDROID_HEADER = new RegExp(`^${DATE},?\\s${TIME}${MERIDIEM}\\s[-–—]\\s(.*)$`, 'i')
const IOS_HEADER = new RegExp(`^\\[${DATE},?\\s${TIME}${MERIDIEM}\\]\\s*(.*)$`, 'i')

/** A header before we know whether the first number is the day or the month. */
export interface RawHeader {
  /** First number of the date: day on DMY phones, month on MDY ones. */
  readonly first: number
  /** Second number of the date. */
  readonly second: number
  readonly year: number
  readonly yearDigits: 2 | 4
  readonly hour: number
  readonly minute: number
  readonly second_: number
  readonly hasSeconds: boolean
  readonly meridiem: 'a' | 'p' | null
  readonly platform: Platform
  /** Everything after the header: either `Autor: texto` or a system notice. */
  readonly body: string
}

function build(m: RegExpMatchArray, platform: Platform): RawHeader {
  const rawYear = m[3]
  return {
    first: Number(m[1]),
    second: Number(m[2]),
    year: Number(rawYear),
    yearDigits: rawYear.length <= 2 ? 2 : 4,
    hour: Number(m[4]),
    minute: Number(m[5]),
    second_: m[6] === undefined ? 0 : Number(m[6]),
    hasSeconds: m[6] !== undefined,
    meridiem: m[7] ? (m[7].toLowerCase() as 'a' | 'p') : null,
    platform,
    body: m[8] ?? '',
  }
}

/**
 * Parses a line's header, or returns `null` when the line is a continuation of
 * the previous message. Cheap enough to run once per line of a 50k-message
 * export: the `[` / digit first character rejects most continuations outright.
 */
export function matchHeader(line: string): RawHeader | null {
  if (line.length === 0) return null
  const firstChar = line.charCodeAt(0)
  if (firstChar === 0x5b /* [ */) {
    const m = IOS_HEADER.exec(line)
    return m ? build(m, 'ios') : null
  }
  // 0-9
  if (firstChar < 0x30 || firstChar > 0x39) return null
  const m = ANDROID_HEADER.exec(line)
  return m ? build(m, 'android') : null
}
