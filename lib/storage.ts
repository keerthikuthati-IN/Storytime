import type { GeneratedStory } from './claude';

export type AgeGroup = 'newborn' | 'toddler' | 'early-learner';

export function getAgeGroup(age: number): AgeGroup {
  if (age <= 1) return 'newborn';
  if (age <= 3) return 'toddler';
  return 'early-learner';
}

export interface ChildProfile {
  name: string;
  age: number;
  gender: 'girl' | 'boy' | 'neutral';
  favouriteCategories: string[];
}

export interface StorytimeData {
  childProfile: ChildProfile | null;
  likedStories: string[];
  dislikedStories: string[];
  playedStories: string[];
  preferredNarrator: string | null;
}

const STORAGE_KEY = 'storytime_data';

const defaultData: StorytimeData = {
  childProfile: null,
  likedStories: [],
  dislikedStories: [],
  playedStories: [],
  preferredNarrator: null,
};

export function getStorytimeData(): StorytimeData {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return { ...defaultData, ...JSON.parse(raw) };
  } catch {
    return defaultData;
  }
}

export function saveStorytimeData(data: Partial<StorytimeData>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStorytimeData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }));
  } catch {
    // ignore storage errors
  }
}

export function getProfile(): ChildProfile | null {
  return getStorytimeData().childProfile;
}

export function saveProfile(profile: ChildProfile): void {
  saveStorytimeData({ childProfile: profile });
}

export function likeStory(storyId: string): void {
  const data = getStorytimeData();
  if (!data.likedStories.includes(storyId)) {
    saveStorytimeData({ likedStories: [...data.likedStories, storyId] });
  }
}

export function dislikeStory(storyId: string): void {
  const data = getStorytimeData();
  if (!data.dislikedStories.includes(storyId)) {
    saveStorytimeData({ dislikedStories: [...data.dislikedStories, storyId] });
  }
}

export function markPlayed(storyId: string): void {
  const data = getStorytimeData();
  if (!data.playedStories.includes(storyId)) {
    saveStorytimeData({ playedStories: [...data.playedStories, storyId] });
  }
}

export function setPreferredNarrator(narratorId: string): void {
  saveStorytimeData({ preferredNarrator: narratorId });
}

export function getLikedStories(): string[] {
  return getStorytimeData().likedStories;
}

export function deleteSavedStory(storyId: string): void {
  // Remove from liked IDs list
  const data = getStorytimeData();
  saveStorytimeData({ likedStories: data.likedStories.filter(id => id !== storyId) });

  // Remove from liked objects list
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('storytime_liked_objects');
    if (!raw) return;
    const objects = JSON.parse(raw);
    localStorage.setItem('storytime_liked_objects', JSON.stringify(objects.filter((s: { id: string }) => s.id !== storyId)));
  } catch { /* ignore */ }

  // Also evict the cached story content and illustrations
  const cachedForDelete = getCachedStory(storyId);
  deleteCachedStory(storyId);
  if (typeof window !== 'undefined') {
    // Lazy import to avoid circular dependency — fire-and-forget
    import('./illustrationCache').then(({ deleteIllustrationsForStory }) => {
      deleteIllustrationsForStory(storyId, cachedForDelete?.story.paragraphs.length ?? 15);
    }).catch(() => { /* ignore */ });
  }
}

// ── Story content cache ────────────────────────────────────────────────────
// Generate once, store permanently. First play = API call + save.
// Every subsequent play = load from localStorage, zero API cost.

export interface CachedStory {
  story: GeneratedStory;
  title: string;
  category: string;
  mood: string;
  narratorId: string;
  language?: string;
  cachedAt: number; // Date.now()
}

const STORY_CACHE_PREFIX = 'storytime_story_';

export function getCachedStory(storyId: string): CachedStory | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORY_CACHE_PREFIX + storyId);
    return raw ? (JSON.parse(raw) as CachedStory) : null;
  } catch {
    return null;
  }
}

export function setCachedStory(storyId: string, cached: CachedStory): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORY_CACHE_PREFIX + storyId, JSON.stringify(cached));
  } catch {
    // Storage full or unavailable — silently skip; story still plays this session
  }
}

export function deleteCachedStory(storyId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORY_CACHE_PREFIX + storyId);
  } catch { /* ignore */ }
}

export function hasStoryCached(storyId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORY_CACHE_PREFIX + storyId) !== null;
}
