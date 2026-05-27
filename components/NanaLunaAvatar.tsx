// Bear character: "Animated Login Character" by JcToon
// Source: https://rive.app/community/files/2244-7248-animated-login-character/
// License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/

'use client';

import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { Narrator } from '@/lib/narrators';

export type AvatarMood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

const SM_NAME = 'Login Machine';
const INPUT = {
  isChecking:  'isChecking',
  numLook:     'numLook',
  isHandsUp:   'isHandsUp',
  trigSuccess: 'trigSuccess',
  trigFail:    'trigFail',
};

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

// CSS filter per mood — visually shifts Bruno's appearance
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
    src: '/rive/nana-luna.riv',
    artboard: 'Teddy',
    stateMachines: SM_NAME,
    autoplay: true,
    onLoadError: () => console.warn(
      'Nana Luna: Rive file not found at /rive/nana-luna.riv — ' +
      'download from https://rive.app/community/files/2244-7248-animated-login-character/'
    ),
  });

  const isChecking  = useStateMachineInput(rive, SM_NAME, INPUT.isChecking);
  const numLook     = useStateMachineInput(rive, SM_NAME, INPUT.numLook);
  const isHandsUp   = useStateMachineInput(rive, SM_NAME, INPUT.isHandsUp);
  const trigSuccess = useStateMachineInput(rive, SM_NAME, INPUT.trigSuccess);
  const trigFail    = useStateMachineInput(rive, SM_NAME, INPUT.trigFail);

  // Mood → Rive expression
  useEffect(() => {
    if (!rive) return;
    try {
      if (trigSuccess) trigSuccess.value = false;
      if (trigFail)    trigFail.value    = false;
      if (isHandsUp)   isHandsUp.value   = false;
      if (isChecking)  isChecking.value  = speaking;
      if (numLook)     numLook.value     = 50;

      if (mood === 'happy' || mood === 'magical') {
        if (trigSuccess) trigSuccess.value = true;
      } else if (mood === 'tense') {
        if (trigFail)    trigFail.value    = true;
      } else if (mood === 'exciting') {
        if (isChecking)  isChecking.value  = true;
      }
    } catch { /* rive not ready */ }
  }, [mood, speaking, rive, isChecking, numLook, isHandsUp, trigSuccess, trigFail]);

  // Periodic gaze when idle — bear glances left/right, feels alive
  useEffect(() => {
    if (!rive || speaking) return;
    const GAZE = [20, 30, 50, 70, 80];
    const interval = setInterval(() => {
      try {
        if (!numLook) return;
        numLook.value = GAZE[Math.floor(Math.random() * GAZE.length)];
        setTimeout(() => { try { if (numLook) numLook.value = 50; } catch { /* stale */ } }, 1400);
      } catch { /* rive state changed between ticks */ }
    }, 3500);
    return () => clearInterval(interval);
  }, [rive, speaking, numLook]);

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
