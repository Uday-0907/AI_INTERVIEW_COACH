'use client'

import { motion } from 'framer-motion'

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      {/* 1. Dynamic Moving Ambient Orbs */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 size-[500px] rounded-full bg-cyan-500/15 blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 50, -60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 -right-32 size-[550px] rounded-full bg-violet-600/15 blur-[140px]"
      />

      {/* 2. Perspective Grid Pattern */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" 
      />
    </div>
  )
}