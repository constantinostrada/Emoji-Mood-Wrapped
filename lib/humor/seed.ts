/**
 * Deterministic "randomness" for the templates.
 *
 * The same `WrappedStats` must always produce the same Wrapped, yet two people
 * with similar profiles should not get identical copy. So variants are chosen
 * by a hash of the whole stats object: any difference in any count reshuffles
 * the picks, and nothing depends on `Math.random` or the clock.
 */

import type { WrappedStats } from '../types'

/** JSON with sorted keys, so two equal objects built in any order hash alike. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
  return `{${entries.join(',')}}`
}

/** 32-bit FNV-1a. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export type Seed = number

export function seedOf(stats: WrappedStats): Seed {
  return fnv1a(stableStringify(stats))
}

/**
 * Picks one of `options`. `slot` names the rule, so the diagnosis and the
 * title of the same chat do not always land on the same index.
 */
export function pick<T>(options: readonly T[], seed: Seed, slot: string): T {
  return options[fnv1a(`${seed}:${slot}`) % options.length]
}
