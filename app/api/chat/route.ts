import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize the Gemini client using your environment API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

export async function POST(req: Request) {
  try {
    const { messages, config, isOpeningQuestion } = await req.json()

    // Craft system instructions using the user's setup data
    const { INTERVIEW_TYPES } = await import('@/lib/mock-data')
    const selectedType = INTERVIEW_TYPES.find((t) => t.id === config?.typeId)

    const systemPrompt = `
      You are a professional hiring manager conducting a structured job interview.
      - Target Role: ${config?.role || 'General Candidate'}
      - Interview Type: ${selectedType?.label || config?.type || 'General'}
      - Candidate Resume Context: ${config?.resume || 'No resume provided'}

      Mode-specific focus:
      ${selectedType?.guidance || 'Keep questions relevant to the target role and resume.'}

      Instructions:
      - Ask ONE question at a time.
      - Keep questions concise, conversational, and directly related to the role (${config?.role || 'the target role'}).
      - Ground questions in the parsed resume when it is provided.
      - If this is an opening question, welcome them briefly and ask an introductory question matching this interview type and their background.
    `

    const prompt = isOpeningQuestion
      ? `${systemPrompt}\n\nTask: Generate the single opening question for this candidate.`
      : `${systemPrompt}\n\nConversation history:\n${JSON.stringify(messages)}\n\nTask: Respond to the candidate and ask the next relevant follow-up question.`

    // Request content from gemini-3.6-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    })

    return NextResponse.json({ text: response.text })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate interviewer response' },
      { status: 500 }
    )
  }
}