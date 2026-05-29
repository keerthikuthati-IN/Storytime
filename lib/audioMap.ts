export type StoryMood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

// Multiple tracks per mood — variety across stories, consistency within a story.
// Add more tracks to each array as royalty-free sources are collected.
// Good sources: pixabay.com, freemusicarchive.org, incompetech.com (Kevin MacLeod CC-BY)
export const MOOD_AUDIO: Record<StoryMood, string[]> = {
  calm:     ['/audio/calm.mp3'],
  happy:    ['/audio/calm.mp3'],         // TODO: replace with upbeat happy.mp3 once sourced
  magical:  ['/audio/exciting.mp3'],     // magic.wav is 11 MB / magical.mp3 is corrupt
  exciting: ['/audio/exciting.mp3'],
  tense:    ['/audio/tense.wav'],        // tense.wav (tense.mp3 is corrupt)
};

export const MUSIC_VOLUME = 0.2;

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Pick a track by hashing storyId so the same story always gets the same track,
// but different stories with the same mood get different tracks once more tracks are added.
export function getAudioForMood(mood: StoryMood, storyId?: string): string {
  const tracks = MOOD_AUDIO[mood] ?? MOOD_AUDIO.calm;
  if (!storyId || tracks.length === 1) return tracks[0];
  return tracks[hashCode(storyId) % tracks.length];
}
