import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ParsedText = { text: string }

async function parseWithUnpdf(data: Uint8Array): Promise<string> {
  const { extractText } = await import('unpdf')
  const { text } = (await extractText(data, { mergePages: true })) as ParsedText
  if (!text || !text.trim()) {
    throw new Error(
      'This PDF file format could not be read directly. Please copy and paste your resume text below.'
    )
  }
  return text
}

async function parseWithPdfParse(data: Uint8Array): Promise<string> {
  try {
    const mod = (await import('pdf-parse-fork' as string)) as typeof import('pdf-parse-fork')
    const pdfParse = (mod as unknown as { default?: (b: Buffer) => Promise<{ text: string }> })
      .default || (mod as unknown as (b: Buffer) => Promise<{ text: string }>)
    const result = await pdfParse(Buffer.from(data))
    if (!result.text || !result.text.trim()) {
      throw new Error(
        'This PDF file format could not be read directly. Please copy and paste your resume text below.'
      )
    }
    return result.text
  } catch {
    throw new Error(
      'This PDF file format could not be read directly. Please copy and paste your resume text below.'
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    let extractedText = ''

    if (file.type === 'text/plain') {
      extractedText = new TextDecoder().decode(bytes)
    } else {
      // Try unpdf first, then pdf-parse-fork as a fallback
      try {
        extractedText = await parseWithUnpdf(bytes)
      } catch {
        extractedText = await parseWithPdfParse(bytes)
      }
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            'This PDF file format could not be read directly. Please copy and paste your resume text below.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ text: extractedText })
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to parse PDF file. Please copy and paste your resume text directly into the text area below.',
      },
      { status: 400 }
    )
  }
}
