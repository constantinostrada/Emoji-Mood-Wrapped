/**
 * Counting emoji the way a human would count them.
 *
 * "👨‍👩‍👧" is seven code points and one emoji. "🏳️‍🌈" is four and one. A skin
 * tone is two. Splitting on code points — or worse, on UTF-16 units — turns a
 * family into three people, so everything here works on grapheme clusters via
 * `Intl.Segmenter`, which knows the ZWJ and modifier rules.
 */

/** Building one is expensive; the rules are locale-independent for graphemes. */
const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' })

/** Covers every emoji base, plus the flag pairs that are not pictographic. */
const HAS_EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u
/** Two regional indicators = one country flag. */
const FLAG = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u
/** Emoji-by-default characters; the rest need an explicit U+FE0F to qualify. */
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u
const VARIATION_SELECTOR_16 = '️'
/** Keycap bases. Excluded by the spec: `1️⃣`, `#️⃣` and `*️⃣` are not emoji here. */
const KEYCAP_BASE = /^[0-9#*]/

/**
 * Whether one grapheme cluster counts as an emoji.
 *
 * The `Emoji_Presentation` check is what keeps `™`, `©` and `↔` out of the top
 * emoji list: they are pictographic but render as text unless someone typed the
 * emoji variation selector after them.
 */
export function isEmojiGrapheme(grapheme: string): boolean {
  if (grapheme.length === 0) return false
  if (KEYCAP_BASE.test(grapheme)) return false
  if (FLAG.test(grapheme)) return true
  if (!PICTOGRAPHIC.test(grapheme)) return false
  if (EMOJI_PRESENTATION.test(grapheme)) return true
  return grapheme.includes(VARIATION_SELECTOR_16)
}

/**
 * Every character that can take part in an emoji sequence: the pictographs
 * themselves, flag halves, skin tones, the joiner, the emoji variation
 * selector, the keycap mark and the tag characters behind subdivision flags.
 *
 * Digits, `#` and `*` are left out on purpose. They are emoji components only
 * as keycap bases, and keycaps do not count here anyway.
 */
const EMOJI_RUN =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u200D\uFE0F\u20E3\u{E0020}-\u{E007F}]+/gu

/**
 * Adds every emoji in `text` to `into`.
 *
 * Mutating a caller-owned map keeps the statistics pass allocation-free per
 * message. The two-step scan is what makes 50k messages fit in the budget:
 * `HAS_EMOJI` skips plain-text messages outright, and `EMOJI_RUN` then hands
 * the segmenter only the few characters that could be an emoji instead of a
 * whole paragraph. The segmenter still decides where one emoji ends and the
 * next begins — that is the part nobody should hand-roll.
 */
export function collectEmojis(text: string, into: Map<string, number>): number {
  if (!HAS_EMOJI.test(text)) return 0

  EMOJI_RUN.lastIndex = 0
  let total = 0
  let run: RegExpExecArray | null

  while ((run = EMOJI_RUN.exec(text)) !== null) {
    for (const { segment } of segmenter.segment(run[0])) {
      if (!isEmojiGrapheme(segment)) continue
      into.set(segment, (into.get(segment) ?? 0) + 1)
      total++
    }
  }

  return total
}

/** Convenience wrapper for tests and one-off callers. */
export function countEmojis(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  collectEmojis(text, counts)
  return counts
}
