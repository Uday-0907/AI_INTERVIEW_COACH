'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { InterviewConfig } from '@/app/page'
import { CircularProgress } from '@/components/circular-progress'
import { cn } from '@/lib/utils'
import {
  FILLER_WORDS,
  HEADLINE_METRICS,
  INTERVIEW_TYPES,
  OVERALL_SCORE,
  QUESTION_FEEDBACK,
  STAR_SCORES,
  TONE_SEGMENTS,
  WPM,
  WPM_IDEAL_MAX,
  WPM_IDEAL_MIN,
  WPM_MAX,
  type EvaluationResult,
} from '@/lib/mock-data'
import {
  ArrowUpRight,
  ChevronDown,
  Gauge,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Volume2,
} from 'lucide-react'

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export function FeedbackScreen({
  config,
  evaluation,
  onRestart,
}: {
  config: InterviewConfig
  evaluation?: EvaluationResult | null
  onRestart: () => void
}) {
  const type = INTERVIEW_TYPES.find((t) => t.id === config.typeId)

  // Reads evaluation results if provided by Gemini API, otherwise falls back to defaults
  const overallScore = evaluation?.overallScore ?? OVERALL_SCORE ?? 0

  const avgStar = evaluation?.starMetrics
    ? Math.round(
        ((evaluation.starMetrics.situation ?? 80) +
          (evaluation.starMetrics.task ?? 80) +
          (evaluation.starMetrics.action ?? 80) +
          (evaluation.starMetrics.result ?? 80)) /
          4
      )
    : 85

  const headlineMetrics = evaluation
    ? [
        { label: 'STAR Structure', value: `${avgStar}%`, delta: '+6', positive: avgStar >= 75 },
        {
          label: 'Pacing (WPM)',
          value: `${evaluation.wordsPerMinute ?? 132}`,
          delta:
            (evaluation.wordsPerMinute ?? 132) >= 110 && (evaluation.wordsPerMinute ?? 132) <= 160
              ? 'Ideal'
              : 'Paced',
          positive:
            (evaluation.wordsPerMinute ?? 132) >= 110 && (evaluation.wordsPerMinute ?? 132) <= 160,
        },
        {
          label: 'Filler Words',
          value: `${evaluation.fillerWordCount ?? 0}`,
          delta: (evaluation.fillerWordCount ?? 0) <= 10 ? 'Low' : 'Moderate',
          positive: (evaluation.fillerWordCount ?? 0) <= 10,
        },
        {
          label: 'Clarity',
          value: `${evaluation.communicationClarity ?? 80}%`,
          delta: '+3',
          positive: (evaluation.communicationClarity ?? 80) >= 75,
        },
      ]
    : HEADLINE_METRICS ?? []

  const starScores = evaluation?.starMetrics
    ? [
        { label: 'Situation', key: 'S', value: evaluation.starMetrics.situation ?? 80 },
        { label: 'Task', key: 'T', value: evaluation.starMetrics.task ?? 80 },
        { label: 'Action', key: 'A', value: evaluation.starMetrics.action ?? 80 },
        { label: 'Result', key: 'R', value: evaluation.starMetrics.result ?? 80 },
      ]
    : STAR_SCORES ?? []

  const fillerWords = evaluation
    ? [
        { word: 'um', count: Math.max(0, Math.round((evaluation.fillerWordCount ?? 10) * 0.4)) },
        { word: 'like', count: Math.max(0, Math.round((evaluation.fillerWordCount ?? 10) * 0.3)) },
        { word: 'you know', count: Math.max(0, Math.round((evaluation.fillerWordCount ?? 10) * 0.2)) },
        { word: 'basically', count: Math.max(0, Math.round((evaluation.fillerWordCount ?? 10) * 0.1)) },
      ]
    : FILLER_WORDS ?? []

  const toneSegments = TONE_SEGMENTS ?? []

  const questionFeedback = evaluation?.questionBreakdowns?.length
    ? evaluation.questionBreakdowns.map((q, idx) => ({
        id: `q${idx + 1}`,
        question: q.question,
        candidateAnswer: q.candidateAnswer,
        idealAnswer: q.idealAnswer,
        missingKeywords: q.missingKeywords || [],
        score: q.score,
      }))
    : QUESTION_FEEDBACK ?? []

  const wpm = evaluation?.wordsPerMinute ?? WPM ?? 0
  const wpmIdealMin = WPM_IDEAL_MIN ?? 0
  const wpmIdealMax = WPM_IDEAL_MAX ?? 0
  const wpmMax = WPM_MAX ?? 200

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
          <span className="text-xs font-medium uppercase tracking-wider text-cyan">Session report</span>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Feedback & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {config.role || 'Target role'} · {type?.label ?? config.type || 'Interview'} ·{' '}
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
          New session
        </motion.button>
      </motion.header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        {/* Top: overall score */}
        <motion.section variants={stagger} className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6"
          >
            <CircularProgress value={overallScore} sublabel="Preparedness" />
            <div className="flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-medium text-success">
              <TrendingUp className="size-3.5" />
              Up 9 points vs. last session
            </div>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-2 gap-4">
            {headlineMetrics.map((m) => (
              <motion.div
                key={m.label}
                variants={item}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-sm text-muted-foreground">{m.label ?? ''}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="font-mono text-3xl font-semibold tracking-tight">{m.value ?? '0'}</span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium',
                      m.positive ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
                    )}
                  >
                    <ArrowUpRight className="size-3" />
                    {m.delta ?? ''}
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
          <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-cyan" />
              <p className="text-sm font-semibold">STAR Framework</p>
            </div>
            <div className="space-y-3.5">
              {starScores.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.label ?? ''}</span>
                    <span className="font-mono font-medium">{s.value ?? 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                      style={{ width: `${s.value ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Filler words */}
          <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Filler Words</p>
              <span className="font-mono text-2xl font-semibold text-warning">
                {fillerWords.reduce((a, b) => a + (b.count ?? 0), 0)}
              </span>
            </div>
            <div className="space-y-2.5">
              {fillerWords.map((f) => (
                <div key={f.word} className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
                    “{f.word ?? ''}”
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${((f.count ?? 0) / 7) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-right font-mono text-xs">{f.count ?? 0}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* WPM gauge */}
          <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
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
                    left: `${(wpmIdealMin / wpmMax) * 100}%`,
                    right: `${100 - (wpmIdealMax / wpmMax) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-cyan"
                  style={{ left: `${(wpm / wpmMax) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex w-full justify-between text-[0.68rem] text-muted-foreground">
                <span>0</span>
                <span className="text-success">ideal 110–160</span>
                <span>{wpmMax}</span>
              </div>
            </div>
          </motion.div>

          {/* Tone */}
          <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Volume2 className="size-4 text-violet" />
              <p className="text-sm font-semibold">Tone Analysis</p>
            </div>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
              {toneSegments.map((t) => (
                <div key={t.label} style={{ width: `${t.value ?? 0}%`, background: t.color ?? 'var(--muted-foreground)' }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {toneSegments.map((t) => (
                <div key={t.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-full" style={{ background: t.color ?? 'var(--muted-foreground)' }} />
                    {t.label ?? ''}
                  </span>
                  <span className="font-mono font-medium">{t.value ?? 0}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* Bottom: accordion */}
        <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Question-by-question review
        </h2>
        <motion.section variants={stagger} className="space-y-3">
          {questionFeedback.map((q, i) => (
            <motion.div key={q.id ?? i} variants={item}>
              <QuestionAccordion q={q} index={i} defaultOpen={i === 0} />
            </motion.div>
          ))}
        </motion.section>
      </div>
    </motion.div>
  )
}

function QuestionAccordion({
  q,
  index,
  defaultOpen,
}: {
  q: (typeof QUESTION_FEEDBACK)[number]
  index: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
        <span className="flex-1 text-sm font-medium">{q.question ?? ''}</span>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium',
            (q.score ?? 0) >= 85
              ? 'bg-success/12 text-success'
              : (q.score ?? 0) >= 75
                ? 'bg-cyan/12 text-cyan'
                : 'bg-warning/12 text-warning',
          )}
        >
          {q.score ?? 0}%
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
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your answer
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{q.candidateAnswer ?? ''}</p>
          </div>
          <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan">
              <Sparkles className="size-3.5" />
              AI recommended answer
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{q.idealAnswer ?? ''}</p>
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
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
