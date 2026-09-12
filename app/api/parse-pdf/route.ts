import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const { text } = await extractText(arrayBuffer, { mergePages: true })

    if (!text || !text.trim()) {
      return NextResponse.json({
        error: 'This PDF file format could not be read directly. Please copy and paste your resume text below.',
      }, { status: 400 })
    }

    return NextResponse.json({ text })
  } catch (err: any) {
    console.error('PDF Parse API Error:', err)
    return NextResponse.json({
      error: 'This PDF file format could not be read directly. Please copy and paste your resume text below.',
    }, { status: 400 })
  }
}
