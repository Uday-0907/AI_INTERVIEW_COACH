import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/genai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in .env.local file' }, 
        { status: 500 }
      )
    }

    const body = await req.json()
    const { messages, targetRole, mode, resumeText } = body

    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `You are a strict technical interviewer conducting a ${mode} interview for a ${targetRole} role.
Candidate Resume Context: ${resumeText || 'None provided'}
Keep questions direct, adaptive, and concise.`

    const promptText = `${systemPrompt}\n\nConversation so far:\n${JSON.stringify(messages)}`
    
    const response = await model.generateContent(promptText)
    const aiText = response.response.text()

    return NextResponse.json({ text: aiText })
  } catch (err: any) {
    console.error('Chat API Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate AI response' }, { status: 500 })
  }
}