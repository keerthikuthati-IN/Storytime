import { illustrationKey, getIllustration, setIllustration } from './illustrationCache';

/**
 * Fetch one illustration data URL — shared helper used by both the play page
 * (pre-load cover during loading screen) and StoryPlayer (background load for scenes).
 *
 * Flow: IndexedDB cache → /api/stories/illustrate (Claude SVG) → IndexedDB persist
 * Returns null on any failure so callers can skip gracefully.
 */
export async function fetchIllustrationDataUrl(
  storyId: string,
  paraIdx: number,        // -1 = portrait/cover, 0+ = scene
  sceneDescOrTitle: string, // scene_description for scenes, story title for cover
  mood: string,
  storyTitle?: string,    // anchors scene context (story name)
  language?: string,      // 'telugu' triggers Indian cultural elements
  timeoutMs = 20_000,
): Promise<string | null> {
  const key = illustrationKey(storyId, paraIdx);

  // 1. IndexedDB hit — instant on replay
  const cached = await getIllustration(key);
  if (cached) return cached;

  // 2. Call the Claude SVG illustration API
  const isPortrait = paraIdx === -1;
  const body = isPortrait
    ? { title: sceneDescOrTitle, mood, language }
    : { scene_description: sceneDescOrTitle, mood, story_title: storyTitle, language };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch('/api/stories/illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      clearTimeout(timeoutId);
      return null;
    }

    if (!res.ok) return null;
    const { dataUrl } = await res.json() as { dataUrl?: string };
    if (!dataUrl) return null;

    setIllustration(key, dataUrl); // persist for instant replay
    return dataUrl;
  } catch {
    return null;
  }
}
