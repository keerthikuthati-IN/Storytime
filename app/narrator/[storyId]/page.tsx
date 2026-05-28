'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PageProps {
  params: Promise<{ storyId: string }>;
}

export default function NarratorPage({ params }: PageProps) {
  const { storyId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const title    = searchParams.get('title')    ?? 'A Story';
  const category = searchParams.get('category') ?? 'Adventure';
  const mood     = searchParams.get('mood')     ?? 'happy';

  useEffect(() => {
    router.replace(
      `/play/${encodeURIComponent(storyId)}?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&mood=${encodeURIComponent(mood)}&narrator=nana-luna`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
