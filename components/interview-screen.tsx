'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { ComplexButton } from '@/components/complex-button'
import type { InterviewConfig } from '@/app/page'
import { Mic, Send, Square, Volume2 } from 'lucide-react'

function formatTime(total: number) {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function InterviewScreen({
  config,
  onFinish,
}: {
  config: InterviewConfig
  onFinish: () => void
}) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const { speak, isPlaying } = useAudioPlayer()
  const startedRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // 1. Clear session and fetch dynamic opening question on mount
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function startFreshSession() {
      setIsLoading(true)
      setMessages([])
      setInputText('')
      setSeconds(0)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            config,
            isOpeningQuestion: true,
          }),
        })

        if (!res.ok) throw new Error('Failed to initiate session')

        const data = await res.json()
        if (data.text) {
          setMessages([{ role: 'ai', text: data.text }])
          speak(data.text) // Spoken Edge-TTS response
        }
      } catch (err) {
        console.error('Failed to start fresh interview:', err)
      } finally {
        setIsLoading(false)
      }
    }

    startFreshSession()
  }, [config, speak])

  // 2. Handle sending user responses to Gemini
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMsg = inputText.trim()
    const updatedMessages = [...messages, { role: 'user' as const, text: userMsg }]
    
    setMessages(updatedMessages)
    setInputText('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          config,
          isOpeningQuestion: false,
        }),
      })

      if (!res.ok) throw new Error('Failed to get AI response')

      const data = await res.json()
      if (data.text) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.text }])
        speak(data.text)
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col justify-between p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {config.role || 'Interview Session'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {config.type}
            {config.role ? ` · ${config.role}` : ''}
          </p>
        </div>
        <span className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 font-mono text-sm tabular-nums">
          {formatTime(seconds)}
        </span>
        <ComplexButton onClick={onFinish} className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
          <Square className="mr-2 size-4 fill-current" /> End Session
        </ComplexButton>
      </div>

      {/* Live Transcript Stream */}
      <div className="my-6 flex-1 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${m.role === 'ai' ? 'items-start' : 'items-end'}`}
          >
            <span className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {m.role === 'ai' ? 'Interviewer' : 'You'}
            </span>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'ai'
                  ? 'bg-card border border-border text-foreground'
                  : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-200'
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        {isPlaying && (
          <div className="flex items-center gap-2 text-xs text-cyan animate-pulse">
            <Volume2 className="size-4" /> AI is speaking...
          </div>
        )}

        {isLoading && !isPlaying && (
          <p className="text-xs text-muted-foreground animate-pulse">AI is thinking...</p>
        )}
      </div>

      {/* Controls / Inputs */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/80"
        >
          <Mic className="size-5" />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your response..."
          className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-cyan"
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isLoading || !inputText.trim()}
          className="flex size-11 items-center justify-center rounded-xl bg-cyan text-slate-950 font-medium disabled:opacity-50"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  )
}