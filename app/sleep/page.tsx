'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { getProfile, getAgeGroup } from '@/lib/storage';
import { WHITE_NOISE_TRACKS, WHITE_NOISE_ORDER, type WhiteNoiseType } from '@/lib/whiteNoise';
import { LULLABIES, type Lullaby } from '@/lib/lullabies';
import type { GeneratedLullaby } from '@/app/api/songs/generate/route';

// ── Lullaby gradient map ───────────────────────────────────────────────────

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

// ── Lullaby List ───────────────────────────────────────────────────────────

function LullabyList({ onPlay }: { onPlay: (song: Lullaby) => void }) {
  const available = LULLABIES.filter(s => !s.comingSoon);
  const soon      = LULLABIES.filter(s => s.comingSoon);

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
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              {song.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            {!isSoon && <span style={{ color: '#ddd', fontSize: 16, flexShrink: 0 }}>▶</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Sound List ─────────────────────────────────────────────────────────────

const SOUND_GRADIENTS: Record<WhiteNoiseType, [string, string]> = {
  brown:     ['#2a1a0a', '#5c3d1e'],
  white:     ['#1a2a3a', '#2d4a6a'],
  rain:      ['#0a1a2a', '#1a3a5a'],
  ocean:     ['#0a1a3a', '#1a4a7a'],
  heartbeat: ['#3a0a0a', '#7a1a1a'],
  fan:       ['#0a1a2a', '#2a3a4a'],
  shush:     ['#1a0a2a', '#3a1a5a'],
};

function SoundList({ onPlay }: { onPlay: (key: WhiteNoiseType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {WHITE_NOISE_ORDER.map((key, i) => {
        const t = WHITE_NOISE_TRACKS[key];
        const [from, to] = SOUND_GRADIENTS[key];

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPlay(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'white', borderRadius: 18, padding: '12px 14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              {t.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{t.label}</p>
              <p style={{ fontSize: 11, color: '#aaa', fontWeight: 600, marginTop: 2 }}>Ambient loop · Sleep timer</p>
            </div>
            <span style={{ color: '#ddd', fontSize: 16, flexShrink: 0 }}>▶</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Sleep Page ─────────────────────────────────────────────────────────────

export default function SleepPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [isNewborn, setIsNewborn]     = useState(false);

  useEffect(() => {
    const p = getProfile();
    setProfileName(p?.name ?? null);
    setIsNewborn(p ? getAgeGroup(p.age) === 'newborn' : false);
  }, []);

  function handlePlayLullaby(song: Lullaby) {
    if (song.comingSoon) return;
    const lullaby: GeneratedLullaby = {
      title: song.title, language: song.language, mood: song.mood,
      intro: song.intro,
      verses: song.verses.map(text => ({ text, mood: song.mood })),
    };
    sessionStorage.setItem(`lullaby_${song.id}`, JSON.stringify(lullaby));
    router.push(`/songs/play/${song.id}`);
  }

  function handlePlaySound(key: WhiteNoiseType) {
    router.push(`/sleep/sounds/${key}`);
  }

  const soundsSection = (
    <div>
      <p className="font-nunito font-bold text-xs text-amber-500 uppercase tracking-widest mb-3 px-1">
        🔊 Sounds
      </p>
      <SoundList onPlay={handlePlaySound} />
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
    >
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

      {/* Browse sections — profile-ordered */}
      <div className="px-5 space-y-6">
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
