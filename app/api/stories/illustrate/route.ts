import { NextResponse } from 'next/server';

/**
 * Story illustration API — Pollinations.ai FLUX
 *
 * Generates children's storybook illustrations via Pollinations.ai (free, no API key).
 * All generation happens server-side; the client receives a base64 JPEG data URL
 * cached in IndexedDB for instant replays.
 */

const STYLE_ANCHOR =
  "children's storybook illustration, warm watercolor painting, soft expressive brushstrokes, " +
  "vibrant but gentle palette, simple bold characters, Pixar warmth, ages 2-6, no text, no letters, no words";

const MOOD_TONE: Record<string, string> = {
  calm:     'soft blues and lavenders, golden afternoon light, peaceful and serene atmosphere',
  magical:  'deep purples and midnight blues, warm glowing gold accents, sparkle and wonder',
  happy:    'warm golden yellows, peach tones, bright leaf greens, sunlit joyful energy',
  exciting: 'vibrant sunset oranges, bold warm reds, dynamic cheerful energy, bright highlights',
  tense:    'deep teal and indigo, candlelight amber warmth, hopeful light at the edges',
};

const INDIAN_HINT =
  'Indian storybook style — mango trees, courtyard homes, rangoli patterns, ' +
  'traditional clothing (saree/kurta), distant temple silhouettes, jasmine flowers, earthen diyas';

export async function POST(req: Request) {
  try {
    const { scene_description, mood = 'calm', title, story_title, language } = await req.json();

    if (!scene_description && !title) {
      return NextResponse.json({ error: 'scene_description or title required' }, { status: 400 });
    }

    const isPortrait = !scene_description && !!title;
    const palette = MOOD_TONE[mood] ?? MOOD_TONE.calm;
    const culturalHint = language === 'telugu' ? INDIAN_HINT : '';

    const subject = isPortrait
      ? `the iconic main character or a memorable scene from the children's story "${title}"`
      : `this story moment from "${story_title ?? 'a children\'s story'}": ${scene_description}`;

    const prompt = [
      STYLE_ANCHOR + '.',
      `Mood and palette: ${palette}.`,
      `Scene: ${subject}.`,
      culturalHint,
      'Characters have large expressive eyes, rounded faces, warm gentle expressions.',
      'One clear focal point. Clean uncluttered composition. Rich warm light.',
      'SAFETY: Wonder and kindness only. No violence, no darkness, no scary elements.',
    ].filter(Boolean).join(' ');

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1_000_000);
    const url =
      `https://image.pollinations.ai/prompt/${encodedPrompt}` +
      `?model=flux-schnell&width=512&height=768&nologo=true&seed=${seed}`;

    // Retry up to 4 times on 402 (queue full) with 20s back-off between attempts
    let response: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 20_000 * attempt));
      response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (response.status !== 402) break;
      console.warn(`Pollinations 402 (queue full) — retry ${attempt + 1}/3 in ${20 * (attempt + 1)}s`);
    }

    if (!response || !response.ok) {
      console.error('Pollinations error:', response?.status, await response?.text());
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) {
      console.error('Pollinations: empty response');
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('Illustrate route error:', error);
    return NextResponse.json({ error: 'Failed to generate illustration' }, { status: 500 });
  }
}
