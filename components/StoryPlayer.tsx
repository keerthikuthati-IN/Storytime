'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NanaLunaAvatar from './NanaLunaAvatar';
import type { AvatarMood } from './NanaLunaAvatar';
import ProgressBar from './ProgressBar';
import type { GeneratedStory, StoryParagraph } from '@/lib/claude';
import type { Narrator } from '@/lib/narrators';
import { getAudioForMood, MUSIC_VOLUME, type StoryMood } from '@/lib/audioMap';
import { markPlayed } from '@/lib/storage';
import { useTTS } from '@/lib/useTTS';

interface StoryPlayerProps {
  story: GeneratedStory;
  narrator: Narrator;
  storyId: string;
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
      x: 3 + (i * 7) % 93,          // spread across full width
      delay: (i * 0.55) % 8,
      dur: 10 + (i * 1.3) % 8,       // 10–18s, slow and peaceful
      size: 20 + (i * 6) % 20,       // 20–40px, big enough to see
      opacity: 0.55 + (i % 3) * 0.1, // 0.55–0.75, visible but not harsh
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

export default function StoryPlayer({ story, narrator, storyId, onEnd }: StoryPlayerProps) {
  const [paraIndex, setParaIndex] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused]     = useState(false);
  const [musicOn, setMusicOn]   = useState(true);
  const [ended, setEnded]       = useState(false);

  const howlRef        = useRef<import('howler').Howl | null>(null);
  const currentMoodRef = useRef<StoryMood>('calm');
  const pausedRef      = useRef(false);

  const currentPara: StoryParagraph | null = paraIndex >= 0 ? story.paragraphs[paraIndex] : null;
  const currentMood: StoryMood = (currentPara?.mood as StoryMood) ?? 'calm';
  const avatarMood: AvatarMood = currentMood as AvatarMood;
  const totalSlides = story.paragraphs.length;

  // ── TTS (Sarvam primary, Web Speech fallback) ──
  const { speak, stop } = useTTS(setSpeaking);

  // ── Music ──────────────────────────────────────
  const startMusic = useCallback(async (mood: StoryMood) => {
    if (!musicOn) return;
    const { Howl } = await import('howler');
    if (howlRef.current) {
      if (currentMoodRef.current === mood) return;
      howlRef.current.fade(MUSIC_VOLUME, 0, 600);
      setTimeout(() => howlRef.current?.unload(), 700);
    }
    currentMoodRef.current = mood;
    const src = getAudioForMood(mood);
    howlRef.current = new Howl({
      src: [src], loop: true, volume: 0,
      onload()      { howlRef.current?.fade(0, MUSIC_VOLUME, 800); },
      onloaderror() { /* audio file not present — skip silently */ },
    });
    howlRef.current.play();
  }, [musicOn]);

  function stopMusic() {
    if (howlRef.current) {
      howlRef.current.fade(MUSIC_VOLUME, 0, 600);
      setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 700);
    }
  }

  useEffect(() => {
    return () => { stop(); stopMusic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-advance paragraphs ─────────────────────
  useEffect(() => {
    if (pausedRef.current) return;

    if (paraIndex === -1) {
      speak(story.narrator_intro, 'english', () => {
        setTimeout(() => setParaIndex(0), 400);
      });
    } else if (paraIndex < totalSlides) {
      const para = story.paragraphs[paraIndex];
      startMusic(para.mood as StoryMood);
      speak(para.text, 'english', () => {
        if (paraIndex < totalSlides - 1) {
          setTimeout(() => setParaIndex(p => p + 1), 600);
        } else {
          setTimeout(() => { setEnded(true); stopMusic(); markPlayed(storyId); }, 800);
        }
      });
    }

    // Cleanup: cancel this speak() if React re-runs the effect (StrictMode
    // double-invoke) or if the component unmounts before audio ends.
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraIndex]);

  // ── Controls ────────────────────────────────────
  function togglePause() {
    if (paused) {
      // Resume
      pausedRef.current = false;
      howlRef.current?.play();
      // Re-speak current paragraph from beginning
      const text = paraIndex === -1 ? story.narrator_intro : story.paragraphs[paraIndex]?.text ?? '';
      speak(text, 'english', () => {
        if (paraIndex === -1) {
          setTimeout(() => setParaIndex(0), 400);
        } else if (paraIndex < totalSlides - 1) {
          setTimeout(() => setParaIndex(p => p + 1), 600);
        } else {
          setTimeout(() => { setEnded(true); stopMusic(); markPlayed(storyId); }, 800);
        }
      });
    } else {
      // Pause
      pausedRef.current = true;
      stop();
      howlRef.current?.pause();
    }
    setPaused(p => !p);
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
    stop();
    stopMusic();
    onEnd();
  }

  if (ended) {
    return <EndScreen narrator={narrator} onAgain={() => { setEnded(false); setParaIndex(-1); }} onEnd={onEnd} />;
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">

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

      {/* Mood-specific floating emojis — environment tells the story */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMood}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        >
          <MoodParticles mood={currentMood} />
        </motion.div>
      </AnimatePresence>

      {/* Avatar — fills top ~60% of screen */}
      <div className="relative z-10 w-full flex flex-col items-center" style={{ height: '60vh' }}>
        <NanaLunaAvatar narrator={narrator} mood={avatarMood} speaking={speaking && !paused} size={480} />
        <div className="text-center -mt-10">
          <p className="font-baloo font-bold text-lg text-gray-800">{narrator.name}</p>
          <p className="font-nunito text-xs text-gray-400 capitalize font-semibold tracking-wide">{currentMood}</p>
        </div>
      </div>

      {/* Top bar — overlaid on top of avatar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-10 pb-2">
        <button
          onClick={handleExit}
          className="text-gray-500 font-nunito text-sm bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm"
        >
          ← Exit
        </button>
        {paraIndex >= 0 && (
          <div className="bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
            <ProgressBar current={paraIndex} total={totalSlides} />
          </div>
        )}
      </div>

      {/* Story text — frosted card floating at bottom */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={paraIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
            className="bg-white/75 backdrop-blur-md rounded-3xl px-6 py-5 shadow-soft text-center"
          >
            {paraIndex === -1 ? (
              <>
                <p className="font-baloo font-bold text-lg text-gray-800 mb-2">{story.title}</p>
                <p className="font-nunito text-gray-600 text-base leading-relaxed italic">
                  {story.narrator_intro}
                </p>
              </>
            ) : (
              <p className="font-nunito text-gray-700 text-base leading-relaxed">
                {currentPara?.text}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-8 pt-3 px-6">
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.88 }} onClick={goPrev} disabled={paraIndex <= -1}
            className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl disabled:opacity-30 shadow-sm">
            ⏮
          </motion.button>

          <motion.button whileTap={{ scale: 0.88 }} onClick={togglePause}
            className="w-16 h-16 rounded-full bg-coral flex items-center justify-center text-2xl text-white shadow-glow">
            {paused ? '▶' : '⏸'}
          </motion.button>

          <motion.button whileTap={{ scale: 0.88 }} onClick={goNext} disabled={paraIndex >= totalSlides - 1}
            className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl disabled:opacity-30 shadow-sm">
            ⏭
          </motion.button>

          <motion.button whileTap={{ scale: 0.88 }} onClick={toggleMusic}
            className={`w-12 h-12 rounded-2xl backdrop-blur-sm flex items-center justify-center text-xl transition-colors shadow-sm ${
              musicOn ? 'bg-sky/20 text-sky' : 'bg-white/60 text-gray-400'
            }`}>
            {musicOn ? '🔊' : '🔇'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function EndScreen({ narrator, onAgain, onEnd }: { narrator: Narrator; onAgain: () => void; onEnd: () => void }) {
  useEffect(() => {
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF'] });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#FFE8D6] flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="text-8xl mb-4">
        {narrator.emoji}
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="font-baloo font-black text-4xl text-gray-800 mb-2">
        The End!
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="font-nunito text-gray-500 text-base mb-10">
        What a wonderful story! 🌟
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="w-full space-y-3">
        <button onClick={onAgain} className="w-full bg-coral text-white py-4 rounded-3xl font-baloo font-bold text-lg shadow-card">
          🔁 Hear it again
        </button>
        <button onClick={onEnd} className="w-full bg-white text-gray-700 py-4 rounded-3xl font-baloo font-bold text-lg border-2 border-gray-100">
          📚 Pick another story
        </button>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
        className="font-nunito text-[10px] text-gray-300 mt-8">
        🐻 Bear character by{' '}
        <a href="https://rive.app/community/files/2244-7248-animated-login-character/"
          target="_blank" rel="noopener noreferrer" className="underline">JcToon</a>
        {' '}· CC BY 4.0
      </motion.p>
    </div>
  );
}
