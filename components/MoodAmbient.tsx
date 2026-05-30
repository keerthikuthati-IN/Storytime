'use client';

import { motion } from 'framer-motion';

const MOOD_PARTICLES: Record<string, string[]> = {
  calm:     ['☁️', '🌿', '🍃', '⭐', '💤'],
  magical:  ['✨', '💫', '⭐', '🌟', '🔮'],
  happy:    ['🌸', '⭐', '✨', '🎈', '🌈'],
  exciting: ['⚡', '🌟', '✨', '🎆', '💥'],
  tense:    ['🌧️', '💧', '🌫️', '🍂', '🌀'],
};

// Deterministic positions — no Math.random to avoid hydration mismatch
const SLOTS = [
  { x: 8,  delay: 0,   dur: 9  },
  { x: 22, delay: 1.4, dur: 11 },
  { x: 40, delay: 0.7, dur: 8  },
  { x: 58, delay: 2.1, dur: 10 },
  { x: 74, delay: 0.3, dur: 12 },
  { x: 88, delay: 1.8, dur: 9  },
];

export default function MoodAmbient({ mood }: { mood: string }) {
  const emojis = MOOD_PARTICLES[mood] ?? MOOD_PARTICLES.calm;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.28,
        pointerEvents: 'none',
        zIndex: 7,
        overflow: 'hidden',
      }}
    >
      {SLOTS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute select-none"
          style={{ left: `${s.x}%`, fontSize: 13 + (i % 3) * 3 }}
          initial={{ y: '108%' }}
          animate={{ y: '-12%' }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'linear' }}
        >
          {emojis[i % emojis.length]}
        </motion.div>
      ))}
    </div>
  );
}
