export interface StoryRecommendation {
  id: string;
  title: string;
  category: string;
  teaser: string;
  ageRange: string;
  duration: string;
  mood: 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';
  coverColor: string;
}

export interface NarratorEmotion {
  state: 'idle' | 'happy' | 'wonder' | 'excited' | 'concerned' | 'sleepy';
  intensity: number;      // 0.0–1.0
  transitionMs: number;   // 300–800
}

export interface StoryParagraph {
  text: string;
  scene_description: string;
  mood: 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';
  emotion?: NarratorEmotion;
}

export interface GeneratedStory {
  title: string;
  narrator_intro: string;
  paragraphs: StoryParagraph[];
}

export async function fetchStoryRecommendations(
  age: number,
  gender: string,
  name: string,
  categories: string[],
  likedStories: string[],
  dislikedStories: string[],
  ageGroup?: string
): Promise<StoryRecommendation[]> {
  const res = await fetch('/api/stories/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ age, gender, name, categories, likedStories, dislikedStories, ageGroup }),
  });
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  const data = await res.json();
  return data.stories;
}

export async function generateStory(
  title: string,
  category: string,
  mood: string,
  childName: string,
  narratorId: string,
  narratorName: string,
  narratorDescription: string,
  ageGroup?: string
): Promise<GeneratedStory> {
  const res = await fetch('/api/stories/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, mood, childName, narratorId, narratorName, narratorDescription, ageGroup }),
  });
  if (!res.ok) throw new Error('Failed to generate story');
  const data = await res.json();
  return data.story;
}
