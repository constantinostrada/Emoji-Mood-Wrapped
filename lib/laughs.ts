/**
 * Counting laughs, by dialect.
 *
 * A laugh is a run, not a syllable: `jajajaja` is one laugh, not four. Each
 * variant gets its own pattern and they are written so they cannot overlap —
 * `jaja` needs a `j`, `haha` an `h`, and neither can swallow `xd` or `lol`.
 */

import type { LaughBreakdown, LaughVariant } from './types'

export const LAUGH_VARIANTS: readonly LaughVariant[] = [
  'jaja',
  'JAJA',
  'jsjs',
  'xd',
  'lol',
  'haha',
  '😂',
]

/**
 * `jaja` and `JAJA` share a pattern and are told apart by case afterwards,
 * because shouting is the whole point of the distinction.
 */
const JA = /\bj(?:a+j)+a*\b/giu
/** `jsjs`, `jsjsjs` — the keyboard-slide laugh. */
const JS = /\bj(?:s+j)+s*\b/giu
/** `xd`, `XDDD`, `xddd`. */
const XD = /\bx+d+\b/giu
/** `lol`, `lolol`, `loool`. */
const LOL = /\bl+o+l+(?:o+l+)*\b/giu
/** `haha`, `hahaha`, `hahah`. */
const HA = /\bh(?:a+h)+a*\b/giu
/** 😂 and 🤣 are the same laugh with different teeth. */
const CRYING = /[\u{1F602}\u{1F923}]/gu

function countMatches(pattern: RegExp, text: string): number {
  pattern.lastIndex = 0
  let n = 0
  while (pattern.exec(text) !== null) n++
  return n
}

/**
 * Adds the laughs in `text` to `into` and returns how many it found.
 *
 * @param into a breakdown being accumulated across many messages.
 */
export function collectLaughs(
  text: string,
  into: Record<LaughVariant, number>,
): number {
  let total = 0

  JA.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = JA.exec(text)) !== null) {
    // All caps means it is the loud version; anything else is the normal one.
    const variant: LaughVariant = m[0] === m[0].toUpperCase() ? 'JAJA' : 'jaja'
    into[variant]++
    total++
  }

  const simple: ReadonlyArray<readonly [LaughVariant, RegExp]> = [
    ['jsjs', JS],
    ['xd', XD],
    ['lol', LOL],
    ['haha', HA],
    ['😂', CRYING],
  ]
  for (const [variant, pattern] of simple) {
    const n = countMatches(pattern, text)
    into[variant] += n
    total += n
  }

  return total
}

export function emptyBreakdown(): Record<LaughVariant, number> {
  return { jaja: 0, JAJA: 0, jsjs: 0, xd: 0, lol: 0, haha: 0, '😂': 0 }
}

/** Convenience wrapper for tests and one-off callers. */
export function countLaughs(text: string): {
  total: number
  byVariant: LaughBreakdown
} {
  const byVariant = emptyBreakdown()
  const total = collectLaughs(text, byVariant)
  return { total, byVariant }
}
