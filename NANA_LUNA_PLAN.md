# Nana Luna — Complete Build Plan
> Story Time app redesign: Rive avatar + lullabies feature
> Saved: 2026-05-27 | Start a new Claude session and share this file

---

## Project Context (for new session)

**App:** Story Time — AI bedtime storytelling app for toddlers 0–3
**Stack:** Next.js 16, React 18, TypeScript, Tailwind CSS, Framer Motion, Howler.js, Anthropic Claude API
**Location:** `C:\Users\Puneeth Kuthati\OneDrive\Desktop\Storytime`
**Current state:** App works end-to-end (stories generate + play), but avatar is a broken DiceBear CSS hack. This plan replaces it with a Rive animated bear character ("Nana Luna") and adds an English + Telugu lullabies feature.

---

## BEFORE YOU WRITE ANY CODE — Get the .riv File

This is the only manual step that cannot be done by Claude. Do it first.

### Step 1 — Open the Rive community file
Go to: **https://rive.app/community/files/2244-7248-animated-login-character/**

You will see a cute animated bear character by JcToon (CC BY license — free for commercial use).

### Step 2 — Open in Rive editor
Click **"Open in Rive"** button on that page.
- No account needed to view
- Free account needed to edit and export (sign up free at rive.app)

### Step 3 — Note the exact state machine details
In the Rive editor, click the **State Machine** panel (bottom of screen).
Write down:
- [ ] State machine name: `_______________` (probably "State Machine 1")
- [ ] Input name for head-look animation: `_______________` (probably "isChecking")
- [ ] Input name for eye follow: `_______________` (probably "numLook")
- [ ] Input name for paws-over-face: `_______________` (probably "isHandsUp")
- [ ] Input name for happy: `_______________` (probably "trigSuccess")
- [ ] Input name for worried: `_______________` (probably "trigFail")

**These exact names go into the React code. If they differ from above, tell Claude the correct names.**

### Step 4 — Optionally restyle (30 min, recommended)
In the Rive editor, select each shape and change fill colors:
- Bear body → warm amber `#F4A261`
- Snout / inner ears / paws → cream `#FFF8F0`
- Eyes → deep warm brown `#5D3A1A`
- Background → transparent (delete or set opacity 0)

This makes the bear feel warm and grandmotherly instead of the default blue/grey.

### Step 5 — Export the .riv file
- Top menu → **File → Export → Export for Runtime**
- Save the file as: `nana-luna.riv`
- Place it at: `C:\Users\Puneeth Kuthati\OneDrive\Desktop\Storytime\public\rive\nana-luna.riv`
  (create the `rive` folder inside `public` if it doesn't exist)

---

## Phase 1 — Nana Luna Avatar (Days 1–5)
*Start this after the .riv file is in place*

### What it does
Replaces the current broken DiceBear avatar with a real Rive animated bear.
The bear reacts emotionally to each story paragraph — happy, worried, sleepy, excited.

### State Machine Mapping
| Story mood | Rive inputs to set |
|---|---|
| `calm` | All false, numLook=50 |
| `happy` | trigSuccess=true |
| `magical` | trigSuccess=true + CSS sparkles |
| `exciting` | isChecking=true |
| `tense` | trigFail=true |
| `sleepy` (last paragraph) | isHandsUp=true |
| Any mood while speaking | isChecking=true |

### Files to create / modify

| Action | File | What changes |
|---|---|---|
| INSTALL | — | `npm install @rive-app/react-canvas` |
| ADD ASSET | `public/rive/nana-luna.riv` | The downloaded Rive file |
| CREATE | `components/NanaLunaAvatar.tsx` | New Rive component (see code below) |
| MODIFY | `app/api/stories/generate/route.ts` | Add `emotion` object to Claude prompt |
| MODIFY | `lib/claude.ts` | Add `NarratorEmotion` type to `StoryParagraph` |
| MODIFY | `components/StoryPlayer.tsx` | Swap `<AnimeNarratorAvatar>` → `<NanaLunaAvatar>` |
| MODIFY | `lib/narrators.ts` | Add `NANA_LUNA` constant |
| MODIFY | `app/discover/page.tsx` | Bypass narrator selection, go direct to play |
| MODIFY | `app/my-stories/page.tsx` | Same bypass |
| MODIFY | `app/narrator/[storyId]/page.tsx` | Redirect to play page |

### NanaLunaAvatar.tsx — Full code for Claude to implement

```tsx
// Bear character: "Animated Login Character" by JcToon
// Source: https://rive.app/community/files/2244-7248-animated-login-character/
// License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/

'use client';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Narrator } from '@/lib/narrators';

type Mood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

// Artboard: "Teddy" | State Machine: "Login Machine" — confirmed from Rive editor
const SM_NAME = 'Login Machine';
const INPUT = {
  isChecking:  'isChecking',
  numLook:     'numLook',
  isHandsUp:   'isHandsUp',
  trigSuccess: 'trigSuccess',
  trigFail:    'trigFail',
};

const MOOD_AURA: Record<Mood, string> = {
  happy: '#FFD93D', magical: '#CE93D8', calm: '#81D4FA',
  exciting: '#FFB74D', tense: '#F48FB1',
};
const MOOD_BADGE: Record<Mood, string> = {
  happy: '😊', magical: '✨', calm: '😌', exciting: '🤩', tense: '😟',
};
const MAGIC_PARTICLES = ['✨', '🌟', '💫', '⭐'];

interface Props { narrator: Narrator; mood: Mood; speaking: boolean; }

export default function NanaLunaAvatar({ mood, speaking }: Props) {
  const { RiveComponent, rive } = useRive({
    src: '/rive/nana-luna.riv',
    stateMachines: SM_NAME,
    autoplay: true,
    onLoadError: () => console.warn('Rive file missing — check public/rive/nana-luna.riv'),
  });

  const isChecking  = useStateMachineInput(rive, SM_NAME, INPUT.isChecking);
  const numLook     = useStateMachineInput(rive, SM_NAME, INPUT.numLook);
  const isHandsUp   = useStateMachineInput(rive, SM_NAME, INPUT.isHandsUp);
  const trigSuccess = useStateMachineInput(rive, SM_NAME, INPUT.trigSuccess);
  const trigFail    = useStateMachineInput(rive, SM_NAME, INPUT.trigFail);

  useEffect(() => {
    if (!rive) return;
    if (trigSuccess) trigSuccess.value = false;
    if (trigFail)    trigFail.value    = false;
    if (isHandsUp)   isHandsUp.value   = false;
    if (isChecking)  isChecking.value  = speaking;
    if (numLook)     numLook.value     = 50;

    if (mood === 'happy' || mood === 'magical') {
      if (trigSuccess) trigSuccess.value = true;
    } else if (mood === 'tense') {
      if (trigFail)   trigFail.value    = true;
    } else if (mood === 'exciting') {
      if (isChecking) isChecking.value  = true;
    } else if (mood === 'calm') {
      if (isHandsUp)  isHandsUp.value   = true;
    }
  }, [mood, speaking, rive]);

  const aura = MOOD_AURA[mood];

  return (
    <div style={{ position: 'relative', width: 220, height: 244 }}>
      {/* Aura rings */}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: 210+i*26, height: 210+i*26,
                   top: '50%', left: '50%', transform: 'translate(-50%,-52%)' }}
          animate={{ scale: [1, 1.12+i*0.06, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.2+i*0.5, repeat: Infinity, delay: i*0.45 }}>
          <div className="w-full h-full rounded-full" style={{
            background: `radial-gradient(circle, ${aura}25 0%, transparent 70%)`,
            border: `1.5px solid ${aura}30`,
          }} />
        </motion.div>
      ))}

      {/* Bear character */}
      <motion.div
        animate={speaking
          ? { y: [0,-6,0,-4,0], rotate: [0,-1.2,1.2,-0.8,0] }
          : { y: [0,-4,0] }}
        transition={speaking
          ? { duration: 0.5, repeat: Infinity }
          : { duration: 3.8, repeat: Infinity }}
        style={{ width: 220, height: 220, position: 'relative', zIndex: 10 }}>

        <div style={{
          width: 220, height: 220, borderRadius: '50%', overflow: 'hidden',
          border: `3px solid ${aura}90`,
          boxShadow: `0 10px 40px ${aura}45, 0 3px 14px rgba(0,0,0,0.14)`,
        }}>
          <RiveComponent style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Shawl overlay */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%',
          transform: 'translateX(-50%)', fontSize: 30,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
        }}>🧣</div>

        {/* Mood badge */}
        <AnimatePresence mode="wait">
          <motion.div key={mood} className="absolute text-2xl"
            style={{ bottom: 8, right: -4, zIndex: 20,
                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18 }}>
            {MOOD_BADGE[mood]}
          </motion.div>
        </AnimatePresence>

        {/* Speaking ring */}
        {speaking && (
          <motion.div className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 0.85, repeat: Infinity }}
            style={{ border: `3px solid ${aura}`, borderRadius: '50%' }} />
        )}
      </motion.div>

      {/* Magical sparkles */}
      <AnimatePresence>
        {mood === 'magical' && MAGIC_PARTICLES.map((emoji, i) => (
          <motion.div key={emoji}
            style={{ position: 'absolute', fontSize: 16,
                     top: '5%', left: `${15+i*22}%` }}
            animate={{ y: [-10,-50,-10], opacity: [0,1,0], rotate: [0,20,-10,0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i*0.4 }}>
            {emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### Emotion data from Claude — prompt addition
Add this to `app/api/stories/generate/route.ts` inside the paragraph JSON schema:
```json
"emotion": {
  "state": "idle|happy|wonder|excited|concerned|sleepy",
  "intensity": 0.0,
  "transitionMs": 400
}
```
Add to system prompt:
> "For each paragraph emotion field, describe how Nana Luna — a warm magical grandmother bear — feels while narrating. A scary moment makes her look gently concerned and protective, never frightened."

### New type in lib/claude.ts
```typescript
export interface NarratorEmotion {
  state: 'idle' | 'happy' | 'wonder' | 'excited' | 'concerned' | 'sleepy';
  intensity: number;      // 0.0–1.0
  transitionMs: number;   // 300–800
}
// Add to StoryParagraph:
// emotion?: NarratorEmotion;
```

---

## Phase 2 — Songs & Lullabies (Days 6–10)
*Build after avatar is working*

### Curated song list (hardcoded in lib/lullabies.ts)

**English (6):**
- Twinkle Twinkle Little Star
- Brahms' Lullaby (Lullaby and Goodnight)
- Rock-a-Bye Baby
- Hush Little Baby
- You Are My Sunshine
- Baa Baa Black Sheep

**Telugu / లాలి పాటలు (6):**
- జో అచ్యుతానంద జో జో (Jo Achyutananda Jo Jo)
- లాలి జో లాలి (Laali Jo Laali)
- నిద్ర పో తల్లీ (Nidra Po Thalli)
- జో జో రాముడు (Jo Jo Ramuda)
- తాలాలో తల్లీ (Thalalo Thalli)
- కన్నుల నిండా కల లే (Kannula Ninda Kala Le)

### Claude generates lyrics (app/api/songs/generate/route.ts)

English response shape:
```json
{
  "title": "Twinkle Twinkle Little Star",
  "language": "english",
  "mood": "calm",
  "intro": "Nana Luna's warm opening sentence...",
  "verses": [
    { "text": "Twinkle, twinkle, little star...", "mood": "calm" }
  ]
}
```

Telugu response shape:
```json
{
  "title": "జో అచ్యుతానంద జో జో",
  "language": "telugu",
  "mood": "calm",
  "intro": "...",
  "verses": [
    {
      "text": "జో అచ్యుతానంద జో జో ముకుందా రావే...",
      "romanization": "Jo Achyutananda Jo Jo Mukunda Raave...",
      "english_meaning": "Sleep my dear Achyuta, come Mukunda...",
      "mood": "calm"
    }
  ]
}
```

### Audio strategy

| Language | How | Cost |
|---|---|---|
| English | Web Speech API (rate: 0.7, pitch: 1.1) | Free |
| Telugu | **Sarvam.ai API** (`bulbul:v1`, `te-IN`) | Free tier |

**Sarvam.ai setup (free):**
1. Sign up at https://sarvam.ai
2. Get API key → add to `.env.local` as `SARVAM_API_KEY`
3. New route: `app/api/songs/tts/route.ts` calls `POST https://api.sarvam.ai/text-to-speech`
4. Returns `{ audioBase64: string }` → client decodes and plays via Web Audio API

**Fallback:** If Sarvam fails → show text + romanization + play background music only (parent can sing along).

### Telugu verse display (LullabyPlayer)
Each verse shows 3 lines:
1. **Telugu script** — large, primary (జో అచ్యుతానంద జో జో)
2. *Romanization* — smaller italic (*Jo Achyutananda Jo Jo*)
3. English meaning — small grey text below

### Bear singing behaviour (no new Rive state needed)
- `isChecking = true` during verse → bear bobs/sways
- `numLook` oscillates 50→30→70→50 every 4s → natural head sway while singing
- `trigSuccess = true` at song end → happy celebration

### New files for Songs feature

| Action | File |
|---|---|
| CREATE | `lib/lullabies.ts` — 12 hardcoded songs |
| CREATE | `app/api/songs/generate/route.ts` — Claude lyrics |
| CREATE | `app/api/songs/tts/route.ts` — Sarvam.ai Telugu voice |
| CREATE | `app/songs/page.tsx` — song grid (6 English + 6 Telugu cards) |
| CREATE | `components/LullabyPlayer.tsx` — verse-by-verse playback |
| MODIFY | `components/BottomNav.tsx` — add Songs tab (Music2 icon from Lucide) |

### Bottom nav after change
```
My Stories  |  Discover  |  Songs  |  Profile
(BookHeart)   (Sparkles)   (Music2)  (UserCircle)
```

---

## Full File Changelist

### Phase 1 (Avatar)
| Action | File |
|---|---|
| INSTALL | `@rive-app/react-canvas` |
| ADD | `public/rive/nana-luna.riv` ← you provide this |
| CREATE | `components/NanaLunaAvatar.tsx` |
| MODIFY | `app/api/stories/generate/route.ts` |
| MODIFY | `lib/claude.ts` |
| MODIFY | `components/StoryPlayer.tsx` |
| MODIFY | `lib/narrators.ts` |
| MODIFY | `app/discover/page.tsx` |
| MODIFY | `app/my-stories/page.tsx` |
| MODIFY | `app/narrator/[storyId]/page.tsx` |

### Phase 2 (Songs)
| Action | File |
|---|---|
| CREATE | `lib/lullabies.ts` |
| CREATE | `app/api/songs/generate/route.ts` |
| CREATE | `app/api/songs/tts/route.ts` |
| CREATE | `app/songs/page.tsx` |
| CREATE | `components/LullabyPlayer.tsx` |
| MODIFY | `components/BottomNav.tsx` |

### New environment variables needed
```
SARVAM_API_KEY=your_key_here   # free from sarvam.ai, for Telugu TTS
```
All other keys (ANTHROPIC_API_KEY) already exist.

---

## 10-Day Timeline

| Day | Task |
|---|---|
| **Day 0** | YOU: Download .riv file, note state machine input names, restyle colors, place in public/rive/ |
| Day 1 | Install @rive-app/react-canvas, create NanaLunaAvatar.tsx |
| Day 2 | Wire Rive state machine to story moods, test in isolation |
| Day 3 | Extend Claude generate route with emotion fields, update lib/claude.ts types |
| Day 4 | Swap avatar in StoryPlayer, full end-to-end test |
| Day 5 | Remove narrator selection screen, polish, verify all moods work |
| Day 6 | lib/lullabies.ts + app/api/songs/generate/route.ts, test Claude lullaby generation |
| Day 7 | app/songs/page.tsx — song grid UI |
| Day 8 | LullabyPlayer.tsx + English lullaby playback |
| Day 9 | Sarvam.ai TTS route + Telugu verse display |
| Day 10 | BottomNav Songs tab + final polish |

---

## How to Start a New Claude Session

1. Open Claude Code in the Storytime project folder
2. Say: *"I have a plan saved at NANA_LUNA_PLAN.md in the project root. Please read it and start executing Phase 1. I have already placed the .riv file at public/rive/nana-luna.riv. The state machine name is [X] and the inputs are: isChecking=[X], numLook=[X], isHandsUp=[X], trigSuccess=[X], trigFail=[X]."*
3. Claude will read the plan and execute step by step.

---

## Verification Checklist

### Phase 1
- [ ] `npm run dev` — no errors
- [ ] Navigate to a story — bear loads (not blank white circle)
- [ ] Bear bobs while narration plays
- [ ] Bear shows happy face on happy paragraph
- [ ] Bear shows worried face on tense paragraph
- [ ] Bear puts paws over face on calm/sleepy paragraph
- [ ] Magical mood shows sparkle particles
- [ ] Narrator selection screen is bypassed

### Phase 2
- [ ] Songs tab appears in bottom nav
- [ ] 12 songs show on grid (6 🇬🇧 + 6 🇮🇳)
- [ ] Tap English song → bear sings verse by verse
- [ ] Tap Telugu song → Telugu script + romanization + English meaning shows
- [ ] Telugu audio plays (or graceful fallback to music-only)
- [ ] Bear bobs during verses, celebrates at end

---

*Plan version: 2026-05-27 | App: Story Time | Claude session: vast-singing-gadget*
