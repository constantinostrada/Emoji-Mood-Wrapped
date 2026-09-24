/**
 * The narrative contract: what turns a `WrappedStats` into jokes.
 *
 * V1 fills it with rules and templates; V2 will fill it with an LLM that gets
 * the same `WrappedStats` JSON and must answer with this same shape. The cards
 * only ever read a `WrappedNarrative`, so swapping the source is transparent.
 *
 * Everything here is plain JSON — no functions, no Dates — so an LLM answer
 * can be validated against it and dropped straight in.
 */

import type { WrappedStats } from '../types'

/** An integer from 0 to 100. */
export type Percent = number

export type PersonalityId =
  | 'night-owl'
  | 'laugh-machine'
  | 'ghost'
  | 'main-character'
  | 'podcaster'
  | 'sticker-lord'
  | 'emoji-maximalist'
  | 'novelist'
  | 'early-bird'
  | 'dry-texter'
  | 'npc'

export interface Personality {
  readonly id: PersonalityId
  readonly name: string
  readonly emoji: string
  /** One sentence explaining the verdict, based on real stats. */
  readonly reason: string
}

export interface AbsurdMetrics {
  readonly chaosLevel: Percent
  readonly awakeAt3amProbability: Percent
  readonly laughIndex: Percent
  readonly personality: Personality
  readonly emojiRepresents: {
    /** `null` when the scope never used a single emoji. */
    readonly emoji: string | null
    /** How much of the emoji budget that emoji takes, 0–100. */
    readonly percent: Percent
    readonly verdict: string
  }
}

/**
 * Which rule picked the diagnosis. The families are part of the contract so
 * tests (and V2 prompts) can reason about tone without matching exact text.
 */
export type DiagnosisFamily =
  | 'needs-sleep'
  | 'laugh-addict'
  | 'ghost'
  | 'main-character'
  | 'podcaster'
  | 'emoji-overload'
  | 'novelist'
  | 'dry-texter'
  | 'silent'
  | 'balanced'

export interface NarrativeTexts {
  readonly diagnosis: { readonly family: DiagnosisFamily; readonly text: string }
  readonly weekTitle: string
  readonly catchphrase: string
  /** Two or three short lines. */
  readonly summary: readonly string[]
}

export interface WrappedNarrative {
  readonly version: 1
  /** Where the jokes came from. V1 is always `templates`. */
  readonly source: 'templates' | 'llm'
  readonly metrics: AbsurdMetrics
  readonly texts: NarrativeTexts
}

/**
 * Async on purpose: the template narrator answers immediately, the V2 LLM
 * narrator will not, and callers must not have to care which one they got.
 */
export interface WrappedNarrator {
  narrate(stats: WrappedStats): Promise<WrappedNarrative>
}

/**
 * What the final card hands to the shareable image: small enough to fit on
 * one picture, and free of anything the person wrote.
 */
export interface WrappedSummary {
  readonly title: string
  readonly emoji: string
  readonly highlights: readonly { readonly label: string; readonly value: string }[]
  readonly diagnosis: string
}
