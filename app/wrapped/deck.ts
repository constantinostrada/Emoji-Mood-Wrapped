/**
 * The Wrapped as data: an ordered list of card models built from the stats and
 * the narrative. No React here, so the rules — which cards show, which get a
 * funny "empty" variant, what every number reads as — are unit-testable.
 *
 * A card never shows a bare zero: when there is nothing to count, it either
 * disappears (runner-up emoji, favourite words, comparisons in a solo chat) or
 * switches to an `empty` variant with a joke instead of a number.
 */

import {
  hourLabel,
  laughSample,
  periodKind,
  wrappedSummary,
  wrappedTitle,
  type LaughVariant,
  type MediaType,
  type WrappedNarrative,
  type WrappedStats,
  type WrappedSummary,
} from '@/lib'

export type CardId =
  | 'intro'
  | 'top-emoji'
  | 'second-emoji'
  | 'messages'
  | 'laughs'
  | 'busiest-hour'
  | 'chaotic-day'
  | 'who-starts'
  | 'who-sends-more'
  | 'media'
  | 'words'
  | 'absurd-metrics'
  | 'personality'
  | 'diagnosis'
  | 'final'

export interface Bar {
  readonly label: string
  readonly value: number
  readonly highlight?: boolean
}

export type Viz =
  | { readonly kind: 'bars'; readonly bars: readonly Bar[]; readonly compact?: boolean }
  | { readonly kind: 'ranking'; readonly items: readonly { readonly label: string; readonly count: string }[] }
  | { readonly kind: 'chips'; readonly items: readonly { readonly label: string; readonly count: string }[] }
  | { readonly kind: 'meters'; readonly items: readonly { readonly label: string; readonly percent: number; readonly caption: string }[] }
  | { readonly kind: 'share'; readonly percent: number; readonly caption: string }

export interface Card {
  readonly id: CardId
  readonly variant: 'full' | 'empty'
  /** CSS `background` value. */
  readonly background: string
  readonly emoji: string
  readonly kicker: string
  readonly headline: string
  /** The big number or word; absent on cards that are all text. */
  readonly value?: string
  readonly body?: string
  /** Small print under the body, e.g. a catchphrase or a wink. */
  readonly aside?: string
  readonly viz?: Viz
}

export interface FinalCard extends Card {
  readonly id: 'final'
  readonly summaryLines: readonly string[]
  /** Seam with the shareable image piece. */
  readonly summary: WrappedSummary
}

export type Deck = readonly (Card | FinalCard)[]

export const DISCLAIMER = 'Solo entretenimiento. No es un análisis psicológico.'

const GRADIENTS: Readonly<Record<CardId, string>> = {
  intro: 'linear-gradient(160deg, #7c3aed 0%, #c026d3 55%, #db2777 100%)',
  'top-emoji': 'linear-gradient(160deg, #f59e0b 0%, #ef4444 60%, #be185d 100%)',
  'second-emoji': 'linear-gradient(160deg, #fb7185 0%, #e11d48 55%, #7c2d12 100%)',
  messages: 'linear-gradient(160deg, #0ea5e9 0%, #6366f1 60%, #312e81 100%)',
  laughs: 'linear-gradient(160deg, #facc15 0%, #f97316 55%, #c2410c 100%)',
  'busiest-hour': 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 55%, #7e22ce 100%)',
  'chaotic-day': 'linear-gradient(160deg, #ec4899 0%, #8b5cf6 60%, #1e3a8a 100%)',
  'who-starts': 'linear-gradient(160deg, #10b981 0%, #0d9488 55%, #164e63 100%)',
  'who-sends-more': 'linear-gradient(160deg, #22d3ee 0%, #3b82f6 55%, #4338ca 100%)',
  media: 'linear-gradient(160deg, #a3e635 0%, #16a34a 55%, #14532d 100%)',
  words: 'linear-gradient(160deg, #f472b6 0%, #db2777 55%, #831843 100%)',
  'absurd-metrics': 'linear-gradient(160deg, #ef4444 0%, #b91c1c 50%, #450a0a 100%)',
  personality: 'linear-gradient(160deg, #8b5cf6 0%, #6d28d9 50%, #2e1065 100%)',
  diagnosis: 'linear-gradient(160deg, #0f172a 0%, #334155 50%, #0e7490 100%)',
  final: 'linear-gradient(160deg, #f59e0b 0%, #db2777 50%, #7c3aed 100%)',
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const LAUGH_LABELS: Readonly<Record<LaughVariant, string>> = {
  jaja: 'jajaja',
  JAJA: 'JAJAJA',
  jsjs: 'jsjsjs',
  xd: 'XD',
  lol: 'lol',
  haha: 'hahaha',
  '😂': '😂',
}

const MEDIA_LABELS: Readonly<Record<MediaType, string>> = {
  audio: '🎙️ Voice notes',
  sticker: '🦄 Stickers',
  image: '📸 Photos',
  video: '🎬 Videos',
  other: '📎 Other',
}

const n = (value: number) => value.toLocaleString('en-US')
const pct = (share: number) => `${Math.round(share * 100)}%`

function card(id: CardId, fields: Omit<Card, 'id' | 'background' | 'variant'> & { variant?: Card['variant'] }): Card {
  return { id, background: GRADIENTS[id], variant: 'full', ...fields }
}

/** `2024-03-04` → `Mar 4, 2024`, without going through `Date` and UTC. */
function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${MONTHS[m - 1] ?? ''} ${d}, ${y}`
}

export function buildDeck(stats: WrappedStats, narrative: WrappedNarrative): Deck {
  const { metrics, texts } = narrative
  const isChat = stats.scope === 'chat'
  const period = periodKind(stats)
  const hasMessages = stats.messages.total > 0
  const cards: (Card | FinalCard)[] = []

  // --- Intro --------------------------------------------------------------
  cards.push(
    card('intro', {
      emoji: '🎁',
      kicker: 'Emoji Mood Wrapped',
      headline: wrappedTitle(stats),
      value: stats.participant ?? 'The whole chat',
      body:
        stats.period.firstDay === stats.period.lastDay
          ? formatDay(stats.period.firstDay)
          : `${formatDay(stats.period.firstDay)} – ${formatDay(stats.period.lastDay)}`,
      aside: 'Tap to start →',
    }),
  )

  // --- Emojis ---------------------------------------------------------------
  const [first, second] = stats.emojis.top
  if (first !== undefined && stats.emojis.total > 0) {
    cards.push(
      card('top-emoji', {
        emoji: first.emoji,
        kicker: `Emoji of the ${period}`,
        headline: isChat ? 'The chat’s official emoji' : 'Your official emoji',
        value: `${n(first.count)}×`,
        body: `${n(stats.emojis.total)} emojis in total, ${n(stats.emojis.distinct)} different ones.`,
        viz: {
          kind: 'ranking',
          items: stats.emojis.top.slice(0, 5).map((e) => ({ label: e.emoji, count: `${n(e.count)}×` })),
        },
      }),
    )
  } else {
    cards.push(
      card('top-emoji', {
        variant: 'empty',
        emoji: '🫥',
        kicker: `Emoji of the ${period}`,
        headline: 'No emoji. Not one.',
        body: 'The emoji keyboard has cobwebs. Somewhere, a 😂 is crying alone.',
      }),
    )
  }
  if (second !== undefined) {
    cards.push(
      card('second-emoji', {
        emoji: second.emoji,
        kicker: 'Runner-up',
        headline: 'Always the bridesmaid',
        value: `${n(second.count)}×`,
        body: `${second.emoji} came second. It is fine. It is taking it well.`,
      }),
    )
  }

  // --- Messages -------------------------------------------------------------
  cards.push(
    hasMessages
      ? card('messages', {
          emoji: '💬',
          kicker: 'Messages sent',
          headline: isChat ? 'This chat does not stop' : 'Your thumbs worked hard',
          value: n(stats.messages.total),
          body: `About ${n(Math.round(stats.messages.perActiveDay))} a day on active days. The longest one: ${n(stats.messages.longestLength)} characters.`,
        })
      : card('messages', {
          variant: 'empty',
          emoji: '🦗',
          kicker: 'Messages sent',
          headline: 'Technically, none',
          body: 'Just crickets. The quietest chat in recorded history.',
        }),
  )

  // --- Laughs ---------------------------------------------------------------
  if (stats.laughs.total > 0) {
    const variants = (Object.keys(LAUGH_LABELS) as LaughVariant[]).filter((v) => stats.laughs.byVariant[v] > 0)
    cards.push(
      card('laughs', {
        emoji: '🤣',
        kicker: 'Laughs',
        headline: stats.laughs.topVariant
          ? `Favourite dialect: ${laughSample(stats.laughs.topVariant)}`
          : 'The laugh count',
        value: n(stats.laughs.total),
        body: 'Every jaja, every XD, every 😂. We counted them all.',
        viz: {
          kind: 'chips',
          items: variants.map((v) => ({ label: LAUGH_LABELS[v], count: n(stats.laughs.byVariant[v]) })),
        },
      }),
    )
  } else {
    cards.push(
      card('laughs', {
        variant: 'empty',
        emoji: '😐',
        kicker: 'Laughs',
        headline: 'Not a single jaja',
        body: 'No jajaja, no XD, no 😂. Are you okay? Blink twice if you need a meme.',
      }),
    )
  }

  // --- Time -----------------------------------------------------------------
  if (hasMessages) {
    const hour = stats.activity.busiestHour
    cards.push(
      card('busiest-hour', {
        emoji: hour <= 4 ? '🌙' : hour <= 11 ? '☀️' : hour <= 19 ? '🌤️' : '🌆',
        kicker: 'Most active hour',
        headline: hour <= 4 ? 'Go to sleep. Seriously.' : 'Prime time',
        value: hourLabel(hour),
        body: `${n(stats.activity.byHour[hour] ?? 0)} messages at that hour alone.`,
        viz: {
          kind: 'bars',
          compact: true,
          bars: stats.activity.byHour.map((value, h) => ({
            label: h % 6 === 0 ? String(h).padStart(2, '0') : '',
            value,
            highlight: h === hour,
          })),
        },
      }),
    )
    const day = stats.activity.busiestWeekday
    cards.push(
      card('chaotic-day', {
        emoji: '🌪️',
        kicker: 'Most chaotic day',
        headline: `${WEEKDAYS[day]}s hit different`,
        value: WEEKDAYS[day],
        body: `${n(stats.activity.byWeekday[day] ?? 0)} messages on ${WEEKDAYS[day]}s. The calendar fears it.`,
        viz: {
          kind: 'bars',
          bars: stats.activity.byWeekday.map((value, d) => ({ label: WEEKDAY_SHORT[d], value, highlight: d === day })),
        },
      }),
    )
  } else {
    cards.push(
      card('busiest-hour', {
        variant: 'empty',
        emoji: '🕳️',
        kicker: 'Most active hour',
        headline: 'No hour, no day, no clue',
        body: 'The clock kept ticking. Nobody typed. Time is a construct anyway.',
      }),
    )
  }

  // --- Comparisons (only with somebody to compare against) -----------------
  if (stats.chat.participantCount >= 2) {
    const others = stats.chat.participantCount
    const starters = stats.conversationStarters
    const silenceHours = Math.round(starters.silenceThresholdMinutes / 60)
    cards.push(
      isChat
        ? card('who-starts', {
            emoji: '📣',
            kicker: 'Who starts the conversation',
            headline: 'Someone always breaks the silence',
            value: n(starters.started),
            body: `Conversations opened in this chat after ${silenceHours}+ hours of silence.`,
          })
        : starters.started === 0
          ? card('who-starts', {
              variant: 'empty',
              emoji: '🫣',
              kicker: 'Who starts the conversation',
              headline: 'Not you. Never you.',
              body: `Out of every conversation in this chat, you opened exactly none. Rank #${starters.rank} of ${others}.`,
              viz: { kind: 'share', percent: 0, caption: 'Your share of conversation starts' },
            })
          : card('who-starts', {
              emoji: starters.rank === 1 ? '📣' : '🤫',
              kicker: 'Who starts the conversation',
              headline: starters.rank === 1 ? 'You break the silence' : 'You let others go first',
              value: pct(starters.share),
              body: `You opened ${n(starters.started)} conversations. Rank #${starters.rank} of ${others}.`,
              viz: { kind: 'share', percent: Math.round(starters.share * 100), caption: 'Your share of conversation starts' },
            }),
    )
    cards.push(
      isChat
        ? card('who-sends-more', {
            emoji: '👥',
            kicker: 'Who sends more',
            headline: `${n(others)} people, one group chat`,
            value: n(Math.round(stats.messages.total / others)),
            body: 'Messages per person, on average. Some are clearly carrying the team.',
          })
        : card('who-sends-more', {
            emoji: stats.messages.rank === 1 ? '🏆' : '🥈',
            kicker: 'Who sends more',
            headline: stats.messages.rank === 1 ? 'The loudest one here' : 'Not the loudest, not the quietest',
            value: pct(stats.messages.share),
            body: `Of every message in the chat, that share is yours. Rank #${stats.messages.rank} of ${others}.`,
            viz: { kind: 'share', percent: Math.round(stats.messages.share * 100), caption: 'Your share of all messages' },
          }),
    )
  }

  // --- Media ----------------------------------------------------------------
  if (stats.media.total > 0) {
    const types = (Object.keys(MEDIA_LABELS) as MediaType[]).filter((t) => stats.media.byType[t] > 0)
    cards.push(
      card('media', {
        emoji: stats.media.byType.audio >= stats.media.byType.sticker ? '🎙️' : '🦄',
        kicker: 'Audios, stickers & more',
        headline: 'Words were not enough',
        value: n(stats.media.total),
        body: 'Things sent that are not text.',
        viz: { kind: 'chips', items: types.map((t) => ({ label: MEDIA_LABELS[t], count: n(stats.media.byType[t]) })) },
      }),
    )
  } else {
    cards.push(
      card('media', {
        variant: 'empty',
        emoji: '📵',
        kicker: 'Audios, stickers & more',
        headline: 'Text only, like it’s 2009',
        body: 'No voice notes, no stickers, no photos. A purist. Or a flip phone.',
      }),
    )
  }

  // --- Words ----------------------------------------------------------------
  if (stats.words.top.length > 0) {
    cards.push(
      card('words', {
        emoji: '🗣️',
        kicker: 'Favourite words',
        headline: `“${stats.words.top[0].word}” is doing a lot of work`,
        viz: {
          kind: 'ranking',
          items: stats.words.top.slice(0, 5).map((w) => ({ label: w.word, count: `${n(w.count)}×` })),
        },
      }),
    )
  }

  // --- Absurd metrics -------------------------------------------------------
  cards.push(
    card('absurd-metrics', {
      emoji: '📈',
      kicker: 'Very scientific metrics',
      headline: 'The numbers don’t lie (they do)',
      viz: {
        kind: 'meters',
        items: [
          { label: 'Chaos level', percent: metrics.chaosLevel, caption: caption(metrics.chaosLevel, ['Monk mode', 'Mild mayhem', 'Certified chaos']) },
          { label: 'Odds of being awake at 3 AM', percent: metrics.awakeAt3amProbability, caption: caption(metrics.awakeAt3amProbability, ['Sleeps like a baby', 'Occasional night shift', 'Owl behaviour']) },
          { label: 'Jajaja index', percent: metrics.laughIndex, caption: caption(metrics.laughIndex, ['Stone face', 'Chuckles politely', 'Laughs at everything']) },
        ],
      },
    }),
  )
  cards.push(
    card('personality', {
      emoji: metrics.personality.emoji,
      kicker: `Personality of the ${period}`,
      headline: metrics.personality.name,
      body: metrics.personality.reason,
      aside:
        metrics.emojiRepresents.emoji === null
          ? `Your emoji represents you: ${metrics.emojiRepresents.verdict}`
          : `${metrics.emojiRepresents.emoji} represents you ${metrics.emojiRepresents.percent}%. ${metrics.emojiRepresents.verdict}`,
    }),
  )

  // --- Diagnosis ------------------------------------------------------------
  cards.push(
    card('diagnosis', {
      emoji: '🤖',
      kicker: 'AI Diagnosis · IA muy artificial',
      headline: 'The machine has spoken',
      body: texts.diagnosis.text,
      aside: `Catchphrase: ${texts.catchphrase}`,
    }),
  )

  // --- Final ----------------------------------------------------------------
  const summary = wrappedSummary(stats, narrative)
  const final: FinalCard = {
    id: 'final',
    variant: 'full',
    background: GRADIENTS.final,
    emoji: summary.emoji,
    kicker: wrappedTitle(stats),
    headline: texts.weekTitle,
    summaryLines: texts.summary,
    summary,
  }
  cards.push(final)

  return cards
}

function caption(percent: number, [low, mid, high]: readonly [string, string, string]): string {
  if (percent < 34) return low
  if (percent < 67) return mid
  return high
}

export function isFinalCard(c: Card): c is FinalCard {
  return c.id === 'final'
}
