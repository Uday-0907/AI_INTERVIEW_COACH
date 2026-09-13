import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      transcript,
      config,
      userId,
      user_id,
      targetRole,
      target_role,
      interviewType,
      interview_type,
      role,
      type,
      resume,
    } = body

    const finalUserId = userId || user_id || 'anonymous_user'
    const finalTargetRole =
      targetRole ||
      target_role ||
      config?.targetRole ||
      config?.role ||
      role ||
      'Software Engineer'
    const finalInterviewType =
      interviewType ||
      interview_type ||
      config?.type ||
      type ||
      'Technical'

    // 1. Generate Evaluation via Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in .env.local' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const evaluationPrompt = `You are a strict, expert technical and behavioral interview evaluator.
Analyze the following interview transcript for target role: "${finalTargetRole}" (Interview Type: "${finalInterviewType}").
${resume ? `Candidate Resume Context:\n${resume}\n` : ''}

You must return a JSON object with this exact schema:
{
  "overallScore": number (0-100, comprehensive candidate score),
  "technicalDepth": number (0-100, technical mastery score),
  "communicationClarity": number (0-100, verbal clarity score),
  "wordsPerMinute": number (estimate speech pacing, typically 110-160),
  "fillerWordCount": number (total count of filler words like um, uh, like),
  "fillerWordBreakdown": [
    { "word": "like", "count": 2 },
    { "word": "um", "count": 1 }
  ],
  "toneDistribution": [
    { "tone": "Confident", "percentage": 70 },
    { "tone": "Hesitant", "percentage": 20 },
    { "tone": "Neutral", "percentage": 10 }
  ],
  "starMetrics": {
    "situation": number (0-100),
    "task": number (0-100),
    "action": number (0-100),
    "result": number (0-100)
  },
  "questionBreakdowns": [
    {
      "question": "Question asked by interviewer",
      "candidateAnswer": "Candidate response or summary",
      "idealAnswer": "Exemplary answer adhering to best practices and STAR method",
      "missingKeywords": ["key term 1", "key term 2"],
      "score": number (0-100)
    }
  ]
}

Transcript:
${JSON.stringify(transcript || [])}`

    const result = await model.generateContent(evaluationPrompt)
    const evaluationData = JSON.parse(result.response.text())

    // 2. Save Session Record to Supabase table 'interview_sessions'
    const sessionPayload = {
      user_id: finalUserId,
      target_role: finalTargetRole,
      interview_type: finalInterviewType,
      transcript: transcript || [],
      evaluation: evaluationData,
      created_at: new Date().toISOString(),
    }

    let savedSessionId: string | null = null
    try {
      const { data: savedSession, error } = await supabase
        .from('interview_sessions')
        .insert(sessionPayload)
        .select()
        .single()

      if (error) {
        console.error('Supabase Save Error:', error)
      } else {
        savedSessionId = savedSession?.id || null
      }
    } catch (dbErr: unknown) {
      console.error('Supabase DB Exception:', dbErr)
    }

    // 3. Return created Supabase sessionId along with evaluation response
    return NextResponse.json({
      sessionId: savedSessionId,
      evaluation: evaluationData,
      ...evaluationData,
    })
  } catch (err: unknown) {
    console.error('Evaluate API Error:', err)

    const errObj = err as { status?: number; message?: string }
    const isRateLimit =
      errObj?.status === 429 ||
      (errObj?.message &&
        (errObj.message.includes('429') ||
          errObj.message.toLowerCase().includes('quota') ||
          errObj.message.includes('RESOURCE_EXHAUSTED')))

    if (isRateLimit) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment or check your API key.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: errObj?.message || 'Evaluation failed' },
      { status: 500 }
    )
  }
}
