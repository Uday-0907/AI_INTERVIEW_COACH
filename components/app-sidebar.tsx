'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  AudioLines,
  BarChart3,
  ChevronRight,
  Settings2,
  Sparkles,
  Waypoints,
} from 'lucide-react'

export type Screen = 'setup' | 'interview' | 'feedback'

const NAV: { id: Screen; label: string; icon: typeof Settings2; hint: string }[] = [
  { id: 'setup', label: 'Setup', icon: Settings2, hint: 'Configure session' },
  { id: 'interview', label: 'Live Interview', icon: AudioLines, hint: 'In session' },
  { id: 'feedback', label: 'Feedback', icon: BarChart3, hint: 'Analytics' },
]

export function AppSidebar({
  screen,
  onNavigate,
}: {
  screen: Screen
  onNavigate: (s: Screen) => void
}) {
  const { user } = useUser()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-violet glow-cyan">
          <Waypoints className="size-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Prepwave</p>
          <p className="text-xs text-muted-foreground">Interview Coach</p>
        </div>
      </div>

        <motion.nav
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
          }}
          className="flex flex-1 flex-col gap-1 px-3 py-4"
        >
        <p className="px-3 pb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {NAV.map((item) => {
          const Icon = item.icon
          const active = screen === item.id
          return (
            <motion.button
              key={item.id}
              type="button"
              variants={{
                hidden: { opacity: 0, x: -10 },
                show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
              }}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              <Icon
                className={cn('size-4.5 transition-colors', active ? 'text-cyan' : 'text-muted-foreground')}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {active ? (
                <ChevronRight className="size-4 text-cyan" />
              ) : (
                <span className="text-[0.68rem] text-muted-foreground/70">{item.hint}</span>
              )}
            </motion.button>
          )
        })}

        <div className="mt-6 rounded-xl border border-sidebar-border bg-gradient-to-br from-violet/12 to-cyan/8 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet" />
            <p className="text-sm font-semibold">Pro tips</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Structure answers with STAR and keep pacing between 110–160 WPM for peak clarity.
          </p>
        </div>
        </motion.nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors">
          <UserButton />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">
              {user?.fullName || user?.firstName || 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}