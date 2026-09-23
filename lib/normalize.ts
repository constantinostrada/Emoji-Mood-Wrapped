/**
 * Text cleanup that has to happen *before* anything tries to match a line.
 *
 * WhatsApp exports are full of invisible characters that break naive regexes:
 * iOS wraps every timestamp in bidi marks, and both platforms use a narrow
 * no-break space between the time and `a. m.` / `p. m.`. To a regex looking
 * for `" "` those are simply not spaces.
 */

/** Byte-order mark, which iOS puts at the head of the file. */
const BOM = /﻿/g
/** Left-to-right and right-to-left marks sprinkled around timestamps. */
const BIDI_MARKS = /[‎‏؜⁦-⁩]/g
/** Narrow no-break space (U+202F) and regular no-break space (U+00A0). */
const NB_SPACES = /[  ]/g
/** Windows and classic-Mac line endings. */
const LINE_ENDINGS = /\r\n?/g

/**
 * Strips invisible characters and unifies line endings, leaving a string whose
 * lines can be matched with ordinary `\s` and `-` patterns.
 */
export function normalizeExport(raw: string): string {
  return raw
    .replace(BOM, '')
    .replace(BIDI_MARKS, '')
    .replace(NB_SPACES, ' ')
    .replace(LINE_ENDINGS, '\n')
}

/** `true` once the file has nothing but whitespace left. */
export function isBlank(text: string): boolean {
  return text.trim().length === 0
}
