'use client';

import { useRef, useCallback } from 'react';

type Language = 'english' | 'telugu';

interface UseTTSReturn {
  speak:    (text: string, language: Language, onDone?: () => void, preloadedBase64?: string) => void;
  stop:     () => void;
  prefetch: (text: string, language: Language) => Promise<string | null>;
}

/**
 * Unified TTS hook — Sarvam.ai primary (Indian voices, en-IN / te-IN).
 * Falls back to Web Speech API if Sarvam is unavailable.
 *
 * speak() accepts an optional preloadedBase64 — if provided the API call is
 * skipped entirely and the audio plays immediately (zero lag path).
 *
 * prefetch() fires a background fetch and returns the base64 string (or null
 * on failure) without playing anything. Used by StoryPlayer for look-ahead.
 */
export function useTTS(
  onSpeakingChange: (speaking: boolean) => void
): UseTTSReturn {
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const genRef       = useRef(0);

  // ── stop ──────────────────────────────────────────────────────
  const stop = useCallback(() => {
    genRef.current++;
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

  // ── Play base64 audio (shared by speak + cached path) ─────────
  const playBase64 = useCallback((
    gen: number,
    base64: string,
    onDone?: () => void,
  ) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
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
      onSpeakingChange(false);
      const wordCount = base64.length > 0 ? 20 : 0; // rough fallback estimate
      const readingMs = Math.max(2500, wordCount * 400);
      setTimeout(() => {
        if (gen === genRef.current) onDone?.();
      }, readingMs);
    });
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
      if (gen !== genRef.current) return;
      const voices = synth.getVoices();
      if (voices.length === 0) {
        synth.addEventListener('voiceschanged', doSpeak, { once: true });
        return;
      }

      const utt   = new SpeechSynthesisUtterance(text);
      utt.rate    = 0.78;
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

  // ── prefetch (background fetch, no playback) ───────────────────
  const prefetch = useCallback(async (
    text: string,
    language: Language,
  ): Promise<string | null> => {
    try {
      const res = await fetch('/api/songs/tts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, language }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.fallback || !data.audioBase64) return null;
      return data.audioBase64 as string;
    } catch {
      return null;
    }
  }, []);

  // ── speak ──────────────────────────────────────────────────────
  const speak = useCallback((
    text: string,
    language: Language,
    onDone?: () => void,
    preloadedBase64?: string,   // if provided, skip API and play directly
  ) => {
    const gen = ++genRef.current;

    abortCtrlRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    onSpeakingChange(true);

    // ── Zero-lag path: audio already available ─────────────────
    if (preloadedBase64) {
      abortCtrlRef.current = null;
      playBase64(gen, preloadedBase64, onDone);
      return;
    }

    // ── Normal path: fetch from Sarvam ─────────────────────────
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
        if (gen !== genRef.current) return;
        abortCtrlRef.current = null;

        if (data.fallback || !data.audioBase64) {
          onSpeakingChange(false);
          speakWebAPI(text, gen, onDone);
          return;
        }

        playBase64(gen, data.audioBase64, onDone);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (gen !== genRef.current) return;
        abortCtrlRef.current = null;
        onSpeakingChange(false);
        speakWebAPI(text, gen, onDone);
      });
  }, [onSpeakingChange, speakWebAPI, playBase64]);

  return { speak, stop, prefetch };
}
