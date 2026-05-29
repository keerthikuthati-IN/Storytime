'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicRenderer from '@/components/CinematicRenderer';
import { WHITE_NOISE_TRACKS, SLEEP_TIMER_OPTIONS, type WhiteNoiseType } from '@/lib/whiteNoise';

interface PageProps {
  params: Promise<{ soundKey: string }>;
}

export default function SoundPlayerPage({ params }: PageProps) {
  const { soundKey } = use(params);
  const router = useRouter();
  const key = soundKey as WhiteNoiseType;
  const track = WHITE_NOISE_TRACKS[key];

  const [playing,  setPlaying]  = useState(false);
  const [timerIdx, setTimerIdx] = useState(1); // 30 min default
  const [dimmed,   setDimmed]   = useState(false);

  const howlRef      = useRef<import('howler').Howl | null>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIdxRef  = useRef(timerIdx);
  useEffect(() => { timerIdxRef.current = timerIdx; }, [timerIdx]);

  const stopSound = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.fade(howlRef.current.volume(), 0, 1500);
      setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 1600);
    }
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    setPlaying(false);
    setDimmed(false);
  }, []);

  const armTimer = useCallback((idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const mins = SLEEP_TIMER_OPTIONS[idx].minutes;
    if (mins > 0) timerRef.current = setTimeout(() => stopSound(), mins * 60_000);
  }, [stopSound]);

  const startSound = useCallback(async () => {
    if (!track) return;
    const { Howl } = await import('howler');
    if (howlRef.current) { howlRef.current.unload(); }
    const howl = new Howl({
      src:  [track.src],
      loop: true,
      volume: 0,
      onload()      { howl.fade(0, 0.85, 1500); setPlaying(true); },
      onloaderror() { console.warn('[SoundPlayer] not found:', track.src); },
    });
    howlRef.current = howl;
    howl.play();
    // Screen dim after 30s
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    dimTimerRef.current = setTimeout(() => setDimmed(true), 30_000);
    armTimer(timerIdxRef.current);
  }, [track, armTimer]);

  // Auto-start on mount
  useEffect(() => {
    startSound();
    return () => {
      howlRef.current?.unload();
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePause() {
    const howl = howlRef.current;
    if (!howl) return;
    if (playing) {
      howl.fade(howl.volume(), 0, 400);
      setTimeout(() => howl.pause(), 450);
      setPlaying(false);
    } else {
      howl.play();
      howl.fade(0, 0.85, 600);
      setPlaying(true);
      armTimer(timerIdx);
    }
  }

  function cycleTimer() {
    const next = (timerIdx + 1) % SLEEP_TIMER_OPTIONS.length;
    setTimerIdx(next);
    armTimer(next);
  }

  function handleBack() {
    stopSound();
    router.push('/sleep');
  }

  if (!track) {
    return null;
  }

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden"
      onClick={() => { if (dimmed) setDimmed(false); }}
    >
      {/* Cinematic night scene background */}
      <div className="absolute inset-0 z-0">
        <CinematicRenderer mood="calm" />
      </div>

      {/* Back button */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 pt-10 pb-2">
        <button
          onClick={handleBack}
          className="text-white/70 font-nunito text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/15"
        >
          ← Whispers
        </button>
      </div>

      {/* Center: emoji + name + waveform */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={playing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 4, repeat: playing ? Infinity : 0, ease: 'easeInOut' }}
          className="text-[88px]"
          style={{ filter: 'drop-shadow(0 0 24px rgba(255,252,210,0.4))' }}
        >
          {track.emoji}
        </motion.div>

        <p className="font-baloo font-bold text-2xl text-white/90">{track.label}</p>

        {/* Animated sound bars */}
        <div className="flex gap-1.5 items-end h-6">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              className="w-1.5 bg-white/50 rounded-full"
              animate={playing
                ? { height: ['25%', '100%', '40%', '80%', '25%'] }
                : { height: '20%' }}
              transition={playing
                ? { duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }
                : { duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-14 px-6 space-y-6">
        {/* Timer chips */}
        <div className="flex gap-2 justify-center flex-wrap">
          {SLEEP_TIMER_OPTIONS.map((opt, i) => (
            <motion.button
              key={opt.label}
              whileTap={{ scale: 0.92 }}
              onClick={cycleTimer}
              style={{
                fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '6px 14px',
                background: timerIdx === i ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color:      timerIdx === i ? 'white' : 'rgba(255,255,255,0.5)',
                border: timerIdx === i ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>

        {/* Play / pause */}
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={togglePause}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl text-white border border-white/30 shadow-lg"
          >
            {playing ? '⏸' : '▶'}
          </motion.button>
        </div>
      </div>

      {/* Screen dim overlay */}
      <AnimatePresence>
        {dimmed && (
          <motion.div
            className="fixed inset-0 z-50 bg-black"
            initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
