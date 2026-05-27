'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      router.replace('/discover');
    } else {
      router.replace('/profile');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce_gentle">📚</div>
        <p className="font-nunito text-coral font-bold text-lg">Loading Story Time...</p>
      </div>
    </div>
  );
}
