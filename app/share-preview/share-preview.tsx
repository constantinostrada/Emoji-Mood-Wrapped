'use client'

import { useMemo, useRef, useState } from 'react'

import { SAMPLE_SUMMARY, type ShareSummary } from '@/lib'

import { renderShareCard } from '../_components/share/render-card'
import { SharePanel } from '../_components/share/share-panel'
import { Screen } from '../_components/ui'

export function SharePreview({ fail, emoji }: { fail: boolean; emoji?: string }) {
  const summary = useMemo(() => (emoji ? { ...SAMPLE_SUMMARY, emoji } : SAMPLE_SUMMARY), [emoji])
  const [forceFailure, setForceFailure] = useState(fail)
  // Read at generation time, so unticking the box and pressing Retry succeeds.
  const failing = useRef(fail)
  failing.current = forceFailure
  const render = useMemo(
    () => async (s: ShareSummary) => {
      if (failing.current) throw new Error('Forced failure (share preview)')
      return renderShareCard(s)
    },
    [],
  )
  return (
    <Screen>
      <label className="flex items-center gap-2 self-center text-sm">
        <input type="checkbox" checked={forceFailure} onChange={(e) => setForceFailure(e.target.checked)} />
        Force generation failure
      </label>
      <SharePanel summary={summary} render={render} />
    </Screen>
  )
}
