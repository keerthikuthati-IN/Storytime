import { NextResponse } from 'next/server';

/**
 * Story illustration API
 *
 * Constructs a child-safe Pollinations.ai (FLUX) image URL from a story
 * paragraph's scene_description. The safety wrapper is hardcoded on the
 * server and cannot be bypassed by client-side content.
 *
 * Returns: { imageUrl: string } — client fetches directly from Pollinations,
 * converts to a data URL, and caches in IndexedDB.
 */

// Per-mood atmosphere hints added to every prompt
const MOOD_HINT: Record<string, string> = {
  calm:     'soft blue and lavender hues, moonlight glow, tranquil and peaceful',
  magical:  'golden sparkles, ethereal pastel glow, stars, sense of wonder',
  happy:    'warm sunny pastels, cheerful bright colours, joyful warmth',
  exciting: 'vibrant warm colours, gentle sense of movement, adventurous',
  tense:    'deep indigo shadows, soft candlelight, dramatic but gentle and soothing',
};

// Deterministic seed so the same scene always generates the same image
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 99999;
}

export async function POST(req: Request) {
  try {
    const { scene_description, mood = 'calm', title, story_title } = await req.json();

    if (!scene_description && !title) {
      return NextResponse.json({ error: 'scene_description or title required' }, { status: 400 });
    }

    const moodHint = MOOD_HINT[mood] ?? MOOD_HINT.calm;

    // ── Safety wrapper + style — non-negotiable, always prepended ──────────
    // Simple flat-cartoon style: renders faster on flux-schnell, stays clear
    // and uncluttered, and is highly engaging for children aged 0–6.
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
      // ── Portrait mode — iconic character for the intro screen ──────────
      // Generates the widely-recognised look of the story's protagonist
      // (Aladdin in blue vest + fez, Cinderella in blue gown, etc.)
      contentPrompt = [
        `cartoon character from the children's story "${title}"`,
        'classic recognizable appearance',
        'friendly happy expression',
        'full body centered in frame',
        'simple colorful storybook background',
      ].join(', ');
      seed = hashCode(title + '_portrait');
    } else {
      // ── Scene mode — story moment with character authenticity ───────────
      // Including story_title anchors the characters to their iconic look
      // (Aladdin in his blue vest, Cinderella in her gown, etc.)
      const storyContext = story_title
        ? `authentic characters from the story "${story_title}", ${scene_description}`
        : scene_description;
      contentPrompt = `${moodHint}, ${storyContext}`;
      seed = hashCode(scene_description);
    }

    const prompt = `${safePrefix}, ${contentPrompt}`;

    const imageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=512&height=768&seed=${seed}&nologo=true&enhance=false&model=flux-schnell`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Illustrate route error:', error);
    return NextResponse.json({ error: 'Failed to build illustration URL' }, { status: 500 });
  }
}
