'use client'

import { useCallback, useEffect, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ComplexButton } from '@/components/complex-button'
import { AudioVisualizer } from '@/components/audio-visualizer'
import { useVADSpeech } from '@/hooks/use-vad-speech'
import type { InterviewConfig } from '@/app/page'
import { Mic, MicOff, Send, Square, Volume2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from 'lucide-react'

export interface ChatMessage {
  role: 'ai' | 'user'
  text: string
}

interface Props {
  config: InterviewConfig
  onFinish: (transcript: ChatMessage[]) => void
}

const MIN_SESSION_SECONDS = 420

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// --- Memoized message bubble to prevent re-renders on every voice event ---
const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col ${message.role === 'ai' ? 'items-start' : 'items-end'}`}
    >
      <span className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {message.role === 'ai' ? 'Interviewer' : 'You'}
      </span>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          message.role === 'ai'
            ? 'bg-card border border-border text-foreground'
            : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-200'
        }`}
      >
        {message.text}
      </div>
    </motion.div>
  )
})

// --- Memoized input bar: isolates typing from heavy speech re-renders ---
interface InputBarProps {
  inputText: string
  onInputChange: (value: string) => void
  onSend: () => void
  onMicToggle: () => void
  onSubmitNow: () => void
  isListening: boolean
  isLoading: boolean
  isSpeaking: boolean
}

const InputBar = memo(function InputBar({
  inputText,
  onInputChange,
  onSend,
  onMicToggle,
  onSubmitNow,
  isListening,
  isLoading,
  isSpeaking,
}: InputBarProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onMicToggle}
        disabled={isLoading || isSpeaking}
        className={`flex size-11 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
          isListening
            ? 'bg-violet/20 text-violet border border-violet/40'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </button>

      <input
        type="text"
        value={inputText}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        placeholder="Type your response..."
        disabled={isLoading || isSpeaking || isListening}
        className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-cyan disabled:opacity-50"
      />

      {isListening ? (
        <button
          type="button"
          onClick={onSubmitNow}
          className="flex size-11 items-center justify-center rounded-xl bg-violet text-white transition-colors hover:bg-violet/80"
          aria-label="Submit voice answer now"
        >
          <Send className="size-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={isLoading || isSpeaking || !inputText.trim()}
          className="flex size-11 items-center justify-center rounded-xl bg-cyan text-slate-950 font-medium transition-colors disabled:opacity-50"
        >
          <Send className="size-5" />
        </button>
      )}
    </div>
  )
})

// --- Memoized status badge ---
const StatusBadge = memo(function StatusBadge({ vadState }: { vadState: string }) {
  if (vadState === 'IDLE') return null
  return (
    <AnimatePresence>
      <motion.div
        key={vadState}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {vadState === 'LISTENING' && (
          <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Listening...
          </span>
        )}
        {vadState === 'PAUSED_DEBOUNCING' && (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
            <span className="size-1.5 animate-pulse rounded-full bg-warning" />
            Pause detected (2s)...
          </span>
        )}
        {vadState === 'PROCESSING' && (
          <span className="flex items-center gap-1.5 rounded-full bg-cyan/15 px-3 py-1 text-xs font-medium text-cyan">
            <span className="size-1.5 animate-pulse rounded-full bg-cyan" />
            Thinking...
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
})

export function InterviewScreen({ config, onFinish }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [clarityWarning, setClarityWarning] = useState<string | null>(null)
  const [canEvaluate, setCanEvaluate] = useState(false)

  const messagesRef = useRef<ChatMessage[]>([])
  const startedRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Refs to break circular dependency: the VAD hook needs callbacks that
  // themselves reference hook outputs (resetState). We store the actual
  // handlers in refs and pass stable wrappers to the hook.
  const transcriptReadyRef = useRef<(transcript: string, confidence: number) => void>(() => {})
  const clarityFailureRef = useRef<(attempt: number) => void>(() => {})

  // --- VAD speech hook: called FIRST, before any callback that uses its outputs ---
  const {
    vadState,
    isListening,
    interimText,
    startListening,
    stopListening,
    submitNow,
    resetState,
  } = useVADSpeech({
    onTranscriptReady: useCallback((transcript: string, confidence: number) => {
      transcriptReadyRef.current(transcript, confidence)
    }, []),
    onClarityFailure: useCallback((attempt: number) => {
      clarityFailureRef.current(attempt)
    }, []),
  })

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Auto-scroll only when message count changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1
        if (next >= MIN_SESSION_SECONDS) setCanEvaluate(true)
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // --- TTS via Web Speech API ---
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.97
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.lang.startsWith('en-US'))
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  // Fetch AI response from the chat API
  const fetchAIResponse = useCallback(async (currentHistory: ChatMessage[], retryPrompt?: string | boolean) => {
    setIsLoading(true)
    try {
      const payloadMessages = typeof retryPrompt === 'string' && retryPrompt.trim()
        ? [...currentHistory, { role: 'user' as const, text: retryPrompt.trim() }]
        : currentHistory

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          mode: config.type,
          targetRole: config.targetRole || config.role,
          resumeText: config.resumeText || config.resume,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Server status ${res.status}`)
      }

      const data = await res.json()
      return data.text || null
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setClarityWarning(errObj?.message || 'Failed to connect to AI server')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [config.type, config.targetRole, config.role, config.resumeText, config.resume])

  // Add an AI message and speak it
  const deliverAIResponse = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { role: 'ai', text }])
      speak(text)
      resetState()
    },
    [speak, resetState]
  )

  // --- VAD transcript handler (stored in ref for the hook) ---
  const handleTranscriptReady = useCallback((transcript: string, _confidence: number) => {
    const trimmed = transcript.trim()
    if (!trimmed || trimmed.length < 3) return

    const updatedMessages = [...messagesRef.current, { role: 'user' as const, text: trimmed }]
    setMessages(updatedMessages)
    setClarityWarning(null)

    fetchAIResponse(updatedMessages, false).then((aiText) => {
      if (aiText) deliverAIResponse(aiText)
    })
  }, [fetchAIResponse, deliverAIResponse])

  // --- VAD clarity failure handler (stored in ref for the hook) ---
  const handleClarityFailure = useCallback(async (attempt: number) => {
    if (attempt === 1) {
      setClarityWarning(
        'Your voice was not clear or audible. Could you please repeat your answer?'
      )
      const repeatText =
        'Your voice was not clear or audible. Could you please repeat your answer?'
      setMessages((prev) => [...prev, { role: 'ai', text: repeatText }])
      speak(repeatText)
    } else {
      setClarityWarning(null)

      const incompleteNote =
        '[Response unclear — marked as incomplete. Moving to next question.]'
      setMessages((prev) => [...prev, { role: 'user', text: incompleteNote }])

      const updatedMessages = [
        ...messagesRef.current,
        { role: 'user' as const, text: incompleteNote },
      ]
      const aiText = await fetchAIResponse(updatedMessages, false)
      if (aiText) deliverAIResponse(aiText)
    }
  }, [speak, fetchAIResponse, deliverAIResponse])

  // Sync handler refs so the stable wrappers passed to the hook call the latest versions
  useEffect(() => {
    transcriptReadyRef.current = handleTranscriptReady
    clarityFailureRef.current = handleClarityFailure
  }, [handleTranscriptReady, handleClarityFailure])

  // --- Start session ---
  useEffect(() => {
    if (!config.role?.trim() || !config.typeId) return
    if (startedRef.current) return
    startedRef.current = true

    async function startSession() {
      setIsLoading(true)
      setMessages([])
      setInputText('')
      setSeconds(0)
      setClarityWarning(null)

      const text = await fetchAIResponse([], false)
      if (text) deliverAIResponse(text)
    }

    startSession()
  }, [config.role, config.typeId, fetchAIResponse, deliverAIResponse])

  // Preload voices (Chrome loads them async)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [stopListening])

  // --- Typed text submission ---
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return
    setClarityWarning(null)

    const userMsg = inputText.trim()
    const updatedMessages = [...messagesRef.current, { role: 'user' as const, text: userMsg }]
    setMessages(updatedMessages)
    setInputText('')

    const aiText = await fetchAIResponse(updatedMessages, false)
    if (aiText) deliverAIResponse(aiText)
  }, [inputText, isLoading, fetchAIResponse, deliverAIResponse])

  const handleEndSession = useCallback(() => {
    stopListening()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    onFinish(messagesRef.current)
  }, [stopListening, onFinish])

  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      stopListening()
    } else {
      const error = await startListening()
      if (error) setClarityWarning(error)
    }
  }, [isListening, stopListening, startListening])

  const handleInputChange = useCallback((value: string) => {
    setInputText(value)
  }, [])

  const canEndSession = canEvaluate && !isLoading && !isSpeaking
  const remainingSeconds = Math.max(0, MIN_SESSION_SECONDS - seconds)
  const aiQuestionCount = messages.filter((m) => m.role === 'ai').length

  if (!config.role?.trim() || !config.typeId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Active Session</h2>
          <p className="text-sm text-muted-foreground">
            Please configure your target role and interview type in Setup, then click Start to begin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {config.role || 'Interview Session'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {config.type}
            {config.role ? ` · ${config.role}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 font-mono text-sm tabular-nums">
              {formatTime(seconds)}
            </span>
            {!canEvaluate && (
              <span className="mt-1 text-[0.68rem] text-muted-foreground">
                Evaluate in {formatTime(remainingSeconds)}
              </span>
            )}
          </div>

          {canEvaluate ? (
            <ComplexButton
              onClick={handleEndSession}
              className="bg-success/15 text-success border-success/30 hover:bg-success/25"
            >
              <CheckCircle2 className="mr-2 size-4" />
              Complete &amp; Evaluate
            </ComplexButton>
          ) : (
            <ComplexButton
              onClick={handleEndSession}
              disabled={!canEndSession}
              className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
            >
              <Square className="mr-2 size-4 fill-current" />
              End Session
            </ComplexButton>
          )}
        </div>
      </div>

      {/* Live Transcript Stream */}
      <div ref={scrollContainerRef} className="my-6 flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, idx) => (
          <MessageBubble key={idx} message={m} />
        ))}

        {/* AI Speaking indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2.5 text-sm text-cyan">
                <Volume2 className="size-4 animate-pulse" />
                <span className="font-medium">AI Speaking...</span>
              </div>
              <div className="h-8 w-32">
                <AudioVisualizer active={isSpeaking} bars={24} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listening indicator with live interim transcript */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2 rounded-xl border border-violet/30 bg-violet/10 px-4 py-2.5 text-sm text-violet">
                <Mic className="size-4 animate-pulse" />
                <span className="font-medium">
                  Listening...
                  {vadState === 'PAUSED_DEBOUNCING' && ' (processing in 2s)'}
                </span>
              </div>
              {interimText && (
                <p className="max-w-[80%] rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs italic text-muted-foreground">
                  {interimText}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Speak clearly. Your response will be captured automatically after 2 seconds of silence.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clarity warning */}
        <AnimatePresence>
          {clarityWarning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{clarityWarning}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        {isLoading && !isSpeaking && (
          <p className="text-xs text-muted-foreground animate-pulse">AI is thinking...</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Controls / Inputs */}
      <div className="space-y-3 border-t border-border pt-4">
        <InputBar
          inputText={inputText}
          onInputChange={handleInputChange}
          onSend={handleSendMessage}
          onMicToggle={handleMicToggle}
          onSubmitNow={submitNow}
          isListening={isListening}
          isLoading={isLoading}
          isSpeaking={isSpeaking}
        />

        <StatusBadge vadState={vadState} />

        <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
          <span>
            {canEvaluate
              ? 'Session complete — click "Complete & Evaluate" for your feedback report.'
              : `Minimum 7-minute session required. ${Math.ceil(remainingSeconds / 60)} min remaining.`}
          </span>
          <span>{aiQuestionCount} questions asked</span>
        </div>
      </div>
    </div>
  )
}
