'use client';

import { useState, useEffect } from 'react';
import type { ComponentType } from 'react';

interface MoodAmbientProps {
  mood: string;
}

/**
 * Transparent Lottie animation overlay layered on top of story illustrations.
 * Maps mood → /public/lottie/mood-{mood}.json
 *
 * Silently renders nothing if a Lottie file is not found — drop JSON files from
 * lottiefiles.com into public/lottie/ to activate. Suggested searches:
 *   calm     → "floating clouds petals gentle"
 *   magical  → "sparkles glowing stars magic"
 *   happy    → "bouncing stars hearts celebration"
 *   exciting → "particles burst shooting stars"
 *   tense    → "flickering embers slow shadows"
 */
export default function MoodAmbient({ mood }: MoodAmbientProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [LottieComp, setLottieComp] = useState<ComponentType<any> | null>(null);
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [lottieModule, res] = await Promise.all([
          import('lottie-react'),
          fetch(`/lottie/mood-${mood}.json`),
        ]);
        if (!mounted || !res.ok) return;
        const data = await res.json();
        if (mounted) {
          setLottieComp(() => lottieModule.default);
          setAnimData(data);
        }
      } catch {
        // Lottie file not present — render nothing until files are added
      }
    }
    setLottieComp(null);
    setAnimData(null);
    load();
    return () => { mounted = false; };
  }, [mood]);

  if (!LottieComp || !animData) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.35,
        pointerEvents: 'none',
        zIndex: 7,
      }}
    >
      <LottieComp
        animationData={animData}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
