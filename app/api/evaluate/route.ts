import { GoogleGenAI, Type, Schema } from '@google/genai'
import { NextResponse } from 'next/server'

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: 'Overall interview preparedness and performance score from 0 to 100. Must honestly reflect the quality of answers — do not inflate.',
    },
    technicalDepth: {
      type: Type.INTEGER,
      description: 'Candidate technical competency, domain knowledge, and depth of understanding from 0 to 100. Penalize brief or superficial answers.',
    },
    communicationClarity: {
      type: Type.INTEGER,
      description: 'Clarity of thought, articulation, conciseness, and delivery from 0 to 100. Penalize unclear, rambling, or disorganized responses.',
    },
    fillerWordCount: {
      type: Type.INTEGER,
      description: 'Total count of filler words (um, uh, like, you know, basically, actually, sort of, kind of) used across all candidate responses.',
    },
    fillerWordBreakdown: {
      type: Type.ARRAY,
      description: 'Breakdown of each filler word and how many times it was used.',
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING, description: 'The filler word or phrase.' },
          count: { type: Type.INTEGER, description: 'Number of times this filler word appeared.' },
        },
        required: ['word', 'count'],
      },
    },
    wordsPerMinute: {
      type: Type.INTEGER,
      description: 'Estimated speaking pacing in words per minute (typical target range is 110-160 WPM).',
    },
    toneDistribution: {
      type: Type.ARRAY,
      description: 'Distribution of candidate tone across the interview as percentages summing to 100.',
      items: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING, description: 'Tone label e.g. Confident, Hesitant, Neutral, Enthusiastic, Defensive.' },
          percentage: { type: Type.INTEGER, description: 'Percentage of the interview exhibiting this tone (0-100).' },
        },
        required: ['tone', 'percentage'],
      },
    },
    starMetrics: {
      type: Type.OBJECT,
      description: 'Evaluation of answers across the STAR framework components (each 0 to 100). Penalize answers that skip any component.',
      properties: {
        situation: {
          type: Type.INTEGER,
          description: 'Effectiveness at describing background context and business constraints (0-100). Score 0-30 if missing or vague.',
        },
        task: {
          type: Type.INTEGER,
          description: 'Clarity in defining ownership, objectives, and hurdles (0-100). Score 0-30 if missing or vague.',
        },
        action: {
          type: Type.INTEGER,
          description: 'Depth and rigor of specific actions and trade-offs taken (0-100). Score 0-30 if missing or vague.',
        },
        result: {
          type: Type.INTEGER,
          description: 'Ability to articulate measurable metrics and outcomes (0-100). Score 0-30 if missing or vague.',
        },
      },
      required: ['situation', 'task', 'action', 'result'],
    },
    questionBreakdowns: {
      type: Type.ARRAY,
      description: 'Question-by-question breakdown of the interview exchange. Include every question the interviewer asked.',
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'The interview question that was asked.',
          },
          candidateAnswer: {
            type: Type.STRING,
            description: "The candidate's exact answer from the transcript. If the answer was unclear or skipped, note that here.",
          },
          idealAnswer: {
            type: Type.STRING,
            description: 'Model senior-level answer demonstrating optimal depth, trade-offs, and STAR structure.',
          },
          missingKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Key terms, patterns, or concepts the candidate should have mentioned.',
          },
          score: {
            type: Type.INTEGER,
            description: 'Score from 0 to 100 for this specific answer. Incomplete, unclear, or skipped answers must score below 40.',
          },
        },
        required: ['question', 'candidateAnswer', 'idealAnswer', 'missingKeywords', 'score'],
      },
    },
  },
  required: [
    'overallScore',
    'technicalDepth',
    'communicationClarity',
    'fillerWordCount',
    'fillerWordBreakdown',
    'wordsPerMinute',
    'toneDistribution',
    'starMetrics',
    'questionBreakdowns',
  ],
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { role, resume, transcript } = body

    if (!transcript || (Array.isArray(transcript) && transcript.length === 0)) {
      return NextResponse.json(
        { error: 'Transcript is required to perform an evaluation.' },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const formattedTranscript = Array.isArray(transcript)
      ? transcript
          .map((m: { role: string; text?: string; content?: string }) => {
            const speaker = m.role === 'ai' ? 'Interviewer (Aria)' : 'Candidate'
            const content = m.text ?? m.content ?? ''
            return `${speaker}: ${content}`
          })
          .join('\n')
      : String(transcript)

    const prompt = `You are a Principal Bar Raiser conducting a strict, honest, and unbiased evaluation of a candidate's complete interview transcript.

Target Position: ${role || 'General Candidate'}
Candidate Resume Context:
${resume || 'No resume context provided.'}

Full Interview Transcript:
${formattedTranscript}

EVALUATION RULES — be rigorous and honest:
1. Score integrity: Scores must reflect actual performance. Do NOT inflate scores. A candidate who gave weak answers must receive low scores.
2. Incomplete or unclear answers: If a candidate's answer was marked as "[Response unclear — marked as incomplete. Moving to next question.]" or was extremely brief, score that answer below 40. Penalize the corresponding STAR component, technical depth, and communication clarity.
3. Off-topic answers: If the candidate's response did not address the question asked, penalize the score for that question and the relevant STAR components.
4. STAR scoring: If the candidate did not describe the Situation, Task, Action, or Result in their answers, score that STAR component 0-30. Do not award partial credit for missing elements.
5. Technical depth: If answers lacked technical specificity, architectural reasoning, or domain knowledge, score technical depth below 50.
6. Communication clarity: If responses were rambling, disorganized, or hard to follow, score communication clarity below 50.
7. Filler words: Count ALL filler words (um, uh, like, you know, basically, actually, sort of, kind of, I mean, right) across all candidate responses. Provide a per-word breakdown.
8. Tone distribution: Analyze the candidate's tone throughout the interview (e.g., Confident, Hesitant, Neutral, Enthusiastic, Defensive). Percentages must sum to 100.
9. WPM: Estimate speaking pace based on response length relative to a typical interview conversation (120-150 WPM is normal).
10. For each question, extract the candidate's EXACT answer from the transcript, provide a comprehensive ideal answer, list missing keywords, and score honestly.

Adhere strictly to the requested JSON schema. Return only the JSON object.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: evaluationSchema,
        temperature: 0.2,
      },
    })

    const responseText = response.text
    if (!responseText) {
      throw new Error('No evaluation content received from Gemini model.')
    }

    const evaluationData = JSON.parse(responseText)

    return NextResponse.json(evaluationData)
  } catch (error: any) {
    console.error('Error in /api/evaluate:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate interview performance.' },
      { status: 500 }
    )
  }
}
