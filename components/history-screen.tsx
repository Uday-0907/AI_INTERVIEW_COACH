'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import { CircleAlert as AlertCircle, ArrowLeft, Calendar, ChevronRight, Loader as Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterviewConfig } from '@/app/page'
import type { ChatMessage } from '@/components/interview-screen'
import type { EvaluationResult, InterviewTypeId } from '@/lib/mock-data'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
}

interface SessionRecord {
  id: string
  user_id: string
  target_role: string
  interview_type: string
  transcript: ChatMessage[]
  evaluation: EvaluationResult
  created_at: string
}

const TYPE_ID_MAP: Record<string, InterviewTypeId> = {
  'Technical Interview': 'technical',
  'HR / Behavioral Interview': 'hr-behavioral',
  'Coding Interview': 'coding',
  'System Design Interview': 'system-design',
  'Project-Based Interview': 'project-based',
  'Resume-Based Interview': 'resume-based',
}

export function HistoryScreen({
  onLoadSession,
}: {
  onLoadSession: (config: InterviewConfig, transcript: ChatMessage[]) => void
}) {
  const { user } = useUser()
  const userId = user?.id || ''

  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SessionRecord | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load history')
      }
      setSessions(data.sessions || [])
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setError(errObj?.message || 'Failed to load past interviews.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchHistory()
    else setLoading(false)
  }, [userId, fetchHistory])

  const handleOpenDetail = (session: SessionRecord) => {
    setSelected(session)
  }

  const handleLoadFeedback = (session: SessionRecord) => {
    const typeId = TYPE_ID_MAP[session.interview_type] || 'technical'
    const sessionConfig: InterviewConfig = {
      role: session.target_role,
      type: session.interview_type,
      typeId,
      resume: '',
      targetRole: session.target_role,
      resumeText: '',
    }
    onLoadSession(sessionConfig, session.transcript || [])
  }

  // ---- Detail View ----
  if (selected) {
    const evalData = selected.evaluation
    const overallScore = evalData?.overallScore ?? 0
    const questionBreakdowns = evalData?.questionBreakdowns ?? []
    const transcript = selected.transcript || []

    return (
      <motion.div
        className="flex-1 overflow-y-auto"
        initial="hidden"
        animate="show"
        variants={fadeIn}
      >
        <motion.header
          variants={fadeIn}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 md:px-10"
        >
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(null)}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
            </motion.button>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-cyan">
                Past session report
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {selected.target_role}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selected.interview_type} ·{' '}
                {new Date(selected.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {questionBreakdowns.length} questions
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleLoadFeedback(selected)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Sparkles className="size-4" />
            View Full Feedback
          </motion.button>
        </motion.header>

        <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
          {/* Score summary */}
          <div className="mb-8 flex flex-wrap gap-4">
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-4xl font-semibold tracking-tight text-cyan">
                {overallScore}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall Score
              </span>
            </div>
            {evalData?.technicalDepth != null && (
              <div className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-6">
                <span className="text-xs text-muted-foreground">Technical Depth</span>
                <span className="font-mono text-2xl font-semibold">{evalData.technicalDepth}%</span>
              </div>
            )}
            {evalData?.communicationClarity != null && (
              <div className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-6">
                <span className="text-xs text-muted-foreground">Clarity</span>
                <span className="font-mono text-2xl font-semibold">{evalData.communicationClarity}%</span>
              </div>
            )}
            {evalData?.wordsPerMinute != null && (
              <div className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-6">
                <span className="text-xs text-muted-foreground">Pacing</span>
                <span className="font-mono text-2xl font-semibold">{evalData.wordsPerMinute} WPM</span>
              </div>
            )}
          </div>

          {/* Transcript */}
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Conversation transcript
          </h2>
          <div className="space-y-4">
            {transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transcript recorded for this session.</p>
            ) : (
              transcript.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.4) }}
                  className={cn('flex flex-col', msg.role === 'ai' ? 'items-start' : 'items-end')}
                >
                  <span className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {msg.role === 'ai' ? 'Interviewer' : 'You'}
                  </span>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                      msg.role === 'ai'
                        ? 'border border-border bg-card text-foreground'
                        : 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                    )}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Question breakdowns */}
          {questionBreakdowns.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Question-by-question review
              </h2>
              <div className="space-y-3">
                {questionBreakdowns.map((q, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-sm text-cyan">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium">{q.question}</p>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium',
                          q.score >= 85
                            ? 'bg-success/12 text-success'
                            : q.score >= 60
                              ? 'bg-cyan/12 text-cyan'
                              : q.score >= 40
                                ? 'bg-warning/12 text-warning'
                                : 'bg-destructive/12 text-destructive'
                        )}
                      >
                        {q.score}%
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="rounded-lg border border-border bg-secondary/30 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Your answer
                        </p>
                        <p className="leading-relaxed text-foreground/90">{q.candidateAnswer}</p>
                      </div>
                      <div className="rounded-lg border border-cyan/25 bg-cyan/5 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan">
                          AI recommended answer
                        </p>
                        <p className="leading-relaxed text-foreground/90">{q.idealAnswer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  // ---- List View ----
  return (
    <motion.div
      className="flex-1 overflow-y-auto"
      initial="hidden"
      animate="show"
      variants={fadeIn}
    >
      <motion.header
        variants={fadeIn}
        className="border-b border-border px-6 py-5 md:px-10"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-cyan">History</span>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Past Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Review your previous mock interview sessions and detailed feedback reports.
          </p>
        </div>
      </motion.header>

      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="size-8 animate-spin text-cyan" />
            <p className="text-sm text-muted-foreground">Loading past interviews...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertCircle className="size-10 text-destructive" />
            <p className="text-sm font-medium">Failed to load history</p>
            <p className="max-w-md text-center text-xs text-muted-foreground">{error}</p>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchHistory}
              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Try Again
            </motion.button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-cyan/10">
              <Sparkles className="size-8 text-cyan" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">No interviews yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Complete your first mock interview from the Setup screen and your session will appear here with a detailed feedback report.
              </p>
            </div>
          </div>
        ) : (
          <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => {
              const evalData = session.evaluation
              const overallScore = evalData?.overallScore ?? 0
              const questionCount = evalData?.questionBreakdowns?.length ?? 0

              return (
                <motion.button
                  key={session.id}
                  type="button"
                  variants={card}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenDetail(session)}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-cyan/30 hover:bg-cyan/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {session.target_role}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{session.interview_type}</p>
                    </div>
                    <div
                      className={cn(
                        'flex size-12 shrink-0 flex-col items-center justify-center rounded-xl',
                        overallScore >= 75
                          ? 'bg-success/12 text-success'
                          : overallScore >= 50
                            ? 'bg-cyan/12 text-cyan'
                            : 'bg-destructive/12 text-destructive'
                      )}
                    >
                      <span className="font-mono text-lg font-bold leading-none">{overallScore}</span>
                      <span className="text-[0.58rem] uppercase tracking-wide">score</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(session.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>{questionCount} questions</span>
                    <span className="flex items-center gap-0.5 text-cyan transition-transform group-hover:translate-x-0.5">
                      View
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
