/**
 * The statistics engine: `ParseResult` in, `ChatAnalysis` out.
 *
 * One pass over the messages fills a per-author accumulator; the whole-chat
 * totals are then merged out of those, so no message is read twice. Everything
 * covers the full span of the file — V1 never filters by year or period.
 */

import { collectEmojis } from './emoji'
import { collectLaughs, emptyBreakdown, LAUGH_VARIANTS } from './laughs'
import { collectWords } from './words'
import type {
  ChatAnalysis,
  ChatMessage,
  LaughVariant,
  MediaType,
  ParseResult,
  ParticipantStats,
  StreakInfo,
} from './types'

/**
 * Six hours of silence ends a conversation.
 *
 * Short enough that a night's sleep splits yesterday from today, long enough
 * that a workday gap does not hand somebody a dozen fake "conversation starts".
 */
export const DEFAULT_SILENCE_THRESHOLD_MINUTES = 6 * 60

export interface AnalyzeOptions {
  /** Silence, in minutes, above which a message opens a new conversation. */
  readonly silenceThresholdMinutes?: number
  /** How many emojis to keep in `topEmojis`. Default 10. */
  readonly topEmojiCount?: number
  /** How many words to keep in `topWords`. Default 15. */
  readonly topWordCount?: number
}

const MEDIA_TYPES: readonly MediaType[] = ['audio', 'image', 'video', 'sticker', 'other']

interface Accumulator {
  participant: string | null
  messageCount: number
  wordCount: number
  charCount: number
  longest: { text: string; length: number; timestamp: Date } | null
  emojis: Map<string, number>
  emojiTotal: number
  words: Map<string, number>
  byHour: number[]
  byWeekday: number[]
  laughs: Record<LaughVariant, number>
  laughTotal: number
  conversationsStarted: number
  media: Record<MediaType, number>
  mediaTotal: number
  days: Set<string>
}

function newAccumulator(participant: string | null): Accumulator {
  return {
    participant,
    messageCount: 0,
    wordCount: 0,
    charCount: 0,
    longest: null,
    emojis: new Map(),
    emojiTotal: 0,
    words: new Map(),
    byHour: new Array<number>(24).fill(0),
    byWeekday: new Array<number>(7).fill(0),
    laughs: emptyBreakdown(),
    laughTotal: 0,
    conversationsStarted: 0,
    media: { audio: 0, image: 0, video: 0, sticker: 0, other: 0 },
    mediaTotal: 0,
    days: new Set(),
  }
}

export function analyzeChat(parsed: ParseResult, options: AnalyzeOptions = {}): ChatAnalysis {
  const silenceThresholdMinutes =
    options.silenceThresholdMinutes ?? DEFAULT_SILENCE_THRESHOLD_MINUTES
  const topEmojiCount = options.topEmojiCount ?? 10
  const topWordCount = options.topWordCount ?? 15

  const silenceMs = silenceThresholdMinutes * 60_000
  const accumulators = new Map<string, Accumulator>()
  for (const name of parsed.participants) accumulators.set(name, newAccumulator(name))

  const messagesByDay: Record<string, number> = {}
  let previousTimestamp: number | null = null

  for (const message of parsed.messages) {
    const acc = accumulators.get(message.author) ?? newAccumulator(message.author)
    accumulators.set(message.author, acc)

    ingest(acc, message)

    const day = dayKey(message.timestamp)
    acc.days.add(day)
    messagesByDay[day] = (messagesByDay[day] ?? 0) + 1

    // A conversation opens on the first message, and again whenever the chat
    // has been quiet for longer than the threshold.
    const at = message.timestamp.getTime()
    if (previousTimestamp === null || at - previousTimestamp > silenceMs) {
      acc.conversationsStarted++
    }
    previousTimestamp = at
  }

  const chatAcc = mergeAll([...accumulators.values()])

  const byParticipant: Record<string, ParticipantStats> = {}
  for (const name of parsed.participants) {
    const acc = accumulators.get(name)
    if (acc !== undefined) {
      byParticipant[name] = finalize(acc, topEmojiCount, topWordCount)
    }
  }

  return {
    format: parsed.format,
    warnings: parsed.warnings,
    participants: parsed.participants,
    dateRange: parsed.dateRange,
    totalMessages: parsed.messages.length,
    systemMessageCount: parsed.systemMessages.length,
    silenceThresholdMinutes,
    chat: finalize(chatAcc, topEmojiCount, topWordCount),
    byParticipant,
    messagesByDay,
  }
}

function ingest(acc: Accumulator, message: ChatMessage): void {
  const { text } = message

  acc.messageCount++
  acc.charCount += text.length
  acc.byHour[message.timestamp.getHours()]++
  acc.byWeekday[message.timestamp.getDay()]++

  if (acc.longest === null || text.length > acc.longest.length) {
    acc.longest = { text, length: text.length, timestamp: message.timestamp }
  }

  if (message.media !== null) {
    acc.media[message.media]++
    acc.mediaTotal++
    // An attachment's body is a file name or a placeholder, never something
    // the person wrote, so it must not reach the word or laugh tallies.
    return
  }

  acc.emojiTotal += collectEmojis(text, acc.emojis)
  acc.wordCount += collectWords(text, acc.words)
  acc.laughTotal += collectLaughs(text, acc.laughs)
}

function mergeAll(accumulators: readonly Accumulator[]): Accumulator {
  const chat = newAccumulator(null)

  for (const acc of accumulators) {
    chat.messageCount += acc.messageCount
    chat.wordCount += acc.wordCount
    chat.charCount += acc.charCount
    chat.emojiTotal += acc.emojiTotal
    chat.laughTotal += acc.laughTotal
    chat.conversationsStarted += acc.conversationsStarted
    chat.mediaTotal += acc.mediaTotal

    if (acc.longest !== null && (chat.longest === null || acc.longest.length > chat.longest.length)) {
      chat.longest = acc.longest
    }
    for (const [emoji, n] of acc.emojis) chat.emojis.set(emoji, (chat.emojis.get(emoji) ?? 0) + n)
    for (const [word, n] of acc.words) chat.words.set(word, (chat.words.get(word) ?? 0) + n)
    for (let h = 0; h < 24; h++) chat.byHour[h] += acc.byHour[h]
    for (let d = 0; d < 7; d++) chat.byWeekday[d] += acc.byWeekday[d]
    for (const variant of LAUGH_VARIANTS) chat.laughs[variant] += acc.laughs[variant]
    for (const type of MEDIA_TYPES) chat.media[type] += acc.media[type]
    for (const day of acc.days) chat.days.add(day)
  }

  return chat
}

function finalize(acc: Accumulator, topEmojiCount: number, topWordCount: number): ParticipantStats {
  const days = [...acc.days].sort()

  return {
    participant: acc.participant,
    messageCount: acc.messageCount,
    wordCount: acc.wordCount,
    charCount: acc.charCount,
    averageMessageLength:
      acc.messageCount === 0 ? 0 : round2(acc.charCount / acc.messageCount),
    longestMessage: acc.longest,
    topEmojis: topEntries(acc.emojis, topEmojiCount).map(([emoji, count]) => ({ emoji, count })),
    emojiTotal: acc.emojiTotal,
    distinctEmojiCount: acc.emojis.size,
    topWords: topEntries(acc.words, topWordCount).map(([word, count]) => ({ word, count })),
    activityByHour: acc.byHour,
    activityByWeekday: acc.byWeekday,
    laughs: { total: acc.laughTotal, byVariant: acc.laughs },
    conversationsStarted: acc.conversationsStarted,
    media: { total: acc.mediaTotal, byType: acc.media },
    activeDays: days.length,
    longestStreak: longestStreak(days),
  }
}

/** Most frequent first; ties broken by the key so results are reproducible. */
function topEntries(counts: Map<string, number>, limit: number): Array<[string, number]> {
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
}

/** @param days `YYYY-MM-DD`, ascending and de-duplicated. */
function longestStreak(days: readonly string[]): StreakInfo {
  if (days.length === 0) return { days: 0, from: null, to: null }

  let best = 1
  let bestFrom = days[0]
  let bestTo = days[0]
  let runLength = 1
  let runFrom = days[0]

  for (let i = 1; i < days.length; i++) {
    if (dayDistance(days[i - 1], days[i]) === 1) {
      runLength++
    } else {
      runLength = 1
      runFrom = days[i]
    }
    if (runLength > best) {
      best = runLength
      bestFrom = runFrom
      bestTo = days[i]
    }
  }

  return { days: best, from: bestFrom, to: bestTo }
}

/** Calendar days between two `YYYY-MM-DD` keys; UTC maths dodges DST. */
export function dayDistance(from: string, to: string): number {
  return Math.round((dayKeyToUtc(to) - dayKeyToUtc(from)) / 86_400_000)
}

function dayKeyToUtc(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)))
}

/** Local `YYYY-MM-DD`. Never `toISOString()`: that would shift the timezone. */
export function dayKey(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
