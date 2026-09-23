/**
 * Shared vocabulary for the WhatsApp parser and the statistics engine.
 *
 * Everything here is plain data: no React, no DOM, no I/O. The whole pipeline
 * runs in the browser, so these types have to survive being built from a
 * `File.text()` string and handed straight to the UI.
 */

// ---------------------------------------------------------------------------
// Export format
// ---------------------------------------------------------------------------

/** Android exports have no brackets around the header; iOS wraps it in `[...]`. */
export type Platform = 'android' | 'ios'

/** Which of the two leading numbers in a date is the day. */
export type DateOrder = 'DMY' | 'MDY'

/** How the clock is written in the header. */
export type ClockFormat = '12h' | '24h'

/**
 * The shape of one concrete export file, as sniffed from its own lines.
 * Two phones exporting the same chat can produce two different `ChatFormat`s.
 */
export interface ChatFormat {
  readonly platform: Platform
  readonly dateOrder: DateOrder
  readonly clock: ClockFormat
  /** `true` when timestamps carry seconds (`14:03:22`), common on iOS. */
  readonly hasSeconds: boolean
  /** Year written with 2 digits (`24`) or 4 (`2024`). */
  readonly yearDigits: 2 | 4
  /** How `dateOrder` was established — useful for the warning copy. */
  readonly dateOrderConfidence: 'proven' | 'assumed'
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MediaType = 'audio' | 'image' | 'video' | 'sticker' | 'other'

/** One user message. System messages are kept apart, in `ParseResult`. */
export interface ChatMessage {
  /** Local time exactly as written in the export; never timezone-shifted. */
  readonly timestamp: Date
  readonly author: string
  /** Full body, with the original newlines of a multi-line message. */
  readonly text: string
  /** Set when the message carries (or stands in for) an attachment. */
  readonly media: MediaType | null
}

/** A non-user line: encryption notice, subject change, joins and leaves. */
export interface SystemMessage {
  readonly timestamp: Date
  readonly text: string
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

export type WarningCode =
  | 'AMBIGUOUS_DATE_ORDER'
  | 'UNPARSEABLE_LINES'
  | 'LEADING_GARBAGE'

export interface ParseWarning {
  readonly code: WarningCode
  /** Human-readable, in Spanish — the UI shows it as-is. */
  readonly message: string
}

export interface DateRange {
  readonly from: Date
  readonly to: Date
}

export interface ParseResult {
  readonly messages: readonly ChatMessage[]
  /** Distinct authors of user messages, in first-seen order. */
  readonly participants: readonly string[]
  readonly dateRange: DateRange
  readonly format: ChatFormat
  readonly warnings: readonly ParseWarning[]
  /** System messages are excluded from every statistic, only counted here. */
  readonly systemMessages: readonly SystemMessage[]
}

// ---------------------------------------------------------------------------
// Counted aggregates
// ---------------------------------------------------------------------------

export interface EmojiCount {
  /** A single grapheme cluster: 👨‍👩‍👧 and 🏳️‍🌈 are one entry each. */
  readonly emoji: string
  readonly count: number
}

export interface WordCount {
  /** Lowercased, accent-preserving token; stopwords are already removed. */
  readonly word: string
  readonly count: number
}

/** The laugh dialects V1 recognises. */
export type LaughVariant = 'jaja' | 'JAJA' | 'jsjs' | 'xd' | 'lol' | 'haha' | '😂'

export type LaughBreakdown = Readonly<Record<LaughVariant, number>>

export type MediaBreakdown = Readonly<Record<MediaType, number>>

// ---------------------------------------------------------------------------
// Per-participant / per-chat statistics (internal, may contain text)
// ---------------------------------------------------------------------------

/**
 * Everything computed for one author (or, in `ChatAnalysis.chat`, for the whole
 * chat). Unlike {@link WrappedStats} this *may* hold literal text — it is the
 * working set the UI reads from, never the payload sent to an LLM.
 */
export interface ParticipantStats {
  /** Author name, or `null` when these are the whole-chat totals. */
  readonly participant: string | null
  readonly messageCount: number
  readonly wordCount: number
  readonly charCount: number
  readonly averageMessageLength: number
  readonly longestMessage: { readonly text: string; readonly length: number; readonly timestamp: Date } | null
  readonly topEmojis: readonly EmojiCount[]
  readonly emojiTotal: number
  readonly distinctEmojiCount: number
  readonly topWords: readonly WordCount[]
  /** 24 slots, index = hour of day in the chat's local time. */
  readonly activityByHour: readonly number[]
  /** 7 slots, index 0 = Sunday, matching `Date.prototype.getDay()`. */
  readonly activityByWeekday: readonly number[]
  readonly laughs: { readonly total: number; readonly byVariant: LaughBreakdown }
  readonly conversationsStarted: number
  readonly media: { readonly total: number; readonly byType: MediaBreakdown }
  /** Days with at least one message, as `YYYY-MM-DD`. */
  readonly activeDays: number
  readonly longestStreak: StreakInfo
}

export interface StreakInfo {
  readonly days: number
  /** `YYYY-MM-DD`, or `null` when there are no messages at all. */
  readonly from: string | null
  readonly to: string | null
}

export interface ChatAnalysis {
  readonly format: ChatFormat
  readonly warnings: readonly ParseWarning[]
  readonly participants: readonly string[]
  readonly dateRange: DateRange
  readonly totalMessages: number
  readonly systemMessageCount: number
  /** Silence in minutes above which a message opens a new conversation. */
  readonly silenceThresholdMinutes: number
  /** Totals across every participant. */
  readonly chat: ParticipantStats
  /** Keyed by author name, in `participants` order. */
  readonly byParticipant: Readonly<Record<string, ParticipantStats>>
  /** Per-day message counts for the whole chat, `YYYY-MM-DD` → count. */
  readonly messagesByDay: Readonly<Record<string, number>>
}

// ---------------------------------------------------------------------------
// WrappedStats — the stable, shareable contract
// ---------------------------------------------------------------------------

/**
 * The contract every other piece of the product builds against, and the exact
 * JSON that V2 will hand to the LLM.
 *
 * Two rules keep it safe to send away, and they are enforced by a test:
 *
 * 1. **Aggregates only.** No message bodies, ever. The longest message shows up
 *    as a length and a timestamp, not as text. (`topWords` and `topEmojis` are
 *    frequency tables, not quotes.)
 * 2. **One name, one place.** `participant` is the only field that may hold a
 *    human name. Comparisons against the rest of the chat are expressed as
 *    shares and ranks, never by naming anybody else.
 *
 * Bump `schemaVersion` on any breaking change; consumers may switch on it.
 */
export interface WrappedStats {
  readonly schemaVersion: 1

  /** The chosen participant's name, or `null` for the whole chat. */
  readonly participant: string | null
  readonly scope: 'participant' | 'chat'

  /** The full span of the file: V1 never filters by year or period. */
  readonly period: {
    /** `YYYY-MM-DD` of the first message. */
    readonly firstDay: string
    /** `YYYY-MM-DD` of the last message. */
    readonly lastDay: string
    /** Calendar days between `firstDay` and `lastDay`, inclusive. */
    readonly spanDays: number
    /** Days on which this scope actually sent something. */
    readonly activeDays: number
  }

  readonly chat: {
    readonly participantCount: number
    readonly totalMessages: number
    readonly systemMessageCount: number
  }

  readonly messages: {
    readonly total: number
    /** Share of all chat messages, 0–1, rounded to 4 decimals. */
    readonly share: number
    /** 1 = sends the most messages. Always 1 when `scope` is `chat`. */
    readonly rank: number
    readonly perActiveDay: number
    readonly averageLength: number
    readonly longestLength: number
    /** ISO-8601 local timestamp of the longest message, never its text. */
    readonly longestAt: string | null
  }

  readonly emojis: {
    readonly total: number
    readonly distinct: number
    readonly perDay: number
    readonly top: readonly EmojiCount[]
  }

  readonly words: {
    readonly total: number
    /** Stopwords already removed, most frequent first. */
    readonly top: readonly WordCount[]
  }

  readonly activity: {
    /** 24 counts, index = hour. */
    readonly byHour: readonly number[]
    /** 7 counts, index 0 = Sunday. */
    readonly byWeekday: readonly number[]
    readonly busiestHour: number
    readonly busiestWeekday: number
  }

  readonly laughs: {
    readonly total: number
    readonly byVariant: LaughBreakdown
    readonly topVariant: LaughVariant | null
  }

  readonly conversationStarters: {
    readonly started: number
    /** Share of all conversation openings in the chat, 0–1. */
    readonly share: number
    /** 1 = opens the most conversations. Always 1 when `scope` is `chat`. */
    readonly rank: number
    readonly silenceThresholdMinutes: number
  }

  readonly media: {
    readonly total: number
    readonly byType: MediaBreakdown
  }

  readonly streak: {
    readonly longestDays: number
    /** `YYYY-MM-DD`, or `null` when there are no messages. */
    readonly from: string | null
    readonly to: string | null
  }

  readonly format: {
    readonly platform: Platform
    readonly dateOrder: DateOrder
    readonly clock: ClockFormat
  }
}
