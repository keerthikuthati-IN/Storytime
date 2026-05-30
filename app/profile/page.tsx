'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile, type ChildProfile, type AgeGroup } from '@/lib/storage';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

const AGE_GROUPS: { group: AgeGroup; label: string; range: string; emoji: string; age: number }[] = [
  { group: 'newborn',       label: 'Newborn',       range: '0–1 yrs', emoji: '🌙', age: 0 },
  { group: 'toddler',       label: 'Toddler',       range: '1–3 yrs', emoji: '🐣', age: 2 },
  { group: 'early-learner', label: 'Early Learner', range: '3–6 yrs', emoji: '⭐', age: 4 },
];

const CATEGORIES = [
  { label: 'Animals',     emoji: '🐾' },
  { label: 'Adventure',   emoji: '🗺️' },
  { label: 'Magic',       emoji: '✨' },
  { label: 'Bedtime',     emoji: '🌙' },
  { label: 'Friendship',  emoji: '🤝' },
  { label: 'Nature',      emoji: '🌿' },
  { label: 'Vehicles',    emoji: '🚗' },
  { label: 'Superheroes', emoji: '🦸' },
  { label: 'Fairy Tales', emoji: '🏰' },
  { label: 'Space',       emoji: '🚀' },
];

const GENDERS = [
  { value: 'girl', label: 'Girl', emoji: '👧' },
  { value: 'boy',  label: 'Boy',  emoji: '👦' },
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<AgeGroup>('toddler');
  const [gender, setGender] = useState<'girl' | 'boy' | 'neutral'>('neutral');
  const [categories, setCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; categories?: string }>({});

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Please enter a name';
    if (categories.length === 0) newErrors.categories = 'Pick at least one category';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const age = AGE_GROUPS.find(g => g.group === selectedGroup)?.age ?? 2;
    saveProfile({ name: name.trim(), age, gender, favouriteCategories: categories });
    router.push('/discover'); // all ages land on stories
  }

  return (
    <div className="min-h-screen pb-8" style={{
      background: 'linear-gradient(160deg, #FFF4F8 0%, #F5F0FF 50%, #F0F9FF 100%)'
    }}>
      {/* Header */}
      <div className="pt-14 pb-8 px-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="text-7xl mb-4 inline-block"
        >
          🧓
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="font-baloo font-bold text-4xl gradient-text"
        >
          Kathabox
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 font-nunito font-semibold mt-1.5 text-base"
        >
          Set up your little one's profile!
        </motion.p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="px-5 space-y-4"
      >
        {/* Name */}
        <div className="glass-card rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-extrabold text-gray-700 mb-2.5 text-sm uppercase tracking-wide">
            Child's Name
          </label>
          <input
            type="text"
            placeholder="e.g. Anya"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-lg focus:outline-none focus:border-coral transition-colors bg-white/70"
          />
          {errors.name && <p className="text-coral text-sm mt-1.5 font-nunito font-bold">{errors.name}</p>}
        </div>

        {/* Age group */}
        <div className="glass-card rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-extrabold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Age Group
          </label>
          <div className="flex gap-2">
            {AGE_GROUPS.map(g => (
              <motion.button
                key={g.group}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedGroup(g.group)}
                className={`flex-1 py-4 rounded-2xl font-nunito font-bold flex flex-col items-center gap-1.5 transition-all ${
                  selectedGroup === g.group
                    ? 'bg-coral text-white shadow-glow'
                    : 'bg-white/80 text-gray-600'
                }`}
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-xs font-extrabold">{g.label}</span>
                <span className="text-[10px] opacity-70">{g.range}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="glass-card rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-extrabold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Stories for
          </label>
          <div className="flex gap-3">
            {GENDERS.map(g => (
              <motion.button
                key={g.value}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setGender(g.value)}
                className={`flex-1 py-4 rounded-2xl font-nunito font-bold flex flex-col items-center gap-1.5 transition-all ${
                  gender === g.value
                    ? 'bg-coral text-white shadow-glow'
                    : 'bg-white/80 text-gray-600'
                }`}
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-sm">{g.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="glass-card rounded-3xl p-5 shadow-soft">
          <label className="block font-nunito font-extrabold text-gray-700 mb-1 text-sm uppercase tracking-wide">
            Favourite Story Types
          </label>
          <p className="text-gray-400 text-xs font-nunito font-semibold mb-3">Pick as many as you like</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => {
              const active = categories.includes(cat.label);
              return (
                <motion.button
                  key={cat.label}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { toggleCategory(cat.label); setErrors(p => ({ ...p, categories: undefined })); }}
                  className={`py-3 px-3 rounded-2xl font-nunito font-bold text-sm flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-coral text-white shadow-glow'
                      : 'bg-white/80 text-gray-600'
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="flex-1 text-left">{cat.label}</span>
                  {active && <Check size={14} strokeWidth={3} />}
                </motion.button>
              );
            })}
          </div>
          {errors.categories && (
            <p className="text-coral text-sm mt-2.5 font-nunito font-bold">{errors.categories}</p>
          )}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          className="w-full bg-coral text-white py-5 rounded-3xl font-baloo font-bold text-xl shadow-glow flex items-center justify-center gap-3"
        >
          Let's Start Reading!
          <ArrowRight size={22} strokeWidth={2.5} />
        </motion.button>
      </motion.form>
    </div>
  );
}
