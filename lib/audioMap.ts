// Mood → audio track mapping
// Replace the placeholder paths with real royalty-free tracks from freesound.org
// or any other royalty-free source before production.
// Example sources:
//   calm: https://freesound.org/people/szegvari/sounds/566517/
//   magical: https://freesound.org/people/FoolBoyMedia/sounds/256522/
//   exciting: https://freesound.org/people/AlaskaRobotics/sounds/221763/
//   tense: https://freesound.org/people/Sirkoto51/sounds/413180/

export type StoryMood = 'happy' | 'magical' | 'calm' | 'exciting' | 'tense';

export const MOOD_AUDIO: Record<StoryMood, string> = {
  happy: '/audio/calm.mp3',     // upbeat-calm works for happy
  calm: '/audio/calm.mp3',
  magical: '/audio/magic.wav',
  exciting: '/audio/exciting.mp3',
  tense: '/audio/tense.wav',
};

export const MUSIC_VOLUME = 0.2;

export function getAudioForMood(mood: StoryMood): string {
  return MOOD_AUDIO[mood] ?? MOOD_AUDIO.calm;
}
