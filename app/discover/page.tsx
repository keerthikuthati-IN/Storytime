'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, BookOpen, X } from 'lucide-react';
import { getProfile, getLikedStories } from '@/lib/storage';
import type { ChildProfile } from '@/lib/storage';
import SwipeDeck from '@/components/SwipeDeck';
import BottomNav from '@/components/BottomNav';

export default function DiscoverPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [likedCount, setLikedCount] = useState(0);

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/profile'); return; }
    setProfile(p);
    setLikedCount(getLikedStories().length);
  }, [router]);

  if (!profile) return null;

  return (
    <div className="min-h-screen fun-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-11 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-nunito text-gray-400 text-sm font-semibold">Good evening,</p>
            <h1 className="font-baloo font-bold text-[26px] leading-tight">
              <span className="gradient-text">{profile.name}</span>
              <span className="text-gray-800"> 👋</span>
            </h1>
          </div>

          <AnimatePresence>
            {likedCount > 0 && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => router.push('/my-stories')}
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1.5 bg-coral/10 text-coral px-3.5 py-2 rounded-2xl"
              >
                <Heart size={14} fill="currentColor" />
                <span className="font-nunito font-bold text-sm">{likedCount} saved</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p className="font-nunito text-gray-400 text-xs mt-2 font-semibold">
          Swipe right to save ❤️ &nbsp;·&nbsp; Swipe left to skip
        </p>
      </div>

      {/* Swipe Deck */}
      <div className="px-5 mt-1">
        <SwipeDeck profile={profile} />
      </div>

      {/* Action buttons */}
      <div className="px-5 mt-5 flex justify-center items-center gap-5">
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-14 h-14 rounded-full bg-white shadow-soft border border-gray-100 flex items-center justify-center"
        >
          <X size={22} strokeWidth={2.5} className="text-gray-400" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-20 h-20 rounded-full bg-coral shadow-glow flex items-center justify-center"
        >
          <Heart size={32} fill="white" className="text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => router.push('/my-stories')}
          className="w-14 h-14 rounded-full bg-white shadow-soft border border-gray-100 flex items-center justify-center"
        >
          <BookOpen size={22} className="text-violet" />
        </motion.button>
      </div>

      <p className="text-center font-nunito text-xs text-gray-300 mt-2.5 font-semibold">
        Drag the card or tap the buttons
      </p>

      <BottomNav />
    </div>
  );
}
