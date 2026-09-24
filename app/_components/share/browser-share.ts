/**
 * Binds `shareOrDownload` to the real browser: `navigator.share` when it can
 * take files, an object-URL download otherwise. Both stay on the device.
 */

import { shareOrDownload, type ShareEnvironment, type ShareOutcome } from '@/lib'

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on a later tick: Safari cancels the download if it goes right away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function shareFile(file: File): Promise<ShareOutcome> {
  const env: ShareEnvironment = {
    canShare: typeof navigator.canShare === 'function' ? (data) => navigator.canShare(data) : undefined,
    share: typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined,
    download: downloadFile,
  }
  return shareOrDownload(file, env)
}
