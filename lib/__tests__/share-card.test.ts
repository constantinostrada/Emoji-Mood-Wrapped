import {
  fitText,
  formatDateRange,
  shareFileName,
  shareOrDownload,
  wrapLines,
  type MeasureText,
  type ShareEnvironment,
} from '../share-card'

// Every code point is `size` wide: easy to reason about line widths.
const measure: MeasureText = (text, size) => Array.from(text).length * size

describe('shareFileName', () => {
  it('names the file after the app and the local day', () => {
    expect(shareFileName(new Date(2026, 8, 4, 23, 59))).toBe('emoji-mood-wrapped-2026-09-04.png')
  })
})

describe('formatDateRange', () => {
  it('repeats the year only when it changes', () => {
    expect(formatDateRange({ from: '2026-03-01', to: '2026-09-24' })).toBe('1 Mar – 24 Sep 2026')
    expect(formatDateRange({ from: '2025-09-24', to: '2026-09-23' })).toBe('24 Sep 2025 – 23 Sep 2026')
    expect(formatDateRange({ from: '2026-01-05', to: '2026-01-05' })).toBe('5 Jan 2026')
  })
})

describe('wrapLines / fitText', () => {
  it('wraps greedily on spaces', () => {
    expect(wrapLines('aa bb cc dd', 5, 1, measure)).toEqual(['aa bb', 'cc dd'])
  })

  it('shrinks until the text fits the line budget', () => {
    const fit = fitText('aaaa bbbb cccc', { maxWidth: 40, maxLines: 2, maxSize: 10, minSize: 2, step: 2 }, measure)
    expect(fit.size).toBe(4)
    expect(fit.lines).toEqual(['aaaa bbbb', 'cccc'])
  })

  it('truncates with an ellipsis at the minimum size, never splitting an emoji', () => {
    const fit = fitText('💀💀💀 💀💀💀 💀💀💀', { maxWidth: 4, maxLines: 1, maxSize: 1, minSize: 1 }, measure)
    expect(fit.lines).toEqual(['💀💀💀…'])
  })
})

describe('shareOrDownload', () => {
  const file = new File([new Uint8Array([1])], 'card.png', { type: 'image/png' })

  function env(overrides: Partial<ShareEnvironment> = {}) {
    const calls = { shared: 0, downloaded: 0 }
    const e: ShareEnvironment = {
      canShare: () => true,
      share: async () => {
        calls.shared++
      },
      download: () => {
        calls.downloaded++
      },
      ...overrides,
    }
    return { e, calls }
  }

  it('uses the native share sheet when files can be shared', async () => {
    const { e, calls } = env()
    expect(await shareOrDownload(file, e)).toBe('shared')
    expect(calls).toEqual({ shared: 1, downloaded: 0 })
  })

  it('downloads when the browser has no share API', async () => {
    const { e, calls } = env({ share: undefined, canShare: undefined })
    expect(await shareOrDownload(file, e)).toBe('downloaded')
    expect(calls.downloaded).toBe(1)
  })

  it('downloads when share exists but cannot take files', async () => {
    const { e, calls } = env({ canShare: () => false })
    expect(await shareOrDownload(file, e)).toBe('downloaded')
    expect(calls).toEqual({ shared: 0, downloaded: 1 })
  })

  it('treats closing the share sheet as a cancel, not a failure', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' })
    const { e, calls } = env({ share: () => Promise.reject(abort) })
    expect(await shareOrDownload(file, e)).toBe('cancelled')
    expect(calls.downloaded).toBe(0)
  })

  it('falls back to downloading when sharing errors for any other reason', async () => {
    const denied = Object.assign(new Error('no gesture'), { name: 'NotAllowedError' })
    const { e, calls } = env({ share: () => Promise.reject(denied) })
    expect(await shareOrDownload(file, e)).toBe('downloaded')
    expect(calls.downloaded).toBe(1)
  })
})
