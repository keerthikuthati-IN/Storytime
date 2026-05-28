export type MilestoneType =
  | 'first_word'
  | 'first_step'
  | 'first_laugh'
  | 'first_day_school'
  | 'bedtime_moment'
  | 'custom';

export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  first_word:       'First Word',
  first_step:       'First Steps',
  first_laugh:      'First Laugh',
  first_day_school: 'First School Day',
  bedtime_moment:   'Bedtime Moment',
  custom:           'Memory',
};

export const MILESTONE_EMOJIS: Record<MilestoneType, string> = {
  first_word:       '💬',
  first_step:       '👣',
  first_laugh:      '😂',
  first_day_school: '🏫',
  bedtime_moment:   '🌙',
  custom:           '⭐',
};

export const MEMORY_EMOJI_PRESETS = ['🌸','👣','💬','😂','🏫','🌙','⭐','🎂','🌿','💛','🎵','📸'];

export interface Memory {
  id: string;
  title: string;
  note?: string;
  milestoneType: MilestoneType;
  date: string;        // ISO date YYYY-MM-DD
  emoji: string;
  photoDataUrl?: string; // compressed base64 image
  createdAt: number;   // Date.now() — used for sort + eviction
}

const DB_NAME    = 'storytime_memories';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const MAX_COUNT  = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => {
      const sorted = (req.result as Memory[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(sorted);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addMemory(memory: Omit<Memory, 'id' | 'createdAt'>): Promise<Memory> {
  const db  = await openDB();
  const all = await getAllMemories();

  // Evict oldest entries if at limit
  if (all.length >= MAX_COUNT) {
    const oldest = all[all.length - 1];
    await deleteMemory(oldest.id);
  }

  const full: Memory = {
    ...memory,
    id:        crypto.randomUUID(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getMemory(id: string): Promise<Memory | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(id);
    req.onsuccess = () => resolve(req.result as Memory | undefined);
    req.onerror   = () => reject(req.error);
  });
}

export async function compressImage(file: File, maxSizeKB = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const MAX_DIM = 800;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        else                { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
