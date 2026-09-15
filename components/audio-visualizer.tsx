'use client'

import { useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  active: boolean
  bars?: number
  className?: string
}

export function AudioVisualizer({ active, bars = 40, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let paused = document.hidden

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (timestamp = 0) => {
      if (paused) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)
      const gradient = context.createLinearGradient(0, height, 0, 0)
      const styles = getComputedStyle(canvas)
      gradient.addColorStop(0, styles.getPropertyValue('--cyan').trim() || 'currentColor')
      gradient.addColorStop(1, styles.getPropertyValue('--violet').trim() || 'currentColor')
      context.fillStyle = gradient

      for (let i = 0; i < bars; i += 1) {
        const center = 1 - Math.abs(i - bars / 2) / (bars / 2)
        const wave = motionQuery.matches ? 0.35 : Math.sin(phaseRef.current + i * 0.55) * 0.5 + 0.5
        const level = active ? Math.max(0.08, Math.min(1, center * (0.35 + wave * 0.5))) : 0.08
        const barWidth = Math.max(1, (width - (bars - 1) * 3) / bars)
        const x = i * (barWidth + 3)
        const barHeight = level * height * 0.9
        context.globalAlpha = active ? 0.45 + level * 0.55 : 0.25
        context.fillRect(x, (height - barHeight) / 2, barWidth, barHeight)
      }
      context.globalAlpha = 1
      if (active && !motionQuery.matches) phaseRef.current += 0.12
      rafRef.current = requestAnimationFrame(draw)
    }

    const stop = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const start = () => {
      stop()
      if (!paused) rafRef.current = requestAnimationFrame(draw)
    }
    const handleVisibility = () => {
      paused = document.hidden
      if (paused) stop()
      else start()
    }
    const handleMotion = () => start()

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery.addEventListener('change', handleMotion)
    start()

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener('change', handleMotion)
    }
  }, [active, bars])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
