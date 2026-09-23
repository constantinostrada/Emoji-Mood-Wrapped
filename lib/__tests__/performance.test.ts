import { describe, expect, it } from 'vitest'

import { analyzeChat } from '../stats'
import { parseChat } from '../parser'
import { toWrappedStats } from '../wrapped-stats'

/**
 * The budget from the work order: 50k messages, parsed and analysed, under two
 * seconds on a mid-range mobile browser. A dev machine is several times faster
 * than that phone, so the assertion below is the headline number and the test
 * prints the measured time — if it ever creeps past a few hundred milliseconds
 * here, the phone has already blown the budget.
 */
const MESSAGE_COUNT = 50_000
const BUDGET_MS = 2_000

const AUTHORS = ['Ana', 'Bruno', 'Caro', 'Diego'] as const

const BODIES = [
  'jajaja no puede ser lo que me contás',
  'dale, nos vemos a las ocho en el bar de siempre 😂',
  'mañana te confirmo, tengo que ver si salgo temprano del trabajo',
  'xd',
  '😂😂😂 me muero',
  'IMG-20240305-WA0002.jpg (archivo adjunto)',
  'PTT-20240305-WA0001.opus (archivo adjunto)',
  'buenísimo 👨‍👩‍👧 la familia entera se re copó con la idea',
  'te cuento algo\nque pasó ayer\ny no lo vas a creer',
  'lol ok',
]

/** A believable export: four people, multi-line messages, emoji and media. */
function generateExport(messageCount: number): string {
  const lines: string[] = [
    '1/1/24, 00:00 - Los mensajes y las llamadas están cifrados de extremo a extremo.',
  ]

  const start = Date.UTC(2024, 0, 1, 9, 0, 0)
  for (let i = 0; i < messageCount; i++) {
    // Roughly seven minutes apart, so the chat spans about eight months.
    const at = new Date(start + i * 7 * 60_000)
    const day = at.getUTCDate()
    const month = at.getUTCMonth() + 1
    const hours = String(at.getUTCHours()).padStart(2, '0')
    const minutes = String(at.getUTCMinutes()).padStart(2, '0')
    const author = AUTHORS[i % AUTHORS.length]
    const body = BODIES[i % BODIES.length]

    lines.push(`${day}/${month}/24, ${hours}:${minutes} - ${author}: ${body}`)
  }

  return lines.join('\n')
}

describe('performance', () => {
  it(
    `parses and analyses ${MESSAGE_COUNT.toLocaleString('en-US')} messages under ${BUDGET_MS}ms`,
    () => {
      const raw = generateExport(MESSAGE_COUNT)

      const startedAt = performance.now()

      const parsed = parseChat(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return

      const analysis = analyzeChat(parsed.value)
      const stats = toWrappedStats(analysis, 'Ana')

      const elapsed = performance.now() - startedAt

      // Sanity: the work was actually done, not short-circuited.
      expect(parsed.value.messages).toHaveLength(MESSAGE_COUNT)
      expect(parsed.value.participants).toHaveLength(AUTHORS.length)
      expect(stats.messages.total).toBe(MESSAGE_COUNT / AUTHORS.length)
      expect(stats.emojis.total).toBeGreaterThan(0)
      expect(stats.media.total).toBeGreaterThan(0)

      console.log(
        `parse + stats of ${MESSAGE_COUNT.toLocaleString('en-US')} messages: ${elapsed.toFixed(0)}ms ` +
          `(${(raw.length / 1_048_576).toFixed(1)} MB)`,
      )
      expect(elapsed).toBeLessThan(BUDGET_MS)
    },
    30_000,
  )
})
