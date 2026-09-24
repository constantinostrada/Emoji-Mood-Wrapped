import { describe, expect, it } from 'vitest'

import {
  BASE_STATS,
  hoursPeakingAt,
  LAUGHER,
  makeStats,
  MINIMAL,
  NEVER_STARTS,
  NIGHT_OWL,
} from '../__fixtures__/sample-stats'
import { narrateWithTemplates, PERSONALITY_CATALOG, templateNarrator, wrappedTitle } from '../humor'
import type { PersonalityId } from '../humor'
import type { WrappedStats } from '../types'

const peakingAt = (hour: number) =>
  makeStats({ activity: { byHour: hoursPeakingAt(hour), busiestHour: hour } })

describe('narrateWithTemplates', () => {
  it('is deterministic: the same stats give the same metrics and texts', async () => {
    for (const stats of [BASE_STATS, NIGHT_OWL, LAUGHER, NEVER_STARTS, MINIMAL]) {
      const again = structuredClone(stats)
      expect(narrateWithTemplates(again)).toEqual(narrateWithTemplates(stats))
      expect(await templateNarrator.narrate(stats)).toEqual(narrateWithTemplates(stats))
    }
  })

  it('01:00 means awake at 3 AM and needing sleep; 14:00 does not', () => {
    const night = narrateWithTemplates(peakingAt(1))
    expect(night.metrics.awakeAt3amProbability).toBeGreaterThan(80)
    expect(night.texts.diagnosis.family).toBe('needs-sleep')

    const afternoon = narrateWithTemplates(peakingAt(14))
    expect(afternoon.metrics.awakeAt3amProbability).toBeLessThan(30)
    expect(afternoon.texts.diagnosis.family).not.toBe('needs-sleep')
  })

  it('zero laughs give a jajaja index of 0%', () => {
    const stats = makeStats({ laughs: { total: 0, byVariant: MINIMAL.laughs.byVariant, topVariant: null } })
    expect(narrateWithTemplates(stats).metrics.laughIndex).toBe(0)
  })

  it('never produces NaN, even with every field at its minimum', () => {
    const json = JSON.stringify(narrateWithTemplates(MINIMAL))
    expect(json).not.toMatch(/NaN|undefined|null%/)
  })

  it('similar profiles do not all get the same diagnosis text', () => {
    const texts = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((extra) =>
        narrateWithTemplates(makeStats({ messages: { total: 200 + extra } })).texts.diagnosis.text,
      ),
    )
    expect(texts.size).toBeGreaterThan(1)
  })
})

describe('personality catalog', () => {
  const cases: Record<PersonalityId, WrappedStats> = {
    'night-owl': NIGHT_OWL,
    'laugh-machine': LAUGHER,
    ghost: NEVER_STARTS,
    'main-character': makeStats({ messages: { share: 0.7 } }),
    podcaster: makeStats({ media: { total: 40, byType: { audio: 40, image: 0, sticker: 0 } } }),
    'sticker-lord': makeStats({ media: { total: 30, byType: { sticker: 30, image: 0, audio: 0 } } }),
    'emoji-maximalist': makeStats({ emojis: { total: 250 } }),
    novelist: makeStats({ messages: { averageLength: 150 } }),
    'early-bird': makeStats({ activity: { byHour: hoursPeakingAt(6), busiestHour: 6 } }),
    'dry-texter': makeStats({ emojis: { total: 5 }, laughs: { total: 2 } }),
    npc: BASE_STATS,
  }

  it('has at least 8 personalities', () => {
    expect(PERSONALITY_CATALOG.length).toBeGreaterThanOrEqual(8)
  })

  it.each(PERSONALITY_CATALOG.map((p) => p.id))('%s is produced by a test profile', (id) => {
    expect(narrateWithTemplates(cases[id]).metrics.personality.id).toBe(id)
  })
})

describe('wrappedTitle', () => {
  it.each([
    [6, 'Your Week Wrapped'],
    [25, 'Your Month Wrapped'],
    [200, 'Your Chat Wrapped'],
  ])('%i days → %s', (spanDays, title) => {
    expect(wrappedTitle(makeStats({ period: { spanDays } }))).toBe(title)
  })
})
