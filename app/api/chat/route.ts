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

    const systemPrompt = `You are a strict technical interviewer conducting a ${mode || 'Technical'} interview for a ${targetRole || 'Candidate'} role.
Candidate Resume Context: ${resumeText || 'None provided'}
Keep questions direct, realistic, concise (1-3 sentences max), and optimized for text-to-speech.`

    const promptText = `${systemPrompt}\n\nChat History:\n${JSON.stringify(messages || [])}`

    const result = await model.generateContent(promptText)
    const responseText = result.response.text()

    return NextResponse.json({ text: responseText })
  } catch (err: any) {
    console.error('Chat API Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}