'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { getProfile, getAgeGroup } from '@/lib/storage';
import {
  WHITE_NOISE_TRACKS, WHITE_NOISE_ORDER, SLEEP_TIMER_OPTIONS,
  type WhiteNoiseType,
} from '@/lib/whiteNoise';
import { LULLABIES, type Lullaby } from '@/lib/lullabies';
import type { GeneratedLullaby } from '@/app/api/songs/generate/route';

// ── Types ──────────────────────────────────────────────────────────────────

type NowPlaying =
  | { type: 'sound'; key: WhiteNoiseType }
  | { type: 'lullaby'; id: string; title: string }
  | null;

// ── Persistent Player Stage ────────────────────────────────────────────────

function PlayerStage({
  nowPlaying,
  playing,
  timerIdx,
  onPlayPause,
  onCycleTimer,
}: {
  nowPlaying: NowPlaying;
  playing: boolean;
  timerIdx: number;
  onPlayPause: () => void;
  onCycleTimer: () => void;
}) {
  const isSound   = nowPlaying?.type === 'sound';
  const isLullaby = nowPlaying?.type === 'lullaby';
  const isIdle    = !nowPlaying;

  const trackLabel = isSound
    ? WHITE_NOISE_TRACKS[nowPlaying!.key as WhiteNoiseType].label
    : isLullaby
    ? nowPlaying!.title
    : null;

  const moonColor = isSound
    ? { from: '#fffce0', to: '#ffd97d', shadow: 'rgba(255,220,100,0.5)', border: 'none' }
    : isLullaby
    ? { from: '#ffe8f0', to: '#ffb8d0', shadow: 'rgba(255,150,180,0.5)', border: 'none' }
    : { from: 'transparent', to: 'transparent', shadow: 'transparent', border: '2px solid rgba(255,255,255,0.3)' };

  return (
    <div
      className="mx-0"
      style={{
        background: 'linear-gradient(160deg, #1a1240 0%, #2d1f5e 60%, #1a2a4a 100%)',
        padding: '22px 20px 18px',
        marginBottom: 0,
      }}
    >
      {/* Track row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Moon */}
        <motion.div
          animate={playing ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 3.8, repeat: playing ? Infinity : 0, ease: 'easeInOut' }}
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 35% 35%, ${moonColor.from}, ${moonColor.to})`,
            boxShadow: playing ? `0 0 24px ${moonColor.shadow}` : 'none',
            border: moonColor.border,
          }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
            {isSound ? '🔊 Sound' : isLullaby ? '🎵 Lullaby' : 'Nothing playing'}
            {playing ? ' · Playing' : isIdle ? '' : ' · Paused'}
          </p>
          <p style={{
            fontSize: 15, fontWeight: 800,
            color: isIdle ? 'rgba(255,255,255,0.65)' : 'white',
            fontStyle: isIdle ? 'italic' : 'normal',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {trackLabel ?? 'Tap a lullaby or sound below…'}
          </p>
        </div>

        {/* Play/pause */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onPlayPause}
          disabled={isIdle}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: isIdle ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: isIdle ? 'rgba(255,255,255,0.45)' : 'white',
            cursor: isIdle ? 'default' : 'pointer',
          }}
        >
          {playing ? '⏸' : '▶'}
        </motion.button>
      </div>

      {/* Timer chips — active only for sounds */}
      <div className="flex gap-2">
        {SLEEP_TIMER_OPTIONS.map((opt, i) => {
          const isActive = timerIdx === i && isSound;
          return (
            <motion.button
              key={opt.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => isSound && onCycleTimer()}
              style={{
                fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '4px 10px',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.10)',
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                cursor: isSound ? 'pointer' : 'default',
                border: 'none',
              }}
            >
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sound Chips ────────────────────────────────────────────────────────────

function SoundChips({
  activeKey,
  playing,
  onSelect,
}: {
  activeKey: WhiteNoiseType | null;
  playing: boolean;
  onSelect: (key: WhiteNoiseType) => void;
}) {
  return (
    <div
      style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}
      className="no-scrollbar"
    >
      {WHITE_NOISE_ORDER.map(key => {
        const t = WHITE_NOISE_TRACKS[key];
        const isActive = activeKey === key;
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(key)}
            style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5,
              background: isActive
                ? 'linear-gradient(135deg, #FF6B6B, #ff8e53)'
                : 'white',
              borderRadius: 20, padding: '14px 12px 10px', minWidth: 70,
              boxShadow: isActive
                ? '0 4px 16px rgba(255,107,107,0.35)'
                : '0 2px 10px rgba(0,0,0,0.07)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>{t.emoji}</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isActive ? 'rgba(255,255,255,0.9)' : '#888',
            }}>
              {t.label}
            </span>
            {/* Animated bars when playing */}
            {isActive && playing && (
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    style={{ width: 3, background: 'white', borderRadius: 2 }}
                    animate={{ height: ['30%', '100%', '30%'] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Lullaby List ───────────────────────────────────────────────────────────

const LULLABY_GRADIENT: Record<string, [string, string]> = {
  '⭐': ['#FFF3C4', '#FFE0A0'],
  '🌙': ['#E8F0FF', '#C8D8FF'],
  '🌿': ['#E8FFF0', '#C0ECC8'],
  '🤫': ['#FFF0E0', '#FFD8B0'],
  '☀️': ['#FFF8E0', '#FFE8A0'],
  '🐑': ['#F0E8FF', '#DCC8FF'],
  '🌸': ['#FFE0EC', '#FFC8DA'],
  '💤': ['#E8FFF8', '#B8F0E0'],
  '🪷': ['#F0E8FF', '#DCC8FF'],
  '🍃': ['#E8FFF0', '#C0ECC8'],
  '✨': ['#FFF3C4', '#FFE0A0'],
};

function getLullabyGradient(emoji: string): [string, string] {
  return LULLABY_GRADIENT[emoji] ?? ['#FFF3C4', '#FFE0A0'];
}

function LullabyList({
  onPlay,
}: {
  onPlay: (song: Lullaby) => void;
}) {
  const all = LULLABIES;
  const available = all.filter(s => !s.comingSoon);
  const soon      = all.filter(s => s.comingSoon);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...available, ...soon].map((song, i) => {
        const [from, to] = getLullabyGradient(song.emoji);
        const isSoon = !!song.comingSoon;

        return (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={isSoon ? {} : { scale: 0.97 }}
            onClick={() => !isSoon && onPlay(song)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'white', borderRadius: 18, padding: '12px 14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: isSoon ? 'default' : 'pointer',
              opacity: isSoon ? 0.4 : 1,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {song.emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: '#333',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {song.title}
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px',
                  background: song.language === 'english' ? '#e0f0ff' : '#fff0e0',
                  color: song.language === 'english' ? '#3b82f6' : '#f59e0b',
                }}>
                  {song.language === 'english' ? 'English' : 'Telugu'}
                </span>
                {isSoon
                  ? <span style={{ fontSize: 9, fontWeight: 800, background: '#f3f4f6', color: '#9ca3af', borderRadius: 6, padding: '2px 7px' }}>Coming soon</span>
                  : <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>{song.durationEstimate}</span>
                }
              </div>
            </div>

            {/* Play arrow */}
            {!isSoon && (
              <span style={{ color: '#ddd', fontSize: 16, flexShrink: 0 }}>▶</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Sleep Page ─────────────────────────────────────────────────────────────

export default function SleepPage() {
  const router  = useRouter();
  const profile = typeof window !== 'undefined' ? getProfile() : null;
  const isNewborn = profile ? getAgeGroup(profile.age) === 'newborn' : false;
  const profileName = profile?.name ?? null;

  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  const [playing,    setPlaying]    = useState(false);
  const [timerIdx,   setTimerIdx]   = useState(1); // 30 min default

  const howlRef    = useRef<import('howler').Howl | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimerRef= useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dimmed,   setDimmed]       = useState(false);

  // ── Sound playback ──
  const stopSound = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.fade(0.85, 0, 1800);
      setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 2000);
    }
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    setPlaying(false);
    setDimmed(false);
  }, []);

  const startSound = useCallback(async (key: WhiteNoiseType) => {
    if (howlRef.current) { howlRef.current.unload(); howlRef.current = null; }
    const { Howl } = await import('howler');
    const track = WHITE_NOISE_TRACKS[key];
    const howl = new Howl({
      src: [track.src], loop: true, volume: 0,
      onload()      { howl.fade(0, 0.85, 1800); },
      onloaderror() { console.warn('[Sounds] not found:', track.src); setPlaying(false); },
    });
    howlRef.current = howl;
    howl.play();
    setNowPlaying({ type: 'sound', key });
    setPlaying(true);

    // Screen dim after 30s
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    dimTimerRef.current = setTimeout(() => setDimmed(true), 30_000);

    // Sleep timer
    if (timerRef.current) clearTimeout(timerRef.current);
    const mins = SLEEP_TIMER_OPTIONS[timerIdx].minutes;
    if (mins > 0) timerRef.current = setTimeout(() => stopSound(), mins * 60_000);
  }, [timerIdx, stopSound]);

  // Cleanup on unmount
  useEffect(() => () => {
    howlRef.current?.unload();
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
  }, []);

  // Newborns auto-start ocean on mount
  useEffect(() => {
    if (isNewborn) startSound('ocean');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──
  function handleSelectSound(key: WhiteNoiseType) {
    startSound(key);
  }

  function handlePlayPause() {
    if (!nowPlaying) return;
    if (nowPlaying.type === 'lullaby') return; // lullaby player handles its own state
    if (playing) stopSound();
    else startSound(nowPlaying.key as WhiteNoiseType);
  }

  function handleCycleTimer() {
    const next = (timerIdx + 1) % SLEEP_TIMER_OPTIONS.length;
    setTimerIdx(next);
    if (playing && timerRef.current) {
      clearTimeout(timerRef.current);
      const mins = SLEEP_TIMER_OPTIONS[next].minutes;
      if (mins > 0) timerRef.current = setTimeout(() => stopSound(), mins * 60_000);
    }
  }

  function handlePlayLullaby(song: Lullaby) {
    if (song.comingSoon) return;
    stopSound(); // stop any playing sound first
    const lullaby: GeneratedLullaby = {
      title: song.title, language: song.language, mood: song.mood,
      intro: song.intro,
      verses: song.verses.map(text => ({ text, mood: song.mood })),
    };
    sessionStorage.setItem(`lullaby_${song.id}`, JSON.stringify(lullaby));
    setNowPlaying({ type: 'lullaby', id: song.id, title: song.title });
    router.push(`/songs/play/${song.id}`);
  }

  // ── Sections (profile-ordered) ──
  const soundsSection = (
    <div>
      <p className="font-nunito font-bold text-xs text-amber-500 uppercase tracking-widest mb-3 px-1">
        🔊 Sounds
      </p>
      <SoundChips
        activeKey={nowPlaying?.type === 'sound' ? nowPlaying.key : null}
        playing={playing}
        onSelect={handleSelectSound}
      />
    </div>
  );

  const lullabiesSection = (
    <div>
      <p className="font-nunito font-bold text-xs text-amber-500 uppercase tracking-widest mb-3 px-1">
        🎵 Lullabies
      </p>
      <LullabyList onPlay={handlePlayLullaby} />
    </div>
  );

  return (
    <div
      className="min-h-screen pb-28 relative"
      style={{ background: 'linear-gradient(160deg, #FFF4F8 0%, #F5F0FF 50%, #F0F9FF 100%)' }}
      onClick={() => { if (dimmed) setDimmed(false); }}
    >
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

      {/* Page header */}
      <div className="px-5 pt-11 pb-4">
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">{profileName ? `${profileName}'s` : 'Our'}</span>
          <span className="text-gray-800"> Whispers 🌙</span>
        </h1>
        <p className="font-nunito text-gray-400 text-sm mt-0.5 font-semibold">
          Nani is here — sleep now, kanna
        </p>
      </div>

      {/* Persistent player stage — always visible */}
      <PlayerStage
        nowPlaying={nowPlaying}
        playing={playing}
        timerIdx={timerIdx}
        onPlayPause={handlePlayPause}
        onCycleTimer={handleCycleTimer}
      />

      {/* Browse sections — profile-ordered */}
      <div className="px-5 pt-5 space-y-6">
        {isNewborn ? (
          <>
            {soundsSection}
            <div className="h-px bg-amber-100" />
            {lullabiesSection}
          </>
        ) : (
          <>
            {lullabiesSection}
            <div className="h-px bg-amber-100" />
            {soundsSection}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
