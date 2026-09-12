'use client'

import { useEffect, useRef, useState } from 'react'

type AudioVisualizerProps = {
  active: boolean
  bars?: number
  className?: string
}

export function AudioVisualizer({ active, bars = 40, className }: AudioVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0.08))
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setLevels(Array(bars).fill(0.08))
      return
    }

    const tick = () => {
      phaseRef.current += 0.18
      const phase = phaseRef.current
      setLevels((prev) =>
        prev.map((_, i) => {
          const center = 1 - Math.abs(i - bars / 2) / (bars / 2)
          const wave = Math.sin(phase + i * 0.55) * 0.5 + 0.5
          const jitter = Math.random() * 0.35
          return Math.max(0.08, Math.min(1, center * (0.35 + wave * 0.5 + jitter * 0.4)))
        }),
      )
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, bars])

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: '100%',
        width: '100%',
      }}
      aria-hidden="true"
    >
      {levels.map((level, i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: `${Math.round(level * 100)}%`,
            borderRadius: 999,
            background: 'linear-gradient(to top, var(--cyan), var(--violet))',
            opacity: active ? 0.45 + level * 0.55 : 0.25,
            transition: 'height 90ms ease-out, opacity 90ms ease-out',
          }}
        />
      ))}
    </div>
  )
}
