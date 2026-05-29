'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Plus, Images, Pencil } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getProfile } from '@/lib/storage';
import {
  getAllMemories, addMemory, updateMemory, deleteMemory, compressImage,
  MEMORY_EMOJI_PRESETS,
  type Memory,
} from '@/lib/memories';

const CARD_GRADIENTS = [
  ['#FFF3C4', '#FFE0A0'],
  ['#FFE0EC', '#FFC8DA'],
  ['#E8F0FF', '#C8D8FF'],
  ['#E8FFF0', '#C0ECC8'],
  ['#FFE8D0', '#FFCCA8'],
  ['#F0E8FF', '#DCC8FF'],
  ['#FFF0E0', '#FFD8B0'],
  ['#E0F8FF', '#B8ECFF'],
  ['#FFF8E0', '#FFE8A0'],
  ['#F8E8FF', '#ECC8FF'],
  ['#E8FFF8', '#B8F0E0'],
  ['#FFE8E8', '#FFC8C8'],
];

function cardGradient(emoji: string): [string, string] {
  const idx = MEMORY_EMOJI_PRESETS.indexOf(emoji);
  return (CARD_GRADIENTS[idx >= 0 ? idx : 0] ?? CARD_GRADIENTS[0]) as [string, string];
}

// ── Memory Card ──────────────────────────────────────────────────────────

function MemoryCard({ memory, onDelete, onEdit }: { memory: Memory; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const date = new Date(memory.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const [from, to] = cardGradient(memory.emoji);

  return (
    <>
      <motion.div
        layout
        whileTap={{ scale: 0.97 }}
        onClick={() => setExpanded(true)}
        className="bg-white rounded-3xl overflow-hidden shadow-soft cursor-pointer"
      >
        {/* Visual — photo or large emoji on gradient */}
        <div
          className="w-full h-36 flex items-center justify-center overflow-hidden"
          style={memory.photoDataUrl ? undefined : { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        >
          {memory.photoDataUrl
            ? <img src={memory.photoDataUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-7xl select-none drop-shadow-sm">{memory.emoji}</span>
          }
        </div>

        {/* Info */}
        <div className="px-3 py-3">
          <p className="font-baloo font-bold text-sm text-gray-800 leading-snug line-clamp-2">{memory.title}</p>
          <p className="font-nunito text-[11px] text-amber-500 font-semibold mt-0.5">{date}</p>
        </div>
      </motion.div>

      {/* Expanded detail sheet */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setExpanded(false)} />
            <motion.div
              className="relative bg-white w-full max-w-[430px] rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Hero image or emoji */}
              <div
                className="w-full h-52 flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={memory.photoDataUrl ? undefined : { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
              >
                {memory.photoDataUrl
                  ? <img src={memory.photoDataUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[96px] select-none drop-shadow-sm">{memory.emoji}</span>
                }
              </div>

              <div className="flex-1 overflow-y-auto px-6 pt-5 pb-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-nunito text-[11px] text-amber-500 font-bold uppercase tracking-wider">{date}</p>
                    <h2 className="font-baloo font-bold text-xl text-gray-800 mt-0.5">{memory.title}</h2>
                  </div>
                  <button onClick={() => setExpanded(false)} className="text-gray-400 p-1 -mt-1">
                    <X size={20} />
                  </button>
                </div>

                {memory.note && (
                  <p className="font-nunito text-gray-500 text-sm leading-relaxed">{memory.note}</p>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                  {/* Edit button */}
                  <button
                    onClick={() => { setExpanded(false); onEdit(); }}
                    className="w-full py-3 rounded-2xl bg-amber-50 text-amber-600 font-nunito font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} /> Edit memory
                  </button>

                  {/* Delete */}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Add Memory Modal ──────────────────────────────────────────────────────

function AddMemoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [note, setNote]   = useState('');
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 100);
    setPhoto(compressed);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const autoEmoji = MEMORY_EMOJI_PRESETS[Math.floor(Math.random() * MEMORY_EMOJI_PRESETS.length)];
    await addMemory({ title: title.trim(), note: note.trim() || undefined, milestoneType: 'custom', date, emoji: autoEmoji, photoDataUrl: photo });
    setSaving(false);
    onSaved();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full max-w-[430px] rounded-t-3xl flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 16px)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50 flex-shrink-0">
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

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4 pb-6">

          {/* Title */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Title *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder="e.g. First word: Amma!"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={400}
              placeholder="Write a little story about this moment…"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-700 text-sm focus:outline-none focus:border-coral/40 resize-none"
            />
          </div>

          {/* Date + Photo side by side */}
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-2xl px-3 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
              />
            </div>
            <div className="flex-shrink-0">
              <p className="font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Photo</p>
              {/* Gallery picker — no capture, shows photo library */}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              {/* Camera picker — opens camera directly */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="" className="w-[72px] h-[46px] rounded-2xl object-cover" />
                  <button onClick={() => setPhoto(undefined)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow">✕</button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="w-[34px] h-[46px] border-2 border-dashed border-coral/30 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-coral/50"
                    title="Take photo"
                  >
                    <Camera size={13} />
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-[34px] h-[46px] border-2 border-dashed border-coral/30 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-coral/50"
                    title="Choose from gallery"
                  >
                    <Images size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Edit Memory Modal ─────────────────────────────────────────────────────

function EditMemoryModal({ memory, onClose, onSaved }: { memory: Memory; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(memory.title);
  const [note,  setNote]  = useState(memory.note ?? '');
  const [date,  setDate]  = useState(memory.date);
  const [emoji, setEmoji] = useState(memory.emoji);
  const [photo, setPhoto] = useState<string | undefined>(memory.photoDataUrl);
  const [saving, setSaving] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 100);
    setPhoto(compressed);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await updateMemory({
      ...memory,
      title: title.trim(),
      note: note.trim() || undefined,
      date,
      emoji,
      photoDataUrl: photo,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full max-w-[430px] rounded-t-3xl flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 16px)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
          <h2 className="font-baloo font-bold text-xl text-gray-800">Edit Memory</h2>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="bg-coral text-white px-4 py-2 rounded-2xl font-nunito font-bold text-sm shadow-glow disabled:opacity-40 transition-opacity"
          >
            {saving ? '…' : 'Save'}
          </motion.button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4 pb-6">

          {/* Emoji picker */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-400 mb-2 uppercase tracking-wider">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {MEMORY_EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-2xl text-xl flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-coral/15 ring-2 ring-coral/50 scale-110' : 'bg-gray-50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Title *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={400}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 font-nunito text-gray-700 text-sm focus:outline-none focus:border-coral/40 resize-none"
            />
          </div>

          {/* Date + Photo */}
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="block font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-2xl px-3 py-3 font-nunito text-gray-800 text-sm focus:outline-none focus:border-coral/40"
              />
            </div>
            <div className="flex-shrink-0">
              <p className="font-nunito font-bold text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Photo</p>
              <input ref={fileRef}   type="file" accept="image/*"                    className="hidden" onChange={handlePhoto} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="" className="w-[72px] h-[46px] rounded-2xl object-cover" />
                  <button onClick={() => setPhoto(undefined)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow">✕</button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => cameraRef.current?.click()}
                    className="w-[34px] h-[46px] border-2 border-dashed border-coral/30 rounded-2xl flex flex-col items-center justify-center text-coral/50" title="Take photo">
                    <Camera size={13} />
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="w-[34px] h-[46px] border-2 border-dashed border-coral/30 rounded-2xl flex flex-col items-center justify-center text-coral/50" title="Choose from gallery">
                    <Images size={13} />
                  </button>
                </div>
              )}
            </div>
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
  const [memories, setMemories]       = useState<Memory[]>([]);
  const [showAdd,  setShowAdd]        = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [loading, setLoading]         = useState(true);
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
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MemoryCard memory={m} onDelete={() => handleDelete(m.id)} onEdit={() => setEditingMemory(m)} />
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

      {/* Edit Memory modal */}
      <AnimatePresence>
        {editingMemory && (
          <EditMemoryModal
            memory={editingMemory}
            onClose={() => setEditingMemory(null)}
            onSaved={() => { setEditingMemory(null); loadMemories(); }}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
