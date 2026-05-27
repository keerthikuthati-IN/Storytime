'use client';

import { motion, AnimatePresence } from 'framer-motion';

type Mood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

const MOOD_EMOJI: Record<Mood, string> = {
  happy:    '😊',
  tense:    '😮',
  calm:     '😌',
  magical:  '✨',
  exciting: '🤩',
};

const MOOD_COLOR: Record<Mood, string> = {
  happy:    'rgba(255,217,61,0.3)',
  tense:    'rgba(255,79,123,0.3)',
  calm:     'rgba(43,182,255,0.25)',
  magical:  'rgba(124,58,237,0.3)',
  exciting: 'rgba(255,159,67,0.3)',
};

interface NarratorAvatarProps {
  narratorEmoji: string;
  mood: Mood;
  speaking: boolean;
}

export default function NarratorAvatar({ narratorEmoji, mood, speaking }: NarratorAvatarProps) {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      {/* Mood-coloured pulse ring when speaking */}
      {speaking && (
        <>
          <motion.div
            animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full"
            style={{ background: MOOD_COLOR[mood] }}
          />
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute inset-0 rounded-full"
            style={{ background: MOOD_COLOR[mood] }}
          />
        </>
      )}

      {/* Avatar bubble */}
      <motion.div
        animate={speaking ? { y: [0, -4, 0], scale: [1, 1.06, 1] } : { y: 0, scale: 1 }}
        transition={speaking ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring' }}
        className="w-12 h-12 bg-white rounded-2xl shadow-soft flex items-center justify-center text-2xl z-10 relative"
      >
        {narratorEmoji}
      </motion.div>

      {/* Mood badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ scale: 0, opacity: 0, y: 4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 18 }}
          className="absolute -top-1.5 -right-1.5 text-base z-20"
        >
          {MOOD_EMOJI[mood]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
