'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import Image from 'next/image';
import type { StoryRecommendation } from '@/lib/claude';

interface SwipeCardProps {
  story: StoryRecommendation;
  onLike: () => void;
  onDislike: () => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 100;
const COVER_SEED_MAP: Record<string, number> = {};

function getCoverSeed(id: string): number {
  if (!COVER_SEED_MAP[id]) {
    COVER_SEED_MAP[id] = Math.floor(Math.random() * 1000);
  }
  return COVER_SEED_MAP[id];
}

export default function SwipeCard({ story, onLike, onDislike, isTop }: SwipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const seed = getCoverSeed(story.id);
  // Picsum photos — replace with real AI-generated images in production
  const coverImage = `https://picsum.photos/seed/${seed}/400/500`;

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
        {/* Cover image */}
        <div className="relative h-72 w-full" style={{ backgroundColor: story.coverColor }}>
          <Image
            src={coverImage}
            alt={story.title}
            fill
            className="object-cover"
            unoptimized
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Category pill */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full font-nunito font-bold text-xs text-gray-700">
            {story.category}
          </div>

          {/* Duration & Age */}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full font-nunito text-xs text-gray-700 font-semibold">
              ⏱ {story.duration}
            </span>
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full font-nunito text-xs text-gray-700 font-semibold">
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
