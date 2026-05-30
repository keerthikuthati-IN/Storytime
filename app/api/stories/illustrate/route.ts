import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Story illustration API
 *
 * Generates child-safe picture book SVG illustrations using Claude haiku.
 * All generation happens server-side — the client receives a base64 SVG data URL
 * directly, cached in IndexedDB for instant replays.
 *
 * Uses ANTHROPIC_API_KEY (already required for story generation — no extra setup).
 */

const anthropic = new Anthropic();

const MOOD_PALETTE: Record<string, string> = {
  calm:     'soft blues, lavenders, gentle greens, peaceful moonlight tones',
  magical:  'purples, golds, pinks, sparkle accents, dreamy pastels',
  happy:    'warm yellows, bright oranges, cheerful greens, sunny warmth',
  exciting: 'vibrant reds, oranges, bold yellows, dynamic energy',
  tense:    'deep teals, indigos, soft candlelight, dramatic but gentle shadows',
};

export async function POST(req: Request) {
  try {
    const { scene_description, mood = 'calm', title, story_title } = await req.json();

    if (!scene_description && !title) {
      return NextResponse.json({ error: 'scene_description or title required' }, { status: 400 });
    }

    const isPortrait = !scene_description && !!title;
    const palette = MOOD_PALETTE[mood] ?? MOOD_PALETTE.calm;

    const subject = isPortrait
      ? `the iconic main character or a memorable scene from the children's story "${title}"`
      : `this story moment from "${story_title ?? 'a children\'s story'}": ${scene_description}`;

    const prompt = `Create a simple SVG illustration for a children's picture book (ages 0–6).

Subject: ${subject}
Colour palette: ${palette}

Requirements:
- viewBox="0 0 512 768" portrait orientation, xmlns="http://www.w3.org/2000/svg"
- Flat cartoon style with bold rounded outlines (stroke-width 3–5)
- Bright, cheerful, child-safe colours — warm and inviting
- Simple background (sky, ground, one or two elements)
- Main character or object large, centered, friendly expression
- Rounded shapes, big eyes, no sharp or scary imagery
- No text, letters, or words inside the SVG
- Keep element count under 35 for fast rendering

Return ONLY valid SVG markup starting with <svg and ending with </svg>. No explanation, no markdown fences.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const match = raw.match(/<svg[\s\S]*<\/svg>/i);
    if (!match) {
      console.error('Claude SVG: no SVG found in response');
      return NextResponse.json({ error: 'No SVG generated' }, { status: 500 });
    }

    const base64 = Buffer.from(match[0]).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('Illustrate route error:', error);
    return NextResponse.json({ error: 'Failed to generate illustration' }, { status: 500 });
  }
}
