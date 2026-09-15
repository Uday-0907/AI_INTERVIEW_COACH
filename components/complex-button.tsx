'use client'

import React, { useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Sparkles, ArrowRight } from 'lucide-react'

interface ComplexButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  glowColor?: string
}

export function ComplexButton({
  children,
  className,
  glowColor = 'color-mix(in srgb, var(--cyan) 35%, transparent)',
  onClick,
  ...props
}: ComplexButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  // 1. Mouse Position Tracking for Magnetic Glow / Spotlight
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth out mouse tracking physics
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  // Dynamic spotlight background gradient
  const spotlightBg = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(120px circle at ${x}px ${y}px, ${glowColor}, transparent 80%)`
  )

  return (
    <motion.button
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      // Fluid physics spring configuration
      initial={false}
      animate={{
        scale: isPressed ? 0.96 : isHovered ? 1.025 : 1,
        y: isHovered ? -2 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 25,
        mass: 0.8,
      }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/40 bg-card/80 px-6 py-3.5 text-sm font-semibold text-foreground shadow-xl backdrop-blur-xl transition-colors duration-300 hover:border-cyan/50',
        className
      )}
      {...(props as any)}
    >
      {/* 2. Interactive Spotlight/Glow Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlightBg }}
      />

      {/* 3. Outer Ambient Pulsing Aura */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-cyan/20 blur-xl"
          />
        )}
      </AnimatePresence>

      {/* 4. Glassmorphism Highlight Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* 5. Animated Content Container */}
      <div className="relative z-10 flex items-center justify-center gap-2.5">
        <motion.span
          animate={{ rotate: isHovered ? [0, -10, 10, 0] : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
            <Sparkles className="size-4 text-cyan transition-colors group-hover:text-cyan" />
        </motion.span>

          <span className="text-foreground">
          {children}
        </span>

        {/* Dynamic Sliding Arrow */}
        <motion.span
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <ArrowRight className="size-4 text-cyan" />
        </motion.span>
      </div>

      {/* 6. On-Click Ripple Wave Effect */}
      {isPressed && (
        <motion.span
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute size-20 rounded-full bg-cyan/40"
          style={{
            left: springX.get() - 40,
            top: springY.get() - 40,
          }}
        />
      )}
    </motion.button>
  )
}
