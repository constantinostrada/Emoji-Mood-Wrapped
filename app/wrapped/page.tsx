'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useWrappedSession } from '../_components/session'
import { WrappedScreen } from './wrapped-screen'

export default function WrappedPage() {
  const { stats } = useWrappedSession()
  const router = useRouter()

  // Nothing in memory means the page was reloaded or opened directly: the
  // result is gone by design, so start over.
  useEffect(() => {
    if (stats === null) router.replace('/')
  }, [stats, router])

  if (stats === null) return null
  return <WrappedScreen stats={stats} />
}
