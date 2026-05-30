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
  getTodaySlotPreviews,
  generateDailyStories,
  CATEGORY_EMOJIS,
  SLOT_LABELS,
  SLOT_UNLOCK_HOURS,
  type DailyStory,
  type DailySlotPreview,
  type StorySlot,
} from '@/lib/dailyStories';
import { fetchIllustrationDataUrl } from '@/lib/illustrationFetcher';
import { getDefaultNarrator } from '@/lib/narrators';
import BottomNav from '@/components/BottomNav';
import NaniAvatar from '@/components/NaniAvatar';
import KathaboxLogo from '@/components/KathaboxLogo';

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

// ── Slot helpers ───────────────────────────────────────────────────────────

function getSlotStatus(slot: StorySlot): 'past' | 'current' | 'future' {
  const h = new Date().getHours();
  if (slot === 'morning') {
    if (h < 6)  return 'future';
    if (h < 12) return 'current';
    return 'past';
  }
  if (slot === 'afternoon') {
    if (h < 12) return 'future';
    if (h < 18) return 'current';
    return 'past';
  }
  // evening
  return h < 18 ? 'future' : 'current';
}

function getCountdownLabel(slot: StorySlot): string {
  const unlockHour = SLOT_UNLOCK_HOURS[slot];
  const now = new Date();
  const target = new Date();
  target.setHours(unlockHour, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Available now';
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
  if (diffH > 0) return `Opens in ${diffH}h ${diffM}m`;
  return `Opens in ${diffM}m`;
}

// ── Time Slot Card ──────────────────────────────────────────────────────────

function TimeSlotCard({
  preview,
  story,
  portrait,
  status,
  onPlay,
  onLockedTap,
}: {
  preview: DailySlotPreview;
  story: DailyStory | null;     // null = still generating
  portrait: string | null;
  status: 'past' | 'current' | 'future';
  onPlay: () => void;
  onLockedTap: () => void;
}) {
  const narrator   = getDefaultNarrator();
  const catEmoji   = CATEGORY_EMOJIS[preview.category] ?? '📚';
  const catStyle   = getCategoryStyle(preview.category);
  const slotInfo   = SLOT_LABELS[preview.slot] ?? { icon: '📖', label: 'Story' };
  const langLabel  = preview.language === 'telugu' ? '🇮🇳 తెలుగు' : '🇬🇧 English';
  const isFuture   = status === 'future';
  const isReady    = story !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      onClick={isFuture ? onLockedTap : onPlay}
      className={`bg-white rounded-3xl overflow-hidden shadow-soft cursor-pointer active:scale-[0.98] transition-transform relative ${
        status === 'current' ? 'ring-2 ring-coral shadow-glow' : ''
      } ${status === 'past' ? 'opacity-80' : ''}`}
    >
      {/* Slot label pill */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
        <span className="text-base">{slotInfo.icon}</span>
        <span className="font-nunito text-xs font-bold text-gray-500 uppercase tracking-wide">
          {slotInfo.label}
        </span>
        {status === 'current' && (
          <span className="ml-auto bg-coral/10 text-coral text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full">
            Now
          </span>
        )}
        {status === 'past' && (
          <span className="ml-auto bg-gray-100 text-gray-400 text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={9} strokeWidth={3} /> Played
          </span>
        )}
      </div>

      {/* Illustration / portrait area */}
      <div
        className="relative w-full overflow-hidden mx-3 rounded-2xl"
        style={{ height: 160, width: 'calc(100% - 24px)', background: `linear-gradient(135deg, ${catStyle.from} 0%, ${catStyle.to} 100%)` }}
      >
        <AnimatePresence>
          {portrait && !isFuture && (
            <motion.div
              key="portrait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 rounded-2xl"
              style={{
                backgroundImage: `url(${portrait})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            />
          )}
        </AnimatePresence>

        {/* Placeholder emoji — shown when no portrait or future */}
        {(!portrait || isFuture) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={isFuture ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: isFuture ? 56 : 64, opacity: isFuture ? 0.35 : 1 }}
            >
              {catEmoji}
            </motion.span>
          </div>
        )}

        {/* Future lock overlay */}
        {isFuture && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-[2px] rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <span style={{ fontSize: 18 }}>🔒</span>
            </div>
            <span className="font-nunito text-white text-xs font-bold bg-black/30 px-3 py-1 rounded-full">
              {getCountdownLabel(preview.slot)}
            </span>
          </div>
        )}

        {/* Language badge */}
        <span className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full">
          {langLabel}
        </span>

        {/* Category badge */}
        <span className="absolute top-2 right-2 bg-white/80 text-gray-700 text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full">
          {catEmoji} {preview.category}
        </span>
      </div>

      {/* Story info + CTA */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-baloo font-bold text-base text-gray-800 leading-tight line-clamp-1">
            {preview.title}
          </h3>
          {isReady ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <NaniAvatar size={18} animate="none" />
              <span className="font-nunito text-xs text-gray-400 font-semibold">{narrator.name}</span>
              <span className="text-gray-200 mx-0.5">·</span>
              <span className="font-nunito text-xs text-gray-400">⏱ ~3 min</span>
            </div>
          ) : (
            // Story still generating — show subtle dots for current slot
            status === 'current' ? (
              <div className="flex items-center gap-1 mt-1">
                {[0, 0.15, 0.3].map(d => (
                  <motion.span
                    key={d}
                    className="w-1 h-1 rounded-full bg-coral/50 inline-block"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  />
                ))}
                <span className="font-nunito text-[10px] text-gray-400 ml-1">Nani is getting ready…</span>
              </div>
            ) : (
              <span className="font-nunito text-xs text-gray-300 mt-0.5 block">Coming soon…</span>
            )
          )}
        </div>

        {isFuture ? (
          <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300 text-lg flex-shrink-0">
            🔒
          </div>
        ) : isReady ? (
          <motion.div
            whileTap={{ scale: 0.88 }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-glow flex-shrink-0 ${
              status === 'current' ? 'bg-coral' : 'bg-gray-300'
            }`}
          >
            {status === 'current' ? '▶' : '↺'}
          </motion.div>
        ) : (
          // Generating — spinner ring for current, nothing for past
          status === 'current' ? (
            <div className="w-11 h-11 rounded-2xl bg-coral/10 flex items-center justify-center flex-shrink-0">
              <motion.div
                className="w-5 h-5 rounded-full border-2 border-coral/30 border-t-coral"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gray-50 flex-shrink-0" />
          )
        )}
      </div>
    </motion.div>
  );
}

// ── Loading state ───────────────────────────────────────────────────────────

function StoriesLoading({ readyCount }: { readyCount: number }) {
  const messages = [
    'Nani is preparing your stories, kanna…',
    'One story is ready! Two more coming…',
    'Almost there… one last story…',
  ];
  const isInitial = readyCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, paddingTop: isInitial ? 48 : 16, paddingBottom: isInitial ? 40 : 12 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="flex flex-col items-center px-6"
    >
      <motion.div
        animate={{ scale: isInitial ? 1 : 72 / 160 }}
        transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        style={{ transformOrigin: 'top center', width: 160, height: 160, flexShrink: 0 }}
      >
        <NaniAvatar size={160} animate={isInitial ? 'float' : 'pulse'} />
      </motion.div>
      <motion.p
        key={readyCount}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`font-nunito text-gray-500 text-center leading-relaxed ${isInitial ? 'text-sm mt-4 mb-5' : 'text-xs mt-1 mb-3'}`}
      >
        {messages[readyCount] ?? messages[0]}
      </motion.p>
      <AnimatePresence>
        {isInitial && (
          <motion.div
            key="logo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [1, 1.05, 1] }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <KathaboxLogo size="lg" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.p
        key={`progress-${readyCount}`}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="font-nunito text-xs text-gray-400 mt-2"
      >
        {readyCount} of 3 stories ready
      </motion.p>
    </motion.div>
  );
}

// ── Today's Stories View ────────────────────────────────────────────────────

const SLOT_ORDER: StorySlot[] = ['morning', 'afternoon', 'evening'];

function TodayStoriesView({ profile }: { profile: ChildProfile }) {
  const router = useRouter();
  // Previews are computed synchronously — titles/categories shown instantly, 0ms wait
  const [previews] = useState<DailySlotPreview[]>(() => getTodaySlotPreviews(profile));
  const [stories, setStories]   = useState<DailyStory[]>([]);
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const generatingRef = useRef(false);

  const loadPortrait = useCallback(async (story: DailyStory) => {
    const url = await fetchIllustrationDataUrl(
      story.id, -1, story.story.title, 'magical', story.story.title, story.story.language, 15_000
    ).catch(() => null);
    if (url) setPortraits(prev => ({ ...prev, [story.id]: url }));
  }, []);

  useEffect(() => {
    const existing = getTodayStories();
    if (existing) {
      const unique = existing.stories.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      setStories(unique);
      unique.forEach(loadPortrait);
      return;
    }

    if (generatingRef.current) return;
    generatingRef.current = true;

    setGenerating(true);
    generateDailyStories(profile, (story) => {
      setStories(prev => prev.some(s => s.id === story.id) ? prev : [...prev, story]);
      loadPortrait(story);
    }).then(() => {
      setGenerating(false);
    }).catch(() => {
      setGenerating(false);
      generatingRef.current = false;
    });
  }, [profile, loadPortrait]);

  function playStory(story: DailyStory) {
    const params = new URLSearchParams({
      title: story.title, category: story.category, mood: story.mood,
      narrator: story.narratorId, language: story.language,
    });
    router.push(`/play/${encodeURIComponent(story.id)}?${params.toString()}`);
  }

  function handleLockedTap(slot: StorySlot) {
    const unlockHour = SLOT_UNLOCK_HOURS[slot];
    const label = `${SLOT_LABELS[slot].icon} Nani will have this ready at ${unlockHour < 12 ? `${unlockHour}am` : `${unlockHour - 12 || 12}pm`}`;
    setLockedToast(label);
    setTimeout(() => setLockedToast(null), 2500);
  }

  // Map full stories onto previews — previews are always the source of truth
  const storiesById = Object.fromEntries(stories.map(s => [s.id, s]));

  const allReady = !generating && stories.length >= 3;

  return (
    <div className="px-5">
      <AnimatePresence>
        {allReady && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start gap-1 mb-4"
          >
            <p className="font-nunito text-xs text-gray-400 font-semibold">
              Today&apos;s stories from your
            </p>
            <KathaboxLogo size="sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time-slot cards — rendered immediately from previews, activated as stories arrive */}
      <div className="flex flex-col gap-4">
        {previews.map(preview => {
          const story = storiesById[preview.storyId] ?? null;
          const status = getSlotStatus(preview.slot);
          return (
            <TimeSlotCard
              key={preview.storyId}
              preview={preview}
              story={story}
              portrait={story ? (portraits[story.id] ?? null) : null}
              status={status}
              onPlay={() => story && playStory(story)}
              onLockedTap={() => handleLockedTap(preview.slot)}
            />
          );
        })}
      </div>

      {/* Locked slot toast */}
      <AnimatePresence>
        {lockedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800/90 backdrop-blur-sm text-white text-sm font-nunito font-semibold px-4 py-2.5 rounded-2xl shadow-xl whitespace-nowrap"
          >
            {lockedToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<ChildProfile | null>(null);
  const [tab, setTab]             = useState<Tab>('today');
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
  const cachedIds  = new Set(savedStories.map(s => s.id).filter(id => hasStoryCached(id)));

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
