import { illustrationKey, getIllustration, setIllustration } from './illustrationCache';

/**
 * Fetch one illustration data URL — shared helper used by all callers.
 *
 * Flow: IndexedDB cache → in-flight dedup → global queue → /api/stories/illustrate → IndexedDB persist
 *
 * Two module-level primitives prevent rate-limit errors:
 *  1. _pending: deduplication map — if the same key is already in-flight, all callers
 *     share the same Promise (zero duplicate API calls).
 *  2. enqueueRequest: global concurrency queue (MAX = 1) — at most 1 Sonnet call
 *     in-flight globally at any time, regardless of how many callers exist.
 */

// ── Global queue: max 1 Sonnet illustration call in-flight at a time ─────────
let _queueRunning = 0;
const _queue: Array<() => void> = [];

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      _queueRunning++;
      fn().then(resolve, reject).finally(() => {
        _queueRunning--;
        if (_queue.length > 0) _queue.shift()!();
      });
    };
    if (_queueRunning < 1) run();
    else _queue.push(run);
  });
}

// ── In-flight deduplication: all callers share the same Promise per cache key ─
const _pending = new Map<string, Promise<string | null>>();

export async function fetchIllustrationDataUrl(
  storyId: string,
  paraIdx: number,           // -1 = portrait/cover, 0+ = scene
  sceneDescOrTitle: string,  // scene_description for scenes, story title for cover
  mood: string,
  storyTitle?: string,       // anchors scene context (story name)
  language?: string,         // 'telugu' triggers Indian cultural elements
  timeoutMs = 20_000,
): Promise<string | null> {
  const key = illustrationKey(storyId, paraIdx);

  // 1. IndexedDB hit — instant on replay
  const cached = await getIllustration(key);
  if (cached) return cached;

  // 2. In-flight dedup — return existing promise if this key is already being fetched
  if (_pending.has(key)) return _pending.get(key)!;

  // 3. New request — enqueue globally (max 1 Sonnet call in-flight at a time)
  const isPortrait = paraIdx === -1;
  const body = isPortrait
    ? { title: sceneDescOrTitle, mood, language }
    : { scene_description: sceneDescOrTitle, mood, story_title: storyTitle, language };

  const promise = enqueueRequest(async () => {
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
  }).finally(() => _pending.delete(key));

  _pending.set(key, promise);
  return promise;
}
