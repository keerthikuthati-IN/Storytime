'use client';

import { motion } from 'framer-motion';

interface KathaboxLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  muted?: boolean;
}

const SIZES = {
  xs: 'text-xs tracking-[0.2em]',
  sm: 'text-sm tracking-[0.25em]',
  md: 'text-xl tracking-[0.3em]',
  lg: 'text-3xl tracking-[0.3em]',
};

/**
 * The Kathabox brand mark — styled text, not an emoji.
 * Use muted=true for the "Tomorrow's Kathabox" locked/greyed state.
 */
export default function KathaboxLogo({ size = 'md', muted = false }: KathaboxLogoProps) {
  return (
    <motion.div
      className="flex items-center gap-1.5 select-none"
      animate={muted ? {} : { opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {!muted && (
        <motion.span
          animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-amber-400"
          style={{ fontSize: size === 'lg' ? 22 : size === 'md' ? 14 : 11 }}
        >
          ✨
        </motion.span>
      )}

      <span
        className={`font-baloo font-black ${SIZES[size]}`}
        style={{
          background: muted
            ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
            : 'linear-gradient(135deg, #F4A261 0%, #E76F51 60%, #D4541A 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        KATHABOX
      </span>

      {!muted && (
        <motion.span
          animate={{ scale: [1, 1.3, 1], rotate: [0, -15, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="text-amber-400"
          style={{ fontSize: size === 'lg' ? 22 : size === 'md' ? 14 : 11 }}
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  );
}
