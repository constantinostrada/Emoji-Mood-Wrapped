/**
 * Reads the anonymised export fixtures from disk.
 *
 * Node-only, so it is imported from tests and never from anything that ends up
 * in the browser bundle.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type FixtureName =
  | 'android-es'
  | 'android-en'
  | 'ios-es'
  | 'ios-en'
  | 'group-es'
  | 'dates-dmy'
  | 'dates-mdy'
  | 'dates-ambiguous'
  | 'media-with'
  | 'media-without'
  | 'not-whatsapp'
  | 'empty'

export function loadFixture(name: FixtureName): string {
  return readFileSync(join(import.meta.dirname, `${name}.txt`), 'utf8')
}
