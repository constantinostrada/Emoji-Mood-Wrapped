/**
 * The share card's fonts, self-hosted under /public/fonts and loaded through
 * the FontFace API before anything is drawn.
 *
 * - Text: Baloo 2 (OFL), latin + latin-ext subsets, weights 500 and 800.
 * - Emoji: Twemoji as a COLRv0 color font (OFL build of CC-BY 4.0 artwork),
 *   which Chrome, Safari and Firefox all paint in canvas. Using our own emoji
 *   font instead of the system's is what makes the PNG look the same on
 *   Android, iOS and desktop. Text must go through `toEmojiGlyphs` with the
 *   index loaded here before it is drawn (see lib/emoji-glyphs.ts for why).
 *
 * Every file is fetched whole from our own origin, so the requests reveal
 * nothing about the chat — not even which emoji the card shows.
 */

import { parseEmojiIndex, type EmojiIndex } from '@/lib'

/** Distinct family names so an installed "Baloo 2" or "Twemoji" never wins. */
export const TEXT_FAMILY = 'EMW Baloo'
export const EMOJI_FAMILY = 'EMW Twemoji'

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

const FACES: ReadonlyArray<{ family: string; url: string; weight?: string; unicodeRange?: string }> = [
  { family: TEXT_FAMILY, url: '/fonts/baloo-2-latin-500-normal.woff2', weight: '500', unicodeRange: LATIN },
  { family: TEXT_FAMILY, url: '/fonts/baloo-2-latin-ext-500-normal.woff2', weight: '500', unicodeRange: LATIN_EXT },
  { family: TEXT_FAMILY, url: '/fonts/baloo-2-latin-800-normal.woff2', weight: '800', unicodeRange: LATIN },
  { family: TEXT_FAMILY, url: '/fonts/baloo-2-latin-ext-800-normal.woff2', weight: '800', unicodeRange: LATIN_EXT },
  { family: EMOJI_FAMILY, url: '/fonts/twemoji-pua-15.0.3.woff2' },
]

const EMOJI_INDEX_URL = '/fonts/twemoji-pua-15.0.3.txt'

let loading: Promise<EmojiIndex> | null = null

/**
 * Resolves with the emoji index once every face is loaded and registered;
 * rejects if anything fails, so the card is never drawn with a system fallback
 * font. A failed attempt is forgotten so "Retry" really retries.
 */
export function loadCardFonts(): Promise<EmojiIndex> {
  loading ??= Promise.all([
    fetch(EMOJI_INDEX_URL).then((res) => {
      if (!res.ok) throw new Error(`Emoji index: HTTP ${res.status}`)
      return res.text()
    }),
    ...FACES.map(async ({ family, url, weight, unicodeRange }) => {
      const face = new FontFace(family, `url(${url}) format("woff2")`, {
        weight: weight ?? 'normal',
        unicodeRange: unicodeRange ?? 'U+0-10FFFF',
        display: 'block',
      })
      await face.load()
      document.fonts.add(face)
    }),
  ]).then(([indexText]) => {
    if (!document.fonts.check(`800 40px "${TEXT_FAMILY}"`) || !document.fonts.check(`40px "${EMOJI_FAMILY}"`)) {
      throw new Error('Card fonts registered but not usable')
    }
    return parseEmojiIndex(indexText)
  })
  loading.catch(() => {
    loading = null
  })
  return loading
}
