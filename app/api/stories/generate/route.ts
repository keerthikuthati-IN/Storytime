import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { title, category, mood, childName, narratorName, narratorDescription } = await req.json();

    const userPrompt = `Tell the classic bedtime story "${title}" in the style of ${narratorName}, who is ${narratorDescription}.
The child's name is ${childName} — weave them in naturally as a small observer or friend of the main character if it fits.
The story category is ${category} and overall mood is ${mood}.

Stay true to the beloved original story that parents and children know and love. Use the classic characters, key plot moments, and satisfying ending. Adapt the language to be simple and warm for ages 0–5 — short sentences, vivid sensory details, gentle rhythm. Each paragraph should feel like one scene read aloud by a grandparent.

Return JSON in this exact shape:
{
  "title": "Story Title",
  "narrator_intro": "One warm, inviting sentence the narrator says before the story begins, in their unique voice.",
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
Write 7 paragraphs. End with a gentle, comforting conclusion that helps a child drift off to sleep. For the emotion field: use 'sleepy' for the last paragraph, 'happy' for joyful moments, 'wonder' for magical/surprising scenes, 'excited' for action, 'concerned' for tense moments (gentle concern, never frightened), 'idle' for calm narration.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: 'You are a master children\'s storyteller for ages 0-5 from Indian families. You know both Western fairy tales and Indian classics - Panchatantra, Tenali Rama, Jataka Tales, Krishna stories, Chandamama folk tales. Stories must use simple vocabulary, short sentences, and rich sensory language. Preserve the cultural flavour of Indian stories (names, settings, values). For each paragraph emotion field, describe how Nana Luna - a warm magical grandmother bear - feels while narrating. A scary moment makes her look gently concerned and protective, never frightened. CRITICAL: Return ONLY valid JSON. Use ONLY straight ASCII double quotes for JSON structure. Inside string values use only straight single quotes (apostrophes) never curly or smart quotes. No markdown, no preamble.',
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
