'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Check } from 'lucide-react';
import { getProfile, deleteSavedStory, getAgeGroup } from '@/lib/storage'; // getAgeGroup used below for SwipeDeck
import type { ChildProfile } from '@/lib/storage';
import type { StoryRecommendation } from '@/lib/claude';
import { getCategoryStyle } from '@/lib/storyCovers';
import SwipeDeck from '@/components/SwipeDeck';
import BottomNav from '@/components/BottomNav';

const LIKED_STORIES_KEY = 'storytime_liked_objects';

function getLikedStoryObjects(): StoryRecommendation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

type Tab = 'discover' | 'saved';

export default function DiscoverPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [tab, setTab] = useState<Tab>('discover');
  const [savedStories, setSavedStories] = useState<StoryRecommendation[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshSaved = useCallback(() => setSavedStories(getLikedStoryObjects()), []);

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/profile'); return; }
    setProfile(p);
    refreshSaved();
  }, [router, refreshSaved]);

  useEffect(() => {
    if (tab === 'saved') refreshSaved();
  }, [tab, refreshSaved]);

  if (!profile) return null;

  const ageGroup = getAgeGroup(profile.age);

  function handleDelete(e: React.MouseEvent, storyId: string) {
    e.stopPropagation();
    if (confirmDeleteId === storyId) {
      deleteSavedStory(storyId);
      setSavedStories(prev => prev.filter(s => s.id !== storyId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(storyId);
    }
  }

  const savedCount = savedStories.length;

  return (
    <div className="min-h-screen fun-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-11 pb-4">
        <p className="font-nunito text-gray-400 text-sm font-semibold">Good evening,</p>
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">{profile.name}</span>
          <span className="text-gray-800"> 👋</span>
        </h1>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex gap-1.5 bg-white/70 backdrop-blur-sm rounded-2xl p-1.5 shadow-soft">
          {(['discover', 'saved'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all duration-200 relative ${
                tab === t ? 'bg-coral text-white shadow-glow' : 'text-gray-400'
              }`}
            >
              {t === 'discover' ? '✨ Discover' : '❤️ Saved'}
              {t === 'saved' && savedCount > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-extrabold ${
                  tab === 'saved' ? 'bg-white/25 text-white' : 'bg-coral/15 text-coral'
                }`}>
                  {savedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Discover tab */}
      <AnimatePresence mode="wait">
        {tab === 'discover' && (
          <motion.div
            key="discover"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <p className="font-nunito text-gray-400 text-xs px-5 mb-3 font-semibold">
              Swipe right to save ❤️ &nbsp;·&nbsp; Swipe left to skip
            </p>
            <div className="px-5">
              <SwipeDeck profile={profile} onLiked={refreshSaved} />
            </div>
          </motion.div>
        )}

        {/* Saved tab */}
        {tab === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            className="px-5"
          >
            {savedStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-7xl mb-5"
                >
                  📚
                </motion.div>
                <h2 className="font-baloo font-bold text-xl text-gray-700 mb-2">No stories saved yet</h2>
                <p className="font-nunito text-gray-400 text-sm leading-relaxed mb-6 max-w-[240px]">
                  Swipe right on stories you love and they&apos;ll appear here.
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setTab('discover')}
                  className="bg-coral text-white px-6 py-3 rounded-2xl font-nunito font-bold shadow-glow flex items-center gap-2"
                >
                  <Sparkles size={15} />
                  Discover Stories
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {savedStories.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                      onClick={() => {
                        setConfirmDeleteId(null);
                        router.push(`/play/${encodeURIComponent(story.id)}?title=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}&mood=${encodeURIComponent(story.mood)}&narrator=nana-luna`);
                      }}
                      className="bg-white rounded-3xl overflow-hidden shadow-soft cursor-pointer"
                    >
                      <div
                        className="relative h-36 w-full flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${getCategoryStyle(story.category).from} 0%, ${getCategoryStyle(story.category).to} 100%)` }}
                      >
                        <span className="text-6xl leading-none select-none drop-shadow-sm relative z-10">
                          {getCategoryStyle(story.category).emoji}
                        </span>
                        <span className="absolute bottom-2 left-2 bg-white/80 text-gray-600 text-[10px] font-nunito font-extrabold px-2 py-0.5 rounded-full">
                          {story.category}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => handleDelete(e, story.id)}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-soft transition-colors ${
                            confirmDeleteId === story.id ? 'bg-red-500' : 'bg-black/40'
                          }`}
                        >
                          {confirmDeleteId === story.id
                            ? <Check size={13} strokeWidth={3} className="text-white" />
                            : <Trash2 size={12} className="text-white" />
                          }
                        </motion.button>
                      </div>
                      <div className="p-3">
                        <h3 className="font-baloo font-bold text-sm text-gray-800 leading-tight line-clamp-2">
                          {story.title}
                        </h3>
                        <p className="font-nunito text-xs text-gray-400 mt-1 font-semibold">
                          {story.duration} · {story.ageRange}
                        </p>
                        {confirmDeleteId === story.id && (
                          <p className="font-nunito text-[10px] text-red-400 mt-1 font-bold">Tap ✓ to confirm</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
