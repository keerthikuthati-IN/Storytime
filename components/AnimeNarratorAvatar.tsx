'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Narrator } from '@/lib/narrators';

type Mood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

// ─── Mood config: aura color, badge, particles ────────────────────────────────
const MOOD_CFG: Record<Mood, { aura: string; badge: string; particles: string[] }> = {
  happy:    { aura: '#FFD93D', badge: '😊', particles: ['⭐','✨','💛','🌟'] },
  magical:  { aura: '#CE93D8', badge: '✨', particles: ['✨','💜','🌙','⭐'] },
  calm:     { aura: '#81D4FA', badge: '😌', particles: ['💙','💫','🌊','☁️'] },
  exciting: { aura: '#FFB74D', badge: '🤩', particles: ['🔥','⚡','🎉','💥'] },
  tense:    { aura: '#F48FB1', badge: '😟', particles: ['💧','🌧️','🌀','🍃'] },
};

// ─── Per-mood DiceBear face expression params ─────────────────────────────────
// Changing eyes/mouth/eyebrows per mood gives genuine facial expressions
const MOOD_FACE: Record<Mood, { eyes: string; mouth: string; eyebrows: string }> = {
  calm:     { eyes: 'variant06', mouth: 'variant04', eyebrows: 'variant10' },
  happy:    { eyes: 'variant04', mouth: 'variant24', eyebrows: 'variant07' },
  magical:  { eyes: 'variant08', mouth: 'variant20', eyebrows: 'variant01' },
  exciting: { eyes: 'variant02', mouth: 'variant30', eyebrows: 'variant01' },
  tense:    { eyes: 'variant10', mouth: 'variant09', eyebrows: 'variant11' },
};

// ─── Per-narrator base config ─────────────────────────────────────────────────
const NARRATOR_BASE: Record<string, {
  seed: string; bg: string;
  hair: string; hairColor: string;
  skinColor: string; skin: string;
  cheek: string;
}> = {
  'grandma-rose': {
    seed: 'GrandmaRosie', bg: 'ffccd5,ffd6e0',
    hair: 'long19', hairColor: '6c4e36',
    skinColor: 'f2d3b1', skin: '#F2D3B1', cheek: '#FFAABB',
  },
  'grandpa-bill': {
    seed: 'GrandpaBillard', bg: 'c9d8f5,d6e4ff',
    hair: 'short01', hairColor: 'ababab',
    skinColor: 'eac086', skin: '#EAC086', cheek: '#FFCC99',
  },
  'fairy-luna': {
    seed: 'FairyLunaMagic', bg: 'e5c5f9,eed4ff',
    hair: 'long17', hairColor: '6d28d9',
    skinColor: 'fddcb5', skin: '#FDDCB5', cheek: '#CE93D8',
  },
  'captain-zara': {
    seed: 'CaptainZaraHero', bg: 'ffe0a0,ffd077',
    hair: 'long07', hairColor: 'a30000',
    skinColor: 'f0c27f', skin: '#F0C27F', cheek: '#FFB347',
  },
};

function buildUrl(narratorId: string, mood: Mood): string {
  const base = NARRATOR_BASE[narratorId] ?? NARRATOR_BASE['grandma-rose'];
  const face = MOOD_FACE[mood];
  return [
    'https://api.dicebear.com/9.x/adventurer/svg',
    `?seed=${base.seed}`,
    `&backgroundColor=${base.bg}`,
    '&backgroundType=gradientLinear',
    `&hair=${base.hair}`,
    `&hairColor=${base.hairColor}`,
    `&skinColor=${base.skinColor}`,
    `&eyes=${face.eyes}`,
    `&mouth=${face.mouth}`,
    `&eyebrows=${face.eyebrows}`,
  ].join('');
}

// ─── Face overlay geometry (for a 220px displayed adventurer) ─────────────────
// These pixel offsets are relative to the top-left of the 220px avatar circle.
// Face center is approximately at (110, 85), radius ~54px.
const F = {
  // Face background circle (covers DiceBear's own static face to avoid double eyes)
  faceTop: 31, faceLeft: 56, faceSize: 108,
  // Eyes: center positions
  eyeY: 68,      // top of eye rect
  eyeH: 26,      // eye container height (scaleY applied to inner iris)
  eyeW: 22,
  leftEyeX: 83,  // left edge of left eye
  rightEyeX: 115, // left edge of right eye
  // Eyebrows
  browY: 54,
  browW: 22, browH: 4,
  leftBrowX: 83,
  rightBrowX: 115,
  // Mouth
  mouthY: 100,
  mouthCX: 110,  // center X
  // Cheeks
  cheekY: 96,
  leftCheekX: 63,
  rightCheekX: 129,
  cheekW: 24, cheekH: 12,
  // Nose
  noseX: 107, noseY: 90,
};

// ─── Lip sync mouth frames ────────────────────────────────────────────────────
const MOUTH_FRAMES = [
  { h: 4,  w: 20, r: 3  },   // closed
  { h: 8,  w: 20, r: 5  },   // small open
  { h: 14, w: 22, r: 8  },   // medium open
  { h: 18, w: 24, r: 10 },   // wide open
];

// ─── Eye roll keyframes (iris translateX) ────────────────────────────────────
const EYE_ROLL_SEQ = [0, 0, 0, 6, 6, -6, -6, 0, 0];  // px offset for iris

// ─── Eyebrow rotation per mood ────────────────────────────────────────────────
const BROW_ROTATE: Record<Mood, [number, number]> = {
  calm:     [0,    0   ],
  happy:    [-4,   4   ],
  magical:  [-6,   6   ],
  exciting: [-8,   8   ],
  tense:    [10,  -10  ],  // worried inward tilt
};

// ─── Eye scaleY per mood ──────────────────────────────────────────────────────
const EYE_SCALE: Record<Mood, number> = {
  calm: 0.55, happy: 0.42, magical: 1.0, exciting: 1.1, tense: 0.85,
};

// ─── Particle ─────────────────────────────────────────────────────────────────
interface Particle { id: number; emoji: string; x: number }

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  narrator: Narrator;
  mood: Mood;
  speaking: boolean;
}

export default function AnimeNarratorAvatar({ narrator, mood, speaking }: Props) {
  const cfg = MOOD_CFG[mood];
  const base = NARRATOR_BASE[narrator.id] ?? NARRATOR_BASE['grandma-rose'];

  // Lip sync
  const [lipFrame, setLipFrame] = useState(0);
  useEffect(() => {
    if (!speaking) { setLipFrame(0); return; }
    const seq = [0, 1, 2, 3, 2, 1, 0, 1, 3, 2, 1, 0];
    let i = 0;
    const t = setInterval(() => { setLipFrame(seq[i++ % seq.length]); }, 120);
    return () => clearInterval(t);
  }, [speaking]);

  // Periodic eye-roll (when NOT speaking, random intervals)
  const [irisOffset, setIrisOffset] = useState(0);
  const rollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    function scheduleRoll() {
      const delay = 3500 + Math.random() * 4000;
      rollRef.current = setTimeout(async () => {
        if (cancelled) return;
        for (const offset of EYE_ROLL_SEQ) {
          if (cancelled) break;
          setIrisOffset(offset);
          await new Promise(r => setTimeout(r, 90));
        }
        setIrisOffset(0);
        scheduleRoll();
      }, delay);
    }
    scheduleRoll();
    return () => { cancelled = true; if (rollRef.current) clearTimeout(rollRef.current); };
  }, []);

  // Floating particles
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      const emoji = cfg.particles[Math.floor(Math.random() * cfg.particles.length)];
      setParticles(p => [...p.slice(-8), { id: Date.now(), emoji, x: Math.random() * 200 - 20 }]);
    }, speaking ? 650 : 1500);
    return () => clearInterval(t);
  }, [mood, speaking, cfg.particles]);

  const mouth = MOUTH_FRAMES[lipFrame];
  const [leftBrow, rightBrow] = BROW_ROTATE[mood];
  const eyeScale = EYE_SCALE[mood];
  const avatarSrc = buildUrl(narrator.id, mood);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 244 }}>

      {/* ── Aura rings ────────────────────────────────────────────────── */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: 210 + i * 28, height: 210 + i * 28 }}
          animate={{ scale: [1, 1.12 + i * 0.07, 1], opacity: [0.45, 0, 0.45] }}
          transition={{ duration: 2.2 + i * 0.5, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }}
        >
          <div className="w-full h-full rounded-full" style={{
            background: `radial-gradient(circle, ${cfg.aura}28 0%, transparent 70%)`,
            border: `1.5px solid ${cfg.aura}35`,
          }} />
        </motion.div>
      ))}

      {/* ── Floating particles ────────────────────────────────────────── */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute text-lg pointer-events-none select-none"
            style={{ left: p.x, bottom: 230 }}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -90, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.9, ease: 'easeOut' }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* ── Character ─────────────────────────────────────────────────── */}
      <motion.div
        style={{ width: 220, height: 220, position: 'relative', zIndex: 10 }}
        animate={
          speaking
            ? { y: [0, -7, 0, -4, 0], rotate: [0, -1.2, 1.2, -0.8, 0] }
            : { y: [0, -5, 0] }
        }
        transition={
          speaking
            ? { duration: 0.52, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Avatar circle */}
        <div style={{
          width: 220, height: 220,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: `0 10px 40px ${cfg.aura}50, 0 3px 14px rgba(0,0,0,0.16)`,
          border: `3px solid ${cfg.aura}90`,
          background: 'white',
          position: 'relative',
        }}>
          {/* DiceBear character — changes per mood (expression change) */}
          <AnimatePresence mode="wait">
            <motion.img
              key={`${narrator.id}-${mood}`}
              src={avatarSrc}
              alt={narrator.name}
              width={220}
              height={220}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            />
          </AnimatePresence>

          {/* ── Face overlays: positioned over the face area ─────────── */}
          {/* Skin-coloured face background — covers DiceBear's static face */}
          <div style={{
            position: 'absolute',
            top: F.faceTop, left: F.faceLeft,
            width: F.faceSize, height: F.faceSize,
            borderRadius: '50%',
            background: base.skin,
          }} />

          {/* Nose */}
          <div style={{
            position: 'absolute',
            top: F.noseY, left: F.noseX,
            width: 6, height: 4, borderRadius: '50%',
            background: 'rgba(0,0,0,0.11)',
          }} />

          {/* Cheeks */}
          {(['left', 'right'] as const).map(side => (
            <motion.div
              key={side}
              animate={{ opacity: mood === 'happy' || mood === 'exciting' ? [0.5, 0.75, 0.5] : [0.3, 0.45, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: F.cheekY,
                left: side === 'left' ? F.leftCheekX : F.rightCheekX,
                width: F.cheekW, height: F.cheekH,
                borderRadius: '50%',
                background: base.cheek + 'B0',
              }}
            />
          ))}

          {/* Eyebrows */}
          {(['left', 'right'] as const).map(side => (
            <motion.div
              key={`brow-${side}`}
              animate={{ rotate: side === 'left' ? leftBrow : rightBrow, y: mood === 'exciting' ? -3 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              style={{
                position: 'absolute',
                top: F.browY,
                left: side === 'left' ? F.leftBrowX : F.rightBrowX,
                width: F.browW, height: F.browH,
                background: '#5D4037',
                borderRadius: 3,
                transformOrigin: side === 'left' ? 'right center' : 'left center',
              }}
            />
          ))}

          {/* Eyes */}
          {(['left', 'right'] as const).map(side => {
            const isLeft = side === 'left';
            return (
              <motion.div
                key={`eye-${side}`}
                animate={{ scaleY: eyeScale }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                style={{
                  position: 'absolute',
                  top: F.eyeY,
                  left: isLeft ? F.leftEyeX : F.rightEyeX,
                  width: F.eyeW, height: F.eyeH,
                  borderRadius: '50%',
                  background: 'white',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transformOrigin: 'center center',
                }}
              >
                {/* Iris */}
                <div style={{
                  position: 'absolute', top: 1, left: 1,
                  width: F.eyeW - 2, height: F.eyeH - 2,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 40% 35%, #5DADE2, #2E86C1)`,
                }}>
                  {/* Pupil */}
                  <motion.div
                    animate={{ x: irisOffset }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{
                      position: 'absolute', top: 5, left: 4,
                      width: 10, height: 11,
                      borderRadius: '50%',
                      background: '#1A1A2E',
                    }}
                  />
                </div>
                {/* Highlight */}
                <div style={{
                  position: 'absolute', top: 3, left: isLeft ? 12 : 2,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'white', opacity: 0.92, zIndex: 10,
                }} />
                <div style={{
                  position: 'absolute', top: 9, left: isLeft ? 9 : 5,
                  width: 3, height: 3, borderRadius: '50%',
                  background: 'white', opacity: 0.65, zIndex: 10,
                }} />
                {/* Magical sparkle */}
                {mood === 'magical' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'conic-gradient(transparent 0deg, rgba(255,255,255,0.28) 60deg, transparent 120deg)',
                      borderRadius: '50%', zIndex: 5,
                    }}
                  />
                )}
              </motion.div>
            );
          })}

          {/* Mouth (lip sync) */}
          <div style={{
            position: 'absolute',
            top: F.mouthY,
            left: F.mouthCX - mouth.w / 2,
          }}>
            <motion.div
              animate={{ height: mouth.h, width: mouth.w, borderRadius: mouth.r }}
              transition={{ duration: 0.08, ease: 'linear' }}
              style={{
                background: lipFrame === 0 ? '#E8A090' : '#D9657A',
                minWidth: 10, minHeight: 4,
                position: 'relative', overflow: 'hidden',
              }}
            >
              {lipFrame > 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '36%', background: '#FEFEFE',
                  borderBottom: '1px solid rgba(200,140,140,0.2)',
                }} />
              )}
              {lipFrame >= 2 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '18%', right: '18%',
                  height: '42%', background: '#F48FB1',
                  borderRadius: '50% 50% 0 0',
                }} />
              )}
            </motion.div>
          </div>

          {/* Tense sweat drop */}
          {mood === 'tense' && (
            <motion.div
              animate={{ y: [0, 5, 0], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              style={{
                position: 'absolute', top: 40, right: 68,
                width: 8, height: 13,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                background: '#87CEEB', transform: 'rotate(20deg)',
              }}
            />
          )}

          {/* Magical shimmer */}
          {mood === 'magical' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', top: F.faceTop + 4, left: F.faceLeft + 4,
                width: F.faceSize - 8, height: F.faceSize - 8,
                background: 'conic-gradient(transparent 0deg, rgba(180,120,240,0.12) 90deg, transparent 180deg)',
                borderRadius: '50%', pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* ── Speaking pulse ring ────────────────────────────────────── */}
        {speaking && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
            style={{ border: `3px solid ${cfg.aura}`, borderRadius: '50%' }}
          />
        )}

        {/* ── Mood badge ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mood}
            className="absolute text-2xl"
            style={{ bottom: 6, right: -2, zIndex: 20, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            initial={{ scale: 0, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18 }}
          >
            {cfg.badge}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Sound wave bars (speaking indicator) ─────────────────────── */}
      <AnimatePresence>
        {speaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute flex items-end gap-0.5"
            style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
          >
            {[0.3, 0.5, 0.7, 0.5, 0.3].map((delay, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 14 + i * 3, 4] }}
                transition={{ duration: 0.5, repeat: Infinity, delay, ease: 'easeInOut' }}
                style={{
                  width: 4, borderRadius: 4,
                  background: cfg.aura,
                  opacity: 0.85,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
