/**
 * Persistent TTS audio cache — IndexedDB
 *
 * Stores base64 WAV audio keyed by `${storyId}__${paraIndex}`.
 * paraIndex = -1 → narrator_intro, 0+ → story paragraphs.
 *
 * Since stories are now permanent (generate-once), their audio is also
 * permanent: same text + same voice = same audio. We generate each
 * segment once, store it here, and replay forever with zero API lag.
 */

const DB_NAME    = 'storytime_tts';
const STORE_NAME = 'audio';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Canonical cache key for a story segment */
export function ttsCacheKey(storyId: string, paraIndex: number): string {
  return `${storyId}__${paraIndex}`;
}

/** Retrieve cached base64 audio, or null if not cached */
export async function getTTSAudio(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Persist base64 audio to IndexedDB */
export async function setTTSAudio(key: string, base64: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(base64, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch {
    // IndexedDB unavailable — silently skip; app still works without cache
  }
}

/** Delete all cached audio for a story (call when story is deleted) */
export async function deleteTTSForStory(storyId: string, totalSlides: number): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    const keys = [-1, ...Array.from({ length: totalSlides }, (_, i) => i)].map(
      idx => ttsCacheKey(storyId, idx)
    );
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    keys.forEach(k => store.delete(k));
  } catch { /* ignore */ }
}
