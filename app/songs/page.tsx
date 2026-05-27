'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { getLullabiesByLanguage, type Lullaby } from '@/lib/lullabies';
import type { GeneratedLullaby } from '@/app/api/songs/generate/route';

type Tab = 'english' | 'telugu';

const MOOD_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  calm:   { bg: 'bg-sky-100',    text: 'text-sky-600',    label: 'Calm'   },
  happy:  { bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Happy'  },
  sleepy: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Sleepy' },
};

function SongCard({ song, onPlay }: { song: Lullaby; onPlay: (song: Lullaby) => void }) {
  const chip = MOOD_CHIP[song.mood] ?? MOOD_CHIP.calm;

  if (song.comingSoon) {
    return (
      <div className="bg-white/60 rounded-3xl p-4 shadow-soft flex items-center gap-4 border border-gray-50 opacity-60">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
          {song.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-baloo font-bold text-sm text-gray-500 leading-tight">{song.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              Coming Soon
            </span>
          </div>
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
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
        {song.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-baloo font-bold text-sm text-gray-800 leading-tight">{song.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full ${chip.bg} ${chip.text}`}>
            {chip.label}
          </span>
          <span className="font-nunito text-[10px] text-gray-400 font-semibold">⏱ {song.durationEstimate}</span>
        </div>
      </div>
      <div className="w-9 h-9 rounded-full bg-coral flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs">▶</span>
      </div>
    </motion.div>
  );
}


export default function SongsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('english');

  const songs = getLullabiesByLanguage(activeTab);

  function handlePlay(song: Lullaby) {
    if (song.comingSoon) return;
    // Build lullaby from hardcoded data — no API call needed
    const lullaby: GeneratedLullaby = {
      title: song.title,
      language: song.language,
      mood: song.mood,
      intro: song.intro,
      verses: song.verses.map(text => ({ text, mood: song.mood })),
    };
    sessionStorage.setItem(`lullaby_${song.id}`, JSON.stringify(lullaby));
    router.push(`/songs/play/${song.id}`);
  }

  return (
    <div className="min-h-screen fun-bg pb-28">

      {/* Header */}
      <div className="px-5 pt-11 pb-4">
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">Lullabies</span>
          <span className="text-gray-800"> 🎵</span>
        </h1>
        <p className="font-nunito text-gray-400 text-sm mt-0.5 font-semibold">
          Nani sings you to sleep
        </p>
      </div>

      {/* Language Tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-soft">
          {(['english', 'telugu'] as Tab[]).map(tab => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-coral text-white shadow-sm'
                  : 'text-gray-400'
              }`}
            >
              {tab === 'english' ? '🇬🇧 English' : '🇮🇳 Telugu'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Song list */}
      <div className="px-5 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {songs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <SongCard song={song} onPlay={handlePlay} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
