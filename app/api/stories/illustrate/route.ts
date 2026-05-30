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
  calm:     'soft periwinkle blues and lavenders, gentle sage greens, silvery moonlight, warm cream highlights — peaceful and dreamy',
  magical:  'deep purples and midnight blues lit by warm gold and pink, sparkle accents, shimmering pastels, ethereal glow',
  happy:    'warm golden yellows, peach oranges, bright leaf greens, sunlit warmth — joyful and energetic',
  exciting: 'vibrant sunset oranges, bold scarlet accents, bright golden highlights, dynamic but safe energy',
  tense:    'deep teal and indigo with warm candlelight amber, dramatic shadows, hopeful light at the edges',
};

export async function POST(req: Request) {
  try {
    const { scene_description, mood = 'calm', title, story_title, language } = await req.json();

    if (!scene_description && !title) {
      return NextResponse.json({ error: 'scene_description or title required' }, { status: 400 });
    }

    const isPortrait = !scene_description && !!title;
    const palette = MOOD_PALETTE[mood] ?? MOOD_PALETTE.calm;

    const subject = isPortrait
      ? `the iconic main character or a memorable scene from the children's story "${title}"`
      : `this story moment from "${story_title ?? 'a children\'s story'}": ${scene_description}`;

    const culturalHint = language === 'telugu'
      ? '\nCULTURAL CONTEXT: This is an Indian Telugu story. Naturally weave in one or two Indian elements where they fit — mango trees, courtyard homes, rangoli patterns, traditional clothing (saree/kurta), a distant temple silhouette, jasmine flowers, earthen diyas, or local nature. Keep it authentic, not forced.\n'
      : '';

    const prompt = `You are illustrating a premium children's picture book page for ages 0–8.

Scene: ${subject}
Mood & Palette: ${palette}
${culturalHint}
STYLE
- Premium picture-book quality — warm, cozy, magical, emotionally safe
- Soft painterly feel: use <defs> with linearGradient, radialGradient, and feGaussianBlur filters to simulate watercolor warmth and soft glowing light
- Gentle golden lighting — add a warm radialGradient glow behind the main subject
- Whimsical details: sparkles (tiny 4-point star polygons), fireflies (small glowing circles with radialGradient), floating petals, soft bokeh circles in the sky
- Rounded, organic shapes throughout — no sharp angles on characters or foreground objects

CHARACTERS (if present)
- Large expressive eyes: big bright irises, white highlight dot, filled with warmth
- Rounded faces, gentle smiles, friendly approachable posture
- Emotion matches the scene mood
- Children: curious, joyful, adventurous
- Grandmothers: warm, nurturing, wise, comforting
- Animals: charming, friendly, non-threatening

COMPOSITION
- One clear focal point — main subject large, centered or at rule-of-thirds
- Clean, uncluttered: sky/background → mid-ground subject → soft foreground frame
- Portrait format: viewBox="0 0 512 768" — use the full vertical space richly
- Keep upper 15% (y < 115) and lower 20% (y > 614) relatively free of dense detail (text overlay area)

TECHNICAL
- xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768"
- Use <defs> for all gradients and blur filters
- 60–100 elements for richness — prioritise quality over minimalism
- NO text, letters, words, or numbers inside the SVG
- Colors: warm, bright, child-safe — no dark/gloomy/cold dominance

SAFETY: No violence, weapons, injuries, horror, or frightening imagery. Wonder, kindness, and optimism only.

Return ONLY valid SVG markup starting with <svg and ending with </svg>. No explanation, no markdown fences.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
