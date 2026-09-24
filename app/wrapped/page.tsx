'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useWrappedSession } from '../_components/session'
import { WrappedScreen } from './wrapped-screen'

export default function WrappedPage() {
  const { wrapped } = useWrappedSession()
  const router = useRouter()

  // Nothing in memory means the page was reloaded or opened directly: the
  // result is gone by design, so start over.
  useEffect(() => {
    if (wrapped === null) router.replace('/')
  }, [wrapped, router])

  if (wrapped === null) return null
  return <WrappedScreen stats={wrapped.stats} narrative={wrapped.narrative} />
}
