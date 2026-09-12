'use client'

import { useState } from 'react'

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)

  const speak = async (text: string) => {
    try {
      setIsPlaying(true)

      // 1. Send the text to your Edge TTS API route
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error('Audio generation failed')

      // 2. Turn the server's response into an audio URL
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      
      // 3. Play the MP3 audio
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setIsPlaying(false) // Reset state when audio finishes
      }

      await audio.play()
    } catch (error) {
      console.error('Audio playback error:', error)
      setIsPlaying(false)
    }
  }

  return { speak, isPlaying }
}