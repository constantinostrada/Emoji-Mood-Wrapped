import { describe, expect, it } from 'vitest'

import { loadFixture, type FixtureName } from '../__fixtures__/load'
import { analyzeExport } from '../index'
import { analyzeChat, DEFAULT_SILENCE_THRESHOLD_MINUTES } from '../stats'
import { parseChat } from '../parser'
import type { ChatAnalysis } from '../types'

function analyzed(fixture: FixtureName): ChatAnalysis {
  const result = analyzeExport(loadFixture(fixture))
  if (!result.ok) throw new Error(`${fixture} failed: ${result.error.code}`)
  return result.value
}

/** Builds a tiny chat from `HH:MM` offsets so gaps are obvious to read. */
function chatOf(lines: readonly string[], silenceThresholdMinutes?: number): ChatAnalysis {
  const parsed = parseChat(lines.join('\n'), { minMessages: 1 })
  if (!parsed.ok) throw new Error(parsed.error.code)
  return analyzeChat(parsed.value, { silenceThresholdMinutes })
}

describe('media counting across export modes', () => {
  it('gives the same audio, image and sticker counts with and without media', () => {
    const withMedia = analyzed('media-with').chat.media
    const withoutMedia = analyzed('media-without').chat.media

    expect(withMedia.byType.audio).toBe(2)
    expect(withMedia.byType.image).toBe(3)
    expect(withMedia.byType.sticker).toBe(2)
    expect(withMedia.byType.video).toBe(1)

    expect(withoutMedia.byType).toEqual(withMedia.byType)
    expect(withoutMedia.total).toBe(withMedia.total)
  })

  it('splits media per participant', () => {
    const analysis = analyzed('media-with')

    expect(analysis.byParticipant.Ana.media.byType).toEqual({
      audio: 1,
      image: 2,
      sticker: 1,
      video: 0,
      other: 0,
    })
    expect(analysis.byParticipant.Bruno.media.byType).toEqual({
      audio: 1,
      image: 1,
      sticker: 1,
      video: 1,
      other: 0,
    })
  })

  it('keeps attachment file names out of the word and emoji tallies', () => {
    const analysis = analyzed('media-with')
    const words = analysis.chat.topWords.map((w) => w.word)

    expect(words).not.toContain('jpg')
    expect(words).not.toContain('archivo')
    expect(words).not.toContain('adjunto')
  })
})

describe('conversation starters', () => {
  const day = '5/3/24'

  it('counts two openings when the silence is longer than the threshold', () => {
    const analysis = chatOf([
      `${day}, 09:00 - Ana: buen día`,
      `${day}, 20:00 - Bruno: hola, recién veo`,
    ])

    expect(analysis.silenceThresholdMinutes).toBe(DEFAULT_SILENCE_THRESHOLD_MINUTES)
    expect(analysis.chat.conversationsStarted).toBe(2)
    expect(analysis.byParticipant.Ana.conversationsStarted).toBe(1)
    expect(analysis.byParticipant.Bruno.conversationsStarted).toBe(1)
  })

  it('counts one opening when the silence is shorter than the threshold', () => {
    const analysis = chatOf([
      `${day}, 09:00 - Ana: buen día`,
      `${day}, 10:00 - Bruno: hola, recién veo`,
    ])

    expect(analysis.chat.conversationsStarted).toBe(1)
    expect(analysis.byParticipant.Ana.conversationsStarted).toBe(1)
    expect(analysis.byParticipant.Bruno.conversationsStarted).toBe(0)
  })

  it('attributes each opening to whoever broke the silence', () => {
    const analysis = chatOf([
      `${day}, 09:00 - Ana: buen día`,
      `${day}, 09:05 - Bruno: hola`,
      `${day}, 22:00 - Bruno: ey, seguís?`,
      `6/3/24, 09:00 - Ana: recién me levanto`,
    ])

    expect(analysis.chat.conversationsStarted).toBe(3)
    expect(analysis.byParticipant.Ana.conversationsStarted).toBe(2)
    expect(analysis.byParticipant.Bruno.conversationsStarted).toBe(1)
  })

  it('honours a custom threshold', () => {
    const lines = [`${day}, 09:00 - Ana: hola`, `${day}, 11:00 - Bruno: hola`]

    expect(chatOf(lines, 60).chat.conversationsStarted).toBe(2)
    expect(chatOf(lines, 180).chat.conversationsStarted).toBe(1)
  })
})

describe('per-participant and whole-chat aggregates', () => {
  it('counts messages per participant and for the chat', () => {
    const analysis = analyzed('group-es')

    expect(analysis.totalMessages).toBe(12)
    expect(analysis.chat.messageCount).toBe(12)

    const perPerson = Object.values(analysis.byParticipant).map((p) => p.messageCount)
    expect(perPerson.reduce((a, b) => a + b, 0)).toBe(12)
    expect(analysis.byParticipant.Ana.messageCount).toBe(3)
    expect(analysis.byParticipant.Diego.messageCount).toBe(3)
  })

  it('reports the system message count separately', () => {
    expect(analyzed('group-es').systemMessageCount).toBe(7)
  })

  it('builds an activity histogram of 24 hours and 7 weekdays', () => {
    const analysis = analyzed('group-es')

    expect(analysis.chat.activityByHour).toHaveLength(24)
    expect(analysis.chat.activityByWeekday).toHaveLength(7)
    expect(analysis.chat.activityByHour.reduce((a, b) => a + b, 0)).toBe(12)
    expect(analysis.chat.activityByWeekday.reduce((a, b) => a + b, 0)).toBe(12)
    // The 2nd of February 2024 conversation happened between 10:00 and 11:03.
    expect(analysis.chat.activityByHour[10]).toBe(5)
    expect(analysis.chat.activityByHour[11]).toBe(3)
  })

  it('finds the longest message and the average length', () => {
    const analysis = analyzed('android-es')
    const ana = analysis.byParticipant.Ana

    expect(ana.longestMessage?.text).toContain('te cuento algo')
    expect(ana.longestMessage?.length).toBe(ana.longestMessage?.text.length)
    expect(ana.averageMessageLength).toBeGreaterThan(0)
    expect(ana.averageMessageLength).toBe(
      Math.round((ana.charCount / ana.messageCount) * 100) / 100,
    )
  })

  it('counts emoji per participant and for the chat', () => {
    const analysis = analyzed('android-es')

    expect(analysis.byParticipant.Bruno.topEmojis[0]).toEqual({ emoji: '😂', count: 3 })
    expect(analysis.chat.emojiTotal).toBe(
      analysis.byParticipant.Ana.emojiTotal + analysis.byParticipant.Bruno.emojiTotal,
    )
  })

  it('counts laughs per participant with the breakdown', () => {
    const analysis = analyzed('android-es')

    expect(analysis.byParticipant.Bruno.laughs.byVariant.jaja).toBe(1)
    expect(analysis.byParticipant.Bruno.laughs.byVariant.JAJA).toBe(1)
    expect(analysis.byParticipant.Bruno.laughs.byVariant.xd).toBe(1)
    expect(analysis.chat.laughs.total).toBe(
      analysis.byParticipant.Ana.laughs.total + analysis.byParticipant.Bruno.laughs.total,
    )
  })

  it('drops stopwords from the top words', () => {
    const analysis = analyzed('android-es')
    const words = analysis.chat.topWords.map((w) => w.word)

    expect(words).not.toContain('que')
    expect(words).not.toContain('de')
    expect(words).toContain('jefe')
  })

  it('counts the days each participant was active', () => {
    const analysis = analyzed('android-es')

    // Ana wrote on the 5th, the 6th and the 13th of March.
    expect(analysis.byParticipant.Ana.activeDays).toBe(3)
    expect(Object.keys(analysis.messagesByDay).sort()).toEqual([
      '2024-03-05',
      '2024-03-06',
      '2024-03-13',
    ])
  })
})

describe('streaks', () => {
  it('finds the longest run of consecutive days', () => {
    const analysis = chatOf([
      '1/3/24, 10:00 - Ana: uno',
      '2/3/24, 10:00 - Ana: dos',
      '3/3/24, 10:00 - Ana: tres',
      '10/3/24, 10:00 - Ana: lejos',
      '11/3/24, 10:00 - Ana: cerca',
    ])

    expect(analysis.byParticipant.Ana.longestStreak).toEqual({
      days: 3,
      from: '2024-03-01',
      to: '2024-03-03',
    })
  })

  it('counts a single day as a streak of one', () => {
    const analysis = chatOf(['1/3/24, 10:00 - Ana: sola'])

    expect(analysis.chat.longestStreak.days).toBe(1)
  })

  it('crosses a month boundary', () => {
    const analysis = chatOf([
      '28/2/24, 10:00 - Ana: uno',
      '29/2/24, 10:00 - Ana: dos',
      '1/3/24, 10:00 - Ana: tres',
    ])

    expect(analysis.chat.longestStreak).toEqual({
      days: 3,
      from: '2024-02-28',
      to: '2024-03-01',
    })
  })
})

describe('the analysis covers the whole file', () => {
  it('never filters by year', () => {
    const analysis = chatOf([
      '1/3/23, 10:00 - Ana: el año pasado',
      '1/3/24, 10:00 - Ana: este año',
      '2/3/24, 10:00 - Bruno: y yo',
    ])

    expect(analysis.totalMessages).toBe(3)
    expect(analysis.dateRange.from.getFullYear()).toBe(2023)
    expect(analysis.dateRange.to.getFullYear()).toBe(2024)
  })
})
