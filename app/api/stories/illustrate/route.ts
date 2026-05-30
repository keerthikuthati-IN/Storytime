import { NextResponse } from 'next/server';

/**
 * Story illustration API
 *
 * Generates a child-safe picture book illustration using HuggingFace Inference API
 * (FLUX.1-schnell). All generation happens server-side — the client receives a
 * base64 data URL directly, cached in IndexedDB for instant replays.
 *
 * Requires: HUGGINGFACE_API_KEY in .env.local
 * Get a free token at: huggingface.co → Settings → Access Tokens → New token (Read)
 */

const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Per-mood atmosphere hints added to every prompt
const MOOD_HINT: Record<string, string> = {
  calm:     'soft blue and lavender hues, moonlight glow, tranquil and peaceful',
  magical:  'golden sparkles, ethereal pastel glow, stars, sense of wonder',
  happy:    'warm sunny pastels, cheerful bright colours, joyful warmth',
  exciting: 'vibrant warm colours, gentle sense of movement, adventurous',
  tense:    'deep indigo shadows, soft candlelight, dramatic but gentle and soothing',
};

// Deterministic seed — same scene always generates the same image
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2_147_483_647; // HF accepts full 32-bit positive seeds
}

export async function POST(req: Request) {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) {
    return NextResponse.json(
      { error: 'HUGGINGFACE_API_KEY not configured. Add it to .env.local.' },
      { status: 503 },
    );
  }

  try {
    const { scene_description, mood = 'calm', title, story_title } = await req.json();

    if (!scene_description && !title) {
      return NextResponse.json({ error: 'scene_description or title required' }, { status: 400 });
    }

    const moodHint = MOOD_HINT[mood] ?? MOOD_HINT.calm;

    // ── Safety wrapper + style — non-negotiable, always prepended ──────────
    const safePrefix = [
      "simple children's picture book illustration",
      'flat cartoon style',
      'bold clean outlines',
      'bright cheerful colors',
      'simple clean background',
      'rounded friendly shapes and big expressive faces',
      'fun and engaging for young children',
      'safe for children aged 0 to 6',
      'no text no words',
      'no violence no blood no horror no scary elements',
      'no weapons no monsters no nightmares no frightening imagery',
    ].join(', ');

    let contentPrompt: string;
    let seed: number;

    if (title && !scene_description) {
      // ── Portrait mode — iconic character for the intro/cover screen ──────
      contentPrompt = [
        `cartoon character from the children's story "${title}"`,
        'classic recognizable appearance',
        'friendly happy expression',
        'full body centered in frame',
        'simple colorful storybook background',
      ].join(', ');
      seed = hashCode(title + '_portrait');
    } else {
      // ── Scene mode — story moment anchored to iconic character look ───────
      const storyContext = story_title
        ? `authentic characters from the story "${story_title}", ${scene_description}`
        : scene_description;
      contentPrompt = `${moodHint}, ${storyContext}`;
      seed = hashCode(scene_description);
    }

    const prompt = `${safePrefix}, ${contentPrompt}`;

    // HuggingFace Inference API — server-side fetch, no Turnstile, no queue limits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000); // extended for X-Wait-For-Model

    let hfRes: Response;
    try {
      hfRes = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': 'application/json',
          'X-Wait-For-Model': 'true', // queue request; HF waits for cold model internally (no 503)
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 4,  // schnell is optimised for 4 steps
            seed,
            width: 512,
            height: 768,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'Illustration fetch timed out' }, { status: 502 });
    }

    if (!hfRes.ok) {
      const body = await hfRes.text().catch(() => '');
      console.error('HuggingFace error:', hfRes.status, body.slice(0, 300));
      // 503 = model loading (cold start) — client should retry after a few seconds
      return NextResponse.json({ error: 'Illustration service unavailable' }, { status: hfRes.status === 503 ? 503 : 502 });
    }

    // HuggingFace returns raw image bytes directly (content-type: image/jpeg or image/png)
    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = hfRes.headers.get('content-type') ?? 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('Illustrate route error:', error);
    return NextResponse.json({ error: 'Failed to generate illustration' }, { status: 500 });
  }
}
