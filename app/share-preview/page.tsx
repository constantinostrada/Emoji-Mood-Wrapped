import { notFound } from 'next/navigation'

import { SharePreview } from './share-preview'

/**
 * Dev-only harness for the share card on the sample summary, so it can be
 * checked without uploading a chat. `?fail=1` starts with generation forced to
 * fail (a checkbox toggles it); `?emoji=` swaps the representative emoji.
 */
export default async function SharePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const params = await searchParams
  const fail = params.fail === '1'
  const emoji = typeof params.emoji === 'string' ? params.emoji : undefined
  return <SharePreview fail={fail} emoji={emoji} />
}
