import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { loadFixture } from '../__fixtures__/load'
import { checkFileSize, decodeChatFile, MAX_FILE_BYTES } from '../intake'
import { parseChat } from '../parser'

const iosText = loadFixture('ios-en')

describe('file size limit', () => {
  it('rejects anything over 20 MB before reading it', () => {
    expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024)
    expect(checkFileSize(MAX_FILE_BYTES)).toBeNull()
    expect(checkFileSize(MAX_FILE_BYTES + 1)?.code).toBe('FILE_TOO_LARGE')
  })

  it('rejects a zip whose chat unpacks past the limit', () => {
    const zip = zipSync({ '_chat.txt': new Uint8Array(MAX_FILE_BYTES + 1) })
    const result = decodeChatFile('WhatsApp Chat - Ana.zip', zip)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FILE_TOO_LARGE')
  })
})

describe('iOS .zip exports', () => {
  it('yields exactly the text of the .txt inside', () => {
    const zip = zipSync({
      '_chat.txt': strToU8(iosText),
      'IMG-0001.jpg': new Uint8Array([0xff, 0xd8, 0xff]),
      '__MACOSX/._chat.txt': new Uint8Array([0, 1, 2]),
    })
    const fromZip = decodeChatFile('WhatsApp Chat - Ana.zip', zip)
    const fromTxt = decodeChatFile('_chat.txt', strToU8(iosText))

    expect(fromZip).toEqual({ ok: true, text: iosText })
    expect(fromZip).toEqual(fromTxt)
    if (fromZip.ok) expect(parseChat(fromZip.text).ok).toBe(true)
  })

  it('reports a zip with no chat in it', () => {
    const zip = zipSync({ 'IMG-0001.jpg': new Uint8Array([1, 2, 3]) })
    const result = decodeChatFile('photos.zip', zip)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NO_CHAT_IN_ZIP')
  })
})

it('refuses files that are neither text nor zip', () => {
  const result = decodeChatFile('photo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'image/png')
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error.code).toBe('UNSUPPORTED_FILE')
})
