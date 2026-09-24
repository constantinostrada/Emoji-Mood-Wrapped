'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import type { ChatAnalysis } from '@/lib'

import { Landing } from './landing'
import { LoadingScreen } from './loading-screen'
import { useWrappedSession, type WrappedResult } from './session'
import { UploadScreen } from './upload-screen'
import { WhoScreen } from './who-screen'

type Step =
  | { name: 'landing'; returning: boolean }
  | { name: 'upload' }
  | { name: 'who'; analysis: ChatAnalysis }
  | { name: 'loading'; analysis: ChatAnalysis; participant: string | null }

/**
 * Landing → upload → "who are you?" → loading, all in component state on one
 * route. Only the final `WrappedStats` (and its narrative) crosses to `/wrapped`, and only in memory.
 */
export function ChatFlow() {
  const [step, setStep] = useState<Step>({ name: 'landing', returning: false })
  const { setWrapped } = useWrappedSession()
  const router = useRouter()

  const onAnalyzed = useCallback((analysis: ChatAnalysis) => {
    // A one-person chat has nobody to choose between.
    if (analysis.participants.length === 1) {
      setStep({ name: 'loading', analysis, participant: analysis.participants[0] })
    } else {
      setStep({ name: 'who', analysis })
    }
  }, [])

  const onDone = useCallback(
    (wrapped: WrappedResult) => {
      setWrapped(wrapped)
      router.push('/wrapped')
    },
    [setWrapped, router],
  )

  switch (step.name) {
    case 'landing':
      return <Landing focusHeading={step.returning} onStart={() => setStep({ name: 'upload' })} />
    case 'upload':
      return <UploadScreen onAnalyzed={onAnalyzed} onBack={() => setStep({ name: 'landing', returning: true })} />
    case 'who':
      return (
        <WhoScreen
          analysis={step.analysis}
          onPick={(participant) => setStep({ name: 'loading', analysis: step.analysis, participant })}
          onBack={() => setStep({ name: 'upload' })}
        />
      )
    case 'loading':
      return <LoadingScreen analysis={step.analysis} participant={step.participant} onDone={onDone} />
  }
}
