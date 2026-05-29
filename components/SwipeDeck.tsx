'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import SwipeCard from './SwipeCard';
import { fetchStoryRecommendations, type StoryRecommendation } from '@/lib/claude';
import { getStorytimeData, getAgeGroup, likeStory, dislikeStory } from '@/lib/storage';
import type { ChildProfile } from '@/lib/storage';

// Store liked story objects so My Stories page can display them
const LIKED_STORIES_KEY = 'storytime_liked_objects';

function saveLikedStoryObject(story: StoryRecommendation) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LIKED_STORIES_KEY);
    const existing: StoryRecommendation[] = raw ? JSON.parse(raw) : [];
    if (!existing.find(s => s.id === story.id)) {
      localStorage.setItem(LIKED_STORIES_KEY, JSON.stringify([...existing, story]));
    }
  } catch { /* ignore */ }
}

interface SwipeDeckProps {
  profile: ChildProfile;
  onLiked?: () => void;
}

export default function SwipeDeck({ profile, onLiked }: SwipeDeckProps) {
  const ageGroup = getAgeGroup(profile.age);
  const [deck, setDeck] = useState<StoryRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedCount, setLikedCount] = useState(0);
  const fetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = getStorytimeData();
      const stories = await fetchStoryRecommendations(
        profile.age,
        profile.gender,
        profile.name,
        profile.favouriteCategories,
        data.likedStories,
        data.dislikedStories,
        ageGroup
      );
      setDeck(prev => [...prev, ...stories]);
    } catch {
      setError('Could not load stories. Check your connection and API key.');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [profile, ageGroup]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  // Auto-fetch when deck runs low
  useEffect(() => {
    if (!loading && deck.length <= 2 && deck.length > 0) {
      loadMore();
    }
  }, [deck.length, loading, loadMore]);

  function handleLike() {
    const story = deck[deck.length - 1];
    if (!story) return;
    likeStory(story.id);
    saveLikedStoryObject(story);
    setLikedCount(c => c + 1);
    setDeck(prev => prev.slice(0, -1));
    onLiked?.();
  }

  function handleDislike() {
    const story = deck[deck.length - 1];
    if (!story) return;
    dislikeStory(story.id);
    setDeck(prev => prev.slice(0, -1));
  }


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="text-5xl mb-4">😕</div>
        <p className="font-nunito text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadMore}
          className="bg-coral text-white px-6 py-3 rounded-2xl font-nunito font-bold text-sm shadow-glow"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="text-5xl mb-4"
        >
          ✨
        </motion.div>
        <p className="font-nunito text-gray-500 font-semibold">Finding perfect stories...</p>
      </div>
    );
  }

  if (!loading && deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="text-5xl mb-4">🎉</div>
        <p className="font-baloo font-bold text-xl text-gray-700 mb-2">You've seen them all!</p>
        <p className="font-nunito text-gray-400 text-sm mb-4">
          You liked {likedCount} {likedCount === 1 ? 'story' : 'stories'}
        </p>
        <button
          onClick={() => { setDeck([]); loadMore(); }}
          className="bg-coral text-white px-6 py-3 rounded-2xl font-nunito font-bold text-sm shadow-glow"
        >
          Discover More ✨
        </button>
      </div>
    );
  }

  // Render top 3 cards (stack effect — bottom cards are scaled down)
  const visibleCards = deck.slice(-3);
  const hasCards = deck.length > 0;

  return (
    <div className="w-full">
      {/* Card stack */}
      <div className="relative w-full" style={{ height: 440 }}>
        <AnimatePresence>
          {visibleCards.map((story, i) => {
            const isTop = i === visibleCards.length - 1;
            const stackOffset = (visibleCards.length - 1 - i) * 8;
            const stackScale = 1 - (visibleCards.length - 1 - i) * 0.04;
            return (
              <motion.div
                key={story.id}
                style={{ zIndex: i, top: stackOffset, scale: stackScale }}
                className="absolute w-full"
              >
                <SwipeCard
                  story={story}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  isTop={isTop}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && deck.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center py-2">
            <span className="font-nunito text-xs text-gray-400 animate-pulse_soft">
              Loading more stories...
            </span>
          </div>
        )}
      </div>

      {/* Action buttons — only when cards are present */}
      {hasCards && (
        <div className="flex justify-center items-center gap-8 mt-5">
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleDislike}
            className="w-14 h-14 rounded-full bg-white shadow-soft border border-gray-100 flex items-center justify-center"
          >
            <X size={22} strokeWidth={2.5} className="text-gray-400" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleLike}
            className="w-20 h-20 rounded-full bg-coral shadow-glow flex items-center justify-center"
          >
            <Heart size={32} fill="white" className="text-white" />
          </motion.button>
        </div>
      )}

      {hasCards && (
        <p className="text-center font-nunito text-xs text-gray-300 mt-2.5 font-semibold">
          Drag the card or tap the buttons
        </p>
      )}
    </div>
  );
}
