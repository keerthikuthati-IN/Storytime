import { NextResponse } from 'next/server';

// Sarvam.ai — Indian-language + English-with-Indian-accent TTS
// Docs: https://docs.sarvam.ai
// Add to .env.local: SARVAM_API_KEY=your_key_here

// Speaker voices per language (bulbul:v3)
const SPEAKERS: Record<string, string> = {
  'en-IN': 'ishita', // warm, gentle female — recommended en-IN voice (bulbul:v3)
  'te-IN': 'neha',   // Telugu, expressive and emotional female
};

const LANG_CODE: Record<string, string> = {
  english: 'en-IN',
  telugu:  'te-IN',
};

export async function POST(req: Request) {
  const { text, language = 'english' } = await req.json();

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'SARVAM_API_KEY not configured', fallback: true },
      { status: 200 }
    );
  }

  const langCode = LANG_CODE[language] ?? 'en-IN';
  const speaker  = SPEAKERS[langCode] ?? 'shubh';

  try {
    const requestBody = {
      inputs: [text],
      target_language_code: langCode,
      speaker,
      pace:                  language === 'telugu' ? 0.85 : 0.88,
      speech_sample_rate:    22050,
      enable_preprocessing:  true,
      model:                 'bulbul:v3',
    };

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type':          'application/json',
        'api-subscription-key':  apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Sarvam TTS error', response.status, err);
      return NextResponse.json({ error: 'TTS failed', fallback: true }, { status: 200 });
    }

    const data = await response.json();
    const audioBase64: string = data.audios?.[0] ?? '';

    if (!audioBase64) {
      return NextResponse.json({ error: 'Empty audio', fallback: true }, { status: 200 });
    }

    return NextResponse.json({ audioBase64 });
  } catch (error) {
    console.error('Sarvam TTS route error:', error);
    return NextResponse.json({ error: 'TTS unavailable', fallback: true }, { status: 200 });
  }
}
