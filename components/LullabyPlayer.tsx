'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NanaLunaAvatar from './NanaLunaAvatar';
import { NANA_LUNA } from '@/lib/narrators';
import type { GeneratedLullaby, GeneratedVerse } from '@/app/api/songs/generate/route';

interface LullabyPlayerProps {
  lullaby: GeneratedLullaby;
  songId: string;
  onEnd: () => void;   // "← Songs" / All Songs
  onNext: () => void;  // play next song
}

const LULLABY_BG = 'linear-gradient(160deg, #F3E8FF 0%, #EDE8F8 50%, #E8EAF6 100%)';
const LULLABY_PARTICLES = ['🌙', '⭐', '✨', '💫', '🌸'];

function FloatingParticles() {
  const [drifters] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      emoji: LULLABY_PARTICLES[i % LULLABY_PARTICLES.length],
      x: 5 + (i * 22) % 86,
      delay: i * 0.7,
      dur: 10 + (i * 1.4) % 6,
      size: 12 + (i * 5) % 14,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drifters.map(d => (
        <motion.div
          key={d.id}
          className="absolute select-none"
          style={{ left: `${d.x}%`, fontSize: d.size, opacity: 0.15 }}
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

function VerseDisplay({ verse }: { verse: GeneratedVerse | null }) {
  if (!verse) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={verse.text}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.6 }}
        className="text-center px-8"
      >
        <p className="font-baloo font-bold text-xl text-gray-800 leading-relaxed whitespace-pre-line">
          {verse.text}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export default function LullabyPlayer({ lullaby, songId, onEnd, onNext }: LullabyPlayerProps) {
  const [verseIndex, setVerseIndex] = useState(0);
  const [singing, setSinging]       = useState(false);
  const [paused, setPaused]         = useState(false);
  const [musicOn, setMusicOn]       = useState(true);

  const songHowlRef   = useRef<import('howler').Howl | null>(null);
  const verseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef     = useRef(false);
  // Keep a stable ref to onNext so the Howl onend callback is never stale
  const onNextRef     = useRef(onNext);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);

  const istelugu    = lullaby.language === 'telugu';
  const totalVerses = lullaby.verses.length;
  const currentVerse: GeneratedVerse | null = lullaby.verses[verseIndex] ?? null;

  // ── Timer helpers ─────────────────────────────────────────────
  function stopVerseTimer() {
    if (verseTimerRef.current) {
      clearInterval(verseTimerRef.current);
      verseTimerRef.current = null;
    }
  }

  function startVerseTimer(durationSec: number, startIdx = 0) {
    stopVerseTimer();
    const versesRemaining = totalVerses - startIdx;
    if (versesRemaining <= 0) return;
    const intervalMs = (durationSec * 1000) / versesRemaining;
    let idx = startIdx;
    verseTimerRef.current = setInterval(() => {
      idx++;
      if (idx < totalVerses) {
        setVerseIndex(idx);
      } else {
        stopVerseTimer();
      }
    }, intervalMs);
  }

  // ── Song MP3 ──────────────────────────────────────────────────
  function cleanupSong() {
    stopVerseTimer();
    if (songHowlRef.current) {
      songHowlRef.current.unload();
      songHowlRef.current = null;
    }
    setSinging(false);
  }

  const startSong = useCallback(async () => {
    if (pausedRef.current) return;
    const { Howl } = await import('howler');
    const howl = new Howl({
      src: [`/audio/lullabies/${songId}.mp3`],
      volume: 0.85,
      onload() {
        if (pausedRef.current) return;
        setSinging(true);
        startVerseTimer(howl.duration());
        howl.play();
      },
      onend() {
        setSinging(false);
        stopVerseTimer();
        // Auto-advance to next song
        onNextRef.current();
      },
      onloaderror() {
        console.warn(`[LullabyPlayer] Audio not found: /audio/lullabies/${songId}.mp3`);
        onNextRef.current();
      },
    });
    songHowlRef.current = howl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  // ── Mount: play immediately ───────────────────────────────────
  useEffect(() => {
    startSong();
    return () => { cleanupSong(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Repeat: restart same song ─────────────────────────────────
  function repeat() {
    cleanupSong();
    setVerseIndex(0);
    setPaused(false);
    pausedRef.current = false;
    setTimeout(() => startSong(), 100);
  }

  // ── Pause / resume ────────────────────────────────────────────
  function togglePause() {
    if (paused) {
      pausedRef.current = false;
      setPaused(false);
      if (songHowlRef.current) {
        songHowlRef.current.play();
        setSinging(true);
        const seek      = songHowlRef.current.seek() as number;
        const remaining = songHowlRef.current.duration() - seek;
        startVerseTimer(remaining, verseIndex);
      }
    } else {
      pausedRef.current = true;
      stopVerseTimer();
      songHowlRef.current?.pause();
      setSinging(false);
      setPaused(true);
    }
  }

  function toggleMusic() {
    const next = !musicOn;
    songHowlRef.current?.volume(next ? 0.85 : 0);
    setMusicOn(next);
  }

  function handleNext() {
    cleanupSong();
    onNext();
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden" style={{ background: LULLABY_BG }}>

      <FloatingParticles />

      {/* Bear — fills top ~60% of screen */}
      <div className="relative z-10 w-full flex flex-col items-center" style={{ height: '60vh' }}>
        <NanaLunaAvatar
          narrator={NANA_LUNA}
          mood="magical"
          speaking={singing && !paused}
          size={480}
        />
        <div className="text-center -mt-10">
          <p className="font-baloo font-bold text-lg text-gray-800">{NANA_LUNA.name}</p>
          <p className="font-nunito text-xs text-gray-400 font-semibold">
            {istelugu ? '🎵 Singing in Telugu' : '🎵 Singing'}
          </p>
        </div>
      </div>

      {/* Top bar — overlaid on top of bear */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-10 pb-2">
        <button
          onClick={() => { cleanupSong(); onEnd(); }}
          className="text-gray-500 font-nunito text-sm bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm"
        >
          ← Songs
        </button>

        {/* Verse progress dots */}
        <div className="flex gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          {lullaby.verses.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                width: i === verseIndex ? 20 : 8,
                background: i === verseIndex ? '#FF6B6B' : '#D1D5DB',
              }}
              style={{ height: 8 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Song title + verse in a frosted card */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-2">
        <div className="bg-white/70 backdrop-blur-md rounded-3xl px-6 py-4 shadow-soft text-center">
          <p className="font-baloo font-bold text-sm text-purple-400 mb-2">{lullaby.title}</p>
          <VerseDisplay verse={currentVerse} />
        </div>
      </div>

      {/* Controls: Repeat | Pause | Next | Volume */}
      <div className="relative z-10 pb-10 pt-3 px-6">
        <div className="flex items-center justify-center gap-4">

          {/* Repeat */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={repeat}
            className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm"
          >
            🔁
          </motion.button>

          {/* Pause / Play */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={togglePause}
            className="w-16 h-16 rounded-full bg-coral flex items-center justify-center text-2xl text-white shadow-glow"
          >
            {paused ? '▶' : '⏸'}
          </motion.button>

          {/* Next Song */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleNext}
            className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm"
          >
            ⏭
          </motion.button>

          {/* Volume */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={toggleMusic}
            className={`w-12 h-12 rounded-2xl backdrop-blur-sm flex items-center justify-center text-xl transition-colors shadow-sm ${
              musicOn ? 'bg-sky-100/60 text-sky-500' : 'bg-white/60 text-gray-400'
            }`}
          >
            {musicOn ? '🔊' : '🔇'}
          </motion.button>

        </div>
      </div>
    </div>
  );
}
