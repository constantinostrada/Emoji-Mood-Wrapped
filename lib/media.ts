/**
 * Spotting attachments, in both export modes and both languages.
 *
 * "Export chat" offers *with* or *without* media, and the two produce
 * completely different lines for the same photo:
 *
 *   without media   `imagen omitida` · `image omitted` · `<Multimedia omitido>`
 *   with media      `IMG-20240305-WA0002.jpg (archivo adjunto)`
 *                   `<adjunto: 00000042-PHOTO-2024-03-05-14-03-22.jpg>`
 *
 * Both have to land on the same `MediaType`, otherwise the same chat exported
 * twice tells two different stories.
 */

import type { MediaType } from './types'

/**
 * Typed "omitted" markers, es + en. Matched case-insensitively against the
 * whole message text, since WhatsApp writes them as the entire body.
 */
const OMITTED_MARKERS: ReadonlyArray<readonly [RegExp, MediaType]> = [
  [/\b(?:audio|ptt|nota de voz|voice message)\s+(?:omitid[oa]|omitted)\b/i, 'audio'],
  [/\b(?:imagen|image|foto|photo)\s+(?:omitid[oa]|omitted)\b/i, 'image'],
  [/\b(?:v[ií]deo|video)\s+(?:omitid[oa]|omitted)\b/i, 'video'],
  [/\b(?:sticker|figurita)\s+(?:omitid[oa]|omitted)\b/i, 'sticker'],
  [/\b(?:gif|documento|document|contacto|contact|tarjeta de contacto)\s+(?:omitid[oa]|omitted)\b/i, 'other'],
  // Older Android exports collapse every attachment into one untyped marker,
  // so the type genuinely is not in the file. `other` is the honest answer.
  [/<\s*(?:multimedia|media|archivo|attached file)\s+(?:omitid[oa]|omitted)\s*>/i, 'other'],
  [/\b(?:archivo|file)\s+(?:omitid[oa]|omitted)\b/i, 'other'],
]

/**
 * Attachment file names. Android prefixes them by kind (`PTT-`, `IMG-`,
 * `VID-`, `STK-`, `DOC-`); iOS embeds the kind in the middle
 * (`…-PHOTO-…`, `…-AUDIO-…`). Both then carry a real extension, which is the
 * fallback when the prefix is unfamiliar.
 */
const ATTACHMENT_LINE =
  /(?:\(\s*(?:archivo adjunto|file attached)\s*\)|<\s*(?:adjunto|attached)\s*:)/i

const ANDROID_PREFIX: ReadonlyArray<readonly [RegExp, MediaType]> = [
  [/\bPTT-/i, 'audio'],
  [/\bAUD-/i, 'audio'],
  [/\bIMG-/i, 'image'],
  [/\bVID-/i, 'video'],
  [/\bSTK-/i, 'sticker'],
  [/\bDOC-/i, 'other'],
]

const IOS_KIND: ReadonlyArray<readonly [RegExp, MediaType]> = [
  [/-AUDIO-/i, 'audio'],
  [/-PHOTO-/i, 'image'],
  [/-VIDEO-/i, 'video'],
  [/-STICKER-/i, 'sticker'],
  [/-GIF-/i, 'other'],
  [/-DOCUMENT-/i, 'other'],
]

const EXTENSION: ReadonlyArray<readonly [RegExp, MediaType]> = [
  [/\.(?:opus|m4a|mp3|ogg|wav|aac|amr)\b/i, 'audio'],
  [/\.(?:jpe?g|png|heic|bmp)\b/i, 'image'],
  [/\.(?:mp4|3gp|mov|avi|mkv)\b/i, 'video'],
  [/\.webp\b/i, 'sticker'],
]

/** Cheap gate so plain-text messages skip the whole battery of regexes. */
const MAYBE_MEDIA = /omitid|omitted|adjunt|attached|\.(?:opus|m4a|mp3|ogg|wav|aac|amr|jpe?g|png|heic|bmp|mp4|3gp|mov|avi|mkv|webp)\b/i

/**
 * Classifies a message body, or returns `null` when it is ordinary text.
 *
 * `.webp` maps to `sticker` rather than `image` on purpose: WhatsApp only ever
 * uses that container for stickers, and counting them as photos would inflate
 * the image count of anybody with a sticker habit.
 */
export function detectMedia(text: string): MediaType | null {
  if (!MAYBE_MEDIA.test(text)) return null

  for (const [pattern, type] of OMITTED_MARKERS) {
    if (pattern.test(text)) return type
  }

  if (ATTACHMENT_LINE.test(text)) {
    for (const [pattern, type] of IOS_KIND) if (pattern.test(text)) return type
    for (const [pattern, type] of ANDROID_PREFIX) if (pattern.test(text)) return type
    for (const [pattern, type] of EXTENSION) if (pattern.test(text)) return type
    return 'other'
  }

  return null
}
