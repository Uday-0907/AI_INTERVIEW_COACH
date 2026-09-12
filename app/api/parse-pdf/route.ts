import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse-fork'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const parsedData = await pdfParse(buffer)

    if (!parsedData.text || !parsedData.text.trim()) {
      return NextResponse.json({ error: 'PDF appears to be empty or unscannable' }, { status: 400 })
    }

    return NextResponse.json({ text: parsedData.text })
  } catch (err: any) {
    console.error('PDF Parse API Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to extract text from PDF' }, { status: 500 })
  }
}