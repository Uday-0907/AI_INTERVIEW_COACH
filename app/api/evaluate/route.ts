import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 })
    }

    const { transcript, config } = await req.json()
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const evalPrompt = `Analyze this interview transcript strictly for the role: ${config?.targetRole || 'Candidate'}.
Return a detailed evaluation response.`

    const result = await model.generateContent(`${evalPrompt}\n\nTranscript:\n${JSON.stringify(transcript)}`)
    const responseText = result.response.text()

    return NextResponse.json({ text: responseText })
  } catch (err: any) {
    console.error('Evaluate API Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to evaluate interview' }, { status: 500 })
  }
}