import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { title, category, mood, childName, narratorName, narratorDescription, ageGroup = 'toddler', gender = 'neutral', interests = [] } = await req.json();

    const AGE_INSTRUCTIONS: Record<string, string> = {
      'newborn':       'Write only 3 very short paragraphs (2 soft sentences each). Use only simple sensory words — warm, soft, gentle, cozy, quiet. Focus entirely on warmth and magical peacefulness, no plot or conflict. Use gentle repetition ("soft and warm, warm and soft"). The mood must be purely loving and magical. End with the world going still and the baby drifting to sleep.',
      'toddler':       'Use very simple words (1-2 syllables where possible). Write 4-5 short paragraphs. Use gentle repetition and rhythm. Rich sensory details (soft, warm, cozy, sleepy). End with the child drifting peacefully to sleep.',
      'early-learner': 'Use richer vocabulary with vivid imagery. Write 6-8 paragraphs. Include a simple narrative arc: a gentle challenge and a comforting resolution. You may include 1-2 Telugu words naturally with context (e.g., "the chandamama smiled down"). End with wonder and warmth, not excitement.',
    };

    const genderHint = gender === 'girl' ? 'The child is a girl — use she/her pronouns if the child appears in the story.' : gender === 'boy' ? 'The child is a boy — use he/him pronouns if the child appears in the story.' : '';
    const interestsHint = interests.length > 0 ? `The child loves: ${interests.join(', ')}. Weave these naturally into the story where it fits.` : '';
    const ageInstruction = AGE_INSTRUCTIONS[ageGroup] ?? AGE_INSTRUCTIONS['toddler'];

    const userPrompt = `Tell the classic bedtime story "${title}" in the style of ${narratorName}, who is ${narratorDescription}.
The child's name is ${childName} — weave them in naturally as a small observer or friend of the main character if it fits.
The story category is ${category} and overall mood is ${mood}.
${genderHint}
${interestsHint}

${ageInstruction}

Stay true to the beloved original story that parents and children know and love. Use the classic characters, key plot moments, and satisfying ending. Each paragraph should feel like one scene read aloud softly by a loving Indian grandmother.

Return JSON in this exact shape:
{
  "title": "Story Title",
  "narrator_intro": "One warm, inviting sentence Nani says before the story begins — gentle, grandmother-like, loving and welcoming.",
  "paragraphs": [
    {
      "text": "3-4 short, simple sentences of story content. Rich sensory language. Easy words.",
      "scene_description": "A brief visual description of what is happening (used for illustration).",
      "mood": "happy|magical|calm|exciting|tense",
      "emotion": {
        "state": "idle|happy|wonder|excited|concerned|sleepy",
        "intensity": 0.7,
        "transitionMs": 400
      }
    }
  ]
}
End with a gentle, comforting conclusion that helps a child drift off to sleep. For the emotion field: use 'sleepy' for the last paragraph, 'happy' for joyful moments, 'wonder' for magical/surprising scenes, 'excited' for action, 'concerned' for tense moments (gentle concern, never frightened), 'idle' for calm narration.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: 'You are a master children\'s storyteller for Indian families. You know both Western fairy tales and Indian classics — Panchatantra, Tenali Rama, Jataka Tales, Krishna stories, Chandamama folk tales. Stories must feel warm and intimate, as if told by a loving Indian grandmother called Nani. Use simple vocabulary, short sentences, and rich sensory language. Preserve the cultural flavour of Indian stories (names, settings, values). For each paragraph emotion field, describe how Nani — a warm, nurturing Indian grandmother — feels while narrating. A scary moment makes her look gently concerned and protective, never frightened. CRITICAL: Return ONLY valid JSON. Use ONLY straight ASCII double quotes for JSON structure. Inside string values use only straight single quotes (apostrophes) never curly or smart quotes. No markdown, no preamble.',
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
