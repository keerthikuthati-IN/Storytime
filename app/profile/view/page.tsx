'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getProfile, getStorytimeData } from '@/lib/storage';
import type { ChildProfile } from '@/lib/storage';
import { getNarratorById } from '@/lib/narrators';
import BottomNav from '@/components/BottomNav';

const FAQ_ITEMS = [
  {
    q: 'Where is my child\'s data stored?',
    a: 'Everything — your child\'s profile, memories, and photos — is saved privately on this device only. Nothing is uploaded to any server. If you clear your browser data, it will be erased.',
  },
  {
    q: 'How are stories created?',
    a: 'Each story is freshly written by AI (Claude by Anthropic) the moment you pick one. It uses your child\'s name, age group, and interests to craft a unique bedtime tale just for them. No two stories are ever the same.',
  },
  {
    q: 'What information is sent to the AI?',
    a: 'Only the story title, category, mood, your child\'s first name, and age group are sent when generating a story. Memories, photos, and any other personal data never leave your device.',
  },
  {
    q: 'Can anyone else see our memories?',
    a: 'No. Memories are stored in your browser\'s local storage and are completely private. They are never synced, backed up, or shared with anyone.',
  },
  {
    q: 'Are lullabies and sounds safe for babies?',
    a: 'Yes. All audio is carefully chosen for young ears — gentle volumes, soft tones, and looping ambient sounds. We recommend keeping device volume at a comfortable low level.',
  },
];

function FaqItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-3"
      >
        <span className="font-nunito font-bold text-sm text-gray-700">{item.q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="font-nunito text-gray-500 text-sm leading-relaxed pb-4">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProfileViewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [stats, setStats] = useState({ liked: 0, played: 0, narrator: '' });

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/profile'); return; }
    setProfile(p);
    const data = getStorytimeData();
    const n = data.preferredNarrator ? getNarratorById(data.preferredNarrator) : null;
    setStats({
      liked: data.likedStories.length,
      played: data.playedStories.length,
      narrator: n?.name ?? 'None yet',
    });
  }, [router]);

  if (!profile) return null;

  const genderEmoji = profile.gender === 'girl' ? '👧' : profile.gender === 'boy' ? '👦' : '🧒';

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="bg-gradient-to-b from-coral to-[#FF9999] pt-12 pb-10 px-5 text-center text-white">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-7xl mb-3"
        >
          {genderEmoji}
        </motion.div>
        <h1 className="font-baloo font-bold text-[26px] leading-tight">{profile.name}</h1>
        <p className="font-nunito opacity-80 mt-1">Age {profile.age} · {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</p>
      </div>

      <div className="px-5 -mt-5 space-y-4">
        {/* Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-card grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-baloo font-bold text-2xl text-coral">{stats.liked}</p>
            <p className="font-nunito text-xs text-gray-400">Saved</p>
          </div>
          <div>
            <p className="font-baloo font-bold text-2xl text-sky">{stats.played}</p>
            <p className="font-nunito text-xs text-gray-400">Played</p>
          </div>
          <div>
            <p className="font-baloo font-bold text-sm text-sunshine leading-tight">{stats.narrator.split(' ')[0]}</p>
            <p className="font-nunito text-xs text-gray-400">Narrator</p>
          </div>
        </div>

        {/* Favourite categories */}
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <h2 className="font-baloo font-bold text-base text-gray-700 mb-3">Favourite Topics</h2>
          <div className="flex flex-wrap gap-2">
            {profile.favouriteCategories.map(cat => (
              <span key={cat} className="bg-coral/10 text-coral font-nunito font-semibold text-sm px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Edit button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/profile/edit')}
          className="w-full bg-coral text-white py-4 rounded-3xl font-nunito font-bold text-base shadow-glow"
        >
          ✏️ Edit Profile
        </motion.button>

        {/* FAQ */}
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <h2 className="font-baloo font-bold text-base text-gray-700 mb-1">❓ FAQ</h2>
          <p className="font-nunito text-xs text-gray-400 mb-3 font-semibold">Your data, privacy & how it works</p>
          {FAQ_ITEMS.map(item => <FaqItem key={item.q} item={item} />)}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
