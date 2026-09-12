'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppSidebar, type Screen } from '@/components/app-sidebar'
import { SetupScreen } from '@/components/setup-screen'
import { InterviewScreen, type ChatMessage } from '@/components/interview-screen'
import { FeedbackScreen } from '@/components/feedback-screen'
import { AnimatedBackground } from '@/components/animated-background'
import type { InterviewTypeId } from '@/lib/mock-data'

export interface InterviewConfig {
  role: string
  type: string
  typeId: InterviewTypeId | ''
  resume: string
}

const EMPTY_CONFIG: InterviewConfig = {
  role: '',
  type: '',
  typeId: '',
  resume: '',
}

export default function MainPage() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [sessionId, setSessionId] = useState(0)
  const [config, setConfig] = useState<InterviewConfig>(EMPTY_CONFIG)
  const [transcript, setTranscript] = useState<ChatMessage[]>([])

  const handleStart = (next: InterviewConfig) => {
    setConfig(next)
    setTranscript([])
    setSessionId((id) => id + 1)
    setScreen('interview')
  }

  const handleFinish = (finalTranscript: ChatMessage[]) => {
    setTranscript(finalTranscript)
    setScreen('feedback')
  }

  const handleRestart = () => {
    setConfig(EMPTY_CONFIG)
    setTranscript([])
    setSessionId((id) => id + 1)
    setScreen('setup')
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent">
      <AnimatedBackground />

      <AppSidebar screen={screen} onNavigate={setScreen} />

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {screen === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <SetupScreen
                config={config}
                onConfigChange={setConfig}
                onStart={handleStart}
              />
            </motion.div>
          )}

          {screen === 'interview' && (
            <motion.div
              key={`interview-${sessionId}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <InterviewScreen
                key={sessionId}
                config={config}
                onFinish={handleFinish}
              />
            </motion.div>
          )}

          {screen === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <FeedbackScreen
                config={config}
                transcript={transcript}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
