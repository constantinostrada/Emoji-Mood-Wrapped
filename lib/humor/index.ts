/**
 * The humor layer: `WrappedStats` in, `WrappedNarrative` out. V1 answers
 * with templates; V2 will plug an LLM narrator behind the same interface.
 */

export { templateNarrator, narrateWithTemplates, periodKind, wrappedTitle, wrappedSummary, laughSample, type PeriodKind } from './templates'
export { PERSONALITY_CATALOG, hourLabel } from './metrics'
export type {
  AbsurdMetrics,
  DiagnosisFamily,
  NarrativeTexts,
  Percent,
  Personality,
  PersonalityId,
  WrappedNarrative,
  WrappedNarrator,
  WrappedSummary,
} from './types'
