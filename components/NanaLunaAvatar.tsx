'use client';

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { Narrator } from '@/lib/narrators';

export type AvatarMood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

// State machine from public/rive/nani.riv (Login State Machine)
// States: look_idle → Blend. Single numeric input "type" drives the blend.
const SM_NAME = 'Login State Machine';
const INPUT = {
  type: 'type', // number — blends between expressions; range appears to be 0–100
};

// Mood → type value mapping (tune these after watching live behaviour)
const MOOD_TYPE: Record<AvatarMood, number> = {
  calm:     0,   // resting look_idle
  happy:    40,  // mild positive blend
  magical:  60,  // dreamy blend
  exciting: 80,  // animated blend
  tense:    20,  // slight concern blend
};
const SPEAKING_TYPE = 50; // mid-blend when narrating

const MOOD_AURA: Record<AvatarMood, string> = {
  happy:    '#FFD93D',
  magical:  '#CE93D8',
  calm:     '#81D4FA',
  exciting: '#FFB74D',
  tense:    '#F48FB1',
};

const MOOD_BADGE: Record<AvatarMood, string> = {
  happy:    '😊',
  magical:  '✨',
  calm:     '🌙',
  exciting: '⚡',
  tense:    '😟',
};

// CSS filter per mood — visually shifts Nani's appearance
const MOOD_FILTER: Record<AvatarMood, string> = {
  happy:    'saturate(1.25) hue-rotate(-5deg)',
  magical:  'saturate(1.5) brightness(1.06) hue-rotate(-15deg)',
  calm:     'brightness(0.97) saturate(0.88)',
  exciting: 'saturate(1.3) hue-rotate(10deg)',
  tense:    'brightness(0.82) saturate(0.6) hue-rotate(185deg)',
};

// Slow breathing — same for all moods, calm and trustworthy
const BREATHE_ANIMATE = { scale: [1, 1.025, 1] };
const BREATHE_TRANSITION = { duration: 3.8, repeat: Infinity, ease: 'easeInOut' };


interface Props {
  narrator: Narrator;
  mood: AvatarMood;
  speaking: boolean;
  size?: number;
}

export default function NanaLunaAvatar({ mood, speaking, size = 300 }: Props) {
  const { RiveComponent, rive } = useRive({
    src: '/rive/nani.riv',
    // artboard: leave unset — uses the default artboard in the file
    stateMachines: SM_NAME,
    autoplay: true,
    onLoadError: () => console.warn('[Nani] Rive file not found at /rive/nani.riv'),
  });

  const typeInput = useStateMachineInput(rive, SM_NAME, INPUT.type);

  // Mood + speaking → type blend value
  useEffect(() => {
    if (!rive || !typeInput) return;
    try {
      typeInput.value = speaking ? SPEAKING_TYPE : MOOD_TYPE[mood];
    } catch { /* rive not ready */ }
  }, [mood, speaking, rive, typeInput]);

  // Subtle idle variation — small oscillation so Nani feels alive when quiet
  useEffect(() => {
    if (!rive || speaking) return;
    const base = MOOD_TYPE[mood];
    const DRIFT = [-8, -4, 0, 4, 8];
    const interval = setInterval(() => {
      try {
        if (!typeInput) return;
        const offset = DRIFT[Math.floor(Math.random() * DRIFT.length)];
        typeInput.value = Math.max(0, Math.min(100, base + offset));
        setTimeout(() => { try { if (typeInput) typeInput.value = base; } catch { /* stale */ } }, 1200);
      } catch { /* rive state changed between ticks */ }
    }, 3500);
    return () => clearInterval(interval);
  }, [rive, speaking, mood, typeInput]);

  const aura         = MOOD_AURA[mood];
  const filter       = MOOD_FILTER[mood];
  const reactionCtrl = useAnimation();

  // Reaction beat when mood changes — scale pulse without remounting Rive
  useEffect(() => {
    reactionCtrl.start({ scale: [0.9, 1.06, 1], transition: { duration: 0.4, ease: 'backOut' } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>

      {/* Mood aura */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  size * 0.9 + i * 28,
            height: size * 0.9 + i * 28,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.1 + i * 0.05, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2.4 + i * 0.5, repeat: Infinity, delay: i * 0.5 }}
        >
          <div className="w-full h-full rounded-full" style={{
            background: `radial-gradient(circle, ${aura}30 0%, transparent 70%)`,
            border: `1.5px solid ${aura}25`,
          }} />
        </motion.div>
      ))}

      {/* Reaction beat wrapper — no key, no remount, Rive stays alive */}
      <motion.div
        animate={reactionCtrl}
        style={{ width: size, height: size, position: 'relative', zIndex: 10 }}
      >
        {/* Slow breathing + CSS filter shift per mood */}
        <motion.div
          animate={BREATHE_ANIMATE}
          transition={BREATHE_TRANSITION}
          style={{
            width: size, height: size,
            position: 'relative',
            filter,
            transition: 'filter 0.8s ease',
          }}
        >
          <RiveComponent style={{ width: '100%', height: '100%' }} />

          {/* Speaking pulse */}
          {speaking && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ border: `3px solid ${aura}`, borderRadius: '50%' }}
            />
          )}

          {/* Mood badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mood}
              className="absolute text-3xl"
              style={{ bottom: size * 0.12, right: size * 0.04, zIndex: 20,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {MOOD_BADGE[mood]}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

    </div>
  );
}
