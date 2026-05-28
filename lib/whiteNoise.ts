export type WhiteNoiseType = 'brown' | 'white' | 'rain' | 'ocean' | 'heartbeat' | 'fan' | 'shush';

export interface WhiteNoiseTrack {
  label: string;
  emoji: string;
  src: string;
}

export const WHITE_NOISE_TRACKS: Record<WhiteNoiseType, WhiteNoiseTrack> = {
  brown:     { label: 'Deep Hum',    emoji: '🎵', src: '/audio/noise/brown-noise.mp3' },
  white:     { label: 'White Noise', emoji: '🌫️', src: '/audio/noise/white-noise.wav' },
  rain:      { label: 'Soft Rain',   emoji: '🌧️', src: '/audio/noise/rain.wav'        },
  ocean:     { label: 'Ocean',       emoji: '🌊', src: '/audio/noise/ocean.wav'       },
  heartbeat: { label: 'Heartbeat',   emoji: '💓', src: '/audio/noise/heart-beat.mp3'  },
  fan:       { label: 'Fan',         emoji: '🌀', src: '/audio/noise/fan.wav'         },
  shush:     { label: 'Shush',       emoji: '🤫', src: '/audio/noise/shush.mp3'       },
};

export const WHITE_NOISE_ORDER: WhiteNoiseType[] = [
  'brown', 'white', 'rain', 'ocean', 'heartbeat', 'fan', 'shush',
];

export const SLEEP_TIMER_OPTIONS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '∞',      minutes: 0  },
];
