'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import type { StoryRecommendation } from '@/lib/claude';
import { getCategoryStyle } from '@/lib/storyCovers';

interface SwipeCardProps {
  story: StoryRecommendation;
  onLike: () => void;
  onDislike: () => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 100;

export default function SwipeCard({ story, onLike, onDislike, isTop }: SwipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const cover = getCategoryStyle(story.category);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isTop) return;
    if (info.offset.x > SWIPE_THRESHOLD) {
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3 } });
      onLike();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3 } });
      onDislike();
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  }

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: -300, right: 300 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x, rotate, scale: cardScale }}
      className="swipe-card absolute w-full"
    >
      {/* Like / Nope overlays */}
      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-6 z-10 bg-mint text-white font-baloo font-black text-2xl px-4 py-2 rounded-2xl border-4 border-mint rotate-[-20deg] pointer-events-none"
          >
            ❤️ LIKE
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-6 z-10 bg-coral text-white font-baloo font-black text-2xl px-4 py-2 rounded-2xl border-4 border-coral rotate-[20deg] pointer-events-none"
          >
            NOPE ✕
          </motion.div>
        </>
      )}

      {/* Card */}
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-card"
        onClick={() => isTop && setExpanded(p => !p)}
      >
        {/* Illustrated cover */}
        <div
          className="relative h-72 w-full flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${cover.from} 0%, ${cover.to} 100%)` }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-30" style={{ background: cover.to }} />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-20" style={{ background: cover.from }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-10" style={{ background: cover.to }} />

          {/* Main emoji */}
          <span className="text-[88px] leading-none select-none drop-shadow-sm relative z-10">
            {cover.emoji}
          </span>

          {/* Category pill */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full font-nunito font-bold text-xs text-gray-600">
            {story.category}
          </div>

          {/* Duration & Age */}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full font-nunito text-xs text-gray-600 font-semibold">
              ⏱ {story.duration}
            </span>
            <span className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full font-nunito text-xs text-gray-600 font-semibold">
              {story.ageRange}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="font-baloo font-bold text-xl text-gray-800 leading-tight mb-1">
            {story.title}
          </h2>
          <p className="font-nunito text-gray-500 text-sm leading-relaxed">
            {story.teaser}
          </p>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-100"
            >
              <p className="font-nunito text-gray-600 text-sm leading-relaxed italic">
                Tap ❤️ to save this story to your collection, or swipe to explore more!
              </p>
            </motion.div>
          )}

          <p className="text-center text-xs text-gray-300 font-nunito mt-2">
            Tap to {expanded ? 'collapse' : 'preview'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
