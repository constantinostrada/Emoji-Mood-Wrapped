/**
 * Turns emoji in a string into single Private Use Area characters of the share
 * card's emoji font, so the browser never has to shape an emoji sequence.
 *
 * Browsers disagree on ZWJ sequences: Chrome splits 🤦🏽‍♀️ or 🏳️‍🌈 at the VS16
 * before it ever reaches the font's ligature table, and draws two emoji. The
 * font built by scripts/build-emoji-font.py gives every Twemoji glyph its own
 * PUA code point; this module maps sequences onto them by longest match.
 */

const PUA_START = 0xf0000
const VS16 = 0xfe0f

export interface EmojiIndex {
  /** Sequence key ("1f926-1f3fd-200d-2640", VS16 removed) → PUA code point. */
  readonly byKey: ReadonlyMap<string, number>
  /** Longest sequence, in code points, so matching knows where to start. */
  readonly maxLength: number
}

/** Parses the font's companion list: line N is U+F0000+N. */
export function parseEmojiIndex(text: string): EmojiIndex {
  const byKey = new Map<string, number>()
  let maxLength = 0
  text.split('\n').forEach((line, i) => {
    const key = line.trim()
    if (key === '') return
    byKey.set(key, PUA_START + i)
    maxLength = Math.max(maxLength, key.split('-').length)
  })
  return { byKey, maxLength }
}

/**
 * Replaces every emoji sequence the font knows with its PUA character. Text
 * is left alone: a lone code point below U+2000 (digits, ©, ®…) only becomes
 * an emoji when a VS16 asks for it, so "12,408" stays in the text font.
 */
export function toEmojiGlyphs(text: string, index: EmojiIndex): string {
  const tokens: { cp: number; vs16: boolean }[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp === VS16) {
      if (tokens.length > 0) tokens[tokens.length - 1].vs16 = true
      continue
    }
    tokens.push({ cp, vs16: false })
  }

  let out = ''
  let i = 0
  while (i < tokens.length) {
    let matched = 0
    for (let len = Math.min(index.maxLength, tokens.length - i); len >= 1; len--) {
      if (len === 1 && tokens[i].cp < 0x2000 && !tokens[i].vs16) continue
      const key = tokens
        .slice(i, i + len)
        .map((t) => t.cp.toString(16))
        .join('-')
      const pua = index.byKey.get(key)
      if (pua !== undefined) {
        out += String.fromCodePoint(pua)
        matched = len
        break
      }
    }
    if (matched === 0) {
      out += String.fromCodePoint(tokens[i].cp)
      matched = 1
    }
    i += matched
  }
  return out
}
