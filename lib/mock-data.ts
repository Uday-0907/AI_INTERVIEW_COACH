export interface EvaluationResult {
  overallScore: number
  technicalDepth: number
  communicationClarity: number
  fillerWordCount: number
  fillerWordBreakdown: { word: string; count: number }[]
  wordsPerMinute: number
  toneDistribution: { tone: string; percentage: number }[]
  starMetrics: {
    situation: number
    task: number
    action: number
    result: number
  }
  questionBreakdowns: {
    question: string
    candidateAnswer: string
    idealAnswer: string
    missingKeywords: string[]
    score: number
  }[]
}

export const WPM_IDEAL_MIN = 120
export const WPM_IDEAL_MAX = 160
export const WPM_MAX = 220
export const WPM = 135

export const OVERALL_SCORE = 85

export const FILLER_WORDS = {
  count: 4,
  words: [
    { word: 'like', count: 2 },
    { word: 'um', count: 1 },
    { word: 'you know', count: 1 },
  ],
}

export const STAR_SCORES = {
  situation: 85,
  task: 80,
  action: 90,
  result: 85,
}

export const HEADLINE_METRICS = [
  { label: 'Technical Depth', score: 88, status: 'Strong' },
  { label: 'Communication Clartiy', score: 82, status: 'Good' },
  { label: 'Problem Solving', score: 85, status: 'Strong' },
]

export const TONE_SEGMENTS = [
  { tone: 'Confident', percentage: 70 },
  { tone: 'Hesitant', percentage: 20 },
  { tone: 'Neutral', percentage: 10 },
]

export const QUESTION_FEEDBACK = [
  {
    question: 'Tell me about a complex project you led.',
    answer: 'I managed a cross-functional team to deploy a new feature...',
    feedback: 'Clear structure and well-articulated outcomes.',
    score: 88,
  },
]

export const ROLE_EXAMPLES = [
  'Mechanical Design Engineer',
  'BBA Marketing Executive',
  'Full Stack Developer',
] as const

/** @deprecated Use ROLE_EXAMPLES — target role is now a free-text field. */
export const ROLES = ROLE_EXAMPLES

export type InterviewTypeId =
  | 'technical'
  | 'hr-behavioral'
  | 'coding'
  | 'system-design'
  | 'project-based'
  | 'resume-based'

export interface InterviewTypeOption {
  id: InterviewTypeId
  emoji: string
  label: string
  description: string
  guidance: string
}

export const INTERVIEW_TYPES: InterviewTypeOption[] = [
  {
    id: 'technical',
    emoji: '💻',
    label: 'Technical Interview',
    description:
      'Programming, DSA, DBMS, OOP, SQL, or core domain concepts.',
    guidance:
      'Ask technical questions covering programming, data structures and algorithms, DBMS, OOP, SQL, and core engineering concepts relevant to the target role. Probe for correctness, trade-offs, and depth of understanding.',
  },
  {
    id: 'hr-behavioral',
    emoji: '👔',
    label: 'HR / Behavioral Interview',
    description:
      "Soft skills, 'Tell me about yourself', strengths/weaknesses, and STAR methodology.",
    guidance:
      "Focus on soft skills, motivation, culture fit, 'Tell me about yourself', strengths and weaknesses, and behavioral stories. Coach answers toward the STAR methodology (Situation, Task, Action, Result).",
  },
  {
    id: 'coding',
    emoji: '🧑‍💻',
    label: 'Coding Interview',
    description: 'Algorithms, live problem solving, and logic evaluation.',
    guidance:
      'Run a coding interview: pose algorithm and logic problems, ask the candidate to talk through live problem solving, complexity, edge cases, and alternative approaches. Prefer one problem at a time.',
  },
  {
    id: 'system-design',
    emoji: '🏗️',
    label: 'System Design Interview',
    description: 'Scalable architectures, APIs, database selection, and system design.',
    guidance:
      'Conduct a system design interview: scalable architectures, APIs, database selection, consistency, bottlenecks, and trade-offs. Start with requirements, then capacity, then high-level design, then deep dives.',
  },
  {
    id: 'project-based',
    emoji: '🚀',
    label: 'Project-Based Interview',
    description: 'Deep dives strictly into projects listed on the uploaded resume.',
    guidance:
      'Deep-dive strictly into projects listed on the uploaded resume. Do not invent projects or technologies that are not present. Ask about architecture, ownership, challenges, metrics, and what they personally built.',
  },
  {
    id: 'resume-based',
    emoji: '📄',
    label: 'Resume-Based Interview',
    description:
      'Questions based on candidate experience, education, skills, and background.',
    guidance:
      'Ask questions grounded in the candidate resume: experience, education, skills, and background. Reference specific lines from the resume whenever possible and do not fabricate credentials.',
  },
]