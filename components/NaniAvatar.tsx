'use client';

import { motion } from 'framer-motion';

interface NaniAvatarProps {
  size?: number;
  animate?: 'pulse' | 'float' | 'none';
  className?: string;
}

const ANIMATIONS = {
  pulse: {
    animate: { scale: [1, 1.06, 1] },
    transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const },
  },
  float: {
    animate: { y: [0, -6, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const },
  },
  none: {
    animate: {},
    transition: {},
  },
};

/**
 * Nani — the Kathabox narrator avatar.
 * Uses /nani-avatar.jpg (static asset, version-controlled).
 * To evolve Nani: replace public/nani-avatar.jpg and redeploy.
 */
export default function NaniAvatar({
  size = 80,
  animate = 'none',
  className = '',
}: NaniAvatarProps) {
  const { animate: anim, transition } = ANIMATIONS[animate];

  return (
    <motion.div
      animate={anim}
      transition={transition}
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nani-avatar.jpg"
        alt="Nani"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 10%',
        }}
      />
    </motion.div>
  );
}
