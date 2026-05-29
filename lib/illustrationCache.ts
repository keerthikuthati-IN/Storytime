/**
 * Persistent illustration cache — IndexedDB
 *
 * Stores watercolour story-scene images as data URLs, keyed by story + paragraph.
 * Images are generated once on first play and replayed instantly forever.
 *
 * Key format: `storytime_img_{storyId}_{paraIndex}`
 */

const DB_NAME    = 'storytime_illustrations';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export function illustrationKey(storyId: string, paraIndex: number): string {
  return `storytime_img_${storyId}_${paraIndex}`;
}

export async function getIllustration(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      req.onsuccess = () =>
        resolve((req.result as { key: string; dataUrl: string } | undefined)?.dataUrl ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setIllustration(key: string, dataUrl: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* storage unavailable — silently skip */ }
}

export async function deleteIllustrationsForStory(
  storyId: string,
  totalParagraphs: number,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db   = await openDB();
    const keys = Array.from({ length: totalParagraphs }, (_, i) =>
      illustrationKey(storyId, i),
    );
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    keys.forEach(k => store.delete(k));
  } catch { /* ignore */ }
}
