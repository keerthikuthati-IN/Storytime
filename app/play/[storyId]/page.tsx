'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StoryPlayer from '@/components/StoryPlayer';
import { generateStory, type GeneratedStory } from '@/lib/claude';
import { getNarratorById, getDefaultNarrator } from '@/lib/narrators';
import { MUSIC_VOLUME } from '@/lib/audioMap';
import { getProfile, getAgeGroup, getCachedStory, setCachedStory } from '@/lib/storage';
import { getTTSAudio, setTTSAudio, ttsCacheKey } from '@/lib/ttsCache';
import { getDailyStoryById, saveDailyStoryAsPlayed } from '@/lib/dailyStories';
import NaniAvatar from '@/components/NaniAvatar';
import { fetchIllustrationDataUrl } from '@/lib/illustrationFetcher';

interface PageProps {
  params: Promise<{ storyId: string }>;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  duration: number;
  size: number;
}

const PARTICLES = ['🌙', '⭐', '✨', '🌸', '💫', '🌟', '🎈', '🦋'];

function LoadingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    function spawn() {
      const emoji = PARTICLES[Math.floor(Math.random() * PARTICLES.length)];
      const id = counterRef.current++;
      setParticles(prev => [
        ...prev.slice(-14),
        { id, emoji, x: 5 + Math.random() * 90, duration: 2.8 + Math.random() * 2, size: 18 + Math.floor(Math.random() * 22) },
      ]);
    }
    spawn();
    const interval = setInterval(spawn, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: '100vh', x: `${p.x}vw`, scale: 0.4 }}
            animate={{ opacity: [0, 0.9, 0.9, 0], y: '-20vh', scale: [0.4, 1, 1, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, ease: 'easeOut' }}
            style={{ position: 'absolute', fontSize: p.size, left: 0, bottom: 0 }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function PlayPage({ params }: PageProps) {
  const { storyId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const title    = searchParams.get('title')    ?? 'A Story';
  const category = searchParams.get('category') ?? 'Adventure';
  const mood     = searchParams.get('mood')     ?? 'happy';
  const narratorId = searchParams.get('narrator') ?? 'nana-luna';
  const language   = searchParams.get('language') ?? 'english';

  const [story, setStory]       = useState<GeneratedStory | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const narrator = getNarratorById(narratorId) ?? getDefaultNarrator();
  const profile  = typeof window !== 'undefined' ? getProfile() : null;
  const howlRef  = useRef<import('howler').Howl | null>(null);

  // Fire cover illustration immediately — title/mood/language are in URL params,
  // no need to wait for Claude. Writes to IndexedDB so StoryPlayer finds it cached.
  useEffect(() => {
    fetchIllustrationDataUrl(
      decodeURIComponent(storyId), -1, title, mood, title, language,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ambient music during loading — single exciting.mp3 track
  useEffect(() => {
    let mounted = true;
    async function startAmbient() {
      const { Howl } = await import('howler');
      if (!mounted) return;
      howlRef.current = new Howl({
        src: ['/audio/exciting.mp3'],
        loop: true,
        volume: 0,
        html5: true,
        onload() { if (mounted) howlRef.current?.fade(0, MUSIC_VOLUME * 1.2, 1000); },
        onloaderror() { /* audio not present — skip silently */ },
      });
      howlRef.current.play();
    }
    startAmbient();
    return () => {
      mounted = false;
      if (howlRef.current) {
        howlRef.current.fade(MUSIC_VOLUME * 1.2, 0, 500);
        setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 600);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!narrator) { router.replace('/discover'); return; }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let storyData: GeneratedStory;
        let isCache = false;

        const cached = getCachedStory(decodeURIComponent(storyId));
        if (cached) {
          storyData = cached.story;
          isCache = true;
        } else {
          const ageGroup = profile ? getAgeGroup(profile.age) : 'toddler';
          storyData = await generateStory(
            title, category, mood,
            profile?.name ?? 'the child',
            narratorId, narrator!.name, narrator!.personality,
            ageGroup, profile?.gender, profile?.favouriteCategories, language,
          );
          setCachedStory(decodeURIComponent(storyId), {
            story: storyData, title, category, mood, narratorId, language, cachedAt: Date.now(),
          });
        }

        // Start illustration 0 before StoryPlayer mounts — head start while React re-renders.
        fetchIllustrationDataUrl(
          decodeURIComponent(storyId), 0,
          storyData.paragraphs[0].scene_description,
          storyData.paragraphs[0].mood,
          storyData.title, language,
        );

        setStory(storyData);
        setFromCache(isCache);

        // Pre-warm narrator intro TTS so StoryPlayer finds it ready on mount
        const introKey = ttsCacheKey(decodeURIComponent(storyId), -1);
        getTTSAudio(introKey).then(existing => {
          if (existing) return;
          fetch('/api/songs/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: storyData.narrator_intro, language }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.audioBase64) setTTSAudio(introKey, data.audioBase64); })
            .catch(() => null);
        });
      } catch {
        setError('Could not generate story. Please check your API key and connection.');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!narrator) return null;

  if (loading) {
    return (
      <div className="h-screen relative overflow-hidden fun-bg">
        <LoadingParticles />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            className="flex justify-center"
          >
            <NaniAvatar size={120} animate="pulse" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-baloo font-bold text-xl text-gray-700 mt-6 mb-1"
          >
            Nani is getting ready…
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-nunito text-gray-500 text-sm mb-6"
          >
            Weaving the magic of{' '}
            <span className="font-semibold text-gray-700">&ldquo;{title}&rdquo;</span>
          </motion.p>
          <div className="flex gap-2">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-4">😕</div>
        <p className="font-nunito text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="bg-coral text-white px-6 py-3 rounded-2xl font-nunito font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!story) return null;

  return (
    <StoryPlayer
      story={story}
      narrator={narrator}
      storyId={decodeURIComponent(storyId)}
      fromCache={fromCache}
      storyMeta={{ title, category, mood, narratorId, language }}
      onEnd={() => {
        const dailyStory = getDailyStoryById(decodeURIComponent(storyId));
        if (dailyStory) saveDailyStoryAsPlayed(dailyStory);
        router.push('/discover');
      }}
    />
  );
}
