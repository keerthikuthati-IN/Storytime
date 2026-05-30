'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import NaniAvatar from './NaniAvatar';
import type { GeneratedStory, StoryParagraph } from '@/lib/claude';
import { generateStory } from '@/lib/claude';
import type { Narrator } from '@/lib/narrators';
import { getNarratorById, getDefaultNarrator } from '@/lib/narrators';
import { getAudioForMood, MUSIC_VOLUME, type StoryMood } from '@/lib/audioMap';
import { markPlayed, setCachedStory, getProfile, getAgeGroup } from '@/lib/storage';
import { getTTSAudio, setTTSAudio, ttsCacheKey } from '@/lib/ttsCache';
import { illustrationKey, getIllustration, setIllustration, deleteIllustrationsForStory } from '@/lib/illustrationCache';
import { useTTS } from '@/lib/useTTS';

const MUSIC_DUCK = 0.012; // nearly inaudible while TTS is speaking (~6% of normal)

interface StoryPlayerProps {
  story: GeneratedStory;
  narrator: Narrator;
  storyId: string;
  fromCache: boolean;
  storyMeta: { title: string; category: string; mood: string; narratorId: string; language?: string };
  initialIllustrations?: Record<number, string>; // pre-loaded during play-page loading screen
  onEnd: () => void;
}

// Mood → full-screen gradient background
const MOOD_BG: Record<StoryMood, { from: string; to: string; mid?: string }> = {
  calm:     { from: '#E3F2FD', mid: '#F3E8FF', to: '#EDE8F8' },
  happy:    { from: '#FFFDE7', mid: '#FCE4EC', to: '#FFF8F0' },
  magical:  { from: '#F3E5F5', mid: '#E8EAF6', to: '#EDE7F6' },
  exciting: { from: '#FFF3E0', mid: '#FCE4EC', to: '#FFF8E1' },
  tense:    { from: '#E8EAF6', mid: '#EDE8F8', to: '#F3F4F9' },
};

const MOOD_AMBIENCE: Record<StoryMood, string[]> = {
  calm:     ['☁️','🌿','🌙','💤','⭐'],
  happy:    ['🌸','🌈','⭐','🌻','✨'],
  magical:  ['✨','🌟','💜','🔮','🌙'],
  exciting: ['⚡','🌟','🔥','💥','🚀'],
  tense:    ['🌧️','💧','🌀','🍃','🌫️'],
};

const MOOD_FLOATERS: Record<StoryMood, string[]> = {
  calm:     ['☁️','🌿','🌙','⭐','💤','🍃','🕊️','🌾','💙','🌊','☁️','🌙','🌿','⭐'],
  happy:    ['🌸','🌈','⭐','🌻','✨','🎈','🍭','🦋','🌺','💛','🌸','🌈','🎉','🌼'],
  magical:  ['✨','🌟','💫','⭐','🔮','🌙','💜','🌸','🦄','🪄','✨','🌟','💫','🌙'],
  exciting: ['⚡','🌟','🔥','💥','🚀','🎆','🎇','⭐','🎉','💪','⚡','🌟','🔥','🚀'],
  tense:    ['🌧️','💧','🌀','🍃','🌫️','⛈️','🌪️','💨','🌑','🍂','🌧️','💧','🌀','🍃'],
};

function MoodParticles({ mood }: { mood: StoryMood }) {
  const emojis = MOOD_FLOATERS[mood] ?? MOOD_FLOATERS.calm;
  const [drifters] = useState(() =>
    emojis.map((emoji, i) => ({
      id: i,
      emoji,
      x: 3 + (i * 7) % 93,
      delay: (i * 0.55) % 8,
      dur: 10 + (i * 1.3) % 8,
      size: 20 + (i * 6) % 20,
      opacity: 0.55 + (i % 3) * 0.1,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drifters.map(d => (
        <motion.div
          key={d.id}
          className="absolute select-none"
          style={{ left: `${d.x}%`, fontSize: d.size, opacity: d.opacity }}
          initial={{ y: '105vh' }}
          animate={{ y: '-10vh' }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: 'linear' }}
        >
          {d.emoji}
        </motion.div>
      ))}
    </div>
  );
}

function MoodBackground({ mood }: { mood: StoryMood }) {
  const bg = MOOD_BG[mood] ?? MOOD_BG.calm;
  const emojis = MOOD_AMBIENCE[mood] ?? MOOD_AMBIENCE.calm;
  const [drifters] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: 5 + (i * 19) % 88,
      delay: i * 0.55,
      dur: 9 + (i * 1.3) % 7,
      size: 14 + (i * 7) % 16,
    }))
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: bg.mid
          ? `linear-gradient(160deg, ${bg.from} 0%, ${bg.mid} 50%, ${bg.to} 100%)`
          : `linear-gradient(160deg, ${bg.from}, ${bg.to})`,
      }}
    >
      {drifters.map(d => (
        <motion.div
          key={d.id}
          className="absolute pointer-events-none select-none"
          style={{ left: `${d.x}%`, fontSize: d.size, opacity: 0.18 }}
          animate={{ y: ['-5vh', '-95vh'] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: 'linear' }}
          initial={{ y: '100vh' }}
        >
          {d.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ── Scene Card ─────────────────────────────────────────────────────────────
// Instant, always-distinct illustration base layer. Zero network required.
// 5 moods × 15 categories × 3 layout variants = 225 unique visual combinations.

const SCENE_EMOJIS: Record<string, { hero: string; world: string[]; accent: string[] }> = {
  'Animals':              { hero: '🐻', world: ['🌿','🌳','🍃'], accent: ['🦋','🐦','🌸'] },
  'Adventure':            { hero: '🗺️', world: ['🏔️','🌊','🏕️'], accent: ['⚡','🌟','🔥'] },
  'Magic':                { hero: '🪄', world: ['✨','🌟','💫'], accent: ['🔮','🌙','⭐'] },
  'Bedtime':              { hero: '🌙', world: ['☁️','⭐','🌠'], accent: ['💤','🕊️','🌸'] },
  'Friendship':           { hero: '🤝', world: ['🌈','🌻','🌸'], accent: ['💛','🎈','🌺'] },
  'Nature':               { hero: '🌿', world: ['🌳','🌊','🌄'], accent: ['🦋','🐦','🌸'] },
  'Vehicles':             { hero: '🚂', world: ['🏙️','🌄','🌿'], accent: ['⚡','💨','🌟'] },
  'Superheroes':          { hero: '🦸', world: ['🌆','⭐','🌟'], accent: ['⚡','💥','🔥'] },
  'Fairy Tales':          { hero: '🏰', world: ['🌙','✨','🌟'], accent: ['🌸','🦋','💜'] },
  'Space':                { hero: '🚀', world: ['⭐','🌙','🪐'], accent: ['💫','✨','🌟'] },
  'Chandamama Folk Tale': { hero: '🌕', world: ['⭐','🌙','☁️'], accent: ['✨','🌸','💫'] },
  'Panchatantra':         { hero: '📖', world: ['🌿','🌳','🏕️'], accent: ['🦁','🐒','🦅'] },
  'Tenali Rama':          { hero: '🪔', world: ['🏛️','🌸','🌿'], accent: ['👑','📜','💛'] },
  'Krishna Stories':      { hero: '🦚', world: ['🌿','🌊','🌸'], accent: ['🧈','🪷','💛'] },
  'Jataka Tales':         { hero: '🐘', world: ['🌿','🌳','🌊'], accent: ['💛','🌸','🦋'] },
};

const SCENE_GRADIENTS: Record<StoryMood, string[]> = {
  calm:     ['linear-gradient(135deg,#E8F4FD,#EDE8F8)','linear-gradient(160deg,#EDF4FB,#F0EAF8)','linear-gradient(120deg,#F0F8FF,#EDE8F8)'],
  happy:    ['linear-gradient(135deg,#FFFDE7,#FFF0DC)','linear-gradient(160deg,#FFF8DC,#FCE8D0)','linear-gradient(120deg,#FFFDE7,#FFE8CC)'],
  magical:  ['linear-gradient(135deg,#F3E5F5,#EDE7F6)','linear-gradient(160deg,#EDE7F6,#F8F0FF)','linear-gradient(120deg,#F8F0FF,#EDE7F6)'],
  exciting: ['linear-gradient(135deg,#FFF3E0,#FFE0B2)','linear-gradient(160deg,#FFF8E1,#FFECB3)','linear-gradient(120deg,#FFF3E0,#FFECB3)'],
  tense:    ['linear-gradient(135deg,#E8EAF6,#EDE8F8)','linear-gradient(160deg,#EDE8F8,#F3F4F9)','linear-gradient(120deg,#F3F4F9,#E8EAF6)'],
};

function SceneCard({ mood, category, paraIndex, sceneEmojis }: {
  mood: StoryMood; category: string; paraIndex: number;
  sceneEmojis?: import('@/lib/claude').SceneEmojis;
}) {
  const variant  = Math.abs(paraIndex + 1) % 3; // +1 so intro (−1) → variant 0
  const gradient = (SCENE_GRADIENTS[mood] ?? SCENE_GRADIENTS.calm)[variant];
  // Prefer story-specific emojis returned by Claude; fall back to category map
  const emojis   = sceneEmojis ?? SCENE_EMOJIS[category] ?? SCENE_EMOJIS['Adventure'];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: gradient }}>

      {/* Layout variant 0 — character centre stage */}
      {variant === 0 && (
        <>
          <div style={{ fontSize: 90, lineHeight: 1 }}>{emojis.hero}</div>
          <div className="flex gap-5 mt-4 opacity-60">
            {emojis.world.map((e, i) => (
              <span key={i} style={{ fontSize: 30 + (i % 2) * 8 }}>{e}</span>
            ))}
          </div>
          <div className="flex gap-4 mt-3 opacity-40">
            {emojis.accent.slice(0, 2).map((e, i) => (
              <span key={i} style={{ fontSize: 22 }}>{e}</span>
            ))}
          </div>
        </>
      )}

      {/* Layout variant 1 — wide panorama */}
      {variant === 1 && (
        <>
          <div className="flex gap-6 opacity-55 mb-2">
            {emojis.world.map((e, i) => (
              <span key={i} style={{ fontSize: 40 + (i % 2) * 12 }}>{e}</span>
            ))}
          </div>
          <div style={{ fontSize: 80, lineHeight: 1 }}>{emojis.hero}</div>
          <div className="flex gap-4 mt-3 opacity-40">
            {emojis.accent.map((e, i) => (
              <span key={i} style={{ fontSize: 20 }}>{e}</span>
            ))}
          </div>
        </>
      )}

      {/* Layout variant 2 — action close-up */}
      {variant === 2 && (
        <div className="flex items-end justify-center gap-6">
          <span style={{ fontSize: 56, opacity: 0.6 }}>{emojis.world[0]}</span>
          <span style={{ fontSize: 96, lineHeight: 1 }}>{emojis.hero}</span>
          <div className="flex flex-col gap-2 opacity-65">
            <span style={{ fontSize: 34 }}>{emojis.accent[0]}</span>
            <span style={{ fontSize: 26 }}>{emojis.world[1]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoryPlayer({ story, narrator, storyId, fromCache, storyMeta, initialIllustrations, onEnd }: StoryPlayerProps) {
  // Resolved once — stable for the lifetime of this player instance
  const storyLanguage = (storyMeta.language ?? story.language ?? 'english') as 'english' | 'telugu';

  // Lift story prop → local state so it can be replaced during regeneration
  const [currentStory, setCurrentStory] = useState<GeneratedStory>(story);

  const [paraIndex, setParaIndex]         = useState(-1);
  const [speaking, setSpeaking]           = useState(false);
  const [paused, setPaused]               = useState(false);
  const [musicOn, setMusicOn]             = useState(true);
  const [ended, setEnded]                 = useState(false);
  const [ttsLoading, setTtsLoading]       = useState(false);
  const [regenerating, setRegenerating]   = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  // True once the intro (narrator_intro) TTS finishes — reveals the BEGIN STORY button
  const [introFinished, setIntroFinished] = useState(false);
  // Seed with illustrations pre-loaded during the play-page loading screen
  const [illustrations, setIllustrations] = useState<Record<number, string>>(
    initialIllustrations ?? {}
  );
  // Ref mirror of illustrations — used inside speak() callbacks which close over stale state
  const illustrationsRef = useRef<Record<number, string>>(initialIllustrations ?? {});
  const [showIllustrations, setShowIllustrations] = useState(() => {
    const p = getProfile();
    return p ? getAgeGroup(p.age) !== 'newborn' : true;
  });

  const howlRef        = useRef<import('howler').Howl | null>(null);
  const currentMoodRef = useRef<StoryMood>('calm');
  const pausedRef      = useRef(false);
  // In-memory TTS audio cache: paraIndex → base64. Keyed by -1 (intro) or 0+.
  const audioCacheRef          = useRef<Map<number, string>>(new Map());
  // Tracks which paragraph illustrations have been requested (prevents duplicate fetches).
  // Pre-populated with indices already loaded during the play-page loading screen.
  const illustrationFetchedRef = useRef<Set<number>>(
    new Set(Object.keys(initialIllustrations ?? {}).map(Number))
  );

  const currentPara: StoryParagraph | null = paraIndex >= 0 ? currentStory.paragraphs[paraIndex] : null;
  const currentMood: StoryMood = (currentPara?.mood as StoryMood) ?? 'calm';
  const totalSlides = currentStory.paragraphs.length;
  // Resolved from storyMeta or story itself; falls back to storyLanguage

  // ── TTS (Sarvam primary, Web Speech fallback) ──
  const { speak, stop, prefetch } = useTTS(setSpeaking);

  // ── TTS cache helpers ───────────────────────────
  // Load audio for one paragraph: in-memory → IndexedDB → Sarvam API
  const loadParaAudio = useCallback(async (paraIdx: number, text: string) => {
    if (audioCacheRef.current.has(paraIdx)) return; // already warm
    const key = ttsCacheKey(storyId, paraIdx);
    // 1. Check IndexedDB (fast, local)
    const persisted = await getTTSAudio(key);
    if (persisted) {
      audioCacheRef.current.set(paraIdx, persisted);
      return;
    }
    // 2. Fetch from Sarvam API
    const base64 = await prefetch(text, storyLanguage);
    if (base64) {
      audioCacheRef.current.set(paraIdx, base64);
      setTTSAudio(key, base64); // fire-and-forget persist
    }
  }, [storyId, prefetch]);

  // ── Illustration prefetch ──────────────────────
  // Fire-and-forget: fetches illustration for a paragraph, stores in IndexedDB,
  // and adds to component state. Never blocks narration.
  const prefetchIllustration = useCallback(async (
    paraIdx: number,
    sceneDesc: string,
    mood: string,
    title?: string, // only for intro portrait (paraIdx === -1)
  ) => {
    if (!sceneDesc && !title) return;
    if (illustrationFetchedRef.current.has(paraIdx)) return;
    illustrationFetchedRef.current.add(paraIdx);

    const key = illustrationKey(storyId, paraIdx);

    // 1. Check IndexedDB (instant, cached from previous play)
    const cached = await getIllustration(key);
    if (cached) {
      setIllustrations(prev => ({ ...prev, [paraIdx]: cached }));
      return;
    }

    // 2. Call the API — server fetches from Pollinations and returns a data URL directly.
    //    The 25s timeout covers the full round-trip including server-side generation.
    try {
      const storyTitle = currentStory.title;
      const body = title && !sceneDesc
        ? { title, mood }
        : { scene_description: sceneDesc, mood, story_title: storyTitle };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);
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
        illustrationFetchedRef.current.delete(paraIdx); // timeout → allow retry
        return;
      }

      if (!res.ok) {
        illustrationFetchedRef.current.delete(paraIdx); // server error → allow retry
        return;
      }
      const { dataUrl } = await res.json() as { dataUrl?: string };
      if (!dataUrl) {
        illustrationFetchedRef.current.delete(paraIdx);
        return;
      }
      setIllustrations(prev => ({ ...prev, [paraIdx]: dataUrl }));
      setIllustration(key, dataUrl); // persist for instant replay
    } catch {
      illustrationFetchedRef.current.delete(paraIdx); // allow retry on next look-ahead call
    }
  }, [storyId, currentStory.title]);

  // ── Music ──────────────────────────────────────
  const startMusic = useCallback(async (mood: StoryMood) => {
    if (!musicOn) return;
    const { Howl } = await import('howler');
    if (howlRef.current) {
      if (currentMoodRef.current === mood) return;
      howlRef.current.fade(howlRef.current.volume(), 0, 600);
      setTimeout(() => howlRef.current?.unload(), 700);
    }
    currentMoodRef.current = mood;
    const src = getAudioForMood(mood, storyId);
    howlRef.current = new Howl({
      src: [src], loop: true, volume: 0,
      onload()      { howlRef.current?.fade(0, MUSIC_VOLUME, 800); },
      onloaderror() { /* audio file not present — skip silently */ },
    });
    howlRef.current.play();
  }, [musicOn]);

  function stopMusic() {
    if (howlRef.current) {
      howlRef.current.fade(howlRef.current.volume(), 0, 500);
      setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 600);
    }
  }

  useEffect(() => {
    return () => { stop(); stopMusic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-warm TTS on mount ───────────────────────
  // For cached stories: load all audio from IndexedDB first (fast), then
  // fetch any missing segments from Sarvam API in the background.
  // For first-play: pre-warm intro so it's ready immediately.
  useEffect(() => {
    const allSegments = [
      { idx: -1, text: currentStory.narrator_intro },
      ...currentStory.paragraphs.map((p, i) => ({ idx: i, text: p.text })),
    ];

    async function prewarm() {
      // Step 1: load everything we have from IndexedDB (parallel, fast)
      await Promise.all(
        allSegments.map(async ({ idx, text }) => {
          if (audioCacheRef.current.has(idx)) return;
          const key = ttsCacheKey(storyId, idx);
          const hit = await getTTSAudio(key);
          if (hit) audioCacheRef.current.set(idx, hit);
        })
      );

      if (fromCache) {
        // Step 2 (cached stories only): fill gaps from Sarvam sequentially
        // to avoid hammering the API with 9 simultaneous requests
        for (const { idx, text } of allSegments) {
          if (!audioCacheRef.current.has(idx)) {
            await loadParaAudio(idx, text);
          }
        }
      } else {
        // First play: just pre-warm intro + first paragraph
        if (!audioCacheRef.current.has(-1))
          loadParaAudio(-1, currentStory.narrator_intro);
      }
    }

    prewarm();

    // Scenes already have a head start from play-page Phase 2 fire-and-forget.
    // Use 300 ms stagger here — fast enough that all fire within 1.5 s of mount,
    // spaced enough to not overwhelm Pollinations. No-ops for scenes already in IndexedDB.
    prefetchIllustration(-1, '', 'magical', currentStory.title);
    currentStory.paragraphs.forEach((p, i) => {
      setTimeout(() => prefetchIllustration(i, p.scene_description, p.mood), i * 300);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep illustrationsRef in sync so speak() callbacks can read current illustration state
  useEffect(() => { illustrationsRef.current = illustrations; }, [illustrations]);

  // Clear loading indicator the moment TTS audio actually starts playing
  useEffect(() => {
    if (speaking) setTtsLoading(false);
  }, [speaking]);

  // Duck music while TTS is speaking.
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl || !musicOn || pausedRef.current) return;
    if (speaking) {
      howl.fade(howl.volume(), MUSIC_DUCK, 300);
    } else {
      howl.fade(howl.volume(), MUSIC_VOLUME, 900);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking, paused]);

  // ── Auto-advance paragraphs ─────────────────────
  useEffect(() => {
    if (pausedRef.current) return;

    if (paraIndex === -1) {
      setIntroFinished(false);
      // Look-ahead: load scenes 0 + 1 during the cover phase (~15s of intro TTS)
      if (currentStory.paragraphs[0]) {
        loadParaAudio(0, currentStory.paragraphs[0].text);
        prefetchIllustration(0, currentStory.paragraphs[0].scene_description, currentStory.paragraphs[0].mood);
      }
      if (currentStory.paragraphs[1]) {
        prefetchIllustration(1, currentStory.paragraphs[1].scene_description, currentStory.paragraphs[1].mood);
      }

      const cached = audioCacheRef.current.get(-1);
      // 500 ms pause — user sees the cover before narration begins
      setTimeout(() => {
        if (!cached) setTtsLoading(true);
        speak(currentStory.narrator_intro, storyLanguage, () => {
          // Reveal "BEGIN STORY" button; auto-advance after 2s so tapping is optional
          setIntroFinished(true);
          setTimeout(() => setParaIndex(prev => prev === -1 ? 0 : prev), 2000);
        }, cached);
      }, 500);

    } else if (paraIndex < totalSlides) {
      const para = currentStory.paragraphs[paraIndex];
      startMusic(para.mood as StoryMood);

      // Look-ahead: load N+1 and N+2 illustrations + N+1 audio while narrating N
      if (paraIndex < totalSlides - 1) {
        const next = currentStory.paragraphs[paraIndex + 1];
        if (next) {
          loadParaAudio(paraIndex + 1, next.text);
          prefetchIllustration(paraIndex + 1, next.scene_description, next.mood);
        }
      }
      if (paraIndex < totalSlides - 2) {
        const nextNext = currentStory.paragraphs[paraIndex + 2];
        if (nextNext) prefetchIllustration(paraIndex + 2, nextNext.scene_description, nextNext.mood);
      }
      // Ensure current paragraph illustration is fetched (covers edge cases)
      prefetchIllustration(paraIndex, para.scene_description, para.mood);

      const cached = audioCacheRef.current.get(paraIndex);
      if (!cached) setTtsLoading(true);
      speak(para.text, storyLanguage, () => {
        if (paraIndex < totalSlides - 1) {
          setTimeout(() => setParaIndex(p => p + 1), 300);
        } else {
          setTimeout(() => { setEnded(true); stopMusic(); markPlayed(storyId); }, 800);
        }
      }, cached);
    }

    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraIndex]);

  // ── Controls ────────────────────────────────────
  function togglePause() {
    if (paused) {
      pausedRef.current = false;
      setPaused(false);
      if (howlRef.current) {
        howlRef.current.play();
        howlRef.current.fade(0, MUSIC_DUCK, 600);
      }
      const text = paraIndex === -1 ? currentStory.narrator_intro : currentStory.paragraphs[paraIndex]?.text ?? '';
      const cached = audioCacheRef.current.get(paraIndex);
      speak(text, storyLanguage, () => {
        if (paraIndex === -1) {
          setTimeout(() => setParaIndex(0), 400);
        } else if (paraIndex < totalSlides - 1) {
          setTimeout(() => setParaIndex(p => p + 1), 600);
        } else {
          setTimeout(() => { setEnded(true); stopMusic(); markPlayed(storyId); }, 800);
        }
      }, cached);
    } else {
      pausedRef.current = true;
      stop();
      if (howlRef.current) {
        howlRef.current.fade(howlRef.current.volume(), 0, 400);
        setTimeout(() => howlRef.current?.pause(), 450);
      }
      setPaused(true);
    }
  }

  function goNext() {
    stop();
    if (paraIndex < totalSlides - 1) setParaIndex(p => p + 1);
  }

  function goPrev() {
    stop();
    if (paraIndex > 0) setParaIndex(p => p - 1);
    else setParaIndex(-1);
  }

  function toggleMusic() {
    if (musicOn) { stopMusic(); } else { if (currentPara) startMusic(currentPara.mood as StoryMood); }
    setMusicOn(p => !p);
  }

  function handleExit() {
    pausedRef.current = true;
    stop();
    stopMusic();
    onEnd();
  }

  // ── Regeneration ────────────────────────────────
  async function handleRegenerate() {
    setShowRegenConfirm(false);
    setRegenerating(true);
    setEnded(false);
    try {
      const profile = getProfile();
      const ageGroup = profile ? getAgeGroup(profile.age) : 'toddler';
      const narr = getNarratorById(storyMeta.narratorId) ?? getDefaultNarrator();
      const fresh = await generateStory(
        storyMeta.title,
        storyMeta.category,
        storyMeta.mood,
        profile?.name ?? 'the child',
        storyMeta.narratorId,
        narr.name,
        narr.personality,
        ageGroup,
        profile?.gender,
        profile?.favouriteCategories,
      );
      setCachedStory(storyId, {
        story: fresh,
        title: storyMeta.title,
        category: storyMeta.category,
        mood: storyMeta.mood,
        narratorId: storyMeta.narratorId,
        cachedAt: Date.now(),
      });
      // Clear old illustrations — new story has new scenes
      deleteIllustrationsForStory(storyId, currentStory.paragraphs.length);
      illustrationFetchedRef.current.clear();
      setIllustrations({});
      setIntroFinished(false);
      setCurrentStory(fresh);
      setParaIndex(-1);
    } catch {
      setEnded(true); // restore end screen on failure
    } finally {
      setRegenerating(false);
    }
  }

  // ── Regenerating screen ─────────────────────────
  if (regenerating) {
    return (
      <div className="h-screen fun-bg flex flex-col items-center justify-center text-center px-6">
        <NaniAvatar size={96} animate="pulse" />
        <p className="font-baloo font-bold text-lg text-gray-700 mt-5">Weaving a new story…</p>
        <div className="flex gap-2 mt-4">
          {[0.1, 0.2, 0.3].map(d => (
            <motion.div
              key={d}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: d }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: narrator.accentColor }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── End screen ──────────────────────────────────
  if (ended) {
    return (
      <div className="relative">
        <EndScreen
          narrator={narrator}
          onAgain={() => { setEnded(false); setParaIndex(-1); }}
          onEnd={onEnd}
          fromCache={fromCache}
          onRequestNewVersion={() => setShowRegenConfirm(true)}
        />
        {/* Confirmation dialog */}
        {showRegenConfirm && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center pb-10">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-3xl px-6 pt-6 pb-8 mx-4 shadow-2xl max-w-sm w-full"
            >
              <p className="font-baloo font-bold text-lg text-gray-800 text-center mb-2">
                Create a new version?
              </p>
              <p className="font-nunito text-sm text-gray-500 text-center mb-6 leading-relaxed">
                This will replace the saved story with a brand-new one.{' '}
                The old version cannot be recovered.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRegenerate}
                  className="w-full bg-coral text-white py-3.5 rounded-2xl font-nunito font-bold shadow-glow"
                >
                  Yes, make a new story
                </button>
                <button
                  onClick={() => setShowRegenConfirm(false)}
                  className="w-full text-gray-500 py-3 font-nunito font-semibold text-sm"
                >
                  Keep this version
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // Find best available illustration — max 1 step back so user never sees portrait
  // reappear mid-story. Scene N not ready → show scene N-1 (the page just left).
  const displayParaIdx = (() => {
    if (illustrations[paraIndex] != null) return paraIndex;
    const prev = paraIndex - 1; // equals -1 when paraIndex=0, which is correct (show portrait)
    if (prev >= -1 && illustrations[prev] != null) return prev;
    if (illustrations[-1] != null) return -1; // absolute last resort
    return null;
  })();
  const displayIllus = displayParaIdx != null ? illustrations[displayParaIdx] : null;

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">

      {/* Top bar — absolute over both panes */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-10 pb-2">
        <button
          onClick={handleExit}
          className="text-gray-600 font-nunito text-sm bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm"
        >
          ← Exit
        </button>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowIllustrations(v => !v)}
            className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center text-sm shadow-sm"
            title={showIllustrations ? 'Hide illustrations' : 'Show illustrations'}
          >
            {showIllustrations ? '🖼️' : '👁️'}
          </motion.button>
          {paraIndex >= 0 && (
            <div className="bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              <ProgressBar current={paraIndex} total={totalSlides} />
            </div>
          )}
        </div>
      </div>

      {/* ── Illustration pane — top 60% ── */}
      <div className="relative overflow-hidden" style={{ flex: 6 }}>

        {/* Mood background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMood}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <MoodBackground mood={currentMood} />
          </motion.div>
        </AnimatePresence>

        {/* Mood-specific floating emojis */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMood}
            className="absolute inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <MoodParticles mood={currentMood} />
          </motion.div>
        </AnimatePresence>

        {/* Book Cover: story-specific emoji floaters — only during intro slide */}
        <AnimatePresence>
          {paraIndex === -1 && currentStory.scene_emojis && (
            <motion.div
              key="cover-emojis"
              className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              {[
                currentStory.scene_emojis.hero,
                ...currentStory.scene_emojis.world,
                ...currentStory.scene_emojis.accent,
              ].map((emoji, i) => (
                <motion.div
                  key={i}
                  className="absolute select-none"
                  style={{ left: `${8 + (i * 14) % 80}%`, fontSize: 24 + (i % 3) * 8, opacity: 0.55 }}
                  initial={{ y: '110%' }}
                  animate={{ y: '-15%' }}
                  transition={{ duration: 12 + i * 1.5, repeat: Infinity, delay: i * 0.8, ease: 'linear' }}
                >
                  {emoji}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SceneCard — always-on base layer, mode="sync" ensures never blank between scenes.
            Old card fades out while new one fades in simultaneously (no empty gap).
            AI illustration at zIndex 5 covers it when Pollinations delivers. */}
        <AnimatePresence mode="sync">
          <motion.div
            key={`card-${paraIndex}`}
            className="absolute inset-0"
            style={{ zIndex: 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SceneCard
              mood={currentMood}
              category={storyMeta.category}
              paraIndex={paraIndex}
              sceneEmojis={currentStory.scene_emojis}
            />
          </motion.div>
        </AnimatePresence>

        {/* Shimmer skeleton — warm parchment sweep while an illustration generates.
            Shows only on story scenes (not on the cover/intro), and only when the
            current scene has no illustration yet (including the 1-step-back fallback). */}
        <AnimatePresence>
          {showIllustrations && paraIndex >= 0 && displayIllus == null && (
            <motion.div
              key={`shimmer-${paraIndex}`}
              className="absolute inset-0 illus-shimmer"
              style={{ zIndex: 4 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <motion.span
                  style={{ fontSize: 28, opacity: 0.35 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >🖌️</motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pollinations AI illustration — zIndex 5, crossfades OVER SceneCard when ready.
            Key changes only when displayParaIdx changes (max 1 step back fallback). */}
        <AnimatePresence>
          {showIllustrations && displayIllus && (
            <motion.div
              key={`illus-${displayParaIdx}`}
              className="absolute inset-0"
              style={{ zIndex: 5 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${displayIllus})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center center',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Content pane — bottom 40% ── */}
      <div className="relative flex flex-col bg-white" style={{ flex: 4 }}>

        {/* Story text */}
        <div className="flex-1 flex flex-col justify-center px-5 py-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={paraIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              {paraIndex === -1 ? (
                <div className="text-center">
                  <p className="font-baloo font-bold text-xl text-gray-800 mb-1 leading-snug">
                    {currentStory.title}
                  </p>
                  <p className="font-nunito text-gray-500 text-xs leading-relaxed italic mb-2">
                    {currentStory.narrator_intro}
                  </p>

                  {/* "Painting the scenes" indicator — shows until we have enough illustrations */}
                  {Object.keys(illustrations).length < 3 && (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <span className="text-sm">🖌️</span>
                      <span className="font-nunito text-xs text-gray-400">Nani is painting the scenes</span>
                      {[0, 0.2, 0.4].map(d => (
                        <motion.span key={d} className="w-1 h-1 rounded-full bg-gray-300 inline-block"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: d }} />
                      ))}
                    </div>
                  )}

                  {/* BEGIN STORY button — revealed after intro TTS finishes */}
                  <AnimatePresence>
                    {introFinished && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                        onClick={() => { stop(); setParaIndex(0); }}
                        className="mt-1 px-6 py-2.5 rounded-full bg-coral text-white font-nunito font-bold text-sm shadow-glow"
                      >
                        Begin Story ▶
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="font-nunito text-gray-700 text-base leading-relaxed text-center">
                  {currentPara?.text}
                </p>
              )}

              {/* Nani identity pill + audio state indicator */}
              <div className="flex flex-col items-center gap-1.5 mt-3">
                <div className="flex items-center gap-1.5">
                  {speaking && !paused && (
                    <motion.div className="flex gap-0.5 items-end h-3 mr-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-0.5 bg-coral rounded-full"
                          animate={{ height: ['30%','100%','30%'] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }} />
                      ))}
                    </motion.div>
                  )}
                  <NaniAvatar size={22} animate="none" />
                  <span className="font-nunito text-xs text-gray-400 font-semibold">{narrator.name}</span>
                </div>

                {/* Audio loading dots — visible during API fetch gap */}
                {ttsLoading && !speaking && !paused && (
                  <div className="flex gap-1.5">
                    {[0, 0.18, 0.36].map(d => (
                      <motion.div
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-gray-300"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.65, repeat: Infinity, delay: d }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="pb-5 pt-2 px-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.88 }} onClick={goPrev} disabled={paraIndex <= -1}
              className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-xl disabled:opacity-30">
              ⏮
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }} onClick={togglePause}
              className="w-16 h-16 rounded-full bg-coral flex items-center justify-center text-2xl text-white shadow-glow">
              {paused ? '▶' : '⏸'}
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }} onClick={goNext} disabled={paraIndex >= totalSlides - 1}
              className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-xl disabled:opacity-30">
              ⏭
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }} onClick={toggleMusic}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-colors ${
                musicOn ? 'bg-sky/20 text-sky' : 'bg-gray-100 text-gray-400'
              }`}>
              {musicOn ? '🔊' : '🔇'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

const END_STARS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  top:   `${10 + (i * 13) % 70}%`,
  left:  `${5  + (i * 17) % 88}%`,
  delay: i * 0.12,
  size:  i % 3 === 0 ? 22 : 16,
  emoji: i % 4 === 0 ? '✨' : i % 3 === 0 ? '⭐' : '✦',
}));

function EndScreen({
  narrator,
  onAgain,
  onEnd,
  fromCache,
  onRequestNewVersion,
}: {
  narrator: Narrator;
  onAgain: () => void;
  onEnd: () => void;
  fromCache: boolean;
  onRequestNewVersion: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0FF] to-[#EDE8F8] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">

      {/* Soft star field */}
      {END_STARS.map(s => (
        <motion.div
          key={s.id}
          className="absolute pointer-events-none select-none"
          style={{ top: s.top, left: s.left, fontSize: s.size }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ delay: s.delay, duration: 0.8, ease: 'easeOut' }}
        >
          {s.emoji}
        </motion.div>
      ))}

      <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }} className="mb-4 relative z-10 flex justify-center">
        <NaniAvatar size={96} animate="float" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="font-baloo font-black text-4xl text-gray-700 mb-2 relative z-10">
        The End
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="font-nunito text-gray-400 text-base mb-10 relative z-10">
        Sweet dreams, little one 🌙
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="w-full space-y-3 relative z-10">
        <button onClick={onAgain} className="w-full bg-coral text-white py-4 rounded-3xl font-nunito font-bold text-base shadow-glow">
          🔁 Hear it again
        </button>
        <button onClick={onEnd} className="w-full bg-white text-gray-700 py-4 rounded-3xl font-nunito font-bold text-base border border-gray-100">
          📚 Pick another story
        </button>
        {/* Subtle escape hatch for parents who want a fresh version */}
        {fromCache && (
          <button
            onClick={onRequestNewVersion}
            className="w-full text-gray-400 py-3 font-nunito text-sm"
          >
            ✦ Get a new version of this story
          </button>
        )}
      </motion.div>
    </div>
  );
}
