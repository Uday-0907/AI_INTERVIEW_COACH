'use client'

import { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import type { InterviewConfig } from '@/app/page'
import { CircularProgress } from '@/components/circular-progress'
import { cn } from '@/lib/utils'
import {
  INTERVIEW_TYPES,
  WPM_IDEAL_MAX,
  WPM_IDEAL_MIN,
  WPM_MAX,
  type EvaluationResult,
} from '@/lib/mock-data'
import {
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  Gauge,
  Loader2,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const TONE_COLORS: Record<string, string> = {
  Confident: 'var(--cyan)',
  Hesitant: 'var(--warning)',
  Neutral: 'var(--muted-foreground)',
  Enthusiastic: 'var(--success)',
  Defensive: 'var(--destructive)',
}

export function FeedbackScreen({
  config,
  transcript,
  onRestart,
}: {
  config: InterviewConfig
  transcript?: { role: 'ai' | 'user'; text: string }[]
  onRestart: () => void
}) {
  const { user } = useUser()
  const type = INTERVIEW_TYPES.find((t) => t.id === config.typeId)

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [supabaseSessionId, setSupabaseSessionId] = useState<string | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  useEffect(() => {
    if (!transcript || transcript.length === 0) return
    let cancelled = false

    async function runEvaluation() {
      setIsEvaluating(true)
      setEvalError(null)
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || 'anonymous_user',
            targetRole: config.role || 'Software Engineer',
            interviewType: type?.label || config.type || 'Technical',
            role: config.role,
            type: config.type,
            resume: config.resume,
            transcript,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Evaluation failed')
        }
        const data = await res.json()
        if (!cancelled) {
          const evalResult = data.evaluation || data
          setEvaluation(evalResult)
          if (data.sessionId) {
            setSupabaseSessionId(data.sessionId)
          }
        }
      } catch (err: any) {
        if (!cancelled) setEvalError(err.message || 'Failed to evaluate interview.')
      } finally {
        if (!cancelled) setIsEvaluating(false)
      }
    }

    runEvaluation()
    return () => { cancelled = true }
  }, [transcript, config.role, config.type, config.resume, type?.label, user?.id])

  // Loading state
  if (isEvaluating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
        <Loader2 className="size-10 animate-spin text-cyan" />
        <p className="text-sm font-medium text-foreground">Analyzing your interview transcript...</p>
        <p className="text-xs text-muted-foreground">The AI evaluator is reviewing every answer for strict, honest scoring.</p>
      </div>
    )
  }

  // Error state
  if (evalError && !evaluation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm font-medium text-foreground">Evaluation failed</p>
        <p className="max-w-md text-center text-xs text-muted-foreground">{evalError}</p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRestart}
          className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          <RotateCcw className="size-4" />
          Start New Interview
        </motion.button>
      </div>
    )
  }

  const overallScore = evaluation?.overallScore ?? 0

  const avgStar = evaluation?.starMetrics
    ? Math.round(
        (evaluation.starMetrics.situation +
          evaluation.starMetrics.task +
          evaluation.starMetrics.action +
          evaluation.starMetrics.result) /
          4
      )
    : 0

  const wpm = evaluation?.wordsPerMinute ?? 0
  const wpmStatus =
    wpm >= WPM_IDEAL_MIN && wpm <= WPM_IDEAL_MAX
      ? 'Ideal'
      : wpm < WPM_IDEAL_MIN
        ? 'Slow'
        : 'Fast'

  const headlineMetrics = evaluation
    ? [
        { label: 'Technical Depth', value: `${evaluation.technicalDepth ?? 0}%`, delta: evaluation.technicalDepth >= 75 ? 'Strong' : 'Needs work', positive: evaluation.technicalDepth >= 75 },
        { label: 'STAR Structure', value: `${avgStar}%`, delta: avgStar >= 75 ? 'Strong' : 'Needs work', positive: avgStar >= 75 },
        { label: 'Pacing (WPM)', value: `${wpm}`, delta: wpmStatus, positive: wpm >= WPM_IDEAL_MIN && wpm <= WPM_IDEAL_MAX },
        { label: 'Clarity', value: `${evaluation.communicationClarity ?? 0}%`, delta: evaluation.communicationClarity >= 75 ? 'Clear' : 'Muddled', positive: (evaluation.communicationClarity ?? 0) >= 75 },
      ]
    : []

  const starScores = evaluation?.starMetrics
    ? [
        { label: 'Situation', key: 'S', value: evaluation.starMetrics.situation },
        { label: 'Task', key: 'T', value: evaluation.starMetrics.task },
        { label: 'Action', key: 'A', value: evaluation.starMetrics.action },
        { label: 'Result', key: 'R', value: evaluation.starMetrics.result },
      ]
    : []

  const fillerWords = evaluation?.fillerWordBreakdown ?? []
  const fillerTotal = evaluation?.fillerWordCount ?? fillerWords.reduce((a, b) => a + b.count, 0)
  const maxFillerCount = Math.max(...fillerWords.map((f) => f.count), 1)

  const toneSegments = evaluation?.toneDistribution ?? []

  const questionFeedback = evaluation?.questionBreakdowns ?? []

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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-cyan">Session report</span>
            {supabaseSessionId && (
              <span className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">
                Cloud Saved: {supabaseSessionId.slice(0, 8)}...
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Feedback &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {config.role || 'Target role'} · {type?.label ?? (config.type || 'Interview')} ·{' '}
            {questionFeedback.length} questions
          </p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRestart}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          <RotateCcw className="size-4" />
          Start New Interview
        </motion.button>
      </motion.header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        {/* Top: overall score */}
        <motion.section variants={stagger} className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-card/70 p-6 shadow-xl backdrop-blur-xl"
          >
            <CircularProgress value={overallScore} sublabel="Preparedness" />
            <div className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              overallScore >= 75 ? 'bg-success/12 text-success' : overallScore >= 50 ? 'bg-cyan/12 text-cyan' : 'bg-destructive/12 text-destructive'
            )}>
              <Sparkles className="size-3.5" />
              {overallScore >= 75 ? 'Strong performance' : overallScore >= 50 ? 'Room for improvement' : 'Needs significant work'}
            </div>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-2 gap-4">
            {headlineMetrics.map((m) => (
              <motion.div
                key={m.label}
                variants={item}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl"
              >
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="font-mono text-3xl font-semibold tracking-tight">{m.value}</span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium',
                      m.positive ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
                    )}
                  >
                    <ArrowUpRight className="size-3" />
                    {m.delta}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Middle: metrics grid */}
        <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Delivery breakdown
        </h2>
        <motion.section variants={stagger} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* STAR */}
          <motion.div variants={item} className="rounded-2xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-cyan" />
              <p className="text-sm font-semibold">STAR Framework</p>
            </div>
            <div className="space-y-3.5">
              {starScores.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-mono font-medium">{s.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Filler words */}
          <motion.div variants={item} className="rounded-2xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Filler Words</p>
              <span className="font-mono text-2xl font-semibold text-warning">
                {fillerTotal}
              </span>
            </div>
            {fillerWords.length > 0 ? (
              <div className="space-y-2.5">
                {fillerWords.map((f) => (
                  <div key={f.word} className="flex items-center justify-between gap-3">
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
                      "{f.word}"
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{ width: `${(f.count / maxFillerCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 text-right font-mono text-xs">{f.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No filler words detected.</p>
            )}
          </motion.div>

          {/* WPM gauge */}
          <motion.div variants={item} className="rounded-2xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="size-4 text-cyan" />
              <p className="text-sm font-semibold">Pacing</p>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tracking-tight">{wpm}</span>
              <span className="text-xs text-muted-foreground">words per minute</span>
              <div className="relative mt-5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 rounded-full bg-success/25"
                  style={{
                    left: `${(WPM_IDEAL_MIN / WPM_MAX) * 100}%`,
                    right: `${100 - (WPM_IDEAL_MAX / WPM_MAX) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-cyan"
                  style={{ left: `${Math.min((wpm / WPM_MAX) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex w-full justify-between text-[0.68rem] text-muted-foreground">
                <span>0</span>
                <span className="text-success">ideal {WPM_IDEAL_MIN}–{WPM_IDEAL_MAX}</span>
                <span>{WPM_MAX}</span>
              </div>
            </div>
          </motion.div>

          {/* Tone */}
          <motion.div variants={item} className="rounded-2xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Volume2 className="size-4 text-violet" />
              <p className="text-sm font-semibold">Tone Analysis</p>
            </div>
            {toneSegments.length > 0 ? (
              <>
                <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
                  {toneSegments.map((t) => (
                    <div
                      key={t.tone}
                      style={{ width: `${t.percentage}%`, background: TONE_COLORS[t.tone] ?? 'var(--muted-foreground)' }}
                    />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {toneSegments.map((t) => (
                    <div key={t.tone} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-full" style={{ background: TONE_COLORS[t.tone] ?? 'var(--muted-foreground)' }} />
                        {t.tone}
                      </span>
                      <span className="font-mono font-medium">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Tone analysis unavailable.</p>
            )}
          </motion.div>
        </motion.section>

        {/* Bottom: accordion */}
        <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Question-by-question review
        </h2>
        <motion.section variants={stagger} className="space-y-3">
          {questionFeedback.map((q, i) => (
            <motion.div key={i} variants={item}>
              <QuestionAccordion q={q} index={i} defaultOpen={i === 0} />
            </motion.div>
          ))}
        </motion.section>
      </div>
    </motion.div>
  )
}

type QuestionData = EvaluationResult['questionBreakdowns'][number]

function QuestionAccordion({
  q,
  index,
  defaultOpen,
}: {
  q: QuestionData
  index: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  const isIncomplete = q.candidateAnswer?.includes('[Response unclear') || q.candidateAnswer?.includes('incomplete')

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/70 shadow-lg backdrop-blur-xl">
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/30"
        aria-expanded={open}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-sm text-cyan">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium">{q.question}</span>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium',
            q.score >= 85
              ? 'bg-success/12 text-success'
              : q.score >= 60
                ? 'bg-cyan/12 text-cyan'
                : q.score >= 40
                  ? 'bg-warning/12 text-warning'
                  : 'bg-destructive/12 text-destructive',
          )}
        >
          {q.score}%
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </motion.button>

      {open ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="grid gap-4 border-t border-border px-5 py-5 md:grid-cols-2"
        >
          <div className={cn(
            'rounded-xl border p-4',
            isIncomplete ? 'border-warning/30 bg-warning/5' : 'border-border bg-secondary/30'
          )}>
            <p className={cn(
              'mb-2 text-xs font-semibold uppercase tracking-wider',
              isIncomplete ? 'text-warning' : 'text-muted-foreground'
            )}>
              {isIncomplete ? 'Your answer (incomplete)' : 'Your answer'}
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{q.candidateAnswer}</p>
          </div>
          <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan">
              <Sparkles className="size-3.5" />
              AI recommended answer
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{q.idealAnswer}</p>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs text-muted-foreground">Missing keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {(q.missingKeywords || []).map((k) => (
                  <span
                    key={k}
                    className="rounded-md border border-violet/30 bg-violet/10 px-2 py-0.5 text-xs font-medium text-violet"
                  >
                    {k}
                  </span>
                ))}
                {(!q.missingKeywords || q.missingKeywords.length === 0) && (
                  <span className="text-xs text-muted-foreground">None identified.</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
