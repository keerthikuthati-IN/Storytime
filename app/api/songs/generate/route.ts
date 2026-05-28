import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export interface GeneratedVerse {
  text: string;
  romanization?: string;   // Telugu only
  english_meaning?: string; // Telugu only
  mood: 'calm' | 'happy' | 'sleepy';
}

export interface GeneratedLullaby {
  title: string;
  language: 'english' | 'telugu';
  mood: 'calm' | 'happy' | 'sleepy';
  intro: string;
  verses: GeneratedVerse[];
}

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { id, title, language, mood } = await req.json();

    const istelugu = language === 'telugu';

    const systemPrompt = istelugu
      ? `You are Nani — a warm, gentle Indian grandmother singing traditional Telugu lullabies to a toddler.
For Telugu songs, always include:
1. Telugu script (original text)
2. Roman transliteration (how to pronounce)
3. A gentle English meaning so parents can follow along.
Keep verses short — 4 lines each. Language should be soothing and repetitive, perfect for a child aged 0–3.
CRITICAL: Return ONLY valid JSON. No markdown, no preamble. Use straight ASCII double quotes only.`
      : `You are Nani — a warm, gentle grandmother singing classic English lullabies to a toddler.
Keep verses short — 4–6 lines. Use the traditional, well-known lyrics. Language must be soothing, slow, and repetitive.
Add a warm grandmotherly intro sentence before the song begins.
CRITICAL: Return ONLY valid JSON. No markdown, no preamble. Use straight ASCII double quotes only.`;

    const userPrompt = istelugu
      ? `Sing the Telugu lullaby "${title}" (id: ${id}).
Return JSON in this exact shape:
{
  "title": "${title}",
  "language": "telugu",
  "mood": "${mood}",
  "intro": "One warm sentence Nani says in English before starting the song...",
  "verses": [
    {
      "text": "Telugu script of the verse...",
      "romanization": "Roman transliteration of the verse...",
      "english_meaning": "Gentle English meaning of the verse...",
      "mood": "${mood}"
    }
  ]
}
Write 3–4 verses. End with the most soothing verse last.`
      : `Sing the English lullaby "${title}" (id: ${id}).
Return JSON in this exact shape:
{
  "title": "${title}",
  "language": "english",
  "mood": "${mood}",
  "intro": "One warm sentence Nani says before starting the song...",
  "verses": [
    {
      "text": "Verse lyrics here...",
      "mood": "${mood}"
    }
  ]
}
Write 3–4 verses using the traditional well-known lyrics. End with the most soothing verse last.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      .replace(/[""]/g, '"').replace(/['']/g, "'")
      .replace(/[–—]/g, '-');

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const lullaby: GeneratedLullaby = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return NextResponse.json({ lullaby });
  } catch (error) {
    console.error('Song generate error:', error);
    return NextResponse.json({ error: 'Failed to generate lullaby' }, { status: 500 });
  }
}
