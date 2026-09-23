/**
 * User-facing copy for every way the upload can go wrong.
 *
 * `lib/` returns typed codes (with Spanish copy of its own); the UI speaks
 * English, so it switches on the code and owns its wording here.
 */

import { MAX_FILE_BYTES, type IntakeError, type ParseError, type ParseWarning } from '@/lib'

export interface ErrorCopy {
  readonly emoji: string
  readonly title: string
  readonly message: string
  /** Show the "how to export" steps next to the error. */
  readonly showExportHelp?: boolean
}

const MB = 1024 * 1024
const LIMIT_MB = Math.round(MAX_FILE_BYTES / MB)

export function intakeErrorCopy(error: IntakeError): ErrorCopy {
  switch (error.code) {
    case 'FILE_TOO_LARGE': {
      const size = error.details ? ` That one is ${(error.details.size / MB).toFixed(1)} MB.` : ''
      return {
        emoji: '🐘',
        title: 'Whoa, that chat is thicc',
        message: `The limit is ${LIMIT_MB} MB.${size} Export it again choosing “Without media” — the chat itself is tiny without the photos.`,
        showExportHelp: true,
      }
    }
    case 'NO_CHAT_IN_ZIP':
      return {
        emoji: '📦',
        title: 'That zip has no chat inside',
        message: 'We looked everywhere and found no .txt. Upload the .zip WhatsApp creates with “Export chat”, untouched.',
        showExportHelp: true,
      }
    case 'UNSUPPORTED_FILE':
      return {
        emoji: '📄',
        title: 'We only speak .txt and .zip',
        message: 'Upload the file WhatsApp gives you with “Export chat”: a .txt on Android, a .zip on iPhone.',
        showExportHelp: true,
      }
  }
}

export function parseErrorCopy(error: ParseError): ErrorCopy {
  switch (error.code) {
    case 'UNRECOGNIZED_FORMAT':
      return {
        emoji: '🤨',
        title: 'That’s not a WhatsApp chat',
        message:
          'Not a single line with a date, a time and a name. Export it from WhatsApp (chat → Export chat → Without media) and upload the file exactly as it comes out, without editing it.',
        showExportHelp: true,
      }
    case 'EMPTY_FILE':
      return {
        emoji: '🦗',
        title: 'This file is emptier than your DMs',
        message: 'There’s nothing inside. Export the chat again from WhatsApp and upload the fresh file.',
        showExportHelp: true,
      }
    case 'TOO_FEW_MESSAGES': {
      const found = error.details?.found ?? 0
      const required = error.details?.required ?? 10
      return {
        emoji: '🥲',
        title: 'Too short to roast',
        message: `We found ${found} ${found === 1 ? 'message' : 'messages'} and need at least ${required} to say anything funny. Try a chattier chat.`,
      }
    }
  }
}

export const READ_FAILED_COPY: ErrorCopy = {
  emoji: '🫠',
  title: 'Your browser couldn’t open that file',
  message: 'Something went wrong reading it on your device. Try again, or export the chat once more.',
}

export function warningCopy(warning: ParseWarning): string {
  switch (warning.code) {
    case 'AMBIGUOUS_DATE_ORDER':
      return 'We couldn’t tell whether your dates are day/month or month/day, so we went with day/month. Dates might be a little off.'
    case 'LEADING_GARBAGE':
      return 'The file started with a few lines that weren’t messages — we skipped them.'
    case 'UNPARSEABLE_LINES':
      return 'A few lines didn’t look like messages and were skipped.'
  }
}

export const LOADING_LINES = [
  'Reading your questionable decisions...',
  'Counting your 💀...',
  'Analyzing your 1:37 AM messages...',
  'Determining how chaotic you actually are...',
  'Measuring the jajaja-to-message ratio...',
  'Judging your sticker choices...',
] as const
