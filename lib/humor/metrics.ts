/**
 * The absurd metrics: numbers that look like measurements and are jokes.
 *
 * Every formula here reads only real `WrappedStats` fields and is a pure
 * function of them — no randomness, no clock — so the same chat always scores
 * the same. Every rate is guarded against zero messages; a silent chat scores
 * zeros, never `NaN`.
 */

import type { WrappedStats } from '../types'
import { pick, type Seed } from './seed'
import type { AbsurdMetrics, Percent, Personality, PersonalityId } from './types'

/** Rates derived once and shared by the metrics and the templates. */
export interface Profile {
  readonly messages: number
  /** Share of activity between 00:00 and 04:59, 0–1. */
  readonly nightShare: number
  readonly laughRate: number
  readonly emojiRate: number
  readonly audioRate: number
  readonly stickerRate: number
  readonly mediaRate: number
  /** A named person in a chat with someone to compare against. */
  readonly comparative: boolean
  /** `busiestHour` means something only when there are messages. */
  readonly busiestHour: number | null
}

export function profileOf(stats: WrappedStats): Profile {
  const messages = stats.messages.total
  const activity = sum(stats.activity.byHour)
  const rate = (n: number) => (messages === 0 ? 0 : n / messages)
  return {
    messages,
    nightShare: activity === 0 ? 0 : sum(stats.activity.byHour.slice(0, 5)) / activity,
    laughRate: rate(stats.laughs.total),
    emojiRate: rate(stats.emojis.total),
    audioRate: rate(stats.media.byType.audio),
    stickerRate: rate(stats.media.byType.sticker),
    mediaRate: rate(stats.media.total),
    comparative: stats.scope === 'participant' && stats.chat.participantCount >= 2,
    busiestHour: messages === 0 ? null : stats.activity.busiestHour,
  }
}

export function isNightHour(hour: number): boolean {
  return hour >= 0 && hour <= 4
}

// ---------------------------------------------------------------------------
// Percent metrics
// ---------------------------------------------------------------------------

/** A weighted blend of everything that makes a chat feel unhinged. */
export function chaosLevel(stats: WrappedStats, p = profileOf(stats)): Percent {
  if (p.messages === 0) return 0
  const score =
    0.3 * Math.min(1, p.emojiRate / 1.5) +
    0.25 * Math.min(1, p.laughRate / 0.5) +
    0.2 * Math.min(1, p.nightShare * 2) +
    0.15 * Math.min(1, p.mediaRate * 4) +
    0.1 * Math.min(1, stats.emojis.distinct / 30)
  return clamp(Math.round(score * 100), 3, 99)
}

/**
 * Driven by the busiest hour first: a peak between midnight and 4 AM is a
 * confession (82–99%), a peak in office hours is an alibi (under 30%), and
 * the twilight hours sit in between.
 */
export function awakeAt3amProbability(stats: WrappedStats, p = profileOf(stats)): Percent {
  if (p.busiestHour === null) return 0
  const h = p.busiestHour
  if (isNightHour(h)) return clamp(Math.round(82 + 17 * p.nightShare), 82, 99)
  if (h >= 9 && h <= 19) return clamp(Math.round(4 + 50 * p.nightShare), 4, 29)
  // 5–8 and 20–23: the closer to 3 AM, the more suspicious.
  const distance = Math.min(Math.abs(h - 3), 24 - Math.abs(h - 3))
  return clamp(Math.round(30 + (8 - distance) * 6 + 30 * p.nightShare), 30, 79)
}

/** Saturates fast: laughing in half your messages is already 78%. */
export function laughIndex(stats: WrappedStats, p = profileOf(stats)): Percent {
  if (stats.laughs.total === 0 || p.messages === 0) return 0
  return clamp(Math.round(100 * (1 - Math.exp(-3 * p.laughRate))), 1, 99)
}

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

interface PersonalityRule {
  readonly id: PersonalityId
  readonly name: string
  readonly emoji: string
  readonly matches: (stats: WrappedStats, p: Profile) => boolean
  readonly reason: (stats: WrappedStats, p: Profile) => string
}

/**
 * Checked in order; the first match wins, `npc` catches everyone else. Order
 * is the joke's priority: being awake at 3 AM beats everything else.
 */
export const PERSONALITY_CATALOG: readonly PersonalityRule[] = [
  {
    id: 'night-owl',
    name: 'The Night Owl',
    emoji: '🦉',
    matches: (_, p) => (p.busiestHour !== null && isNightHour(p.busiestHour)) || p.nightShare >= 0.3,
    reason: (_, p) => `${pct(p.nightShare)} of your texting happens while decent people sleep.`,
  },
  {
    id: 'laugh-machine',
    name: 'The Laugh Machine',
    emoji: '🤣',
    matches: (_, p) => p.laughRate >= 0.4,
    reason: (s) => `${s.laughs.total.toLocaleString('en-US')} laughs. Some of them were probably sincere.`,
  },
  {
    id: 'ghost',
    name: 'The Ghost',
    emoji: '👻',
    matches: (s, p) => p.comparative && p.messages > 0 && s.conversationStarters.share <= 0.1,
    reason: (s) =>
      s.conversationStarters.started === 0
        ? 'You never once started a conversation. You just… appear.'
        : `You opened only ${pct(s.conversationStarters.share)} of the conversations.`,
  },
  {
    id: 'main-character',
    name: 'The Main Character',
    emoji: '🎬',
    matches: (s, p) => p.comparative && s.messages.share >= 0.6,
    reason: (s) => `${pct(s.messages.share)} of the chat is you. The others are extras.`,
  },
  {
    id: 'podcaster',
    name: 'The Podcaster',
    emoji: '🎙️',
    matches: (_, p) => p.audioRate >= 0.15,
    reason: (s) => `${s.media.byType.audio.toLocaleString('en-US')} voice notes. Episode 1 of many.`,
  },
  {
    id: 'sticker-lord',
    name: 'The Sticker Lord',
    emoji: '🦄',
    matches: (_, p) => p.stickerRate >= 0.1,
    reason: (s) => `${s.media.byType.sticker.toLocaleString('en-US')} stickers instead of words.`,
  },
  {
    id: 'emoji-maximalist',
    name: 'The Emoji Maximalist',
    emoji: '🎨',
    matches: (_, p) => p.emojiRate >= 1,
    reason: (_, p) => `${round1(p.emojiRate)} emojis per message. Words are optional.`,
  },
  {
    id: 'novelist',
    name: 'The Novelist',
    emoji: '📜',
    matches: (s) => s.messages.averageLength >= 120,
    reason: (s) => `Your messages average ${Math.round(s.messages.averageLength)} characters. Chapter two when?`,
  },
  {
    id: 'early-bird',
    name: 'The Early Bird',
    emoji: '🐓',
    matches: (_, p) => p.busiestHour !== null && p.busiestHour >= 5 && p.busiestHour <= 8,
    reason: (s) => `Peak activity at ${hourLabel(s.activity.busiestHour)}. Before coffee. Worrying.`,
  },
  {
    id: 'dry-texter',
    name: 'The Dry Texter',
    emoji: '🌵',
    matches: (_, p) => p.messages > 0 && p.emojiRate < 0.05 && p.laughRate < 0.02,
    reason: () => 'Almost no emojis, almost no laughs. Just facts. Cold, hard facts.',
  },
  {
    id: 'npc',
    name: 'The Background NPC',
    emoji: '🧍',
    matches: () => true,
    reason: (_, p) =>
      p.messages === 0
        ? 'Zero messages sent. The ultimate mystery.'
        : 'Perfectly balanced. Suspiciously normal. Nobody is this normal.',
  },
]

export function personalityOf(stats: WrappedStats, p = profileOf(stats)): Personality {
  const rule = PERSONALITY_CATALOG.find((r) => r.matches(stats, p)) ?? PERSONALITY_CATALOG[PERSONALITY_CATALOG.length - 1]
  return { id: rule.id, name: rule.name, emoji: rule.emoji, reason: rule.reason(stats, p) }
}

// ---------------------------------------------------------------------------
// "Your emoji represents you"
// ---------------------------------------------------------------------------

const EMOJI_MEANINGS: Readonly<Record<string, string>> = {
  '😂': 'You laugh first and read the message later.',
  '🤣': 'You are rolling on the floor more than is medically advisable.',
  '❤️': 'Soft on the inside. Also on the outside.',
  '😍': 'Easily impressed, loudly.',
  '🙃': 'Everything is fine. Everything is absolutely fine.',
  '🥲': 'Smiling through it. Barely.',
  '😭': 'Emotionally, you are always at 110%.',
  '🔥': 'You think everything is fire. It is not.',
  '👀': 'You know things. You are not telling.',
  '💀': 'You have died of laughter so often it is a lifestyle.',
  '👍': 'Communication, but make it minimal.',
  '🙏': 'Polite to a fault. Or begging. Hard to say.',
  '😅': 'Nervous energy, weaponised.',
  '🤡': 'Self-aware, at least.',
  '✨': 'Main character sparkle, applied liberally.',
  '🥺': 'Professional puppy eyes.',
}

const EMOJI_FALLBACKS = [
  (e: string) => `Nobody else would pick ${e} this often. That says a lot.`,
  (e: string) => `${e} is not an emoji to you. It is a personality.`,
  (e: string) => `Scientists are still decoding why ${e}.`,
]

const NO_EMOJI_VERDICTS = [
  'Zero emojis. You communicate exclusively in raw text, like a telegram.',
  'No emoji represents you. You are beyond symbols.',
  'Not a single emoji. Your keyboard misses you.',
]

export function emojiRepresents(stats: WrappedStats, seed: Seed): AbsurdMetrics['emojiRepresents'] {
  const top = stats.emojis.top[0]
  if (top === undefined || stats.emojis.total === 0) {
    return { emoji: null, percent: 0, verdict: pick(NO_EMOJI_VERDICTS, seed, 'no-emoji') }
  }
  const percent = clamp(Math.round((top.count / stats.emojis.total) * 100), 1, 100)
  const verdict = EMOJI_MEANINGS[top.emoji] ?? pick(EMOJI_FALLBACKS, seed, 'emoji-fallback')(top.emoji)
  return { emoji: top.emoji, percent, verdict }
}

export function absurdMetrics(stats: WrappedStats, seed: Seed): AbsurdMetrics {
  const p = profileOf(stats)
  return {
    chaosLevel: chaosLevel(stats, p),
    awakeAt3amProbability: awakeAt3amProbability(stats, p),
    laughIndex: laughIndex(stats, p),
    personality: personalityOf(stats, p),
    emojiRepresents: emojiRepresents(stats, seed),
  }
}

// ---------------------------------------------------------------------------
// Small helpers, shared with the templates
// ---------------------------------------------------------------------------

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString()
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function sum(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}
