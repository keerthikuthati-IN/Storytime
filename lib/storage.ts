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
}
