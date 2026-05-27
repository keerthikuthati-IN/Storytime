'use client';

import { useRef, useCallback } from 'react';

type Language = 'english' | 'telugu';

interface UseTTSReturn {
  speak: (text: string, language: Language, onDone?: () => void) => void;
  stop:  () => void;
}

/**
 * Unified TTS hook — Sarvam.ai primary (Indian voices, en-IN / te-IN).
 * Falls back to Web Speech API if Sarvam is unavailable.
 *
 * Uses a generation counter so that only the MOST RECENT speak() call
 * can trigger onDone. Any in-flight fetch from a previous call is
 * aborted immediately, preventing double-advance in React StrictMode
 * (which double-invokes effects in development).
 */
export function useTTS(
  onSpeakingChange: (speaking: boolean) => void
): UseTTSReturn {
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const genRef       = useRef(0); // incremented on every speak() call

  // ── stop ──────────────────────────────────────────────────────
  const stop = useCallback(() => {
    genRef.current++;                     // invalidate any pending speak
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    onSpeakingChange(false);
  }, [onSpeakingChange]);

  // ── Web Speech API fallback ────────────────────────────────────
  const speakWebAPI = useCallback((
    text: string,
    gen: number,
    onDone?: () => void,
  ) => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synth.cancel();

    function doSpeak() {
      if (gen !== genRef.current) return;   // superseded
      const voices = synth.getVoices();
      if (voices.length === 0) {
        synth.addEventListener('voiceschanged', doSpeak, { once: true });
        return;
      }

      const utt   = new SpeechSynthesisUtterance(text);
      utt.rate    = 0.82;
      utt.pitch   = 1.0;
      const english = voices.filter(v => v.lang.startsWith('en'));
      const female  = english.find(v =>
        ['zira','aria','jenny','samantha','karen','susan','helena','female','woman']
          .some(n => v.name.toLowerCase().includes(n))
      ) ?? english[0] ?? voices[0];
      if (female) utt.voice = female;

      utt.onstart = () => onSpeakingChange(true);
      utt.onend   = () => {
        onSpeakingChange(false);
        if (gen === genRef.current) onDone?.();
      };
      utt.onerror = () => {
        onSpeakingChange(false);
        if (gen === genRef.current) onDone?.();
      };
      synth.speak(utt);
    }
    doSpeak();
  }, [onSpeakingChange]);

  // ── Sarvam TTS (primary) ───────────────────────────────────────
  const speak = useCallback((
    text: string,
    language: Language,
    onDone?: () => void,
  ) => {
    // Claim a new generation — any previous speak's callbacks are now stale
    const gen = ++genRef.current;

    // Abort the in-flight HTTP request from the previous speak(), if any
    abortCtrlRef.current?.abort();

    // Stop any currently-playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    onSpeakingChange(true);

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    fetch('/api/songs/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, language }),
      signal:  ctrl.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (gen !== genRef.current) return;   // superseded by a later speak()
        abortCtrlRef.current = null;

        if (data.fallback || !data.audioBase64) {
          // Sarvam unavailable — use Web Speech API
          onSpeakingChange(false);
          speakWebAPI(text, gen, onDone);
          return;
        }

        // Decode base64 WAV and play
        const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
        const blob  = new Blob([bytes], { type: 'audio/wav' });
        const url   = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onSpeakingChange(false);
          if (gen === genRef.current) onDone?.();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onSpeakingChange(false);
          if (gen === genRef.current) onDone?.();
        };
        audio.play().catch(() => {
          // Autoplay blocked by browser — wait a realistic reading time
          onSpeakingChange(false);
          const wordCount = text.trim().split(/\s+/).length;
          const readingMs = Math.max(2500, wordCount * 400);
          setTimeout(() => {
            if (gen === genRef.current) onDone?.();
          }, readingMs);
        });
      })
      .catch(err => {
        if (err.name === 'AbortError') return;   // intentionally cancelled
        if (gen !== genRef.current) return;
        abortCtrlRef.current = null;
        onSpeakingChange(false);
        speakWebAPI(text, gen, onDone);
      });
  }, [onSpeakingChange, speakWebAPI]);

  return { speak, stop };
}
