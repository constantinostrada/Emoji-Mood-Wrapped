/**
 * Hand-built `WrappedStats` for the humor layer and the cards, so they can be
 * exercised on profiles that are hard to get from a real export (a pure night
 * owl, a chat with zero laughs, every field at its minimum).
 */

import type { LaughBreakdown, MediaBreakdown, WrappedStats } from '../types'

type DeepPartial<T> = T extends readonly (infer _U)[]
  ? T
  : T extends object
    ? { -readonly [K in keyof T]?: DeepPartial<T[K]> }
    : T

const NO_LAUGHS: LaughBreakdown = { jaja: 0, JAJA: 0, jsjs: 0, xd: 0, lol: 0, haha: 0, '😂': 0 }
const NO_MEDIA: MediaBreakdown = { audio: 0, image: 0, video: 0, sticker: 0, other: 0 }

/** A 24-slot histogram with `peak` messages at `hour` and `rest` everywhere else. */
export function hoursPeakingAt(hour: number, peak = 60, rest = 2): number[] {
  return Array.from({ length: 24 }, (_, h) => (h === hour ? peak : rest))
}

/** A middle-of-the-road participant in a two-person chat. */
export const BASE_STATS: WrappedStats = {
  schemaVersion: 1,
  participant: 'Ana',
  scope: 'participant',
  period: { firstDay: '2024-03-04', lastDay: '2024-03-10', spanDays: 7, activeDays: 6 },
  chat: { participantCount: 2, totalMessages: 400, systemMessageCount: 1 },
  messages: {
    total: 200,
    share: 0.5,
    rank: 1,
    perActiveDay: 33.33,
    averageLength: 38,
    longestLength: 240,
    longestAt: '2024-03-06T21:14:00',
  },
  emojis: {
    total: 60,
    distinct: 12,
    perDay: 8.57,
    top: [
      { emoji: '❤️', count: 18 },
      { emoji: '🙃', count: 12 },
      { emoji: '🔥', count: 8 },
      { emoji: '👀', count: 6 },
      { emoji: '🥲', count: 4 },
    ],
  },
  words: {
    total: 1400,
    top: [
      { word: 'mañana', count: 22 },
      { word: 'posta', count: 15 },
      { word: 'café', count: 11 },
      { word: 'dale', count: 9 },
    ],
  },
  activity: {
    byHour: hoursPeakingAt(19, 40, 7).map((n, h) => (h < 7 ? 0 : n)),
    byWeekday: [20, 30, 25, 35, 40, 30, 20],
    busiestHour: 19,
    busiestWeekday: 4,
  },
  laughs: {
    total: 20,
    byVariant: { ...NO_LAUGHS, jaja: 14, '😂': 6 },
    topVariant: 'jaja',
  },
  conversationStarters: { started: 10, share: 0.5, rank: 1, silenceThresholdMinutes: 240 },
  media: { total: 12, byType: { ...NO_MEDIA, image: 8, audio: 3, sticker: 1 } },
  streak: { longestDays: 5, from: '2024-03-05', to: '2024-03-09' },
  format: { platform: 'android', dateOrder: 'DMY', clock: '24h' },
}

/** `BASE_STATS` with some fields replaced. Arrays are replaced, not merged. */
export function makeStats(overrides: DeepPartial<WrappedStats> = {}): WrappedStats {
  return merge(BASE_STATS, overrides) as WrappedStats
}

function merge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch
  if (base === null || typeof base !== 'object' || Array.isArray(base)) return patch
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    out[key] = merge(out[key], value)
  }
  return out
}

/** Lives between midnight and 4 AM. */
export const NIGHT_OWL: WrappedStats = makeStats({
  participant: 'Luna',
  activity: {
    byHour: hoursPeakingAt(1, 70, 3).map((n, h) => (h === 0 || h === 2 ? 30 : n)),
    busiestHour: 1,
    busiestWeekday: 6,
    byWeekday: [40, 20, 20, 25, 30, 45, 60],
  },
  laughs: { total: 6, byVariant: { ...NO_LAUGHS, jaja: 6 }, topVariant: 'jaja' },
})

/** Every other message is a laugh. */
export const LAUGHER: WrappedStats = makeStats({
  participant: 'Tomi',
  messages: { total: 300, share: 0.6, perActiveDay: 50 },
  laughs: {
    total: 180,
    byVariant: { ...NO_LAUGHS, jaja: 90, JAJA: 40, jsjs: 10, xd: 5, '😂': 35 },
    topVariant: 'jaja',
  },
  emojis: {
    total: 90,
    top: [
      { emoji: '😂', count: 35 },
      { emoji: '💀', count: 20 },
      { emoji: '🤣', count: 12 },
    ],
  },
})

/** Answers everything, opens nothing. */
export const NEVER_STARTS: WrappedStats = makeStats({
  participant: 'Fede',
  messages: { total: 90, share: 0.225, rank: 2, perActiveDay: 15 },
  conversationStarters: { started: 0, share: 0, rank: 2 },
  laughs: { total: 4, byVariant: { ...NO_LAUGHS, haha: 4 }, topVariant: 'haha' },
  emojis: { total: 8, distinct: 3, perDay: 1.14, top: [{ emoji: '👍', count: 6 }, { emoji: '🙂', count: 2 }] },
})

/** Every field at its minimum: one lonely participant who never said anything. */
export const MINIMAL: WrappedStats = {
  schemaVersion: 1,
  participant: null,
  scope: 'chat',
  period: { firstDay: '2024-01-01', lastDay: '2024-01-01', spanDays: 1, activeDays: 0 },
  chat: { participantCount: 1, totalMessages: 0, systemMessageCount: 0 },
  messages: { total: 0, share: 0, rank: 1, perActiveDay: 0, averageLength: 0, longestLength: 0, longestAt: null },
  emojis: { total: 0, distinct: 0, perDay: 0, top: [] },
  words: { total: 0, top: [] },
  activity: { byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), busiestHour: 0, busiestWeekday: 0 },
  laughs: { total: 0, byVariant: NO_LAUGHS, topVariant: null },
  conversationStarters: { started: 0, share: 0, rank: 1, silenceThresholdMinutes: 240 },
  media: { total: 0, byType: NO_MEDIA },
  streak: { longestDays: 0, from: null, to: null },
  format: { platform: 'android', dateOrder: 'DMY', clock: '24h' },
}

export const SAMPLE_STATS = { NIGHT_OWL, LAUGHER, NEVER_STARTS } as const
