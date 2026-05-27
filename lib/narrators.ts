export interface Narrator {
  id: string;
  name: string;
  tone: string;
  voiceGender: 'female' | 'male';
  ttsRate: number;
  ttsPitch: number;
  personality: string;
  sampleQuote: string;
  emoji: string;
  bgColor: string;
  accentColor: string;
  elevenLabsVoiceId: string;
}

export const NARRATORS: Narrator[] = [
  {
    id: 'grandma-rose',
    name: 'Grandma Rose',
    tone: 'Warm & Gentle',
    voiceGender: 'female',
    ttsRate: 0.8,
    ttsPitch: 0.9,
    personality: 'Speaks like a loving grandmother; adds "my dear" and "sweetheart"',
    sampleQuote: '"Come sit beside me, my dear. I have the most wonderful story for you, sweetheart..."',
    emoji: '👵',
    bgColor: '#FFF0F0',
    accentColor: '#FF9999',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel — warm, calm, clear female
  },
  {
    id: 'grandpa-bill',
    name: 'Grandpa Bill',
    tone: 'Wise & Calm',
    voiceGender: 'male',
    ttsRate: 0.75,
    ttsPitch: 0.7,
    personality: 'Deep, unhurried; uses "you see" and "long ago"',
    sampleQuote: '"Long ago, you see, in a land full of wonder... there lived a very special friend."',
    emoji: '👴',
    bgColor: '#F0F4FF',
    accentColor: '#7B9EFF',
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam — deep, authoritative male
  },
  {
    id: 'fairy-luna',
    name: 'Fairy Luna',
    tone: 'Magical & Sparkly',
    voiceGender: 'female',
    ttsRate: 1.1,
    ttsPitch: 1.3,
    personality: 'Enthusiastic; adds magical sound words like "whoosh" and "shimmer"',
    sampleQuote: '"✨ Whoosh! Shimmer and sparkle! Oh, do I have a MAGICAL story for you today! ✨"',
    emoji: '🧚',
    bgColor: '#F5F0FF',
    accentColor: '#B57BEE',
    elevenLabsVoiceId: 'MF3mGyEYCl7XYWbV9V6O', // Elli — young, bright, energetic female
  },
  {
    id: 'captain-zara',
    name: 'Captain Zara',
    tone: 'Bold & Heroic',
    voiceGender: 'female',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    personality: 'Action-oriented; uses "Zoom!", "Pow!", dramatic pauses',
    sampleQuote: '"Zoom! Pow! Are you ready for the most EPIC adventure? Because... it starts RIGHT NOW!"',
    emoji: '🦸‍♀️',
    bgColor: '#FFF8E0',
    accentColor: '#FFB830',
    elevenLabsVoiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi — strong, confident female
  },
];

// Bruno — the single default narrator (warm bear via Rive, Sarvam shubh voice in English)
export const NANA_LUNA: Narrator = {
  id: 'nana-luna',
  name: 'Bruno',
  tone: 'Warm & Magical',
  voiceGender: 'male',
  ttsRate: 0.82,
  ttsPitch: 0.95,
  personality: 'Speaks like a warm, gentle storytelling bear; calm, friendly, never hurried',
  sampleQuote: '"Come, little one, let Bruno tell you the most wonderful story... close your eyes and listen..."',
  emoji: '🐻',
  bgColor: '#FFF8F0',
  accentColor: '#F4A261',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // fallback if ElevenLabs ever added
};

export function getNarratorById(id: string): Narrator | undefined {
  if (id === 'nana-luna') return NANA_LUNA;
  return NARRATORS.find(n => n.id === id);
}

export function getDefaultNarrator(): Narrator {
  return NANA_LUNA;
}
