/**
 * Tokenising message text into countable words.
 *
 * Accents are folded for the *stopword check only* — `que` and `qué` are the
 * same filler — but the word kept in the tally is the one the person typed, so
 * a Wrapped card shows "mañana" and not "manana".
 */

import { STOPWORDS } from './stopwords'

/** Letters and digits, plus the apostrophe inside `don't`. */
const TOKEN = /[\p{L}\p{N}][\p{L}\p{N}']*/gu
/** Under three characters a word is almost always noise. */
const MIN_LENGTH = 3
/** Anything with a digit in it is a time, a price or a phone number. */
const HAS_DIGIT = /\p{N}/u

/** Anything outside Basic Latin, which is when accent folding can matter. */
const NON_ASCII = /[^\u0000-\u007F]/
const DIACRITIC = /\p{Diacritic}/gu

/**
 * Strips diacritics for the stopword lookup.
 *
 * Only called for words that actually have a non-ASCII character in them:
 * `normalize('NFD')` is expensive and most tokens in a chat do not need it.
 */
function foldForLookup(word: string): string {
  if (!NON_ASCII.test(word)) return word
  DIACRITIC.lastIndex = 0
  return word.normalize('NFD').replace(DIACRITIC, '')
}

/**
 * Adds the countable words of `text` to `into` and returns how many tokens the
 * message had in total, stopwords and all.
 *
 * One tokenisation does both jobs — the `total` feeds `wordCount` while the map
 * feeds `topWords` — because on a 50k-message chat a second pass over the same
 * text is measurable.
 */
export function collectWords(text: string, into: Map<string, number>): number {
  TOKEN.lastIndex = 0
  let total = 0
  let m: RegExpExecArray | null

  while ((m = TOKEN.exec(text)) !== null) {
    total++

    const raw = m[0].toLowerCase()
    if (raw.length < MIN_LENGTH) continue
    if (HAS_DIGIT.test(raw)) continue
    if (STOPWORDS.has(raw) || STOPWORDS.has(foldForLookup(raw))) continue

    into.set(raw, (into.get(raw) ?? 0) + 1)
  }

  return total
}
