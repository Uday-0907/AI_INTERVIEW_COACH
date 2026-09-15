'use client'

import { useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { FileText, Upload, Sparkles, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react'
import type { InterviewConfig } from '@/app/page'
import { INTERVIEW_TYPES, ROLE_EXAMPLES } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
}

const cardItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
}

export function SetupScreen({
  config,
  onConfigChange,
  onStart,
}: {
  config: InterviewConfig
  onConfigChange: (newConfig: InterviewConfig) => void
  onStart: (session: InterviewConfig) => void
}) {
  const [isParsing, setIsParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [highlightResume, setHighlightResume] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsParsing(true)
    setErrorMsg('')

    try {
      if (file.type === 'text/plain') {
        const text = await file.text()
        onConfigChange({ ...config, resume: text })
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to extract text from PDF')
      }

      if (data.text) {
        onConfigChange({ ...config, resume: data.text })
      }
    } catch (err: any) {
      console.error('PDF parsing error:', err)
      setErrorMsg(err.message || 'Error processing PDF file. Try pasting the resume text directly.')
      setHighlightResume(true)
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        textareaRef.current?.focus()
      }, 200)
      setTimeout(() => setHighlightResume(false), 4000)
    } finally {
      setIsParsing(false)
      e.target.value = ''
    }
  }

  const handleStart = () => {
    const selected = INTERVIEW_TYPES.find((t) => t.id === config.typeId)
    if (!selected || !config.role.trim()) return

    onStart({
      role: config.role.trim(),
      type: selected.label,
      typeId: selected.id,
      resume: config.resume.trim(),
    })
  }

  const hasResume = Boolean(config.resume && config.resume.trim())
  const canStart = Boolean(config.role.trim() && config.typeId && !isParsing)

  const buttonLabel = isParsing
    ? 'Processing Resume...'
    : hasResume
      ? 'Start Voice Interview'
      : 'Start Interview Without Resume'

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan">
          <Sparkles className="size-3.5" /> Voice Interview Preparation
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Configure Your Interview
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a mode, enter any target role, and provide resume context for a clean, domain-specific session.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col space-y-4 rounded-2xl border border-border/40 bg-card/70 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-cyan" />
            <h2 className="font-semibold text-foreground">1. Upload or Paste Resume</h2>
          </div>

          <label className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-background/50 p-4 backdrop-blur-md transition-colors hover:border-cyan/50 hover:bg-cyan/5">
            <Upload className="mb-2 size-6 text-muted-foreground group-hover:text-cyan" />
            <span className="text-center text-xs text-muted-foreground group-hover:text-foreground">
              {isParsing ? (
                <span className="animate-pulse font-medium text-cyan">Extracting PDF text...</span>
              ) : fileName ? (
                <span className="flex items-center gap-1 font-medium text-success">
                  <CheckCircle2 className="size-3.5" /> {fileName} Loaded
                </span>
              ) : (
                'Click to upload PDF or TXT file'
              )}
            </span>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={isParsing}
              className="hidden"
            />
          </label>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-2 text-muted-foreground">or paste resume text</span>
            </div>
          </div>

          <motion.textarea
            ref={textareaRef}
            value={config.resume}
            onChange={(e) => onConfigChange({ ...config, resume: e.target.value })}
            placeholder="Paste raw resume text, projects, or skill summaries here..."
            animate={highlightResume ? { boxShadow: '0 0 0 2px var(--cyan), 0 0 24px -4px var(--cyan)' } : { boxShadow: '0 0 0 0 transparent' }}
            transition={{ duration: 0.4 }}
            className={cn(
              'h-32 w-full rounded-xl border border-border/40 bg-background/50 p-3 text-xs outline-none transition-colors focus:border-cyan focus:ring-1 focus:ring-cyan',
              highlightResume && 'border-cyan',
            )}
          />
        </div>

        <div className="flex flex-col space-y-4 rounded-2xl border border-border/40 bg-card/70 p-6 shadow-xl backdrop-blur-xl">
          <div>
            <h2 className="mb-2 font-semibold text-foreground">2. Target Role & Domain</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Enter any discipline — engineering, business, healthcare, design, and more.
            </p>
            <input
              type="text"
              value={config.role}
              onChange={(e) => onConfigChange({ ...config, role: e.target.value })}
              placeholder={`e.g. ${ROLE_EXAMPLES.join(', ')}`}
              className="w-full rounded-xl border border-border/40 bg-background/50 p-3 text-sm outline-none transition-colors focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Next, pick one of the six interview modes below. Starting a session clears prior chat and timers.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">3. Interview Type</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select exactly one mode for this session.</p>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {INTERVIEW_TYPES.map((type) => {
            const active = config.typeId === type.id
            return (
              <motion.button
                key={type.id}
                type="button"
                variants={cardItem}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  onConfigChange({
                    ...config,
                    typeId: type.id,
                    type: type.label,
                  })
                }
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors',
                  active
                    ? 'border-cyan/50 bg-cyan/10 backdrop-blur-xl'
                    : 'border-border/40 bg-card/70 backdrop-blur-xl hover:border-cyan/30 hover:bg-cyan/5',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {type.emoji}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{type.label}</span>
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{type.description}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      <motion.button
        type="button"
        whileHover={canStart ? { scale: 1.02 } : undefined}
        whileTap={canStart ? { scale: 0.98 } : undefined}
        onClick={handleStart}
        disabled={!canStart}
        className="w-full rounded-xl border border-cyan/40 bg-cyan py-3.5 text-sm font-semibold text-background shadow-lg shadow-cyan/10 transition-all hover:bg-cyan/90 disabled:opacity-50 disabled:hover:bg-cyan"
      >
        {buttonLabel}
      </motion.button>
    </div>
  )
}
