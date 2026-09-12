import { NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 })
    }

    // Convert file into Buffer for parsing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse PDF text
    const data = await pdfParse(buffer)

    return NextResponse.json({ text: data.text })
  } catch (error) {
    console.error('PDF parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    )
  }
}