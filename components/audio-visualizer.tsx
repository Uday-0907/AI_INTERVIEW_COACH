'use client'

import { useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  active: boolean
  bars?: number
  className?: string
}

export function AudioVisualizer({ active, bars = 40, className }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const barRefs = useRef<HTMLSpanElement[]>([])
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef(0)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      barRefs.current.forEach((el) => {
        if (el) {
          el.style.height = '8%'
          el.style.opacity = '0.25'
        }
      })
      return
    }

    const tick = (timestamp: number) => {
      // Throttle to ~30fps to avoid excessive DOM updates
      if (timestamp - lastUpdateRef.current < 33) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      lastUpdateRef.current = timestamp

      phaseRef.current += 0.18
      const phase = phaseRef.current
      const half = bars / 2

      for (let i = 0; i < bars; i++) {
        const el = barRefs.current[i]
        if (!el) continue

        const center = 1 - Math.abs(i - half) / half
        const wave = Math.sin(phase + i * 0.55) * 0.5 + 0.5
        const jitter = Math.random() * 0.35
        const level = Math.max(0.08, Math.min(1, center * (0.35 + wave * 0.5 + jitter * 0.4)))

        el.style.height = `${Math.round(level * 100)}%`
        el.style.opacity = String(0.45 + level * 0.55)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, bars])

  return (
    <div
      ref={containerRef}
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
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { if (el) barRefs.current[i] = el }}
          style={{
            width: 4,
            height: '8%',
            borderRadius: 999,
            background: 'linear-gradient(to top, var(--cyan), var(--violet))',
            opacity: active ? 0.55 : 0.25,
            transition: 'height 90ms ease-out, opacity 90ms ease-out',
          }}
        />
      ))}
    </div>
  )
}
