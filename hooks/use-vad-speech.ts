'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// --- Web Speech API type declarations (not in standard TS DOM lib) ---

type SpeechRecognitionResultItem = {
  0: { transcript: string; confidence: number }
  isFinal: boolean
  length: number
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultItem }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

// --- VAD State Machine ---

export type VADState = 'IDLE' | 'LISTENING' | 'PAUSED_DEBOUNCING' | 'PROCESSING'

const SILENCE_DURATION_MS = 2000
const PAUSE_DETECT_DURATION_MS = 500
const GAIN_VALUE = 2.5

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!SR) return null
  return new SR()
}

interface UseVADSpeechOptions {
  onTranscriptReady: (transcript: string, confidence: number) => void
  onClarityFailure: (attempt: number) => void
}

export function useVADSpeech({ onTranscriptReady, onClarityFailure }: UseVADSpeechOptions) {
  const [vadState, setVadState] = useState<VADState>('IDLE')
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')

  // WebAudio pipeline refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Speech recognition ref
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  // VAD state machine refs
  const vadStateRef = useRef<VADState>('IDLE')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pauseDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interimTextRef = useRef('')
  const finalTextRef = useRef('')
  const micActiveRef = useRef(false)
  const clarityAttemptsRef = useRef(0)

  // Callback refs to avoid stale closures
  const onTranscriptReadyRef = useRef(onTranscriptReady)
  const onClarityFailureRef = useRef(onClarityFailure)

  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady
    onClarityFailureRef.current = onClarityFailure
  }, [onTranscriptReady, onClarityFailure])

  const setVadStateSync = useCallback((state: VADState) => {
    vadStateRef.current = state
    setVadState(state)
  }, [])

  // --- Timer helpers ---

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const clearPauseDetectTimer = useCallback(() => {
    if (pauseDetectTimerRef.current) {
      clearTimeout(pauseDetectTimerRef.current)
      pauseDetectTimerRef.current = null
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    clearSilenceTimer()
    clearPauseDetectTimer()
  }, [clearSilenceTimer, clearPauseDetectTimer])

  // --- WebAudio Gain Engine ---

  const initAudioPipeline = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      })
      mediaStreamRef.current = stream

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      const sourceNode = audioContext.createMediaStreamSource(stream)
      sourceNodeRef.current = sourceNode

      const gainNode = audioContext.createGain()
      gainNode.gain.value = GAIN_VALUE
      gainNodeRef.current = gainNode

      sourceNode.connect(gainNode)
      // Not connecting to destination — avoids feedback while keeping
      // the gain-processed stream available for downstream analysis.

      return true
    } catch {
      return false
    }
  }, [])

  const teardownAudioPipeline = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect() } catch { /* ignore */ }
      sourceNodeRef.current = null
    }
    if (gainNodeRef.current) {
      try { gainNodeRef.current.disconnect() } catch { /* ignore */ }
      gainNodeRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      try { void audioContextRef.current.close() } catch { /* ignore */ }
      audioContextRef.current = null
    }
  }, [])

  // --- Release mic tracks and recognition (stops browser recording indicator) ---

  const releaseMic = useCallback(() => {
    micActiveRef.current = false
    clearAllTimers()

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.onstart = null
        recognitionRef.current.abort()
      } catch { /* ignore */ }
      recognitionRef.current = null
    }

    teardownAudioPipeline()
    setIsListening(false)
  }, [clearAllTimers, teardownAudioPipeline])

  // --- VAD: Submit transcript when silence timer elapses ---

  const submitTranscript = useCallback(() => {
    const combined = (finalTextRef.current + ' ' + interimTextRef.current).trim()

    if (combined.length >= 3) {
      releaseMic()
      setVadStateSync('PROCESSING')
      onTranscriptReadyRef.current(combined, 0.85)
      finalTextRef.current = ''
      interimTextRef.current = ''
      setInterimText('')
    } else if (micActiveRef.current) {
      clarityAttemptsRef.current += 1
      onClarityFailureRef.current(clarityAttemptsRef.current)
      finalTextRef.current = ''
      interimTextRef.current = ''
      setInterimText('')
      setVadStateSync('IDLE')
    }
  }, [releaseMic, setVadStateSync])

  // --- Submit immediately (bypass silence timer — Send button) ---

  const submitNow = useCallback(() => {
    clearAllTimers()
    const combined = (finalTextRef.current + ' ' + interimTextRef.current).trim()

    if (combined.length >= 3) {
      releaseMic()
      setVadStateSync('PROCESSING')
      onTranscriptReadyRef.current(combined, 0.85)
      finalTextRef.current = ''
      interimTextRef.current = ''
      setInterimText('')
    } else {
      releaseMic()
      setVadStateSync('IDLE')
    }
  }, [clearAllTimers, releaseMic, setVadStateSync])

  // --- Reset VAD state to IDLE (called by parent after AI response) ---

  const resetState = useCallback(() => {
    setVadStateSync('IDLE')
  }, [setVadStateSync])

  // --- Stop listening ---

  const stopListening = useCallback(() => {
    releaseMic()
    interimTextRef.current = ''
    finalTextRef.current = ''
    setInterimText('')
    setVadStateSync('IDLE')
  }, [releaseMic, setVadStateSync])

  // --- Start listening ---

  const startListening = useCallback(async (): Promise<string | null> => {
    const recognition = getSpeechRecognition()
    if (!recognition) {
      return 'Speech recognition is not supported in this browser. Please type your response below.'
    }

    // Tear down any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    clearAllTimers()
    teardownAudioPipeline()

    // Initialize WebAudio gain engine
    await initAudioPipeline()

    // Reset VAD state
    micActiveRef.current = true
    interimTextRef.current = ''
    finalTextRef.current = ''
    clarityAttemptsRef.current = 0
    setInterimText('')
    setVadStateSync('IDLE')

    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setVadStateSync('LISTENING')
    }

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          finalTextRef.current += result[0].transcript
          interimTextRef.current = ''
        } else {
          interimTextRef.current = result[0].transcript
        }
      }

      const combined = (finalTextRef.current + ' ' + interimTextRef.current).trim()
      setInterimText(combined)

      if (combined.length >= 3) {
        // New speech arrived — clear any existing timers.
        // If we were in PAUSED_DEBOUNCING, this is the "new speech during debounce"
        // case: instantly clear the silence timer without losing state.
        clearSilenceTimer()
        clearPauseDetectTimer()
        setVadStateSync('LISTENING')

        // Start pause detection — transitions to PAUSED_DEBOUNCING after a
        // short gap with no new onresult events.
        pauseDetectTimerRef.current = setTimeout(() => {
          setVadStateSync('PAUSED_DEBOUNCING')
        }, PAUSE_DETECT_DURATION_MS)

        // Start the 2-second silence timer. If new speech arrives before
        // it fires, the timer is cleared above and restarted here.
        silenceTimerRef.current = setTimeout(() => {
          clearPauseDetectTimer()
          submitTranscript()
        }, SILENCE_DURATION_MS)
      }
    }

    recognition.onerror = (e: { error: string }) => {
      if (e.error === 'no-speech' || e.error === 'audio-capture' || e.error === 'not-allowed') {
        const combined = (finalTextRef.current + ' ' + interimTextRef.current).trim()
        if (combined.length < 3 && micActiveRef.current) {
          clarityAttemptsRef.current += 1
          if (clarityAttemptsRef.current <= 2) {
            onClarityFailureRef.current(clarityAttemptsRef.current)
          }
        }
      }
    }

    recognition.onend = () => {
      // Auto-reconnect: if the mic is still active and we're in LISTENING
      // or PAUSED_DEBOUNCING, the recognition service dropped unexpectedly.
      // Re-invoke start() without clearing transcript state or timers.
      if (micActiveRef.current && (vadStateRef.current === 'LISTENING' || vadStateRef.current === 'PAUSED_DEBOUNCING')) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
          setVadStateSync('IDLE')
        }
      } else if (!micActiveRef.current) {
        setIsListening(false)
        setVadStateSync('IDLE')
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setVadStateSync('IDLE')
      return 'Failed to start speech recognition.'
    }

    return null
  }, [initAudioPipeline, clearAllTimers, clearSilenceTimer, clearPauseDetectTimer, teardownAudioPipeline, setVadStateSync, submitTranscript])

  // Cleanup on unmount — dispose all WebAudio nodes and recognition instances
  useEffect(() => {
    return () => {
      micActiveRef.current = false
      clearAllTimers()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
          recognitionRef.current.onend = null
          recognitionRef.current.onstart = null
          recognitionRef.current.abort()
        } catch { /* ignore */ }
        recognitionRef.current = null
      }
      teardownAudioPipeline()
    }
  }, [clearAllTimers, teardownAudioPipeline])

  return {
    vadState,
    isListening,
    interimText,
    startListening,
    stopListening,
    submitNow,
    resetState,
  }
}
