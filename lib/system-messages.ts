/**
 * Telling a user message from a WhatsApp notice.
 *
 * The rule is structural rather than a dictionary of phrases: WhatsApp prefixes
 * every user message with `Autor: `, and never prefixes a notice. So a header
 * line whose body has no `name: ` prefix is a notice — which holds for Spanish,
 * English, and whatever wording a future app version invents.
 *
 * The exception is the handful of notices that happen to contain `: ` early
 * enough to look like an author, which is what `SYSTEM_DESPITE_COLON` covers.
 */

/** `Autor: texto`. Names never contain a colon; 80 chars is generous for one. */
const AUTHOR_PREFIX = /^([^:\n]{1,80}):[ \t]?([\s\S]*)$/

/** Notices that would otherwise be mistaken for `author: text`. */
const SYSTEM_DESPITE_COLON: readonly RegExp[] = [
  /\bcambi[óo] el asunto\b/i,
  /\bchanged the subject\b/i,
  /\bcambi[óo] la descripci[óo]n\b/i,
  /\bchanged the group description\b/i,
  /\bcambi[óo] el nombre del grupo\b/i,
  /\bchanged the group name\b/i,
]

export interface AuthoredBody {
  readonly author: string
  readonly text: string
}

/**
 * Splits `Autor: texto`, or returns `null` when the body is a system notice.
 */
export function splitAuthoredBody(body: string): AuthoredBody | null {
  const m = AUTHOR_PREFIX.exec(body)
  if (m === null) return null

  for (const pattern of SYSTEM_DESPITE_COLON) {
    if (pattern.test(body)) return null
  }

  const author = m[1].trim()
  if (author.length === 0) return null

  return { author, text: m[2] }
}
