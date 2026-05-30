import { NextResponse } from 'next/server';

/**
 * Story illustration API — Google Imagen 3
 *
 * Generates rich children's storybook illustrations using Google Imagen 3.
 * All generation happens server-side; the client receives a base64 PNG data URL
 * cached in IndexedDB for instant replays.
 *
 * Requires: GOOGLE_AI_API_KEY in environment variables (Google AI Studio key).
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

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 });
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',   // portrait format matching story player layout
            safetySetting: 'block_few', // allow storybook content
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Imagen 3 error:', response.status, errText);
      return NextResponse.json({ error: 'Imagen 3 generation failed' }, { status: 500 });
    }

    const data = await response.json() as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };

    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      console.error('Imagen 3: no image in response', JSON.stringify(data));
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    const mimeType = prediction.mimeType ?? 'image/png';
    const dataUrl = `data:${mimeType};base64,${prediction.bytesBase64Encoded}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('Illustrate route error:', error);
    return NextResponse.json({ error: 'Failed to generate illustration' }, { status: 500 });
  }
}
