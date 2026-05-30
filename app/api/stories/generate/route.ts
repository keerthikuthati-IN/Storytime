import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { title, category, mood, childName, narratorName, narratorDescription, ageGroup = 'toddler', gender = 'neutral', interests = [], language = 'english', generateTitle = false } = await req.json();
    const isTelugu = language === 'telugu';

    // Vocabulary guidance per age — paragraph count is always 12 (picture book format)
    const AGE_VOCABULARY: Record<string, string> = {
      'newborn':       'Use only simple sensory words — warm, soft, gentle, cozy, quiet. One very soft sentence per scene, maximum. No plot or conflict. Pure warmth and magic.',
      'toddler':       'Use very simple words (1-2 syllables where possible). Gentle rhythm and repetition. Rich sensory details — soft, warm, cozy, sleepy.',
      'early-learner': 'Use vivid vocabulary with interesting imagery. Simple but expressive language. A gentle narrative arc across the 10 scenes.',
    };

    const genderHint = gender === 'girl' ? 'The child is a girl — use she/her pronouns if the child appears in the story.' : gender === 'boy' ? 'The child is a boy — use he/him pronouns if the child appears in the story.' : '';
    const interestsHint = interests.length > 0 ? `The child loves: ${interests.join(', ')}. Weave these naturally into the story where it fits.` : '';
    const ageVocabulary = AGE_VOCABULARY[ageGroup] ?? AGE_VOCABULARY['toddler'];

    const languageInstruction = isTelugu
      ? `LANGUAGE: Write the entire story in Telugu script (తెలుగు). The title, narrator_intro, and all paragraph "text" fields must be in Telugu. Keep "scene_description" in English (it is used for illustration generation only).`
      : `LANGUAGE: Write in English.`;

    const storyPromptOpener = generateTitle
      ? `Create an original ${category} bedtime story in the style of ${narratorName}, who is ${narratorDescription}. Choose a beautiful, culturally-rich title that Indian families will love. The story mood is ${mood}.`
      : `Tell the classic bedtime story "${title}" in the style of ${narratorName}, who is ${narratorDescription}. The story category is ${category} and overall mood is ${mood}.`;

    const userPrompt = `${storyPromptOpener}
The child's name is ${childName} — weave them in naturally as a small observer or friend of the main character if it fits.
${genderHint}
${interestsHint}

${languageInstruction}

PICTURE BOOK FORMAT — THIS IS CRITICAL:
Write exactly 10 scenes. Each scene is 2–3 concise sentences — no filler, no padding, every word earns its place. One vivid moment per scene, like a picture book page read aloud by Nani while the child looks at the illustration. Short words, strong images, natural rhythm when spoken aloud. ${ageVocabulary}
Build a gentle arc: wonder → warmth → calm → sleepy. End the final scene with the world going soft and still, guiding the child toward sleep.

${generateTitle ? 'Create a fresh, original story with memorable characters.' : 'Stay true to the beloved original story. Use classic characters, key plot moments, and the satisfying ending parents and children know.'}

Also return scene_emojis with emojis a child aged 0-6 immediately recognises as belonging to THIS specific story title — not generic category emojis.

Return JSON in this exact shape:
{
  "title": "Story Title",
  "narrator_intro": "One warm, inviting sentence Nani says before the story begins — gentle, grandmother-like, may use 'kanna' or 'bangaram' naturally, loving and welcoming.",
  "language": "${language}",
  "scene_emojis": {
    "hero": "one emoji for the main character of THIS story (e.g. 🦚 for Krishna, 👸 for Cinderella, 🐷 for Three Little Pigs)",
    "world": ["setting emoji 1", "setting emoji 2", "setting emoji 3"],
    "accent": ["key object emoji", "key action emoji", "mood/feeling emoji"]
  },
  "paragraphs": [
    {
      "text": "2-3 tight sentences. No filler. Vivid, warm, rhythmic when read aloud.",
      "scene_description": "A brief visual description in English of what is happening in this scene (used for illustration).",
      "mood": "happy|magical|calm|exciting|tense",
      "emotion": {
        "state": "idle|happy|wonder|excited|concerned|sleepy",
        "intensity": 0.7,
        "transitionMs": 400
      }
    }
  ]
}
IMPORTANT: The paragraphs array must contain EXACTLY 10 items — no more, no less.
For the emotion field: use 'sleepy' for the last scene, 'happy' for joyful moments, 'wonder' for magical/surprising scenes, 'excited' for action, 'concerned' for tense moments (gentle concern, never frightened), 'idle' for calm narration.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5500,
      system: `You are a master children's storyteller for Indian families. You know both Western fairy tales and Indian classics — Panchatantra, Tenali Rama, Jataka Tales, Krishna stories, folk tales. Stories must feel warm and intimate, as if told by a loving Indian grandmother called Nani. Use simple vocabulary, short sentences, and rich sensory language. ${isTelugu ? 'Nani naturally uses warm South Indian endearments like "kanna" and "bangaram" — use them sparingly (once or twice per story) at emotionally warm moments, never in every sentence.' : 'Nani uses gentle English endearments like "little one", "sweetheart", or "dearest" — use them sparingly (once or twice per story) at emotionally warm moments, never in every sentence. Do NOT use Telugu or South Indian words like kanna or bangaram in English stories.'} For each paragraph emotion field, describe how Nani — a warm, nurturing Indian grandmother — feels while narrating. A scary moment makes her look gently concerned and protective, never frightened. ${isTelugu ? 'You are fluent in Telugu. When asked to write in Telugu, write beautiful, simple Telugu in Telugu script suitable for young children. Keep sentences short and warm.' : ''} Write like a master editor who has cut every unnecessary word. Tight, vivid, rhythmic prose — the kind of sentences a grandmother chooses carefully to make a child lean in and listen. Soothing and calming, with gentle dramatic beats of wonder and warmth that guide the child toward sleep. CRITICAL: Return ONLY valid JSON. Use ONLY straight ASCII double quotes for JSON structure. Inside string values use only straight single quotes (apostrophes) never curly or smart quotes. No markdown, no preamble.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip markdown fences, then sanitize characters that break JSON.parse
    const cleaned = text
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      // Replace smart/curly quotes with straight quotes
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      // Replace em/en dashes with hyphens
      .replace(/[–—]/g, '-')
      // Remove zero-width and other invisible chars
      .replace(/[​-‍﻿]/g, '');

    // Extract the outermost JSON object as a safety net
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const story = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 });
  }
}
