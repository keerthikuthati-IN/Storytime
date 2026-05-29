'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedLullaby } from '@/app/api/songs/generate/route';
import LullabyPlayer from '@/components/LullabyPlayer';
import { getLullabyById, getLullabiesByLanguage } from '@/lib/lullabies';

interface PageProps {
  params: Promise<{ songId: string }>;
}

export default function SongPlayPage({ params }: PageProps) {
  const { songId } = use(params);
  const router = useRouter();
  const [lullaby, setLullaby] = useState<GeneratedLullaby | null>(null);
  const [error, setError] = useState(false);

  const meta = getLullabyById(songId);

  useEffect(() => {
    const raw = sessionStorage.getItem(`lullaby_${songId}`);
    if (!raw) { setError(true); return; }
    try {
      setLullaby(JSON.parse(raw));
    } catch {
      setError(true);
    }
  }, [songId]);

  function handleNext() {
    if (!meta) return;
    // Find next available (non-coming-soon) song in the same language
    const available = getLullabiesByLanguage(meta.language).filter(s => !s.comingSoon);
    const currentIdx = available.findIndex(s => s.id === songId);
    const next = available[(currentIdx + 1) % available.length];
    if (!next) { router.push('/sleep'); return; }

    const nextLullaby: GeneratedLullaby = {
      title: next.title,
      language: next.language,
      mood: next.mood,
      intro: next.intro,
      verses: next.verses.map(text => ({ text, mood: next.mood })),
    };
    sessionStorage.setItem(`lullaby_${next.id}`, JSON.stringify(nextLullaby));
    router.push(`/songs/play/${next.id}`);
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="font-nunito text-gray-600 mb-4">Could not load the lullaby.</p>
        <button
          onClick={() => router.push('/sleep')}
          className="bg-coral text-white px-6 py-3 rounded-2xl font-nunito font-bold"
        >
          Back to Whispers
        </button>
      </div>
    );
  }

  if (!lullaby) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-5xl animate-pulse">🎵</div>
      </div>
    );
  }

  return (
    <LullabyPlayer
      lullaby={lullaby}
      songId={songId}
      onEnd={() => router.push('/sleep')}
      onNext={handleNext}
    />
  );
}
