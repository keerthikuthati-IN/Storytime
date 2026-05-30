'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/storage';
import NaniAvatar from '@/components/NaniAvatar';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      router.replace('/discover'); // all ages see stories (newborns get warmer story prompts)
    } else {
      router.replace('/profile');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="text-center">
        <div className="mb-4 flex justify-center"><NaniAvatar size={72} animate="pulse" /></div>
        <p className="font-nunito text-coral font-bold text-lg">Loading Kathabox...</p>
      </div>
    </div>
  );
}
