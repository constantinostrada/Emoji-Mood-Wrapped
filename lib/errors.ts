/**
 * Typed, user-facing failures.
 *
 * The parser never throws for bad input: it returns a `Result`, so the upload
 * screen can switch on `error.code` and show copy that helps instead of a
 * stack trace. Exceptions are reserved for actual bugs.
 */

export type ParseErrorCode =
  /** The file has no content once whitespace is stripped. */
  | 'EMPTY_FILE'
  /** Nothing in the file looks like a WhatsApp message header. */
  | 'UNRECOGNIZED_FORMAT'
  /** Recognised, but too short to say anything interesting about. */
  | 'TOO_FEW_MESSAGES'

export interface ParseError {
  readonly code: ParseErrorCode
  /** Short headline for the UI. */
  readonly title: string
  /** One or two sentences telling the user what to do next. */
  readonly message: string
  /** Extra context for `TOO_FEW_MESSAGES`. */
  readonly details?: { readonly found: number; readonly required: number }
}

/** Below this, a Wrapped would be embarrassing rather than fun. */
export const MIN_MESSAGES = 10

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ParseError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T>(error: ParseError): Result<T> {
  return { ok: false, error }
}

export function emptyFileError(): ParseError {
  return {
    code: 'EMPTY_FILE',
    title: 'El archivo está vacío',
    message:
      'No encontramos nada adentro del .txt. Volvé a exportar el chat desde WhatsApp y subí el archivo de nuevo.',
  }
}

export function unrecognizedFormatError(): ParseError {
  return {
    code: 'UNRECOGNIZED_FORMAT',
    title: 'No parece un export de WhatsApp',
    message:
      'No reconocimos ninguna línea con fecha, hora y autor. Asegurate de subir el .txt que genera "Exportar chat" en WhatsApp, sin editarlo.',
  }
}

export function tooFewMessagesError(found: number): ParseError {
  return {
    code: 'TOO_FEW_MESSAGES',
    title: 'El chat es muy cortito',
    message: `Encontramos ${found} ${
      found === 1 ? 'mensaje' : 'mensajes'
    } y necesitamos al menos ${MIN_MESSAGES} para armar tu Wrapped. Probá con un chat más movido.`,
    details: { found, required: MIN_MESSAGES },
  }
}
