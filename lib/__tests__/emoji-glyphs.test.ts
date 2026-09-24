import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseEmojiIndex, toEmojiGlyphs } from '../emoji-glyphs'

// The real companion list shipped next to the font.
const index = parseEmojiIndex(readFileSync(join(__dirname, '../../public/fonts/twemoji-pua-15.0.3.txt'), 'utf8'))
const pua = (s: string) => Array.from(s).map((c) => c.codePointAt(0)! >= 0xf0000)

describe('toEmojiGlyphs', () => {
  it.each(['😂', '🤦🏽‍♀️', '🏳️‍🌈', '❤️‍🔥', '👨‍👩‍👧', '🇦🇷', '👍🏽', '❤️'])('draws %s as one glyph', (emoji) => {
    expect(pua(toEmojiGlyphs(emoji, index))).toEqual([true])
  })

  it('matches with or without VS16', () => {
    expect(toEmojiGlyphs('🏳‍🌈', index)).toBe(toEmojiGlyphs('🏳️‍🌈', index))
  })

  it('leaves text, digits and bare © alone', () => {
    expect(toEmojiGlyphs('12,408 jajajas © 1:37 AM', index)).toBe('12,408 jajajas © 1:37 AM')
  })

  it('keeps text around emoji in place', () => {
    expect(pua(toEmojiGlyphs('chronic 💀 overuse', index))).toEqual(
      Array.from('chronic 💀 overuse').map((c) => c === '💀'),
    )
  })

  it('turns a keycap into one glyph', () => {
    expect(pua(toEmojiGlyphs('1️⃣', index))).toEqual([true])
  })
})
