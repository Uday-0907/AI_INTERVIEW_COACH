'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

export type VADState = 'IDLE' | 'LISTENING' | 'PROCESSING'

const GAIN_VALUE = 3.5

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

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const vadStateRef = useRef<VADState>('IDLE')
  const interimTextRef = useRef('')
  const finalTextRef = useRef('')
  const micActiveRef = useRef(false)
  const clarityAttemptsRef = useRef(0)

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

  const releaseMic = useCallback(() => {
    micActiveRef.current = false

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
  }, [teardownAudioPipeline])

  const submitNow = useCallback(() => {
    const combined = (finalTextRef.current + ' ' + interimTextRef.current).trim()

    releaseMic()

    if (combined.length >= 3) {
      setVadStateSync('PROCESSING')
      onTranscriptReadyRef.current(combined, 0.85)
    } else {
      setVadStateSync('IDLE')
    }

    finalTextRef.current = ''
    interimTextRef.current = ''
    setInterimText('')
  }, [releaseMic, setVadStateSync])

  const resetState = useCallback(() => {
    setVadStateSync('IDLE')
  }, [setVadStateSync])

  const stopListening = useCallback(() => {
    releaseMic()
    interimTextRef.current = ''
    finalTextRef.current = ''
    setInterimText('')
    setVadStateSync('IDLE')
  }, [releaseMic, setVadStateSync])

  const startListening = useCallback(async (): Promise<string | null> => {
    const recognition = getSpeechRecognition()
    if (!recognition) {
      return 'Speech recognition is not supported in this browser. Please type your response below.'
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    teardownAudioPipeline()

    await initAudioPipeline()

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
      if (micActiveRef.current && vadStateRef.current === 'LISTENING') {
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
  }, [initAudioPipeline, teardownAudioPipeline, setVadStateSync])

  useEffect(() => {
    return () => {
      micActiveRef.current = false
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
  }, [teardownAudioPipeline])

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
