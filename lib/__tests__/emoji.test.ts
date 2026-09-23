import { describe, expect, it } from 'vitest'

import { countEmojis, isEmojiGrapheme } from '../emoji'

describe('counting emoji by grapheme', () => {
  it('counts the acceptance-criteria string as four distinct emoji', () => {
    const counts = countEmojis('😂😂💀👨‍👩‍👧🏳️‍🌈')

    expect(counts.size).toBe(4)
    expect(counts.get('😂')).toBe(2)
    expect(counts.get('💀')).toBe(1)
    expect(counts.get('👨‍👩‍👧')).toBe(1)
    expect(counts.get('🏳️‍🌈')).toBe(1)
  })

  it('treats a ZWJ family as one emoji, not three people', () => {
    const counts = countEmojis('👨‍👩‍👧')

    expect([...counts.keys()]).toEqual(['👨‍👩‍👧'])
    expect(counts.get('👨')).toBeUndefined()
  })

  it('treats a skin tone as part of its emoji', () => {
    const counts = countEmojis('✋🏽')

    expect(counts.size).toBe(1)
    expect(counts.get('✋🏽')).toBe(1)
  })

  it('treats a country flag as one emoji', () => {
    const counts = countEmojis('🇦🇷🇧🇷')

    expect(counts.size).toBe(2)
    expect(counts.get('🇦🇷')).toBe(1)
    expect(counts.get('🇧🇷')).toBe(1)
  })

  it('excludes digits, # and * even when they carry a keycap', () => {
    const counts = countEmojis('1️⃣ 7 #️⃣ # *️⃣ *')

    expect(counts.size).toBe(0)
  })

  it('ignores plain text and text-presentation pictographs', () => {
    expect(countEmojis('hola, todo bien?').size).toBe(0)
    expect(countEmojis('Marca™ © 2024').size).toBe(0)
  })

  it('counts a pictograph that carries the emoji variation selector', () => {
    const counts = countEmojis('☀️')

    expect(counts.get('☀️')).toBe(1)
  })
})

describe('scanning only emoji runs matches segmenting the whole text', () => {
  // `collectEmojis` hands the segmenter just the characters that could be an
  // emoji, which is a big speed-up and the kind of shortcut that quietly
  // miscounts. This pins it against the slow, obviously-correct version.
  const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' })

  function segmentWholeText(text: string): Map<string, number> {
    const counts = new Map<string, number>()
    for (const { segment } of segmenter.segment(text)) {
      if (!isEmojiGrapheme(segment)) continue
      counts.set(segment, (counts.get(segment) ?? 0) + 1)
    }
    return counts
  }

  const corpus = [
    '😂😂💀👨‍👩‍👧🏳️‍🌈',
    'hola 😂 que tal 🇦🇷🇧🇷 ✋🏽 fin',
    '1️⃣2️⃣ #️⃣ *️⃣ 7',
    'a😂b🤣c',
    '👩🏽‍🚀👨‍👨‍👦‍👦🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    '☀️⛄❤️‍🔥🫱🏼‍🫲🏿',
    'sin ningún emoji acá',
    '™ © ® ‼️ ⁉️',
    'IMG-20240305-WA0002.jpg 😂',
    '😂'.repeat(50),
    'texto largo '.repeat(20) + '🎉🎉',
    '👍🏻👍🏼👍🏽👍🏾👍🏿',
    '🇦🇷🇦',
    '👨‍👩‍👧‍👦 familia',
    '🥺👉👈',
  ]

  it.each(corpus)('%s', (text) => {
    expect([...countEmojis(text).entries()].sort()).toEqual(
      [...segmentWholeText(text).entries()].sort(),
    )
  })
})

describe('isEmojiGrapheme', () => {
  it.each([
    ['😂', true],
    ['👨‍👩‍👧', true],
    ['🏳️‍🌈', true],
    ['🇦🇷', true],
    ['✋🏽', true],
    ['☀️', true],
    ['1️⃣', false],
    ['#️⃣', false],
    ['*', false],
    ['a', false],
    ['™', false],
    ['', false],
  ])('%s', (grapheme, expected) => {
    expect(isEmojiGrapheme(grapheme)).toBe(expected)
  })
})
