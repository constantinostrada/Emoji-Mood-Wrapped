/**
 * The V1 narrator: rules pick a family, a seeded hash picks the variant.
 *
 * Each rule has at least three variants so two people with similar profiles
 * rarely read the same line, while one chat always reads the same one. The
 * copy is phrased so it works for a person and for a whole chat alike, and
 * every line is plainly a joke — nothing here pretends to be a real
 * assessment of anybody.
 */

import type { WrappedStats } from '../types'
import { absurdMetrics, hourLabel, pct, profileOf, type Profile } from './metrics'
import { pick, seedOf, type Seed } from './seed'
import type {
  AbsurdMetrics,
  DiagnosisFamily,
  NarrativeTexts,
  PersonalityId,
  WrappedNarrative,
  WrappedNarrator,
  WrappedSummary,
} from './types'

// ---------------------------------------------------------------------------
// Period
// ---------------------------------------------------------------------------

export type PeriodKind = 'week' | 'month' | 'chat'

export function periodKind(stats: WrappedStats): PeriodKind {
  if (stats.period.spanDays <= 7) return 'week'
  if (stats.period.spanDays <= 31) return 'month'
  return 'chat'
}

const PERIOD_TITLES: Readonly<Record<PeriodKind, string>> = {
  week: 'Your Week Wrapped',
  month: 'Your Month Wrapped',
  chat: 'Your Chat Wrapped',
}

export function wrappedTitle(stats: WrappedStats): string {
  return PERIOD_TITLES[periodKind(stats)]
}

// ---------------------------------------------------------------------------
// Rule context
// ---------------------------------------------------------------------------

interface Ctx {
  readonly stats: WrappedStats
  readonly metrics: AbsurdMetrics
  readonly profile: Profile
  /** "week", "month" or "chat" — for "the ___ of …" titles. */
  readonly period: string
  /** "you" for a person, "this chat" for everyone. */
  readonly who: string
  readonly hour: string
}

type Template = (c: Ctx) => string

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

const FAMILY_BY_PERSONALITY: Readonly<Record<PersonalityId, DiagnosisFamily>> = {
  'night-owl': 'needs-sleep',
  'laugh-machine': 'laugh-addict',
  ghost: 'ghost',
  'main-character': 'main-character',
  podcaster: 'podcaster',
  'sticker-lord': 'emoji-overload',
  'emoji-maximalist': 'emoji-overload',
  novelist: 'novelist',
  'dry-texter': 'dry-texter',
  'early-bird': 'balanced',
  npc: 'balanced',
}

export function diagnosisFamily(stats: WrappedStats, metrics: AbsurdMetrics): DiagnosisFamily {
  if (stats.messages.total === 0) return 'silent'
  return FAMILY_BY_PERSONALITY[metrics.personality.id]
}

const DIAGNOSES: Readonly<Record<DiagnosisFamily, readonly Template[]>> = {
  'needs-sleep': [
    (c) => `Our very artificial AI detects peak activity at ${c.hour}. Diagnosis: you needed to sleep. Prescription: a pillow and airplane mode.`,
    (c) => `Messages at ${c.hour} are not a vibe, they are a cry for a bedtime. The machine recommends: sleeping, at night, like a mammal.`,
    (c) => `Chronic case of "just one more message" at ${c.hour}. Treatment: close the chat, open your eyelids less.`,
  ],
  'laugh-addict': [
    (c) => `Laugh index at ${c.metrics.laughIndex}%. Nobody is that funny. The AI suspects you laugh at your own messages.`,
    (c) => `${c.stats.laughs.total.toLocaleString('en-US')} laughs detected. Condition: terminal "jajaja". There is no cure and you would not take it anyway.`,
    () => `The AI ran the numbers and concluded: you laugh as punctuation. Periods are for serious people.`,
  ],
  ghost: [
    (c) => `Conversations started: ${c.stats.conversationStarters.started.toLocaleString('en-US')}. Diagnosis: professional ghost. You only exist when summoned.`,
    () => `The AI waited for you to start a conversation. It is still waiting. It will wait forever.`,
    () => `Symptoms: replies fast, never texts first. Condition: "you could have messaged me too" syndrome.`,
  ],
  'main-character': [
    (c) => `${pct(c.stats.messages.share)} of the chat is you. The AI diagnoses: main character energy, extras sold separately.`,
    () => `Detected: a monologue with occasional audience participation. Recommended: let someone else talk. Once.`,
    () => `The group chat is legally your blog now. The AI respects the hustle.`,
  ],
  podcaster: [
    (c) => `${c.stats.media.byType.audio.toLocaleString('en-US')} voice notes. The AI diagnoses: undeclared podcast. Please add chapters.`,
    () => `Typing is for the weak. You broadcast. Everyone else listens at 2x speed.`,
    () => `Condition: voice-note-itis. Side effects include "sorry, can you type that?".`,
  ],
  'emoji-overload': [
    (c) => `${c.stats.emojis.total.toLocaleString('en-US')} emojis. The AI diagnoses: hieroglyphic communication. Archaeologists are interested.`,
    () => `Words detected, but mostly as decoration between emojis. Keyboard status: emotionally exhausted.`,
    () => `The AI tried to read your messages and got a colouring book. Stunning. Illegible.`,
  ],
  novelist: [
    (c) => `Average message: ${Math.round(c.stats.messages.averageLength)} characters. Diagnosis: accidental novelist. Publishers are circling.`,
    () => `The AI needed a coffee break halfway through one of your messages. Condition: paragraph dependency.`,
    () => `You don't text, you release chapters. Readers request a TL;DR.`,
  ],
  'dry-texter': [
    () => `Emojis: almost none. Laughs: almost none. Diagnosis: dry texter. The AI offers you a glass of water 🥛.`,
    () => `Your messages are 100% information, 0% seasoning. The AI recommends one (1) emoji per week, to start.`,
    () => `Tone detected: tax return. Warmth detected: pending. Prognosis: someone will ask "are you mad?".`,
  ],
  silent: [
    () => `The AI analysed absolutely nothing and still reached a verdict: mysterious. Very mysterious.`,
    () => `Zero messages. Either you are a lurker or the chat is a museum. Either way, respect.`,
    () => `Nothing to diagnose. The AI is disappointed but also a little relieved.`,
  ],
  balanced: [
    (c) => `Peak hour ${c.hour}, respectable laugh index, normal emoji intake. The AI is suspicious of how normal ${c.who} seems.`,
    () => `Diagnosis: disturbingly balanced. The AI checked twice. Nobody is this well-adjusted in a group chat.`,
    (c) => `Chaos level ${c.metrics.chaosLevel}%. Not calm, not unhinged. The AI calls it "functional chaos".`,
  ],
}

// ---------------------------------------------------------------------------
// Title of the week
// ---------------------------------------------------------------------------

const TITLES: Readonly<Record<DiagnosisFamily, readonly Template[]>> = {
  'needs-sleep': [
    (c) => `The ${c.period} of sleeping never`,
    (c) => `A ${c.period} of 3 AM thoughts`,
    () => `Insomnia: the director's cut`,
  ],
  'laugh-addict': [
    (c) => `The ${c.period} of jajaja`,
    () => `Laughing now, reading later`,
    (c) => `A ${c.period} in stand-up mode`,
  ],
  ghost: [
    (c) => `The ${c.period} of left on read`,
    () => `Now you see me, now you don't`,
    () => `Seen at the speed of light`,
  ],
  'main-character': [
    () => `Starring you, featuring you`,
    (c) => `The ${c.period} of the monologue`,
    () => `One chat, one protagonist`,
  ],
  podcaster: [
    (c) => `The ${c.period} of voice notes`,
    () => `Now streaming: your voice`,
    () => `Hold to record, forever`,
  ],
  'emoji-overload': [
    (c) => `The ${c.period} of hieroglyphs`,
    () => `Emojis first, words maybe`,
    () => `A masterpiece in yellow faces`,
  ],
  novelist: [
    (c) => `The ${c.period} of the wall of text`,
    () => `Chapter one of many`,
    () => `Scroll down, there's more`,
  ],
  'dry-texter': [
    (c) => `The ${c.period} of "ok."`,
    () => `Straight to the point`,
    () => `Zero seasoning, full facts`,
  ],
  silent: [
    (c) => `The ${c.period} of silence`,
    () => `An audience of none`,
    () => `Quiet on set`,
  ],
  balanced: [
    (c) => `The ${c.period} of functional chaos`,
    () => `Suspiciously normal`,
    (c) => `A perfectly average ${c.period}`,
  ],
}

// ---------------------------------------------------------------------------
// Catchphrase
// ---------------------------------------------------------------------------

const LAUGH_CATCHPHRASES: readonly ((laugh: string) => string)[] = [
  (laugh) => `"${laugh}" — reply to everything, since forever`,
  (laugh) => `"${laugh}" (did not read the message)`,
  (laugh) => `"${laugh}", but make it a lifestyle`,
]

const WORD_CATCHPHRASES: readonly ((word: string, n: string) => string)[] = [
  (word, n) => `"${word}" — ${n} times and counting`,
  (word) => `"${word}". Say it again. You will.`,
  (word, n) => `"${word}" × ${n}. A signature move.`,
]

const EMOJI_CATCHPHRASES: readonly ((emoji: string) => string)[] = [
  (emoji) => `"${emoji}" — no further comments`,
  (emoji) => `"${emoji}${emoji}${emoji}" — the complete works`,
  (emoji) => `"${emoji}" said more than words ever could`,
]

const SILENT_CATCHPHRASES = [
  '"…" — the sound of mystery',
  '"(typing…)" — and then nothing',
  '"Seen." — the whole story',
]

function catchphrase(c: Ctx, seed: Seed): string {
  const { stats, profile } = c
  if (stats.laughs.topVariant !== null && profile.laughRate >= 0.2) {
    return pick(LAUGH_CATCHPHRASES, seed, 'catch-laugh')(laughSample(stats.laughs.topVariant))
  }
  const word = stats.words.top[0]
  if (word !== undefined) {
    return pick(WORD_CATCHPHRASES, seed, 'catch-word')(word.word, word.count.toLocaleString('en-US'))
  }
  const emoji = stats.emojis.top[0]
  if (emoji !== undefined) return pick(EMOJI_CATCHPHRASES, seed, 'catch-emoji')(emoji.emoji)
  return pick(SILENT_CATCHPHRASES, seed, 'catch-silent')
}

/** How each laugh dialect is spelled when quoted back at you. */
export function laughSample(variant: string): string {
  switch (variant) {
    case 'jaja':
      return 'jajaja'
    case 'JAJA':
      return 'JAJAJAJA'
    case 'jsjs':
      return 'jsjsjs'
    case 'xd':
      return 'XD'
    case 'haha':
      return 'hahaha'
    default:
      return variant
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const SUMMARY_OPENERS: readonly Template[] = [
  (c) => `${c.stats.messages.total.toLocaleString('en-US')} messages, peak hour ${c.hour}.`,
  (c) => `A ${c.period} of ${c.stats.messages.total.toLocaleString('en-US')} messages, mostly around ${c.hour}.`,
  (c) => `${c.stats.messages.total.toLocaleString('en-US')} messages sent. The busiest moment: ${c.hour}.`,
]

const SUMMARY_SILENT: readonly Template[] = [
  (c) => `A ${c.period} with no messages at all.`,
  () => `Not one message. Impressive restraint.`,
  () => `The chat was open. Nobody typed.`,
]

const SUMMARY_PERSONALITY: readonly Template[] = [
  (c) => `Officially: ${c.metrics.personality.name} ${c.metrics.personality.emoji}.`,
  (c) => `Verdict: ${c.metrics.personality.name} ${c.metrics.personality.emoji}, with a chaos level of ${c.metrics.chaosLevel}%.`,
  (c) => `Certified: ${c.metrics.personality.name} ${c.metrics.personality.emoji}. No appeals.`,
]

const SUMMARY_EMOJI: readonly ((emoji: string) => string)[] = [
  (emoji) => `Emotional support emoji: ${emoji}.`,
  (emoji) => `Spirit animal, but emoji: ${emoji}.`,
  (emoji) => `If this Wrapped had a flag, it would be ${emoji}.`,
]

function summary(c: Ctx, seed: Seed): string[] {
  if (c.stats.messages.total === 0) {
    return [pick(SUMMARY_SILENT, seed, 'sum-open')(c), pick(SUMMARY_PERSONALITY, seed, 'sum-pers')(c)]
  }
  const lines = [pick(SUMMARY_OPENERS, seed, 'sum-open')(c), pick(SUMMARY_PERSONALITY, seed, 'sum-pers')(c)]
  const emoji = c.metrics.emojiRepresents.emoji
  if (emoji !== null) lines.push(pick(SUMMARY_EMOJI, seed, 'sum-emoji')(emoji))
  return lines
}

// ---------------------------------------------------------------------------
// Narrator
// ---------------------------------------------------------------------------

export function templateTexts(stats: WrappedStats, metrics: AbsurdMetrics, seed: Seed): NarrativeTexts {
  const profile = profileOf(stats)
  const c: Ctx = {
    stats,
    metrics,
    profile,
    period: periodKind(stats),
    who: stats.scope === 'chat' ? 'this chat' : 'you',
    hour: hourLabel(stats.activity.busiestHour),
  }
  const family = diagnosisFamily(stats, metrics)
  return {
    diagnosis: { family, text: pick(DIAGNOSES[family], seed, 'diagnosis')(c) },
    weekTitle: pick(TITLES[family], seed, 'title')(c),
    catchphrase: catchphrase(c, seed),
    summary: summary(c, seed),
  }
}

/** Synchronous V1 narration; the `WrappedNarrator` below wraps it. */
export function narrateWithTemplates(stats: WrappedStats): WrappedNarrative {
  const seed = seedOf(stats)
  const metrics = absurdMetrics(stats, seed)
  return { version: 1, source: 'templates', metrics, texts: templateTexts(stats, metrics, seed) }
}

export const templateNarrator: WrappedNarrator = {
  narrate: (stats) => Promise.resolve(narrateWithTemplates(stats)),
}

/** The model the shareable image renders from the final card. */
export function wrappedSummary(stats: WrappedStats, narrative: WrappedNarrative): WrappedSummary {
  const { metrics, texts } = narrative
  return {
    title: texts.weekTitle,
    emoji: metrics.emojiRepresents.emoji ?? metrics.personality.emoji,
    highlights: [
      { label: 'Messages', value: stats.messages.total.toLocaleString('en-US') },
      { label: 'Chaos level', value: `${metrics.chaosLevel}%` },
      { label: 'Personality', value: `${metrics.personality.name} ${metrics.personality.emoji}` },
    ],
    diagnosis: texts.diagnosis.text,
  }
}
