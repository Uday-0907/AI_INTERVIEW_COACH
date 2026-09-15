'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function AmbientBackground({ children }: { children?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let paused = document.hidden
    let lastFrame = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr))
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (timestamp: number) => {
      if (paused) return
      if (timestamp - lastFrame < 33 && !motionQuery.matches) {
        frameRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrame = timestamp

      const width = window.innerWidth
      const height = window.innerHeight
      const styles = getComputedStyle(canvas)
      const cyan = styles.getPropertyValue('--cyan').trim() || 'transparent'
      const violet = styles.getPropertyValue('--violet').trim() || 'transparent'
      const phase = phaseRef.current
      const driftX = Math.sin(phase) * width * 0.035
      const driftY = Math.cos(phase * 0.8) * height * 0.025

      context.clearRect(0, 0, width, height)
      const cyanGlow = context.createRadialGradient(width * 0.12 + driftX, height * 0.08 + driftY, 0, width * 0.12 + driftX, height * 0.08 + driftY, Math.max(width, height) * 0.55)
      cyanGlow.addColorStop(0, `${cyan}22`)
      cyanGlow.addColorStop(1, `${cyan}00`)
      context.fillStyle = cyanGlow
      context.fillRect(0, 0, width, height)

      const violetGlow = context.createRadialGradient(width * 0.9 - driftX, height * 0.65 - driftY, 0, width * 0.9 - driftX, height * 0.65 - driftY, Math.max(width, height) * 0.6)
      violetGlow.addColorStop(0, `${violet}1c`)
      violetGlow.addColorStop(1, `${violet}00`)
      context.fillStyle = violetGlow
      context.fillRect(0, 0, width, height)

      if (!motionQuery.matches) phaseRef.current += 0.003
      if (motionQuery.matches) frameRef.current = null
      else frameRef.current = requestAnimationFrame(draw)
    }

    const stop = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    const start = () => {
      stop()
      draw(0)
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
  }, [])

  return (
    <div className="relative min-h-full overflow-hidden bg-background">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full opacity-80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-40 -top-48 size-[34rem] rounded-full opacity-20 blur-[110px]"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--cyan) 38%, transparent), transparent 68%)' }}
        />
        <div
          className="absolute -right-48 top-1/3 size-[38rem] rounded-full opacity-15 blur-[130px]"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--violet) 42%, transparent), transparent 68%)' }}
        />
      </div>
      <div className="relative z-10 min-h-full">{children}</div>
    </div>
  )
}

export function AnimatedBackground() {
  return <AmbientBackground />
}
