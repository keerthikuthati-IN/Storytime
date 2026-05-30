import { illustrationKey, getIllustration, setIllustration } from './illustrationCache';

/**
 * Illustration fetching with global queue and in-flight deduplication.
 *
 * Two module-level primitives prevent rate-limit errors:
 *  1. _pending: dedup map — if the same key is already in-flight, all callers share the same Promise.
 *  2. enqueueRequest: global concurrency queue (MAX = 2) — at most 2 Imagen 3 calls in-flight globally.
 */

// ── Global queue: max 2 Imagen 3 calls in-flight at a time ──────────────────
const MAX_CONCURRENT = 1; // Pollinations allows 1 concurrent request per IP
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
    if (_queueRunning < MAX_CONCURRENT) run();
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
  timeoutMs = 30_000,
): Promise<string | null> {
  const key = illustrationKey(storyId, paraIdx);

  // 1. IndexedDB hit — instant on replay
  const cached = await getIllustration(key);
  if (cached) return cached;

  // 2. In-flight dedup — return existing promise if this key is already being fetched
  if (_pending.has(key)) return _pending.get(key)!;

  // 3. New request — enqueue globally (max 2 Imagen 3 calls in-flight at a time)
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

/**
 * Pre-generate all illustrations for a story in background.
 * Fires requests for cover (-1) and all 10 scenes (0-9) using the global queue (max 2 concurrent).
 * Calls onProgress as each completes so StoryPlayer can update state progressively.
 * Uses IndexedDB cache — instant for replays, zero extra API calls.
 */
export async function preGenerateAllIllustrations(
  story: {
    title: string;
    paragraphs: Array<{ scene_description: string; mood: string }>;
  },
  storyId: string,
  language: string | undefined,
  onProgress: (paraIdx: number, dataUrl: string) => void,
): Promise<void> {
  const requests: Array<{ paraIdx: number; sceneDesc: string; mood: string }> = [
    // Cover portrait first — shows during intro phase
    { paraIdx: -1, sceneDesc: story.title, mood: 'magical' },
    // All 10 scene illustrations
    ...story.paragraphs.map((p, i) => ({
      paraIdx: i,
      sceneDesc: p.scene_description,
      mood: p.mood,
    })),
  ];

  await Promise.all(
    requests.map(async ({ paraIdx, sceneDesc, mood }) => {
      const dataUrl = await fetchIllustrationDataUrl(
        storyId,
        paraIdx,
        sceneDesc,
        mood,
        story.title,
        language,
        30_000,
      );
      if (dataUrl) onProgress(paraIdx, dataUrl);
    })
  );
}
