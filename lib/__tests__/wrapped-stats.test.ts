import { describe, expect, it } from 'vitest'

import { loadFixture } from '../__fixtures__/load'
import { analyzeExport, buildWrappedStats } from '../index'
import type { ChatAnalysis, WrappedStats } from '../types'

// ---------------------------------------------------------------------------
// Type-level guard
// ---------------------------------------------------------------------------

type Equals<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

/**
 * Pins the top-level shape of the contract. Adding a field to `WrappedStats`
 * breaks this line on purpose: whoever adds it has to come back here, declare
 * it, and answer whether it leaks message text or somebody's name.
 */
type _ContractIsPinned = Expect<
  Equals<
    keyof WrappedStats,
    | 'schemaVersion'
    | 'participant'
    | 'scope'
    | 'period'
    | 'chat'
    | 'messages'
    | 'emojis'
    | 'words'
    | 'activity'
    | 'laughs'
    | 'conversationStarters'
    | 'media'
    | 'streak'
    | 'format'
  >
>

/** The only `string` field allowed to hold a human name. */
type _ParticipantIsTheOnlyName = Expect<Equals<WrappedStats['participant'], string | null>>

/** The longest message is exposed as a length and a time, never as text. */
type _LongestMessageIsNotText = Expect<
  Equals<WrappedStats['messages']['longestLength'], number>
>
type _NoMessageTextKey = Expect<
  Equals<Extract<keyof WrappedStats['messages'], 'text' | 'body' | 'longestText'>, never>
>

// ---------------------------------------------------------------------------
// Runtime guard
// ---------------------------------------------------------------------------

function leafStrings(value: unknown, path = '', into: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === 'string') {
    into.push([path, value])
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => leafStrings(item, `${path}[${i}]`, into))
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      leafStrings(child, path === '' ? key : `${path}.${key}`, into)
    }
  }
  return into
}

function analysisOf(fixture: 'group-es'): ChatAnalysis {
  const result = analyzeExport(loadFixture(fixture))
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function wrapped(participant: string | null): WrappedStats {
  const result = buildWrappedStats(loadFixture('group-es'), participant)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

describe('WrappedStats carries no message text', () => {
  it('does not contain any message body from the chat', () => {
    const analysis = analysisOf('group-es')
    const parsedTexts = Object.values(analysis.byParticipant)
      .map((p) => p.longestMessage?.text ?? '')
      .filter((t) => t.length > 0)

    expect(parsedTexts.length).toBeGreaterThan(0)

    for (const scope of [null, 'Ana', 'Bruno', 'Caro', 'Diego']) {
      const json = JSON.stringify(wrapped(scope))
      for (const text of parsedTexts) {
        expect(json).not.toContain(text)
      }
    }
  })

  it('reports the longest message as a length and a timestamp only', () => {
    const stats = wrapped('Ana')

    expect(stats.messages.longestLength).toBeGreaterThan(0)
    expect(stats.messages.longestAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    expect(Object.keys(stats.messages)).not.toContain('longestText')
  })

  it('keeps only single tokens in the word and emoji tallies', () => {
    const stats = wrapped(null)

    for (const { word } of stats.words.top) {
      expect(word).not.toMatch(/\s/)
    }
    for (const { emoji } of stats.emojis.top) {
      expect(emoji).not.toMatch(/\s/)
    }
  })
})

describe('WrappedStats names one participant and nobody else', () => {
  const everyone = ['Ana', 'Bruno', 'Caro', 'Diego'] as const

  it.each(everyone)('for %s, no other participant is named anywhere', (chosen) => {
    const stats = wrapped(chosen)
    const leaves = leafStrings(stats)

    expect(stats.participant).toBe(chosen)

    const namedAt = leaves.filter(([, value]) => value === chosen).map(([path]) => path)
    expect(namedAt).toEqual(['participant'])

    for (const other of everyone.filter((n) => n !== chosen)) {
      for (const [path, value] of leaves) {
        expect(`${path}=${value}`).not.toContain(other)
      }
    }
  })

  it('names nobody at all in whole-chat scope', () => {
    const stats = wrapped(null)

    expect(stats.participant).toBeNull()
    expect(stats.scope).toBe('chat')

    const json = JSON.stringify(stats)
    for (const name of everyone) {
      expect(json).not.toContain(name)
    }
  })

  it('every string leaf is an enum value, a date, an emoji or a single word', () => {
    const stats = wrapped('Ana')
    const allowedWords = new Set(stats.words.top.map((w) => w.word))
    const allowedEmojis = new Set(stats.emojis.top.map((e) => e.emoji))
    const enums = new Set<string>([
      'participant',
      'chat',
      'android',
      'ios',
      'DMY',
      'MDY',
      '12h',
      '24h',
      'jaja',
      'JAJA',
      'jsjs',
      'xd',
      'lol',
      'haha',
      '😂',
      'Ana',
    ])
    const dateLike = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/

    for (const [path, value] of leafStrings(stats)) {
      const allowed =
        enums.has(value) ||
        dateLike.test(value) ||
        allowedWords.has(value) ||
        allowedEmojis.has(value)
      expect(allowed, `unexpected string at ${path}: ${JSON.stringify(value)}`).toBe(true)
    }
  })
})

describe('the projection itself', () => {
  it('expresses comparisons as shares and ranks', () => {
    const ana = wrapped('Ana')

    expect(ana.messages.rank).toBeGreaterThanOrEqual(1)
    expect(ana.messages.rank).toBeLessThanOrEqual(ana.chat.participantCount)
    expect(ana.messages.share).toBeGreaterThan(0)
    expect(ana.messages.share).toBeLessThanOrEqual(1)
    expect(ana.conversationStarters.share).toBeLessThanOrEqual(1)
  })

  it('reports rank 1 and share 1 for the whole chat', () => {
    const chat = wrapped(null)

    expect(chat.messages.rank).toBe(1)
    expect(chat.messages.share).toBe(1)
    expect(chat.conversationStarters.rank).toBe(1)
    expect(chat.messages.total).toBe(chat.chat.totalMessages)
  })

  it('covers the whole span of the file', () => {
    const chat = wrapped(null)

    expect(chat.period.firstDay).toBe('2024-02-02')
    expect(chat.period.lastDay).toBe('2024-02-14')
    expect(chat.period.spanDays).toBe(13)
    expect(chat.period.activeDays).toBe(2)
  })

  it('carries the histograms at fixed sizes', () => {
    const chat = wrapped(null)

    expect(chat.activity.byHour).toHaveLength(24)
    expect(chat.activity.byWeekday).toHaveLength(7)
    expect(chat.activity.busiestHour).toBe(10)
  })

  it('reports the detected format', () => {
    const chat = wrapped(null)

    expect(chat.format).toEqual({ platform: 'android', dateOrder: 'DMY', clock: '24h' })
    expect(chat.chat.systemMessageCount).toBe(7)
  })

  it('names the top laugh variant', () => {
    const caro = wrapped('Caro')

    expect(caro.laughs.total).toBeGreaterThan(0)
    expect(caro.laughs.topVariant).not.toBeNull()
  })

  it('propagates the typed error instead of throwing', () => {
    const result = buildWrappedStats(loadFixture('not-whatsapp'), null)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('UNRECOGNIZED_FORMAT')
  })

  it('throws for a participant who is not in the chat, which is a caller bug', () => {
    const analysis = analysisOf('group-es')
    expect(analysis.byParticipant.Nadie).toBeUndefined()
    expect(() => buildWrappedStats(loadFixture('group-es'), 'Nadie')).toThrow()
  })

  it('is stable JSON: the same input gives the same output', () => {
    expect(JSON.stringify(wrapped('Ana'))).toBe(JSON.stringify(wrapped('Ana')))
  })
})
