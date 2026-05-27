'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getProfile, getStorytimeData } from '@/lib/storage';
import type { ChildProfile } from '@/lib/storage';
import { getNarratorById } from '@/lib/narrators';
import BottomNav from '@/components/BottomNav';

export default function ProfileViewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [stats, setStats] = useState({ liked: 0, played: 0, narrator: '' });

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/profile'); return; }
    setProfile(p);
    const data = getStorytimeData();
    const n = data.preferredNarrator ? getNarratorById(data.preferredNarrator) : null;
    setStats({
      liked: data.likedStories.length,
      played: data.playedStories.length,
      narrator: n?.name ?? 'None yet',
    });
  }, [router]);

  if (!profile) return null;

  const genderEmoji = profile.gender === 'girl' ? '👧' : profile.gender === 'boy' ? '👦' : '🧒';

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="bg-gradient-to-b from-coral to-[#FF9999] pt-12 pb-10 px-5 text-center text-white">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-7xl mb-3"
        >
          {genderEmoji}
        </motion.div>
        <h1 className="font-baloo font-bold text-3xl">{profile.name}</h1>
        <p className="font-nunito opacity-80 mt-1">Age {profile.age} · {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</p>
      </div>

      <div className="px-5 -mt-5 space-y-4">
        {/* Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-card grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-baloo font-bold text-2xl text-coral">{stats.liked}</p>
            <p className="font-nunito text-xs text-gray-400">Saved</p>
          </div>
          <div>
            <p className="font-baloo font-bold text-2xl text-sky">{stats.played}</p>
            <p className="font-nunito text-xs text-gray-400">Played</p>
          </div>
          <div>
            <p className="font-baloo font-bold text-sm text-sunshine leading-tight">{stats.narrator.split(' ')[0]}</p>
            <p className="font-nunito text-xs text-gray-400">Narrator</p>
          </div>
        </div>

        {/* Favourite categories */}
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <h2 className="font-baloo font-bold text-base text-gray-700 mb-3">Favourite Topics</h2>
          <div className="flex flex-wrap gap-2">
            {profile.favouriteCategories.map(cat => (
              <span key={cat} className="bg-coral/10 text-coral font-nunito font-semibold text-sm px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Edit button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/profile/edit')}
          className="w-full bg-coral text-white py-4 rounded-3xl font-baloo font-bold text-lg shadow-card"
        >
          ✏️ Edit Profile
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
