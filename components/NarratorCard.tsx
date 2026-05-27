'use client';

import { motion } from 'framer-motion';
import { Mic2, Check } from 'lucide-react';
import type { Narrator } from '@/lib/narrators';

interface NarratorCardProps {
  narrator: Narrator;
  selected: boolean;
  onSelect: () => void;
}

export default function NarratorCard({ narrator, selected, onSelect }: NarratorCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      animate={selected ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className={`w-full rounded-3xl text-left overflow-hidden transition-all ${
        selected
          ? 'shadow-card-hover ring-[3px] ring-coral/70'
          : 'shadow-soft'
      }`}
      style={{ background: 'white' }}
    >
      {/* Coloured top stripe */}
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${narrator.accentColor}, ${narrator.accentColor}88)` }}
      />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <motion.div
            animate={selected ? { rotate: [0, -8, 8, 0] } : {}}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-soft flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${narrator.accentColor}28, ${narrator.accentColor}10)` }}
          >
            {narrator.emoji}
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="font-baloo font-bold text-lg text-gray-800 leading-tight">
              {narrator.name}
            </h3>
            <span
              className="inline-block text-xs font-nunito font-extrabold px-2.5 py-0.5 rounded-full mt-1"
              style={{ background: narrator.accentColor + '20', color: narrator.accentColor }}
            >
              {narrator.tone}
            </span>
          </div>

          {/* Check / voice icon */}
          <div className="flex-shrink-0">
            {selected ? (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="w-8 h-8 bg-coral rounded-full flex items-center justify-center shadow-glow"
              >
                <Check size={16} strokeWidth={3} className="text-white" />
              </motion.div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Mic2 size={15} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Voice gender chip */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[11px] text-gray-400 font-nunito font-semibold">
            {narrator.voiceGender === 'female' ? '♀ Female voice' : '♂ Male voice'}
          </span>
        </div>

        {/* Sample quote */}
        <p className="font-nunito text-sm text-gray-500 italic leading-snug line-clamp-2">
          {narrator.sampleQuote}
        </p>
      </div>
    </motion.button>
  );
}
