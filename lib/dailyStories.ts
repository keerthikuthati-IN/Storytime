import { generateStory } from './claude';
import { getAgeGroup, setCachedStory, type ChildProfile } from './storage';
import { getDefaultNarrator } from './narrators';
import { fetchIllustrationDataUrl } from './illustrationFetcher';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StoryTeaser {
  category: string;
  emoji: string;
  language: 'english' | 'telugu';
}

export interface DailyStory {
  id: string;
  story: import('./claude').GeneratedStory;
  title: string;
  category: string;
  mood: string;
  narratorId: string;
  language: 'english' | 'telugu';
}

export interface DailyStoriesData {
  date: string;                   // "YYYY-MM-DD"
  stories: DailyStory[];          // 3 stories for today
  tomorrowTeaser: StoryTeaser[];  // 3 category teasers for tomorrow
  generatedAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DAILY_KEY = 'storytime_daily';

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Animals':              '🐾',
  'Adventure':            '🗺️',
  'Magic':                '✨',
  'Bedtime':              '🌙',
  'Friendship':           '🤝',
  'Nature':               '🌿',
  'Vehicles':             '🚗',
  'Superheroes':          '🦸',
  'Fairy Tales':          '🏰',
  'Space':                '🚀',
  'Panchatantra':         '📖',
  'Tenali Rama':          '🪔',
  'Krishna Stories':      '🦚',
  'Jataka Tales':         '🐘',
  'Chandamama Folk Tale': '🌕',
};

const MOODS = ['magical', 'happy', 'calm', 'exciting'] as const;

// ── Date helpers ───────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Storage ────────────────────────────────────────────────────────────────

export function getTodayStories(): DailyStoriesData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DailyStoriesData;
    if (data.date !== todayDate()) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDailyStories(data: DailyStoriesData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(data));
  } catch { /* ignore storage errors */ }
}

export function getDailyStoryById(id: string): DailyStory | null {
  return getTodayStories()?.stories.find(s => s.id === id) ?? null;
}

/** Save a played daily story into storytime_liked_objects so it appears in the Saved tab. */
export function saveDailyStoryAsPlayed(story: DailyStory): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('storytime_liked_objects');
    const existing: object[] = raw ? JSON.parse(raw) : [];
    const alreadySaved = existing.some((s: object) => (s as { id: string }).id === story.id);
    if (alreadySaved) return;

    const obj = {
      id: story.id,
      title: story.title,
      category: story.category,
      mood: story.mood,
      language: story.language,
      teaser: '',
      ageRange: '2-6',
      duration: '~3 min',
      coverColor: '#F5F0FF',
    };
    localStorage.setItem('storytime_liked_objects', JSON.stringify([obj, ...existing]));
  } catch { /* ignore */ }
}

// ── Category / mood picking ────────────────────────────────────────────────

function pickDailySlots(profile: ChildProfile): { category: string; mood: string; language: 'english' | 'telugu' }[] {
  const cats = profile.favouriteCategories.length > 0
    ? profile.favouriteCategories
    : ['Animals', 'Magic', 'Adventure'];

  // Seed shuffle deterministically by today's date so the order is stable
  // within a day but different each day.
  const dateSeed = parseInt(todayDate().replace(/-/g, ''), 10);
  const shuffled = [...cats].sort((a, b) => {
    const ha = ((a.charCodeAt(0) * dateSeed) % 97);
    const hb = ((b.charCodeAt(0) * dateSeed) % 97);
    return ha - hb;
  });

  return [
    { category: shuffled[0] ?? 'Animals',    mood: MOODS[dateSeed % 4],           language: 'english' },
    { category: shuffled[1] ?? 'Adventure',  mood: MOODS[(dateSeed + 1) % 4],     language: 'english' },
    { category: shuffled[2] ?? shuffled[0] ?? 'Magic', mood: MOODS[(dateSeed + 2) % 4], language: 'telugu' },
  ];
}

function pickTomorrowTeaser(profile: ChildProfile, todayCategories: string[]): StoryTeaser[] {
  const cats = profile.favouriteCategories.length > 0
    ? profile.favouriteCategories
    : ['Animals', 'Magic', 'Adventure'];

  const unused = cats.filter(c => !todayCategories.includes(c));
  const pool = unused.length >= 3 ? unused : cats;

  // Different seed: tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowSeed = parseInt(tomorrow.toISOString().split('T')[0].replace(/-/g, ''), 10);

  const shuffled = [...pool].sort((a, b) => {
    const ha = ((a.charCodeAt(0) * tomorrowSeed) % 97);
    const hb = ((b.charCodeAt(0) * tomorrowSeed) % 97);
    return ha - hb;
  });

  return [
    { category: shuffled[0] ?? 'Animals',   emoji: CATEGORY_EMOJIS[shuffled[0]] ?? '📚', language: 'english' },
    { category: shuffled[1] ?? 'Magic',      emoji: CATEGORY_EMOJIS[shuffled[1]] ?? '📚', language: 'english' },
    { category: shuffled[2] ?? shuffled[0] ?? 'Adventure', emoji: CATEGORY_EMOJIS[shuffled[2]] ?? '📚', language: 'telugu' },
  ];
}

// ── Illustration kick-off ──────────────────────────────────────────────────

/** Fire all 12 scene illustrations + portrait for a story — fire-and-forget. */
export function kickOffIllustrations(story: DailyStory): void {
  const { id, story: generated } = story;
  // Portrait (paraIdx -1)
  fetchIllustrationDataUrl(id, -1, generated.title, 'magical', generated.title, 15_000).catch(() => null);
  // All 12 scenes
  generated.paragraphs.forEach((p, i) => {
    fetchIllustrationDataUrl(id, i, p.scene_description, p.mood, generated.title, 15_000).catch(() => null);
  });
}

// ── Daily generation ───────────────────────────────────────────────────────

/**
 * Generate today's 3 stories sequentially (avoids Claude rate limits).
 * Calls onStoryReady(story, index) as each one finishes so the UI can
 * show cards progressively rather than waiting for all 3.
 */
export async function generateDailyStories(
  profile: ChildProfile,
  onStoryReady?: (story: DailyStory, index: number) => void,
): Promise<DailyStoriesData> {
  const narrator = getDefaultNarrator(); // Nani
  const ageGroup = getAgeGroup(profile.age);
  const slots = pickDailySlots(profile);
  const date = todayDate();
  const stories: DailyStory[] = [];

  for (let i = 0; i < slots.length; i++) {
    const { category, mood, language } = slots[i];
    const storyId = `daily-${date}-${i}`;

    const generated = await generateStory(
      category,   // passed as title seed; generateTitle=true lets Claude pick the real title
      category,
      mood,
      profile.name,
      narrator.id,
      narrator.name,
      narrator.personality,
      ageGroup,
      profile.gender,
      profile.favouriteCategories,
      language,
      true,       // generateTitle — Claude invents the story title
    );

    const dailyStory: DailyStory = {
      id: storyId,
      story: generated,
      title: generated.title,
      category,
      mood,
      narratorId: narrator.id,
      language,
    };

    stories.push(dailyStory);

    // Persist to story cache so play page finds it via getCachedStory()
    setCachedStory(storyId, {
      story: generated,
      title: generated.title,
      category,
      mood,
      narratorId: narrator.id,
      language,
      cachedAt: Date.now(),
    });

    onStoryReady?.(dailyStory, i);

    // Kick off illustrations immediately after each story text is ready
    kickOffIllustrations(dailyStory);
  }

  const tomorrowTeaser = pickTomorrowTeaser(profile, slots.map(s => s.category));

  const data: DailyStoriesData = {
    date,
    stories,
    tomorrowTeaser,
    generatedAt: Date.now(),
  };

  saveDailyStories(data);
  return data;
}
