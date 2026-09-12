import { GoogleGenAI, Type, Schema } from '@google/genai'
import { NextResponse } from 'next/server'

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: 'Overall interview preparedness and performance score from 0 to 100.',
    },
    technicalDepth: {
      type: Type.INTEGER,
      description: 'Candidate technical competency, architectural depth, and domain knowledge score from 0 to 100.',
    },
    communicationClarity: {
      type: Type.INTEGER,
      description: 'Clarity of thought, articulation, conciseness, and delivery score from 0 to 100.',
    },
    fillerWordCount: {
      type: Type.INTEGER,
      description: 'Estimated count of filler words (e.g., um, uh, like, you know, basically) used across candidate responses.',
    },
    wordsPerMinute: {
      type: Type.INTEGER,
      description: 'Estimated speaking pacing in words per minute (typical target range is 110-160 WPM).',
    },
    starMetrics: {
      type: Type.OBJECT,
      description: 'Evaluation of answers across the STAR framework components (each 0 to 100).',
      properties: {
        situation: {
          type: Type.INTEGER,
          description: 'Effectiveness at describing background context and business constraints (0-100).',
        },
        task: {
          type: Type.INTEGER,
          description: 'Clarity in defining ownership, objectives, and hurdles (0-100).',
        },
        action: {
          type: Type.INTEGER,
          description: 'Depth and technical rigor of specific actions and trade-offs taken (0-100).',
        },
        result: {
          type: Type.INTEGER,
          description: 'Ability to articulate measurable metrics and outcomes (0-100).',
        },
      },
      required: ['situation', 'task', 'action', 'result'],
    },
    questionBreakdowns: {
      type: Type.ARRAY,
      description: 'Question-by-question breakdown of the interview exchange.',
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'The interview question that was asked.',
          },
          candidateAnswer: {
            type: Type.STRING,
            description: "Summary or key transcript excerpt of the candidate's answer.",
          },
          idealAnswer: {
            type: Type.STRING,
            description: 'Model senior-level answer demonstrating optimal technical depth, trade-offs, and STAR structure.',
          },
          missingKeywords: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
            description: 'Key technical terms, architectural patterns, or concepts the candidate should have mentioned.',
          },
          score: {
            type: Type.INTEGER,
            description: 'Score from 0 to 100 for this specific answer.',
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
    'wordsPerMinute',
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
          .map((m: { role: string; content: string }) => {
            const speaker = m.role === 'ai' ? 'Interviewer (Aria)' : 'Candidate'
            return `${speaker}: ${m.content}`
          })
          .join('\n')
      : String(transcript)

    const prompt = `You are a Principal Engineering Bar Raiser evaluating a candidate's complete interview transcript.

Target Position: ${role || 'Senior Software Engineer'}
Candidate Resume Context:
${resume || 'No resume context provided.'}

Full Interview Transcript:
${formattedTranscript}

Perform a rigorous evaluation of the candidate's performance. Adhere strictly to the requested JSON schema.
- Evaluate overall readiness (0-100).
- Gauge technical depth and system design / coding competency (0-100).
- Measure communication clarity (0-100).
- Count or realistically estimate filler words used by the candidate.
- Calculate candidate speaking pacing in WPM (typical conversational pacing is 120-150 WPM).
- Score each dimension of the STAR method (situation, task, action, result) from 0-100.
- For each question asked, extract the candidate's answer, provide a comprehensive ideal answer, list missing keywords, and score the answer.`

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
