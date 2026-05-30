'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';
import { getProfile, deleteSavedStory, hasStoryCached } from '@/lib/storage';
import type { ChildProfile } from '@/lib/storage';
import type { StoryRecommendation } from '@/lib/claude';
import { getCategoryStyle } from '@/lib/storyCovers';
import {
  getTodayStories,
  generateDailyStories,
  CATEGORY_EMOJIS,
  type DailyStory,
  type StoryTeaser,
} from '@/lib/dailyStories';
import { fetchIllustrationDataUrl } from '@/lib/illustrationFetcher';
import { getDefaultNarrator } from '@/lib/narrators';
import BottomNav from '@/components/BottomNav';

const LIKED_STORIES_KEY = 'storytime_liked_objects';

function getLikedStoryObjects(): StoryRecommendation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type Tab = 'today' | 'saved';

// ── Story Card ─────────────────────────────────────────────────────────────

function DailyStoryCard({
  story,
  portrait,
  index,
  onPlay,
}: {
  story: DailyStory;
  portrait: string | null;
  index: number;
  onPlay: () => void;
}) {
  const narrator = getDefaultNarrator();
  const langLabel = story.language === 'telugu' ? '🇮🇳 తెలుగు' : '🇬🇧 English';
  const catEmoji = CATEGORY_EMOJIS[story.category] ?? '📚';
  const catStyle = getCategoryStyle(story.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.85, rotate: -2 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.12, type: 'spring', stiffness: 320, damping: 24 }}
      onClick={onPlay}
      className="bg-white rounded-3xl overflow-hidden shadow-soft cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Illustration / portrait area */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 180, background: `linear-gradient(135deg, ${catStyle.from} 0%, ${catStyle.to} 100%)` }}
      >
        <AnimatePresence>
          {portrait && (
            <motion.div
              key="portrait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${portrait})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            />
          )}
        </AnimatePresence>

        {!portrait && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: 72 }}
            >
              {catEmoji}
            </motion.span>
          </div>
        )}

        {/* Language badge */}
        <span className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-nunito font-bold px-2.5 py-1 rounded-full">
          {langLabel}
        </span>

        {/* Category badge */}
        <span className="absolute top-3 right-3 bg-white/80 text-gray-700 text-[10px] font-nunito font-bold px-2.5 py-1 rounded-full">
          {catEmoji} {story.category}
        </span>

        {/* Duration */}
        <span className="absolute bottom-3 right-3 bg-black/35 backdrop-blur-sm text-white text-[10px] font-nunito font-semibold px-2.5 py-1 rounded-full">
          ⏱ ~3 min
        </span>
      </div>

      {/* Text info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-baloo font-bold text-base text-gray-800 leading-tight line-clamp-1">
            {story.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-base leading-none">{narrator.emoji}</span>
            <span className="font-nunito text-xs text-gray-400 font-semibold">{narrator.name}</span>
          </div>
        </div>
        <motion.div
          whileTap={{ scale: 0.88 }}
          className="w-11 h-11 rounded-2xl bg-coral flex items-center justify-center text-white text-lg shadow-glow flex-shrink-0"
        >
          ▶
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Kathabox Loading State ─────────────────────────────────────────────────

function KathaboxLoading({ readyCount }: { readyCount: number }) {
  const stars = ['✨', '✨ ✨', '✨ ✨ ✨'];
  const messages = [
    'Nani is preparing your stories, kanna…',
    'One story is ready! Two more coming…',
    'Almost there… one last story…',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-10 px-6"
    >
      {/* Nani */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 56 }}
      >
        🧓
      </motion.div>

      <motion.p
        key={readyCount}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-nunito text-sm text-gray-500 text-center mt-3 mb-6 leading-relaxed"
      >
        {messages[readyCount] ?? messages[0]}
      </motion.p>

      {/* Kathabox */}
      <motion.div
        animate={readyCount < 3 ? {
          rotate: [0, -2, 2, -1, 1, 0],
          scale: [1, 1.04, 1],
        } : { scale: [1, 1.06, 1] }}
        transition={{
          duration: readyCount < 3 ? 1.2 : 2,
          repeat: Infinity,
          repeatDelay: readyCount < 3 ? 2.5 : 0,
          ease: 'easeInOut',
        }}
        style={{ fontSize: 64 }}
        className="relative"
      >
        📦
        {/* Sparkles around the box */}
        {readyCount < 3 && (
          <motion.span
            className="absolute -top-2 -right-2 text-base"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
          >
            ✨
          </motion.span>
        )}
      </motion.div>

      {/* Progress stars */}
      <motion.p
        key={`stars-${readyCount}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="font-nunito text-xl mt-3 mb-1 tracking-widest"
      >
        {stars[readyCount] ?? ''}
      </motion.p>
      <p className="font-nunito text-xs text-gray-300">
        {readyCount} of 3 stories ready
      </p>
    </motion.div>
  );
}

// ── Tomorrow's Glimpse ─────────────────────────────────────────────────────

function TomorrowGlimpse({ teasers }: { teasers: StoryTeaser[] }) {
  if (teasers.length === 0) return null;

  return (
    <div className="mt-8 mb-2">
      {/* Closed Kathabox header */}
      <div className="flex flex-col items-center mb-4">
        <motion.div
          animate={{ opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ fontSize: 36 }}
          className="relative"
        >
          📦
          <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>
        </motion.div>
        <p className="font-baloo font-bold text-sm text-gray-400 mt-2">
          Tomorrow&apos;s Kathabox opens at sunrise 🌅
        </p>
      </div>

      {/* Teaser chips */}
      <div className="flex gap-3 justify-center">
        {teasers.map((teaser, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex-shrink-0 w-24 bg-white/50 rounded-2xl p-3 text-center border border-gray-100/60 backdrop-blur-sm"
          >
            <motion.div
              animate={{ opacity: [0.4, 0.65, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.6 }}
              className="text-2xl mb-1"
            >
              {teaser.emoji}
            </motion.div>
            <p className="font-nunito text-[11px] text-gray-400 font-bold leading-tight">
              {teaser.category}
            </p>
            <p className="font-nunito text-[9px] text-gray-300 mt-0.5">
              {teaser.language === 'telugu' ? 'తెలుగు' : 'English'}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Today's Stories View ───────────────────────────────────────────────────

function TodayStoriesView({ profile }: { profile: ChildProfile }) {
  const router = useRouter();
  const [stories, setStories] = useState<DailyStory[]>([]);
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [tomorrowTeaser, setTomorrowTeaser] = useState<StoryTeaser[]>([]);
  const [generating, setGenerating] = useState(false);
  // Guard against React StrictMode double-invocation of the effect
  const generatingRef = useRef(false);

  const loadPortrait = useCallback(async (story: DailyStory) => {
    const url = await fetchIllustrationDataUrl(
      story.id, -1, story.story.title, 'magical', story.story.title, 15_000
    ).catch(() => null);
    if (url) setPortraits(prev => ({ ...prev, [story.id]: url }));
  }, []);

  useEffect(() => {
    const existing = getTodayStories();
    if (existing) {
      // Deduplicate by id in case of prior buggy writes
      const unique = existing.stories.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      setStories(unique);
      setTomorrowTeaser(existing.tomorrowTeaser);
      unique.forEach(loadPortrait);
      return;
    }

    // Prevent StrictMode double-run from firing two generation requests
    if (generatingRef.current) return;
    generatingRef.current = true;

    // First open of the day — generate stories progressively
    setGenerating(true);
    generateDailyStories(profile, (story) => {
      // Deduplicate in case of any re-render edge cases
      setStories(prev => prev.some(s => s.id === story.id) ? prev : [...prev, story]);
      loadPortrait(story);
    }).then(data => {
      setTomorrowTeaser(data.tomorrowTeaser);
      setGenerating(false);
    }).catch(() => {
      setGenerating(false);
      generatingRef.current = false; // allow retry on error
    });
  }, [profile, loadPortrait]);

  function playStory(story: DailyStory) {
    const params = new URLSearchParams({
      title:    story.title,
      category: story.category,
      mood:     story.mood,
      narrator: story.narratorId,
      language: story.language,
    });
    router.push(`/play/${encodeURIComponent(story.id)}?${params.toString()}`);
  }

  const allReady = !generating && stories.length === 3;

  return (
    <div className="px-5">

      {/* Kathabox section header — shown once all stories are ready */}
      <AnimatePresence>
        {allReady && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <span style={{ fontSize: 22 }}>📦</span>
            <p className="font-nunito text-xs text-gray-400 font-semibold">
              Today&apos;s stories from your Kathabox
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories pop out from Kathabox */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {stories.map((story, i) => (
            <DailyStoryCard
              key={story.id}
              story={story}
              portrait={portraits[story.id] ?? null}
              index={i}
              onPlay={() => playStory(story)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Kathabox loading animation — shown below ready cards while generating */}
      <AnimatePresence>
        {generating && (
          <motion.div
            key="kathabox-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <KathaboxLoading readyCount={stories.length} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tomorrow's Glimpse */}
      <AnimatePresence>
        {allReady && <TomorrowGlimpse teasers={tomorrowTeaser} />}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [savedStories, setSavedStories] = useState<StoryRecommendation[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshSaved = useCallback(() => setSavedStories(getLikedStoryObjects()), []);

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/profile'); return; }
    setProfile(p);
    refreshSaved();
  }, [router, refreshSaved]);

  useEffect(() => {
    if (tab === 'saved') refreshSaved();
  }, [tab, refreshSaved]);

  if (!profile) return null;

  function handleDelete(e: React.MouseEvent, storyId: string) {
    e.stopPropagation();
    if (confirmDeleteId === storyId) {
      deleteSavedStory(storyId);
      setSavedStories(prev => prev.filter(s => s.id !== storyId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(storyId);
    }
  }

  const savedCount = savedStories.length;
  const cachedIds = new Set(savedStories.map(s => s.id).filter(id => hasStoryCached(id)));

  return (
    <div className="min-h-screen fun-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-11 pb-4">
        <p className="font-nunito text-gray-400 text-sm font-semibold">{timeGreeting()},</p>
        <h1 className="font-baloo font-bold text-[26px] leading-tight">
          <span className="gradient-text">{profile.name}</span>
          <span className="text-gray-800"> 👋</span>
        </h1>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-5">
        <div className="flex gap-1.5 bg-white/70 backdrop-blur-sm rounded-2xl p-1.5 shadow-soft">
          <button
            onClick={() => setTab('today')}
            className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all duration-200 ${
              tab === 'today' ? 'bg-coral text-white shadow-glow' : 'text-gray-400'
            }`}
          >
            ✨ Today
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`flex-1 py-2.5 rounded-xl font-nunito font-bold text-sm transition-all duration-200 relative ${
              tab === 'saved' ? 'bg-coral text-white shadow-glow' : 'text-gray-400'
            }`}
          >
            ❤️ Saved
            {savedCount > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-extrabold ${
                tab === 'saved' ? 'bg-white/25 text-white' : 'bg-coral/15 text-coral'
              }`}>
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Today tab */}
        {tab === 'today' && (
          <motion.div
            key="today"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <TodayStoriesView profile={profile} />
          </motion.div>
        )}

        {/* Saved tab */}
        {tab === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            className="px-5"
          >
            {savedStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-7xl mb-5"
                >
                  📚
                </motion.div>
                <h2 className="font-baloo font-bold text-xl text-gray-700 mb-2">No stories saved yet</h2>
                <p className="font-nunito text-gray-400 text-sm leading-relaxed mb-6 max-w-[240px]">
                  Stories you&apos;ve played will appear here for easy replay.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {savedStories.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                      onClick={() => {
                        setConfirmDeleteId(null);
                        router.push(`/play/${encodeURIComponent(story.id)}?title=${encodeURIComponent(story.title)}&category=${encodeURIComponent(story.category)}&mood=${encodeURIComponent(story.mood)}&narrator=nana-luna&language=${encodeURIComponent((story as { language?: string }).language ?? 'english')}`);
                      }}
                      className="bg-white rounded-3xl overflow-hidden shadow-soft cursor-pointer"
                    >
                      <div
                        className="relative h-36 w-full flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${getCategoryStyle(story.category).from} 0%, ${getCategoryStyle(story.category).to} 100%)` }}
                      >
                        <span className="text-6xl leading-none select-none drop-shadow-sm relative z-10">
                          {getCategoryStyle(story.category).emoji}
                        </span>
                        <span className="absolute bottom-2 left-2 bg-white/80 text-gray-600 text-[10px] font-nunito font-extrabold px-2 py-0.5 rounded-full">
                          {story.category}
                        </span>
                        {cachedIds.has(story.id) && confirmDeleteId !== story.id && (
                          <span className="absolute bottom-2 right-2 bg-white/80 text-[10px] font-nunito font-extrabold px-1.5 py-0.5 rounded-full text-indigo-500">
                            📖
                          </span>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => handleDelete(e, story.id)}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-soft transition-colors ${
                            confirmDeleteId === story.id ? 'bg-red-500' : 'bg-black/40'
                          }`}
                        >
                          {confirmDeleteId === story.id
                            ? <Check size={13} strokeWidth={3} className="text-white" />
                            : <Trash2 size={12} className="text-white" />
                          }
                        </motion.button>
                      </div>
                      <div className="p-3">
                        <h3 className="font-baloo font-bold text-sm text-gray-800 leading-tight line-clamp-2">
                          {story.title}
                        </h3>
                        <p className="font-nunito text-xs text-gray-400 mt-1 font-semibold">
                          {story.duration} · {story.ageRange}
                        </p>
                        {confirmDeleteId === story.id && (
                          <p className="font-nunito text-[10px] text-red-400 mt-1 font-bold">Tap ✓ to confirm</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
