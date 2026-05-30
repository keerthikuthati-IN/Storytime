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

// ── Popular story lists (ranked most-to-least universally known) ──────────

const POPULAR_STORIES: Record<'english' | 'telugu', { title: string; category: string }[]> = {
  english: [
    { title: 'Cinderella',                       category: 'Fairy Tales' },
    { title: 'The Three Little Pigs',             category: 'Animals' },
    { title: 'Goldilocks and the Three Bears',    category: 'Adventure' },
    { title: 'Little Red Riding Hood',            category: 'Adventure' },
    { title: 'Snow White',                        category: 'Fairy Tales' },
    { title: 'Jack and the Beanstalk',            category: 'Magic' },
    { title: 'Sleeping Beauty',                   category: 'Fairy Tales' },
    { title: 'The Ugly Duckling',                 category: 'Animals' },
    { title: 'The Tortoise and the Hare',         category: 'Animals' },
    { title: 'Beauty and the Beast',              category: 'Fairy Tales' },
    { title: 'Rapunzel',                          category: 'Fairy Tales' },
    { title: 'Pinocchio',                         category: 'Magic' },
    { title: 'The Little Mermaid',                category: 'Magic' },
    { title: 'Peter Pan',                         category: 'Adventure' },
    { title: 'The Jungle Book',                   category: 'Animals' },
    { title: 'Aladdin',                           category: 'Magic' },
    { title: 'Hansel and Gretel',                 category: 'Adventure' },
    { title: 'The Lion and the Mouse',            category: 'Animals' },
    { title: 'The Gingerbread Man',               category: 'Adventure' },
    { title: 'Thumbelina',                        category: 'Magic' },
  ],
  telugu: [
    { title: 'Baby Krishna and the Butter',       category: 'Krishna Stories' },
    { title: 'The Monkey and the Crocodile',      category: 'Panchatantra' },
    { title: 'Tenali Rama and the Cats',          category: 'Tenali Rama' },
    { title: 'The Blue Jackal',                   category: 'Panchatantra' },
    { title: 'Krishna Lifts Govardhan Hill',      category: 'Krishna Stories' },
    { title: 'The Wise Monkey King',              category: 'Jataka Tales' },
    { title: "Birbal's Khichdi",                  category: 'Tenali Rama' },
    { title: 'The Golden Goose',                  category: 'Jataka Tales' },
    { title: 'Ganesha and the Mango Race',        category: 'Krishna Stories' },
    { title: 'The Crow and the Pitcher',          category: 'Panchatantra' },
    { title: 'Tenali Rama and the Thieves',       category: 'Tenali Rama' },
    { title: 'The Rabbit and the Lion',           category: 'Panchatantra' },
    { title: 'Krishna and the Serpent Kaliya',    category: 'Krishna Stories' },
    { title: 'The Banyan Deer',                   category: 'Jataka Tales' },
    { title: 'The Story of Ganesha and the Moon', category: 'Krishna Stories' },
  ],
};

// ── Category / mood picking ────────────────────────────────────────────────

interface DailySlot {
  title: string;
  category: string;
  mood: string;
  language: 'english' | 'telugu';
}

function pickDailySlots(profile: ChildProfile): DailySlot[] {
  const dateSeed = parseInt(todayDate().replace(/-/g, ''), 10);
  const ageGroup = getAgeGroup(profile.age);
  const favCats  = profile.favouriteCategories ?? [];

  // English pool — filter to favorite categories; fall back to full list if too few matches
  const enFavs = POPULAR_STORIES.english.filter(s => favCats.includes(s.category));
  const en     = enFavs.length >= 2 ? enFavs : POPULAR_STORIES.english;

  // Telugu pool — filter to Indian-culture favorites (Panchatantra, Krishna, Tenali, etc.)
  const teFavs = POPULAR_STORIES.telugu.filter(s => favCats.includes(s.category));
  const te     = teFavs.length >= 1 ? teFavs : POPULAR_STORIES.telugu;

  // Age-appropriate moods — calm only for newborns, expanding with age
  const moodsByAge: Record<string, string[]> = {
    newborn:         ['calm'],
    toddler:         ['calm', 'happy', 'magical'],
    'early-learner': ['calm', 'happy', 'magical', 'exciting'],
  };
  const moods = moodsByAge[ageGroup] ?? [...MOODS];

  // Include child's name in seed so siblings on the same device get different picks
  const seed = dateSeed + (profile.name.charCodeAt(0) || 0);

  const eIdx  = seed % en.length;
  const eIdx2 = (seed + 3) % en.length; // +3 avoids collision even in small filtered pools
  const tIdx  = seed % te.length;

  return [
    { ...en[eIdx],  mood: moods[seed % moods.length],           language: 'english' },
    { ...en[eIdx2], mood: moods[(seed + 1) % moods.length],     language: 'english' },
    { ...te[tIdx],  mood: moods[(seed + 2) % moods.length],     language: 'telugu'  },
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

/** Fire all 15 scene illustrations + portrait for a story — fire-and-forget.
 *  Priority: cover + paras 0-2 fire immediately (needed soonest).
 *  Remaining paragraphs staggered 2s apart so HuggingFace isn't slammed.
 *  Results are cached in IndexedDB so replay is instant. */
export function kickOffIllustrations(story: DailyStory): void {
  const { id, story: generated } = story;
  // Portrait + first 3 paragraphs — fire immediately (highest priority)
  fetchIllustrationDataUrl(id, -1, generated.title, 'magical', generated.title, 90_000).catch(() => null);
  [0, 1, 2].forEach(i => {
    const p = generated.paragraphs[i];
    if (p) fetchIllustrationDataUrl(id, i, p.scene_description, p.mood, generated.title, 90_000).catch(() => null);
  });
  // Remaining paragraphs — staggered 2s apart (lower urgency, background)
  generated.paragraphs.slice(3).forEach((p, i) => {
    setTimeout(() => {
      fetchIllustrationDataUrl(id, i + 3, p.scene_description, p.mood, generated.title, 90_000).catch(() => null);
    }, (i + 1) * 2000);
  });
}

// ── Daily generation ───────────────────────────────────────────────────────

/**
 * Generate today's 3 stories in parallel (300ms stagger to reduce API burst).
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
  const stories: DailyStory[] = new Array(slots.length);

  await Promise.all(slots.map(async (slot, i) => {
    // Small stagger so all 3 don't hit Claude simultaneously
    if (i > 0) await new Promise<void>(r => setTimeout(r, i * 300));

    const { title, category, mood, language } = slot;
    const storyId = `daily-${date}-${i}`;

    const generated = await generateStory(
      title,      // well-known popular title — tells the classic story faithfully
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
      false,      // generateTitle=false — use the provided popular title
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

    stories[i] = dailyStory;

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
  }));

  const tomorrowTeaser = pickTomorrowTeaser(profile, slots.map((s: DailySlot) => s.category));

  const data: DailyStoriesData = {
    date,
    stories,
    tomorrowTeaser,
    generatedAt: Date.now(),
  };

  saveDailyStories(data);
  return data;
}
