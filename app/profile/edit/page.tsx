'use client';

// Edit profile page — reuses the same form logic but pre-fills existing data
// and shows a "Save Changes" button instead of "Let's Start Reading!"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, saveProfile, type ChildProfile } from '@/lib/storage';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const CATEGORIES = [
  { label: 'Animals', emoji: '🐾' },
  { label: 'Adventure', emoji: '🗺️' },
  { label: 'Magic', emoji: '✨' },
  { label: 'Bedtime', emoji: '🌙' },
  { label: 'Friendship', emoji: '🤝' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Vehicles', emoji: '🚗' },
  { label: 'Superheroes', emoji: '🦸' },
  { label: 'Fairy Tales', emoji: '🏰' },
  { label: 'Space', emoji: '🚀' },
];

const GENDERS = [
  { value: 'girl', label: 'Girl', emoji: '👧' },
  { value: 'boy', label: 'Boy', emoji: '👦' },
  { value: 'neutral', label: 'Any', emoji: '🧒' },
] as const;

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(3);
  const [gender, setGender] = useState<'girl' | 'boy' | 'neutral'>('neutral');
  const [categories, setCategories] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (p) {
      setName(p.name);
      setAge(p.age);
      setGender(p.gender);
      setCategories(p.favouriteCategories);
    }
  }, []);

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || categories.length === 0) return;
    const profile: ChildProfile = { name: name.trim(), age, gender, favouriteCategories: categories };
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => router.push('/discover'), 800);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#FFE8D6] pb-28">
      <div className="px-5 pt-10 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 text-sm font-nunito mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="font-baloo font-bold text-2xl text-gray-800">Edit Profile 👤</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-5">
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-bold text-gray-700 mb-2">Child's Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-lg focus:outline-none focus:border-coral"
          />
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-bold text-gray-700 mb-3">
            Age — <span className="text-coral font-extrabold text-xl">{age}</span>
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(a => (
              <button key={a} type="button" onClick={() => setAge(a)}
                className={`flex-1 py-3 rounded-2xl font-nunito font-bold text-lg transition-all ${age === a ? 'bg-coral text-white scale-105' : 'bg-gray-100 text-gray-500'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-bold text-gray-700 mb-3">Stories for</label>
          <div className="flex gap-3">
            {GENDERS.map(g => (
              <button key={g.value} type="button" onClick={() => setGender(g.value)}
                className={`flex-1 py-4 rounded-2xl font-nunito font-bold flex flex-col items-center gap-1 transition-all ${gender === g.value ? 'bg-coral text-white scale-105' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-sm">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-bold text-gray-700 mb-3">Favourite Story Types</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.label} type="button" onClick={() => toggleCategory(cat.label)}
                className={`py-3 px-3 rounded-2xl font-nunito font-semibold text-sm flex items-center gap-2 transition-all ${categories.includes(cat.label) ? 'bg-coral text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg">{cat.emoji}</span>
                {cat.label}
                {categories.includes(cat.label) && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          className={`w-full py-5 rounded-3xl font-baloo font-bold text-xl shadow-card transition-colors ${saved ? 'bg-mint text-white' : 'bg-coral text-white'}`}
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </motion.button>
      </form>

      <BottomNav />
    </div>
  );
}
