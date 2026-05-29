'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicRenderer from './CinematicRenderer';
import type { GeneratedLullaby, GeneratedVerse } from '@/app/api/songs/generate/route';

interface LullabyPlayerProps {
  lullaby: GeneratedLullaby;
  songId: string;
  onEnd: () => void;   // "← Songs" / All Songs
  onNext: () => void;  // play next song
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
        <p className="font-baloo font-bold text-xl text-white/90 leading-relaxed whitespace-pre-line">
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
    <div className="relative flex flex-col h-screen overflow-hidden">

      {/* Cinematic night scene — fills entire screen behind content */}
      <div className="absolute inset-0 z-0">
        <CinematicRenderer mood={currentVerse?.mood ?? lullaby.mood} />
      </div>

      {/* Spacer — same height as old avatar area so card + controls stay at bottom */}
      <div className="relative z-10 w-full" style={{ height: '60vh' }} />

      {/* Top bar — overlaid on top of bear */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-10 pb-2">
        <button
          onClick={() => { cleanupSong(); onEnd(); }}
          className="text-white/70 font-nunito text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/15"
        >
          ← Sleep
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

      {/* Song title + verse in a frosted card — dark-mode palette over cinematic bg */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-2">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl px-6 py-4 border border-white/15 text-center">
          <p className="font-baloo font-bold text-sm text-purple-200 mb-2">{lullaby.title}</p>
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
            className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xl"
          >
            🔁
          </motion.button>

          {/* Pause / Play */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={togglePause}
            className="w-16 h-16 rounded-full bg-coral/90 backdrop-blur-sm flex items-center justify-center text-2xl text-white shadow-glow"
          >
            {paused ? '▶' : '⏸'}
          </motion.button>

          {/* Next Song */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleNext}
            className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xl"
          >
            ⏭
          </motion.button>

          {/* Volume */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={toggleMusic}
            className={`w-12 h-12 rounded-2xl backdrop-blur-sm flex items-center justify-center text-xl transition-colors ${
              musicOn ? 'bg-coral/30 text-coral/80' : 'bg-white/10 text-white/40'
            }`}
          >
            {musicOn ? '🔊' : '🔇'}
          </motion.button>

        </div>
      </div>
    </div>
  );
}
