/**
 * Public surface of the parsing + statistics engine.
 *
 * The three other pieces of the product (upload, Wrapped cards, share card)
 * build against this file and nothing deeper.
 */

export { parseChat, type ParseOptions } from './parser'
export { analyzeChat, DEFAULT_SILENCE_THRESHOLD_MINUTES, type AnalyzeOptions } from './stats'
export { toWrappedStats, type WrappedStatsOptions } from './wrapped-stats'
export { DEFAULT_DATE_ORDER } from './detect-format'
export { MIN_MESSAGES, type ParseError, type ParseErrorCode, type Result } from './errors'
export type {
  ChatAnalysis,
  ChatFormat,
  ChatMessage,
  DateOrder,
  DateRange,
  EmojiCount,
  LaughBreakdown,
  LaughVariant,
  MediaBreakdown,
  MediaType,
  ParseResult,
  ParseWarning,
  ParticipantStats,
  Platform,
  StreakInfo,
  SystemMessage,
  WarningCode,
  WordCount,
  WrappedStats,
} from './types'

import { err, ok, type Result } from './errors'
import { parseChat, type ParseOptions } from './parser'
import { analyzeChat, type AnalyzeOptions } from './stats'
import { toWrappedStats, type WrappedStatsOptions } from './wrapped-stats'
import type { ChatAnalysis, WrappedStats } from './types'

export interface AnalyzeExportOptions extends ParseOptions, AnalyzeOptions {}

/** Parse and analyse in one call, keeping the typed error on the failure path. */
export function analyzeExport(
  raw: string,
  options: AnalyzeExportOptions = {},
): Result<ChatAnalysis> {
  const parsed = parseChat(raw, options)
  if (!parsed.ok) return err(parsed.error)
  return ok(analyzeChat(parsed.value, options))
}

/**
 * The one-liner most callers want: raw `.txt` to the `WrappedStats` of one
 * participant (or of the whole chat when `participant` is `null`).
 */
export function buildWrappedStats(
  raw: string,
  participant: string | null,
  options: AnalyzeExportOptions & WrappedStatsOptions = {},
): Result<WrappedStats> {
  const analysis = analyzeExport(raw, options)
  if (!analysis.ok) return analysis
  return ok(toWrappedStats(analysis.value, participant, options))
}
