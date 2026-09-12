'use client'

import { useEffect, useState } from 'react'

type CircularProgressProps = {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  gradientId?: string
}

export function CircularProgress({
  value,
  size = 176,
  strokeWidth = 12,
  label,
  sublabel,
  gradientId = 'cp-gradient',
}: CircularProgressProps) {
  const [progress, setProgress] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setProgress(value), 120)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined ? (
          <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">{label}</span>
        ) : (
          <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">{value}%</span>
        )}
        {sublabel ? (
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
