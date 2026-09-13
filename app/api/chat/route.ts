import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in .env.local' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { messages, mode, targetRole, resumeText } = body

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const hasResume = Boolean(
      resumeText &&
      typeof resumeText === 'string' &&
      resumeText.trim().length > 0 &&
      resumeText.trim().toLowerCase() !== 'none provided'
    )

    const history = Array.isArray(messages) ? messages : []
    const isOpening =
      history.length === 0 ||
      history.every((m: any) => m.role === 'ai' || !m.text || m.text === true)

    let promptText = ''

    if (isOpening) {
      if (!hasResume) {
        promptText = `You are an expert, friendly, and professional technical interviewer conducting a ${mode || 'Technical'} interview for a ${targetRole || 'Candidate'} role.
The candidate did not provide or upload a resume.

INSTRUCTION FOR OPENING PROMPT:
Warmly greet the candidate, introduce the interview for the ${targetRole || 'specified'} role, and explicitly ask them to state their background, key technical skills, and recent experience.
Keep your response welcoming, natural, concise (1-3 sentences maximum), and optimized for text-to-speech audio. Do not include markdown asterisks or bullet points in the spoken text.`
      } else {
        promptText = `You are an expert, friendly, and professional technical interviewer conducting a ${mode || 'Technical'} interview for a ${targetRole || 'Candidate'} role.
Candidate Resume Context:
${resumeText.trim()}

INSTRUCTION FOR OPENING PROMPT:
Warmly welcome the candidate to the interview for the ${targetRole || 'specified'} position.
Ask a clear, direct, and engaging opening question tailored specifically to their resume background and the interview mode.
Keep your response concise (1-3 sentences maximum) and optimized for text-to-speech audio. Do not include markdown asterisks or bullet points in the spoken text.`
      }
    } else {
      const resumeContext = hasResume
        ? `Candidate Resume Context:\n${resumeText.trim()}`
        : `Candidate did not provide a resume. Evaluate based on their responses and stated background.`

      promptText = `You are an expert interviewer conducting a ${mode || 'Technical'} interview for a ${targetRole || 'Candidate'} role.
${resumeContext}
Guidelines:
- Keep all questions direct, realistic, and concise (1-3 sentences maximum).
- Ask one question at a time.
- Directly build upon or probe deeper into the candidate's last answer.
- Optimize response text for natural speech synthesis (avoid asterisks, markdown headings, or bulleted lists).

Chat History:
${JSON.stringify(history)}`
    }

    const result = await model.generateContent(promptText)
    const responseText = result.response.text()

    return NextResponse.json({ text: responseText })
  } catch (err: any) {
    console.error('Chat API Error:', err)

    const isRateLimit =
      err?.status === 429 ||
      (err?.message &&
        (err.message.includes('429') ||
          err.message.toLowerCase().includes('quota') ||
          err.message.includes('RESOURCE_EXHAUSTED')))

    if (isRateLimit) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please try again later or check your API key.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: err.message || 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}