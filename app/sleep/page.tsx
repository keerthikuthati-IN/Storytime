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
import { getLullabiesByLanguage, type Lullaby } from '@/lib/lullabies';
import type { GeneratedLullaby } from '@/app/api/songs/generate/route';

type SleepTab = 'noise' | 'lullabies';
type LullabyLang = 'english' | 'telugu';

// ── White Noise Player ─────────────────────────────────────────────────────

function WhiteNoiseTab() {
  const [active, setActive]   = useState<WhiteNoiseType>('brown');
  const [playing, setPlaying] = useState(false);
  const [timerIdx, setTimerIdx] = useState(1); // default 30 min
  const [dimmed, setDimmed]   = useState(false);

  const howlRef    = useRef<import('howler').Howl | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimerRef= useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSound = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.fade(0.85, 0, 2000);
      setTimeout(() => { howlRef.current?.unload(); howlRef.current = null; }, 2100);
    }
    setPlaying(false);
  }, []);

  const startSound = useCallback(async (type: WhiteNoiseType) => {
    if (howlRef.current) { howlRef.current.unload(); howlRef.current = null; }
    const { Howl } = await import('howler');
    const track = WHITE_NOISE_TRACKS[type];
    const howl = new Howl({
      src: [track.src], loop: true, volume: 0,
      onload() { howl.fade(0, 0.85, 2000); },
      onloaderror() { console.warn('[WhiteNoise] audio not found:', track.src); setPlaying(false); },
    });
    howlRef.current = howl;
    howl.play();
    setPlaying(true);

    // Reset dim timer on each play
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    dimTimerRef.current = setTimeout(() => setDimmed(true), 30_000);

    // Sleep timer
    const minutes = SLEEP_TIMER_OPTIONS[timerIdx].minutes;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (minutes > 0) {
      timerRef.current = setTimeout(() => stopSound(), minutes * 60_000);
    }
  }, [timerIdx, stopSound]);

  useEffect(() => () => {
    howlRef.current?.unload();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
  }, []);

  function togglePlay() {
    if (playing) { stopSound(); setDimmed(false); }
    else         { startSound(active); }
  }

  function selectSound(type: WhiteNoiseType) {
    setActive(type);
    if (playing) startSound(type);
  }

  function cycleTimer() {
    const next = (timerIdx + 1) % SLEEP_TIMER_OPTIONS.length;
    setTimerIdx(next);
    // Reschedule live timer if playing
    if (playing && timerRef.current) {
      clearTimeout(timerRef.current);
      const minutes = SLEEP_TIMER_OPTIONS[next].minutes;
      if (minutes > 0) timerRef.current = setTimeout(() => stopSound(), minutes * 60_000);
    }
  }

  return (
    <div
      className="px-5 pb-4"
      onClick={() => { if (dimmed) setDimmed(false); }}
    >
      {/* Dim overlay — only when playing and screen auto-dims */}
      <AnimatePresence>
        {dimmed && (
          <motion.div
            className="fixed inset-0 z-50 bg-black"
            initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
          />
        )}
      </AnimatePresence>

      {/* Now playing indicator */}
      {playing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4 px-1"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-coral"
          />
          <span className="font-nunito font-bold text-sm text-coral">
            {WHITE_NOISE_TRACKS[active].label}
          </span>
          <span className="font-nunito text-xs text-gray-400">playing</span>
        </motion.div>
      )}

      {/* Sound list — vertical */}
      <div className="space-y-2 mb-6">
        {WHITE_NOISE_ORDER.map(type => {
          const t = WHITE_NOISE_TRACKS[type];
          const isActive = active === type;
          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectSound(type)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-coral/8 border-coral/25 text-gray-800'
                  : 'bg-white border-gray-100 text-gray-500'
              }`}
            >
              <span className="text-2xl w-8 text-center">{t.emoji}</span>
              <span className={`font-nunito font-bold text-sm flex-1 text-left ${isActive ? 'text-coral' : ''}`}>
                {t.label}
              </span>
              {isActive && playing && (
                <motion.div className="flex gap-0.5 items-end h-4">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 bg-coral rounded-full"
                      animate={{ height: ['30%', '100%', '30%'] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
              {isActive && !playing && (
                <div className="w-2 h-2 rounded-full bg-coral/40" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-soft border border-gray-50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-glow ${playing ? 'bg-gray-400' : 'bg-coral'}`}
        >
          {playing ? '⏸' : '▶'}
        </motion.button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-nunito text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Sleep timer</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={cycleTimer}
            className="font-nunito font-bold text-base text-gray-700"
          >
            {SLEEP_TIMER_OPTIONS[timerIdx].label}
          </motion.button>
        </div>

        <div className="w-14 h-14" />
      </div>
    </div>
  );
}

// ── Lullabies Grid (ported from /songs) ──────────────────────────────────

const MOOD_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  calm:   { bg: 'bg-sky-100',    text: 'text-sky-600',    label: 'Calm'   },
  happy:  { bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Happy'  },
  sleepy: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Sleepy' },
};

function SongCard({ song, onPlay }: { song: Lullaby; onPlay: (s: Lullaby) => void }) {
  const chip = MOOD_CHIP[song.mood] ?? MOOD_CHIP.calm;

  if (song.comingSoon) {
    return (
      <div className="bg-white/60 rounded-3xl p-4 shadow-soft flex items-center gap-4 border border-gray-50 opacity-60">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">{song.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-baloo font-bold text-sm text-gray-500 leading-tight">{song.title}</p>
          <span className="text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Coming Soon</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-sm">🔜</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => onPlay(song)}
      className="bg-white rounded-3xl p-4 shadow-soft cursor-pointer flex items-center gap-4 border border-gray-50"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">{song.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-baloo font-bold text-sm text-gray-800 leading-tight">{song.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full ${chip.bg} ${chip.text}`}>{chip.label}</span>
          <span className="font-nunito text-[10px] text-gray-400 font-semibold">⏱ {song.durationEstimate}</span>
        </div>
      </div>
      <div className="w-9 h-9 rounded-full bg-coral flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs">▶</span>
      </div>
    </motion.div>
  );
}

function LullabiesTab() {
  const router = useRouter();
  const [lang, setLang] = useState<LullabyLang>('english');
  const songs = getLullabiesByLanguage(lang);

  function handlePlay(song: Lullaby) {
    if (song.comingSoon) return;
    const lullaby: GeneratedLullaby = {
      title: song.title, language: song.language, mood: song.mood, intro: song.intro,
      verses: song.verses.map(text => ({ text, mood: song.mood })),
    };
    sessionStorage.setItem(`lullaby_${song.id}`, JSON.stringify(lullaby));
    router.push(`/songs/play/${song.id}`);
  }

  return (
    <div className="pb-4">
      {/* Language tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-soft">
          {(['english', 'telugu'] as LullabyLang[]).map(t => (
            <motion.button key={t} whileTap={{ scale: 0.96 }} onClick={() => setLang(t)}
              className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all ${lang === t ? 'bg-coral text-white shadow-sm' : 'text-gray-400'}`}>
              {t === 'english' ? '🇬🇧 English' : '🇮🇳 Telugu'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Song list */}
      <div className="px-5 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div key={lang} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
            {songs.map((song, i) => (
              <motion.div key={song.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <SongCard song={song} onPlay={handlePlay} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sleep Page ─────────────────────────────────────────────────────────────

export default function SleepPage() {
  const [activeTab, setActiveTab] = useState<SleepTab>(() => {
    // Default tab based on age group — newborns go straight to noise
    if (typeof window === 'undefined') return 'lullabies';
    const profile = getProfile();
    if (!profile) return 'lullabies';
    return getAgeGroup(profile.age) === 'newborn' ? 'noise' : 'lullabies';
  });

  const TAB_CONFIG: { key: SleepTab; label: string; emoji: string }[] = [
    { key: 'noise',    label: 'White Noise', emoji: '🌙' },
    { key: 'lullabies', label: 'Lullabies',  emoji: '🎵' },
  ];

  return (
    <div className="min-h-screen fun-bg pb-28">

      {/* Header */}
      <div className="px-5 pt-11 pb-4">
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">Sleep</span>
          <span className="text-gray-800"> 🌙</span>
        </h1>
        <p className="font-nunito text-gray-400 text-sm mt-0.5 font-semibold">
          Nani is here — sleep now, kanna
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-soft">
          {TAB_CONFIG.map(t => (
            <motion.button key={t.key} whileTap={{ scale: 0.96 }} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === t.key ? 'bg-coral text-white shadow-glow' : 'text-gray-400'}`}>
              {t.emoji} {t.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'noise' ? <WhiteNoiseTab /> : <LullabiesTab />}
        </motion.div>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
