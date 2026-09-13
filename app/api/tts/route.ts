import { NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'edge-tts-node'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Initialize Edge TTS engine
    const tts = new MsEdgeTTS({})
    
    // Set voice (en-US-GuyNeural is great for professional interviewers)
    await tts.setMetadata('en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

    // Generate audio stream
    const readable = await tts.toStream(text)

    // Convert stream into buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of readable) {
      chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    // Return MP3 audio response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Edge TTS Error:', error)
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}