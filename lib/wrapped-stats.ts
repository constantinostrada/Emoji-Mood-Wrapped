/**
 * Projecting a `ChatAnalysis` onto the shareable `WrappedStats` contract.
 *
 * This is the narrow seam: `ChatAnalysis` is the rich internal picture and may
 * hold message text and every participant's name; `WrappedStats` is what the UI
 * cards render and what V2 will hand to an LLM. The projection is where the two
 * safety rules get applied — aggregates only, and one name in one place — which
 * is why comparisons come out as shares and ranks instead of leaderboards.
 */

import { LAUGH_VARIANTS } from './laughs'
import { dayDistance, dayKey, round2 } from './stats'
import type {
  ChatAnalysis,
  LaughVariant,
  ParticipantStats,
  WrappedStats,
} from './types'

export interface WrappedStatsOptions {
  /** How many emojis to expose. Default 10. */
  readonly topEmojiCount?: number
  /** How many words to expose. Default 10. */
  readonly topWordCount?: number
}

/**
 * @param participant the chosen author, or `null` for the whole chat.
 * @throws if `participant` is not one of the chat's authors — a caller passing
 * a name that is not there is a bug, not bad user input.
 */
export function toWrappedStats(
  analysis: ChatAnalysis,
  participant: string | null,
  options: WrappedStatsOptions = {},
): WrappedStats {
  const topEmojiCount = options.topEmojiCount ?? 10
  const topWordCount = options.topWordCount ?? 10

  const source: ParticipantStats | undefined =
    participant === null ? analysis.chat : analysis.byParticipant[participant]

  if (source === undefined) {
    throw new Error(`Unknown participant: ${participant}`)
  }

  const firstDay = dayKey(analysis.dateRange.from)
  const lastDay = dayKey(analysis.dateRange.to)
  const spanDays = dayDistance(firstDay, lastDay) + 1

  const totalMessages = analysis.totalMessages
  const totalStarts = analysis.chat.conversationsStarted

  return {
    schemaVersion: 1,

    participant,
    scope: participant === null ? 'chat' : 'participant',

    period: { firstDay, lastDay, spanDays, activeDays: source.activeDays },

    chat: {
      participantCount: analysis.participants.length,
      totalMessages,
      systemMessageCount: analysis.systemMessageCount,
    },

    messages: {
      total: source.messageCount,
      share: share(source.messageCount, totalMessages),
      rank: participant === null ? 1 : rankBy(analysis, participant, (s) => s.messageCount),
      perActiveDay: source.activeDays === 0 ? 0 : round2(source.messageCount / source.activeDays),
      averageLength: source.averageMessageLength,
      longestLength: source.longestMessage?.length ?? 0,
      // Deliberately the timestamp and not the text: `WrappedStats` never
      // carries anything the person actually wrote.
      longestAt: source.longestMessage === null ? null : toLocalIso(source.longestMessage.timestamp),
    },

    emojis: {
      total: source.emojiTotal,
      distinct: source.distinctEmojiCount,
      perDay: spanDays === 0 ? 0 : round2(source.emojiTotal / spanDays),
      top: source.topEmojis.slice(0, topEmojiCount),
    },

    words: {
      total: source.wordCount,
      top: source.topWords.slice(0, topWordCount),
    },

    activity: {
      byHour: source.activityByHour,
      byWeekday: source.activityByWeekday,
      busiestHour: indexOfMax(source.activityByHour),
      busiestWeekday: indexOfMax(source.activityByWeekday),
    },

    laughs: {
      total: source.laughs.total,
      byVariant: source.laughs.byVariant,
      topVariant: topVariant(source),
    },

    conversationStarters: {
      started: source.conversationsStarted,
      share: share(source.conversationsStarted, totalStarts),
      rank: participant === null ? 1 : rankBy(analysis, participant, (s) => s.conversationsStarted),
      silenceThresholdMinutes: analysis.silenceThresholdMinutes,
    },

    media: { total: source.media.total, byType: source.media.byType },

    streak: {
      longestDays: source.longestStreak.days,
      from: source.longestStreak.from,
      to: source.longestStreak.to,
    },

    format: {
      platform: analysis.format.platform,
      dateOrder: analysis.format.dateOrder,
      clock: analysis.format.clock,
    },
  }
}

/**
 * 1 = highest. Ties share the better rank, so two people with the same message
 * count are both "1" rather than one of them being arbitrarily second.
 */
function rankBy(
  analysis: ChatAnalysis,
  participant: string,
  metric: (stats: ParticipantStats) => number,
): number {
  const mine = metric(analysis.byParticipant[participant])
  let ahead = 0
  for (const name of analysis.participants) {
    if (name === participant) continue
    if (metric(analysis.byParticipant[name]) > mine) ahead++
  }
  return ahead + 1
}

function share(part: number, whole: number): number {
  if (whole === 0) return 0
  return Math.round((part / whole) * 10_000) / 10_000
}

function indexOfMax(values: readonly number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i
  }
  return best
}

function topVariant(stats: ParticipantStats): LaughVariant | null {
  if (stats.laughs.total === 0) return null
  let best: LaughVariant = LAUGH_VARIANTS[0]
  for (const variant of LAUGH_VARIANTS) {
    if (stats.laughs.byVariant[variant] > stats.laughs.byVariant[best]) best = variant
  }
  return best
}

/** Local time as `YYYY-MM-DDTHH:mm:ss`, with no `Z` and no offset applied. */
function toLocalIso(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return (
    `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
