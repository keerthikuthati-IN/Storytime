'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { deleteSavedStory } from '@/lib/storage';
import type { StoryRecommendation } from '@/lib/claude';

const LIKED_STORIES_KEY = 'storytime_liked_objects';

function getLikedStoryObjects(): StoryRecommendation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function MyStoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryRecommendation[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(e: React.MouseEvent, storyId: string) {
    e.stopPropagation();
    if (confirmDeleteId === storyId) {
      deleteSavedStory(storyId);
      setStories(prev => prev.filter(s => s.id !== storyId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(storyId);
    }
  }

  useEffect(() => {
    setStories(getLikedStoryObjects());
  }, []);

  return (
    <div className="min-h-screen fun-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-11 pb-5">
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">My Stories</span>
          <span className="text-gray-800"> 🔖</span>
        </h1>
        <p className="font-nunito text-gray-400 text-sm mt-0.5 font-semibold">
          {stories.length > 0
            ? `${stories.length} ${stories.length === 1 ? 'story' : 'stories'} saved`
            : 'Your saved stories appear here'}
        </p>
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-8xl mb-6"
          >
            📚
          </motion.div>
          <h2 className="font-baloo font-bold text-xl text-gray-700 mb-2">No stories yet!</h2>
          <p className="font-nunito text-gray-400 text-sm leading-relaxed mb-7">
            Swipe right on stories you love ❤️ and they'll appear here.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/discover')}
            className="bg-coral text-white px-7 py-3.5 rounded-2xl font-nunito font-bold shadow-glow flex items-center gap-2"
          >
            <Sparkles size={16} />
            Discover Stories
          </motion.button>
        </div>
      ) : (
        <div className="px-5 grid grid-cols-2 gap-4">
          <AnimatePresence>
            {stories.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                onClick={() => {
                  setConfirmDeleteId(null);
                  router.push(`/play/${encodeURIComponent(story.id)}?title=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}&mood=${encodeURIComponent(story.mood)}&narrator=nana-luna`);
                }}
                className="bg-white rounded-3xl overflow-hidden shadow-soft story-card cursor-pointer relative"
              >
                {/* Cover image */}
                <div className="relative h-36 w-full" style={{ backgroundColor: story.coverColor }}>
                  <Image
                    src={`https://picsum.photos/seed/${story.id.charCodeAt(0) + story.id.length}/300/200`}
                    alt={story.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-2 bg-white/90 text-gray-700 text-[10px] font-nunito font-extrabold px-2 py-0.5 rounded-full">
                    {story.category}
                  </span>

                  {/* Delete button */}
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

      <BottomNav />
    </div>
  );
}
