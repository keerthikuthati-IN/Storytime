'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Plus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getProfile } from '@/lib/storage';
import {
  getAllMemories, addMemory, deleteMemory, compressImage,
  MILESTONE_LABELS, MILESTONE_EMOJIS, MEMORY_EMOJI_PRESETS,
  type Memory, type MilestoneType,
} from '@/lib/memories';

// ── Memory Card ──────────────────────────────────────────────────────────

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const date = new Date(memory.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <motion.div
        layout
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(true)}
        className="bg-white rounded-3xl p-4 shadow-soft cursor-pointer border border-amber-50 relative overflow-hidden"
      >
        {/* Parchment texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjOTk5Ii8+PC9zdmc+')] pointer-events-none rounded-3xl" />

        <div className="flex items-start gap-3 relative">
          {/* Photo thumbnail or emoji */}
          <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-amber-50 flex items-center justify-center">
            {memory.photoDataUrl
              ? <img src={memory.photoDataUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl">{memory.emoji}</span>
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-baloo font-bold text-sm text-gray-800 leading-tight">{memory.title}</p>
            <p className="font-nunito text-[10px] text-amber-600 font-bold mt-0.5">{date}</p>
            <span className="inline-block mt-1 text-[10px] font-nunito font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-500">
              {MILESTONE_EMOJIS[memory.milestoneType]} {MILESTONE_LABELS[memory.milestoneType]}
            </span>
            {memory.note && (
              <p className="font-nunito text-xs text-gray-400 mt-1 line-clamp-2 leading-snug">{memory.note}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setExpanded(false)} />
            <motion.div
              className="relative bg-white w-full max-w-[430px] rounded-t-3xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-nunito text-[10px] text-amber-500 font-bold uppercase tracking-wider">{date}</p>
                  <h2 className="font-baloo font-bold text-xl text-gray-800 mt-0.5">{memory.title}</h2>
                  <span className="inline-block mt-1 text-[10px] font-nunito font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-500">
                    {MILESTONE_EMOJIS[memory.milestoneType]} {MILESTONE_LABELS[memory.milestoneType]}
                  </span>
                </div>
                <button onClick={() => setExpanded(false)} className="text-gray-400 p-1">
                  <X size={20} />
                </button>
              </div>

              {memory.photoDataUrl && (
                <img src={memory.photoDataUrl} alt="" className="w-full rounded-2xl object-cover mb-4 max-h-64" />
              )}

              {memory.note && (
                <p className="font-nunito text-gray-600 text-sm leading-relaxed">{memory.note}</p>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button onClick={() => { onDelete(); setExpanded(false); }}
                      className="flex-1 py-3 rounded-2xl bg-red-50 text-red-500 font-nunito font-bold text-sm">
                      Yes, delete
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-nunito font-bold text-sm">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="w-full py-3 rounded-2xl bg-gray-50 text-gray-400 font-nunito font-bold text-sm">
                    Delete memory
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Add Memory Modal ──────────────────────────────────────────────────────

const MILESTONE_TYPES: MilestoneType[] = [
  'bedtime_moment', 'first_word', 'first_step', 'first_laugh', 'first_day_school', 'custom',
];

function AddMemoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle]             = useState('');
  const [note, setNote]               = useState('');
  const [milestone, setMilestone]     = useState<MilestoneType>('bedtime_moment');
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10));
  const [emoji, setEmoji]             = useState('🌙');
  const [photo, setPhoto]             = useState<string | undefined>();
  const [saving, setSaving]           = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 100);
    setPhoto(compressed);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await addMemory({ title: title.trim(), note: note.trim() || undefined, milestoneType: milestone, date, emoji, photoDataUrl: photo });
    setSaving(false);
    onSaved();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full max-w-[430px] rounded-t-3xl flex flex-col max-h-[92vh]"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header — close left, title centre, Save right */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
          <h2 className="font-baloo font-bold text-xl text-gray-800">Add a Memory</h2>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="bg-coral text-white px-4 py-2 rounded-2xl font-nunito font-bold text-sm shadow-glow disabled:opacity-40 transition-opacity"
          >
            {saving ? '…' : 'Save'}
          </motion.button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 pb-8">

          {/* Emoji picker */}
          <div>
            <p className="font-nunito font-bold text-xs text-gray-500 mb-2 uppercase tracking-wider">Pick an emoji</p>
            <div className="flex flex-wrap gap-2">
              {MEMORY_EMOJI_PRESETS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-2xl text-xl flex items-center justify-center transition-all ${emoji === e ? 'bg-coral/10 scale-110 shadow-sm' : 'bg-gray-50'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Title *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder="e.g. First word: Amma!"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={400}
              placeholder="Write a little story about this moment…"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-700 text-sm focus:outline-none focus:border-coral/40 resize-none"
            />
          </div>

          {/* Milestone type */}
          <div>
            <p className="font-nunito font-bold text-xs text-gray-500 mb-2 uppercase tracking-wider">Milestone</p>
            <div className="flex flex-wrap gap-2">
              {MILESTONE_TYPES.map(m => (
                <button key={m} onClick={() => setMilestone(m)}
                  className={`text-xs font-nunito font-bold px-3 py-1.5 rounded-full transition-all ${milestone === m ? 'bg-coral text-white shadow-glow' : 'bg-gray-100 text-gray-500'}`}>
                  {MILESTONE_EMOJIS[m]} {MILESTONE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
            />
          </div>

          {/* Photo upload */}
          <div>
            <p className="font-nunito font-bold text-xs text-gray-500 mb-2 uppercase tracking-wider">Photo (optional)</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {photo ? (
              <div className="relative inline-block">
                <img src={photo} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                <button onClick={() => setPhoto(undefined)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 border-2 border-dashed border-coral/25 rounded-2xl px-4 py-3 text-coral/60 font-nunito font-bold text-sm">
                <Camera size={16} /> Add photo
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ── Timeline Group ───────────────────────────────────────────────────────

function groupByMonth(memories: Memory[]): { label: string; items: Memory[] }[] {
  const map = new Map<string, Memory[]>();
  for (const m of memories) {
    const dt = new Date(m.date);
    const key = dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ── Memories Page ────────────────────────────────────────────────────────

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  async function loadMemories() {
    const all = await getAllMemories();
    setMemories(all);
    setLoading(false);
  }

  useEffect(() => {
    setProfileName(getProfile()?.name ?? null);
    loadMemories();
  }, []);

  async function handleDelete(id: string) {
    await deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  const groups = groupByMonth(memories);

  return (
    <div className="min-h-screen fun-bg pb-28">

      {/* Header */}
      <div className="px-5 pt-11 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-baloo font-bold text-[26px] leading-tight">
            <span className="gradient-text">{profileName ? `${profileName}'s` : 'Our'}</span>
            <span className="text-gray-800"> Moments</span>
          </h1>
          <p className="font-nunito text-gray-400 text-sm mt-0.5 font-semibold">
            💛 {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-coral text-white px-4 py-2.5 rounded-2xl font-nunito font-bold text-sm shadow-glow mt-1"
        >
          <Plus size={15} />
          Add
        </motion.button>
      </div>

      {/* Empty state */}
      {!loading && memories.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="px-5 pt-16 flex flex-col items-center text-center"
        >
          <div className="text-7xl mb-5">🌸</div>
          <p className="font-baloo font-bold text-xl text-gray-700 mb-2">No memories yet</p>
          <p className="font-nunito text-gray-400 text-sm max-w-[260px] leading-relaxed">
            Every little moment deserves to be kept. Tap Add to save your first memory.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
            className="mt-8 bg-coral text-white px-8 py-4 rounded-3xl font-nunito font-bold text-base shadow-glow"
          >
            💛 Add First Memory
          </motion.button>
        </motion.div>
      )}

      {/* Timeline */}
      {groups.length > 0 && (
        <div className="px-5 space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="font-nunito font-bold text-xs text-amber-500 uppercase tracking-widest mb-3 px-1">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MemoryCard memory={m} onDelete={() => handleDelete(m.id)} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory modal */}
      <AnimatePresence>
        {showAdd && (
          <AddMemoryModal
            onClose={() => setShowAdd(false)}
            onSaved={() => { setShowAdd(false); loadMemories(); }}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
