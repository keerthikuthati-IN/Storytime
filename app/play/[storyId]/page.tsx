'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StoryPlayer from '@/components/StoryPlayer';
import NanaLunaAvatar from '@/components/NanaLunaAvatar';
import { generateStory, type GeneratedStory } from '@/lib/claude';
import { getNarratorById, getDefaultNarrator } from '@/lib/narrators';
import { getAudioForMood, MUSIC_VOLUME } from '@/lib/audioMap';
import { getProfile, getAgeGroup } from '@/lib/storage';

interface PageProps {
  params: Promise<{ storyId: string }>;
}

// Narrator → loading mood/particles mapping
const NARRATOR_LOADING: Record<string, {
  mood: 'calm' | 'magical' | 'exciting';
  particles: string[];
  bgFrom: string;
  bgTo: string;
}> = {
  'nana-luna': {
    mood: 'magical',
    particles: ['🌙', '⭐', '✨', '🌸', '💫'],
    bgFrom: '#FFF8F0',
    bgTo: '#FFF0E8',
  },
  'grandma-rose': {
    mood: 'calm',
    particles: ['🌸', '🍃', '💐', '🌷', '☁️'],
    bgFrom: '#FFF0F0',
    bgTo: '#FFF8F4',
  },
  'grandpa-bill': {
    mood: 'calm',
    particles: ['📖', '🍂', '🌙', '⭐', '🍁'],
    bgFrom: '#F0F4FF',
    bgTo: '#F5F8FF',
  },
  'fairy-luna': {
    mood: 'magical',
    particles: ['✨', '🌟', '💫', '🌈', '🦋'],
    bgFrom: '#F5F0FF',
    bgTo: '#FDF8FF',
  },
  'captain-zara': {
    mood: 'exciting',
    particles: ['⚡', '🌟', '🔥', '💥', '🚀'],
    bgFrom: '#FFF8E0',
    bgTo: '#FFFCF0',
  },
};

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

function LoadingParticles({ narratorId }: { narratorId: string }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const counterRef = useRef(0);
  const config = NARRATOR_LOADING[narratorId] ?? NARRATOR_LOADING['grandma-rose'];

  useEffect(() => {
    function spawn() {
      const emoji = config.particles[Math.floor(Math.random() * config.particles.length)];
      const id = counterRef.current++;
      setParticles(prev => [
        ...prev.slice(-14), // keep at most 15
        {
          id,
          emoji,
          x: 5 + Math.random() * 90,
          delay: 0,
          duration: 2.8 + Math.random() * 2,
          size: 18 + Math.floor(Math.random() * 22),
        },
      ]);
    }

    spawn(); // immediate first particle
    const interval = setInterval(spawn, 600);
    return () => clearInterval(interval);
  }, [config.particles]);

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

  const title = searchParams.get('title') ?? 'A Story';
  const category = searchParams.get('category') ?? 'Adventure';
  const mood = searchParams.get('mood') ?? 'happy';
  const narratorId = searchParams.get('narrator') ?? 'nana-luna';

  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const narrator = getNarratorById(narratorId) ?? getDefaultNarrator();
  const profile = typeof window !== 'undefined' ? getProfile() : null;
  const howlRef = useRef<import('howler').Howl | null>(null);

  const loadingConfig = NARRATOR_LOADING[narratorId] ?? NARRATOR_LOADING['grandma-rose'];

  // Start ambient loading music
  useEffect(() => {
    let mounted = true;
    async function startAmbient() {
      const { Howl } = await import('howler');
      if (!mounted) return;
      const src = getAudioForMood(loadingConfig.mood);
      howlRef.current = new Howl({
        src: [src],
        loop: true,
        volume: 0,
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
        const ageGroup = profile ? getAgeGroup(profile.age) : 'toddler';
        const generated = await generateStory(
          title,
          category,
          mood,
          profile?.name ?? 'the child',
          narratorId,
          narrator!.name,
          narrator!.personality,
          ageGroup
        );
        setStory(generated);
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
      <div className="h-screen relative overflow-hidden"
        style={{ background: '#C8E8F4' }}
      >
        <LoadingParticles narratorId={narratorId} />

        {/* Nani — centered, background matches artboard so edges are invisible */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          className="absolute inset-0 flex items-start justify-center"
          style={{ paddingTop: 0 }}
        >
          <NanaLunaAvatar
            narrator={narrator}
            mood={loadingConfig.mood}
            speaking={false}
            size={500}
          />
        </motion.div>

        {/* Text overlaid at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-14 pt-8 text-center px-6"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, transparent 100%)' }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-baloo font-bold text-xl text-gray-700 mb-1"
          >
            {narrator.name} is preparing...
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-nunito text-gray-500 text-sm mb-5"
          >
            Weaving the magic of{' '}
            <span className="font-semibold text-gray-700">"{title}"</span>
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
      onEnd={() => router.push('/my-stories')}
    />
  );
}
