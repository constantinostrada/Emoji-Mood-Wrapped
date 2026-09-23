/**
 * Working out the shape of one concrete export from the export itself.
 *
 * Platform, clock and seconds are stable across a file, so the first handful of
 * headers settle them. Day/month order is the hard one: `05/03/24` is March 5th
 * on a Spanish phone and May 3rd on a US one, and the only reliable evidence is
 * a date somewhere in the file where one of the two numbers is over 12. That
 * evidence can be thousands of lines in, so this scan covers every header.
 */

import type { ChatFormat, DateOrder, Platform } from './types'
import type { RawHeader } from './header'

/** What we assume when a file's dates are all ambiguous (every number ≤ 12). */
export const DEFAULT_DATE_ORDER: DateOrder = 'DMY'

/** Headers past this point can still prove the date order, but not the rest. */
const SNIFF_HEADERS = 50

export interface FormatDetection {
  readonly format: ChatFormat
  /** `true` when nothing in the file could prove the day/month order. */
  readonly dateOrderAmbiguous: boolean
}

/**
 * @param headers every header in the file, in order. Callers that already made
 * one pass over the lines pass the headers they collected rather than paying
 * for a second regex sweep.
 */
export function detectFormat(
  headers: readonly RawHeader[],
  defaultOrder: DateOrder = DEFAULT_DATE_ORDER,
): FormatDetection | null {
  if (headers.length === 0) return null

  const sniff = headers.slice(0, SNIFF_HEADERS)

  // Platform: the bracket either is there or it is not. A stray mismatch (a
  // quoted line that happens to look like the other platform) loses the vote.
  let iosVotes = 0
  for (const h of sniff) if (h.platform === 'ios') iosVotes++
  const platform: Platform = iosVotes * 2 >= sniff.length ? 'ios' : 'android'

  // Clock: a meridiem marker anywhere proves 12h; an hour above 12 proves 24h.
  // Neither showing up (a 12h chat that only ever ran between 1 and 12 without
  // markers) is not a thing WhatsApp produces, so 24h is the safe fallback.
  let has12hMarker = false
  let hasHourAbove12 = false
  let hasSecondsVotes = 0
  let fourDigitYears = 0
  for (const h of sniff) {
    if (h.meridiem !== null) has12hMarker = true
    if (h.hour > 12) hasHourAbove12 = true
    if (h.hasSeconds) hasSecondsVotes++
    if (h.yearDigits === 4) fourDigitYears++
  }

  const { order, proven } = resolveDateOrder(headers, defaultOrder)

  return {
    format: {
      platform,
      dateOrder: order,
      clock: has12hMarker && !hasHourAbove12 ? '12h' : '24h',
      hasSeconds: hasSecondsVotes * 2 >= sniff.length,
      yearDigits: fourDigitYears * 2 >= sniff.length ? 4 : 2,
      dateOrderConfidence: proven ? 'proven' : 'assumed',
    },
    dateOrderAmbiguous: !proven,
  }
}

/**
 * Decides day/month order by looking for a number that cannot be a month.
 *
 * A file can contain evidence for both orders only if it is corrupt or hand
 * edited; in that case neither side wins and we fall back to the default, the
 * same as if there were no evidence at all.
 */
function resolveDateOrder(
  headers: readonly RawHeader[],
  defaultOrder: DateOrder,
): { order: DateOrder; proven: boolean } {
  let firstOver12 = false
  let secondOver12 = false

  for (const h of headers) {
    if (h.first > 12) {
      firstOver12 = true
      if (secondOver12) break
    }
    if (h.second > 12) {
      secondOver12 = true
      if (firstOver12) break
    }
  }

  if (firstOver12 && !secondOver12) return { order: 'DMY', proven: true }
  if (secondOver12 && !firstOver12) return { order: 'MDY', proven: true }
  return { order: defaultOrder, proven: false }
}
