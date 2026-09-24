/**
 * Draws the share card straight onto a 1080×1920 canvas and encodes it as PNG.
 *
 * It is a layout designed for the image, not a screenshot of the page: no DOM
 * rasteriser, no dependency, and nothing leaves the browser. Content sits
 * between y≈200 and y≈1720, clear of the bars Instagram and WhatsApp overlay
 * at the top and bottom of a story.
 */

import {
  APP_NAME,
  fitText,
  formatDateRange,
  SHARE_DISCLAIMER,
  toEmojiGlyphs,
  type MeasureText,
  type ShareStat,
  type ShareSummary,
} from '@/lib'

import { EMOJI_FAMILY, loadCardFonts, TEXT_FAMILY } from './card-fonts'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

/** Where the watermark points. Override per deployment. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'emojimoodwrapped.app'

const MARGIN = 80
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2
const WHITE = '#ffffff'
const INK = '#4c1d95'

const textFont = (weight: 500 | 800, size: number) => `${weight} ${size}px "${TEXT_FAMILY}", "${EMOJI_FAMILY}"`

export async function renderShareCard(input: ShareSummary): Promise<Blob> {
  const emojiIndex = await loadCardFonts()
  const glyphs = (text: string) => toEmojiGlyphs(text, emojiIndex)
  const stat = (s: ShareStat): ShareStat => ({ value: glyphs(s.value), label: glyphs(s.label) })
  // Every string the card draws, with its emoji mapped onto the emoji font.
  const summary: ShareSummary = {
    ...input,
    title: glyphs(input.title),
    emoji: glyphs(input.emoji),
    stats: [stat(input.stats[0]), stat(input.stats[1]), stat(input.stats[2])],
    diagnosis: glyphs(input.diagnosis),
  }

  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('Canvas 2D is not available')

  drawBackground(ctx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const cx = CARD_WIDTH / 2

  // Header: app name, title, date range.
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = textFont(800, 36)
  ctx.fillText(spaced(APP_NAME.toUpperCase()), cx, 230)

  const title = fitText(
    summary.title,
    { maxWidth: CONTENT_WIDTH, maxLines: 2, maxSize: 112, minSize: 64 },
    measureWith(ctx, 800),
  )
  ctx.fillStyle = WHITE
  ctx.font = textFont(800, title.size)
  const titleLineHeight = title.size * 1.02
  let y = 250 + title.size
  for (const line of title.lines) {
    ctx.fillText(line, cx, y)
    y += titleLineHeight
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = textFont(500, 40)
  ctx.fillText(formatDateRange(summary.dateRange), cx, y + 16)

  // The representative emoji, centred on y=810 whatever the glyph's metrics.
  drawEmoji(ctx, summary.emoji, cx, 810, 360)

  // Three highlighted stats.
  const boxGap = 28
  const boxWidth = (CONTENT_WIDTH - boxGap * 2) / 3
  const boxTop = 1040
  const boxHeight = 230
  summary.stats.forEach((stat, i) => {
    const x = MARGIN + i * (boxWidth + boxGap)
    roundRect(ctx, x, boxTop, boxWidth, boxHeight, 40, 'rgba(255,255,255,0.16)')
    const value = fitText(stat.value, { maxWidth: boxWidth - 40, maxLines: 1, maxSize: 84, minSize: 40 }, measureWith(ctx, 800))
    ctx.fillStyle = WHITE
    ctx.font = textFont(800, value.size)
    ctx.fillText(value.lines[0] ?? '', x + boxWidth / 2, boxTop + 128)
    const label = fitText(stat.label, { maxWidth: boxWidth - 40, maxLines: 1, maxSize: 36, minSize: 24 }, measureWith(ctx, 500))
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = textFont(500, label.size)
    ctx.fillText(label.lines[0] ?? '', x + boxWidth / 2, boxTop + 185)
  })

  // Diagnosis panel.
  const panelTop = 1320
  const panelHeight = 330
  roundRect(ctx, MARGIN, panelTop, CONTENT_WIDTH, panelHeight, 48, WHITE)
  ctx.fillStyle = '#c026d3'
  ctx.font = textFont(800, 32)
  ctx.fillText(spaced('DIAGNOSIS'), cx, panelTop + 72)
  const diagnosis = fitText(
    summary.diagnosis,
    { maxWidth: CONTENT_WIDTH - 100, maxLines: 3, maxSize: 60, minSize: 36 },
    measureWith(ctx, 800),
  )
  ctx.fillStyle = INK
  ctx.font = textFont(800, diagnosis.size)
  const diagLineHeight = diagnosis.size * 1.15
  const diagBlock = diagLineHeight * diagnosis.lines.length
  let dy = panelTop + 100 + (panelHeight - 100 - diagBlock) / 2 + diagnosis.size * 0.85
  for (const line of diagnosis.lines) {
    ctx.fillText(line, cx, dy)
    dy += diagLineHeight
  }

  // Watermark and small print.
  ctx.fillStyle = WHITE
  ctx.font = textFont(800, 44)
  ctx.fillText(APP_URL, cx, 1740)
  const disclaimer = fitText(
    SHARE_DISCLAIMER,
    { maxWidth: CONTENT_WIDTH, maxLines: 2, maxSize: 28, minSize: 22, step: 2 },
    measureWith(ctx, 500),
  )
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = textFont(500, disclaimer.size)
  disclaimer.lines.forEach((line, i) => ctx.fillText(line, cx, 1800 + i * disclaimer.size * 1.3))

  return toPng(canvas)
}

function measureWith(ctx: CanvasRenderingContext2D, weight: 500 | 800): MeasureText {
  return (text, size) => {
    ctx.font = textFont(weight, size)
    return ctx.measureText(text).width
  }
}

/** Poor man's letter-spacing: `ctx.letterSpacing` is missing on older Safari. */
function spaced(text: string): string {
  return Array.from(text).join(' ')
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const base = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  base.addColorStop(0, '#7c3aed')
  base.addColorStop(0.55, '#c026d3')
  base.addColorStop(1, '#db2777')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  glow(ctx, CARD_WIDTH * 0.2, 0, 1000, 'rgba(244,114,182,0.9)')
  glow(ctx, CARD_WIDTH, CARD_HEIGHT * 0.6, 800, 'rgba(245,158,11,0.75)')
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
}

function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, cx: number, cy: number, size: number) {
  // Emoji only from our font, so an emoji the index does not know still comes
  // from Twemoji rather than the system.
  ctx.font = `${size}px "${EMOJI_FAMILY}"`
  const m = ctx.measureText(emoji)
  const ascent = m.actualBoundingBoxAscent || size * 0.8
  const descent = m.actualBoundingBoxDescent || size * 0.2
  ctx.fillText(emoji, cx, cy + (ascent - descent) / 2)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob === null ? reject(new Error('PNG encoding failed')) : resolve(blob)), 'image/png')
  })
}
