import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { age, gender, name, categories, likedStories, dislikedStories, ageGroup = 'toddler' } = await req.json();

    const AGE_GUIDANCE: Record<string, string> = {
      'toddler':       'Choose stories with very simple plots, warm characters, and gentle sensory details. Titles should feel cozy and comforting — nothing too complex or scary. Short stories (2–3 min) preferred.',
      'early-learner': 'Choose stories with richer narratives, clear cause-and-effect, and emotionally meaningful characters. Mix gentle adventure with wonder. Stories can be longer (3–5 min). Include some with subtle moral lessons.',
    };
    const ageGuidance = AGE_GUIDANCE[ageGroup] ?? AGE_GUIDANCE['toddler'];

    const userPrompt = `Recommend 10 well-known classic bedtime stories for a ${age}-year-old ${gender} child named ${name} who likes ${categories.join(', ')}.

Age group guidance: ${ageGuidance}

IMPORTANT LANGUAGE RULE: Return either 1 or 2 Telugu/Indian stories (choose randomly each time — vary it naturally) and the remaining stories as English/Western, for a total of 10. Mark Telugu stories with "language": "telugu" and English stories with "language": "english".

POPULARITY RULE: Always prioritise the most universally known and beloved titles first. Every child should encounter Cinderella before Rumpelstiltskin, and Baby Krishna before Vikram and Betaal. Lead with the stories every parent and child already knows.

Western classics to draw from (listed most-popular first):
Cinderella, The Three Little Pigs, Goldilocks and the Three Bears, Little Red Riding Hood, Snow White, Jack and the Beanstalk, Sleeping Beauty, The Ugly Duckling, The Tortoise and the Hare, Beauty and the Beast, Rapunzel, Pinocchio, The Little Mermaid, Peter Pan, The Jungle Book, Aladdin, Hansel and Gretel, The Lion and the Mouse, The Gingerbread Man, Thumbelina, Puss in Boots, Rumpelstiltskin, Winnie the Pooh and the Honey Tree, Curious George, The Velveteen Rabbit, Bambi, Dumbo, Ali Baba and the Forty Thieves, Sinbad the Sailor.

Indian & Telugu classics to draw from (listed most-popular first):
Krishna stories — Baby Krishna and the Butter, Krishna Lifts Govardhan Hill, Krishna and the Serpent Kaliya, Krishna and the Demon Putana, Ganesha and the Mango Race, The Story of Ganesha and the Moon;
Panchatantra — The Monkey and the Crocodile, The Blue Jackal, The Crow and the Pitcher, The Rabbit and the Lion, The Greedy Dog, The Foolish Donkey, The Wise Old Crane, Two Cats and a Monkey;
Tenali Rama — Tenali Rama and the Cats, Tenali Rama and the Thieves, Tenali Rama and the King's Dream, Tenali Rama and the Jinx, The Brinjal Garden;
Jataka Tales — The Wise Monkey King, The Banyan Deer, The Golden Goose, The Elephant and the Dog;
Other Indian classics — Akbar and Birbal (Birbal's Khichdi, The Wise Answer), Vikram and Betaal, Chandamama folk tales (The Moon Uncle, The Magic Drum, The Wishing Tree), Raja Harishchandra.

Previously liked stories: ${likedStories.length ? likedStories.join(', ') : 'none yet'}
Previously disliked stories: ${dislikedStories.length ? dislikedStories.join(', ') : 'none yet'}

Return a JSON array of 10 objects with this shape:
{
  "id": "unique_slug",
  "title": "Story Title",
  "category": "Animals",
  "teaser": "One sentence that makes a child excited about this story.",
  "ageRange": "2-4",
  "duration": "3 min",
  "mood": "happy|magical|calm|exciting|tense",
  "coverColor": "a warm hex color for the card background",
  "language": "english|telugu"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a children\'s story curator for kids aged 0–5 from Indian families. Return ONLY valid JSON array, no markdown, no preamble, no explanation.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    const cleaned = text
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/[​-‍﻿]/g, '');

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    const stories = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Recommend error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
