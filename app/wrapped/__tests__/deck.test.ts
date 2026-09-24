import { describe, expect, it } from 'vitest'

import { LAUGHER, makeStats, MINIMAL, NEVER_STARTS, NIGHT_OWL } from '@/lib/__fixtures__/sample-stats'
import { narrateWithTemplates, type WrappedStats } from '@/lib'

import { buildDeck, isFinalCard, type Card } from '../deck'

const deckOf = (stats: WrappedStats) => buildDeck(stats, narrateWithTemplates(stats))

/** Every string a card can put on screen, plus the ones that stand alone as a number. */
function texts(card: Card): { all: string[]; standalone: string[] } {
  const all = [card.kicker, card.headline, card.value, card.body, card.aside].filter((s) => s !== undefined)
  const standalone = card.value === undefined ? [] : [card.value]
  const viz = card.viz
  if (viz?.kind === 'ranking' || viz?.kind === 'chips') {
    for (const item of viz.items) {
      all.push(item.label, item.count)
      standalone.push(item.count)
    }
  }
  if (viz?.kind === 'meters') for (const m of viz.items) all.push(m.label, m.caption, String(m.percent))
  if (viz?.kind === 'share') all.push(viz.caption, String(viz.percent))
  if (viz?.kind === 'bars') for (const b of viz.bars) all.push(b.label, String(b.value))
  if (isFinalCard(card)) {
    all.push(...card.summaryLines, card.summary.title, card.summary.diagnosis)
    for (const h of card.summary.highlights) all.push(h.label, h.value)
  }
  return { all, standalone }
}

describe('buildDeck', () => {
  it('renders the same deck twice for the same stats', () => {
    expect(deckOf(structuredClone(NIGHT_OWL))).toEqual(deckOf(NIGHT_OWL))
  })

  it.each([
    ['night owl', NIGHT_OWL],
    ['laugher', LAUGHER],
    ['never starts', NEVER_STARTS],
    ['minimal', MINIMAL],
  ])('%s: no NaN, no undefined, no bare zero', (_, stats) => {
    for (const card of deckOf(stats)) {
      const { all, standalone } = texts(card)
      for (const text of all) expect(text, card.id).not.toMatch(/NaN|undefined|null/)
      for (const text of standalone) expect(text, card.id).not.toMatch(/^0(?!\d)/)
    }
  })

  it('shows the empty variant, not a 0, when there are no laughs', () => {
    const stats = makeStats({ laughs: { total: 0, byVariant: MINIMAL.laughs.byVariant, topVariant: null } })
    const laughs = deckOf(stats).find((c) => c.id === 'laughs')
    expect(laughs?.variant).toBe('empty')
    expect(laughs?.value).toBeUndefined()
  })

  it('shows the comparison cards only with 2 or more participants', () => {
    const ids = (stats: WrappedStats) => deckOf(stats).map((c) => c.id)
    expect(ids(makeStats({ chat: { participantCount: 2 } }))).toEqual(
      expect.arrayContaining(['who-starts', 'who-sends-more']),
    )
    const solo = ids(makeStats({ chat: { participantCount: 1 }, messages: { share: 1 } }))
    expect(solo).not.toContain('who-starts')
    expect(solo).not.toContain('who-sends-more')
  })

  it('titles the Wrapped after the chat’s date range', () => {
    const intro = (spanDays: number) => deckOf(makeStats({ period: { spanDays } }))[0].headline
    expect(intro(6)).toBe('Your Week Wrapped')
    expect(intro(25)).toBe('Your Month Wrapped')
    expect(intro(200)).toBe('Your Chat Wrapped')
  })

  it('ends with a final card that exposes the share summary', () => {
    const deck = deckOf(LAUGHER)
    const last = deck[deck.length - 1]
    expect(isFinalCard(last)).toBe(true)
    if (isFinalCard(last)) expect(last.summary.highlights).toHaveLength(3)
  })
})
