export type LullabyLanguage = 'english' | 'telugu';
export type LullabyMood = 'calm' | 'happy' | 'sleepy';

export interface Lullaby {
  id: string;
  title: string;
  language: LullabyLanguage;
  mood: LullabyMood;
  emoji: string;
  durationEstimate: string;
  comingSoon?: boolean;
  intro: string;   // spoken by Nani before the song starts
  verses: string[]; // one entry per stanza — shown on screen in sync with the MP3
}

export const LULLABIES: Lullaby[] = [
  // ── English ──────────────────────────────────────────────────
  {
    id: 'twinkle-twinkle',
    title: 'Little Stars Are Shining Bright',
    language: 'english',
    mood: 'calm',
    emoji: '⭐',
    durationEstimate: '2–3 min',
    intro: 'Let Nani sing you a little song about the stars that shine just for you...',
    verses: [
      'Little stars are shining bright\nFloating softly through the night\nMoon is singing from above\nWrapping dreams in sleepy love',
      'Twinkle softly, little light\nGuide us gently through the night\nClose your eyes and drift away\nDreams will dance till break of day',
    ],
  },
  {
    id: 'brahms-lullaby',
    title: 'Moonlight Lullaby',
    language: 'english',
    mood: 'sleepy',
    emoji: '🌙',
    durationEstimate: '2–3 min',
    intro: 'Settle in, little one. Nani will sing you softly to dreamland...',
    verses: [
      'Sleep now little one so dear\nMoonlight whispers softly near\nClouds are sailing calm and slow\nDreamland waits with gentle glow',
      'Tiny eyes are growing sweet\nNighttime sings a peaceful beat\nStars will guard you through the night\nTill the morning brings new light',
    ],
  },
  {
    id: 'rock-a-bye-baby',
    title: 'Rocking in the Breeze',
    language: 'english',
    mood: 'calm',
    emoji: '🌿',
    durationEstimate: '2–3 min',
    intro: 'Sway gently, like a leaf on a sleepy breeze. Nani is here...',
    verses: [
      'Rocking softly in the breeze\nDancing leaves upon the trees\nNight is humming lullabies\nSleepy moon in velvet skies',
      'Close your eyes and float away\nDreams will gently come and stay\nWarm and safe the whole night through\nMagic stars will watch over you',
    ],
  },
  {
    id: 'hush-little-baby',
    title: 'Hush Now Little One',
    language: 'english',
    mood: 'calm',
    emoji: '🤫',
    durationEstimate: '2–3 min',
    intro: 'Shh... hush now, sweet one. Let Nani sing all your worries away...',
    verses: [
      'Hush now little sleepy one\nMoon and stars have just begun\nTiny dreams are floating near\nNighttime songs are soft and clear',
      'Close your eyes so warm and tight\nMagic fills the gentle night\nClouds will rock you while you rest\nSleepy dreams are always best',
    ],
  },
  {
    id: 'you-are-my-sunshine',
    title: 'You Are My Shining Light',
    language: 'english',
    mood: 'happy',
    emoji: '☀️',
    durationEstimate: '2–3 min',
    intro: 'You are Nani\'s little sunshine. Let me sing this song just for you...',
    verses: [
      'You are my little shining light\nMy sleepy star so warm and bright\nEvery night the moon will say\nDream with joy till morning day',
      'Tiny laughter soft and sweet\nDreams will dance to bedtime beat\nClose your eyes and drift so slow\nWrapped in love and gentle glow',
    ],
  },
  {
    id: 'baa-baa-black-sheep',
    title: 'Little Sheep Going to Sleep',
    language: 'english',
    mood: 'happy',
    emoji: '🐑',
    durationEstimate: '1–2 min',
    intro: 'The little sheep are going to sleep, and so are you. Let Nani sing...',
    verses: [
      'Little sheep are going to sleep\nStars above are shining deep\nSoft night wind begins to sway\nDreamland calls at end of day',
      'Tiny hooves and fluffy white\nSleeping softly through the night\nMoonlight sings a gentle tune\nMorning will be coming soon',
    ],
  },

  // ── Telugu / లాలి పాటలు ──────────────────────────────────────
  {
    id: 'jo-achyutananda',
    title: 'జో జో చిన్నారి',
    language: 'telugu',
    mood: 'sleepy',
    emoji: '🌸',
    durationEstimate: '3–4 min',
    intro: 'Nani will sing you a beautiful Telugu lullaby. Close your eyes and drift away...',
    verses: [
      'జో జో చిన్నారి\nచందమామ వేళలో\nతారలన్ని చూస్తూ\nనిదురలోకి వెళ్లవో',
      'మెల్లగా గాలి వీసే\nమధురమైన రాత్రిలో\nఅమ్మ మాట వినుతూ\nకలల లోకానికి పో',
    ],
  },
  {
    id: 'laali-jo-laali',
    title: 'లాలి జో లాలి',
    language: 'telugu',
    mood: 'calm',
    emoji: '🌙',
    durationEstimate: '2–3 min',
    intro: 'Laali jo laali... Nani\'s favourite Telugu lullaby, just for you...',
    verses: [
      'లాలి జో లాలి\nబంగారు పాపాయి\nచుక్కలన్నీ చూస్తూ\nనిదుర పోవాలి',
      'వెన్నెల మెల్లగా\nనీ మీద పడగా\nకలల పూలతోటలో\nఆడుకోవాలి',
    ],
  },
  {
    id: 'nidra-po-thalli',
    title: 'నిద్ర పో తల్లీ',
    language: 'telugu',
    mood: 'sleepy',
    emoji: '💤',
    durationEstimate: '2–3 min',
    intro: 'Nani will sing you to sleep with this gentle Telugu song...',
    verses: [
      'నిద్ర పో తల్లీ\nకన్నులు మూసుకో\nచందమామ పాటతో\nకలలలో తేలుకో',
      'గాలి మెల్లగా\nజోల పాట పాడగా\nఅమ్మ ఒడిలోనే\nహాయిగా నిదురపో',
    ],
  },
  {
    id: 'jo-jo-ramuda',
    title: 'జో జో రాముడు',
    language: 'telugu',
    mood: 'calm',
    emoji: '🪷',
    durationEstimate: '2–3 min',
    comingSoon: true,
    intro: 'Nani will sing you a special Telugu lullaby about the moon...',
    verses: [
      'జో జో రాముడా\nజాబిలి నవ్వుడా\nతారల మధ్యలో\nతేలుతూ రావుడా',
      'మల్లెల పరిమళం\nరాత్రంతా వీచగా\nచిన్నారి కలల్లో\nచిరునవ్వు పూయగా',
    ],
  },
  {
    id: 'thalalo-thalli',
    title: 'తాలాలో తల్లీ',
    language: 'telugu',
    mood: 'calm',
    emoji: '🍃',
    durationEstimate: '2–3 min',
    comingSoon: true,
    intro: 'Listen to Nani sing this peaceful Telugu lullaby...',
    verses: [
      'తాలాలో తల్లీ\nతారల్లో వెల్లీ\nవెన్నెల దారిలో\nకలలకి వెళ్లీ',
      'చుక్కలు పాడగా\nగాలులు ఆడగా\nఅమ్మ ఒడిలోనే\nహాయిగా నిదురపో',
    ],
  },
  {
    id: 'kannula-ninda',
    title: 'కన్నుల నిండా కల లే',
    language: 'telugu',
    mood: 'sleepy',
    emoji: '✨',
    durationEstimate: '2–3 min',
    comingSoon: true,
    intro: 'Fill your eyes with beautiful dreams. Nani will sing you to sleep...',
    verses: [
      'కన్నుల నిండా కలలే\nచందమామ వెలుగులే\nమెల్లగా తేలుతూ\nనిదురలోకి వెళ్లేలే',
      'తారల పాటలు\nగాలుల మాటలు\nచిన్నారి నవ్వుల్లో\nమధురమైన రాత్రులే',
    ],
  },
];

export function getLullabiesByLanguage(lang: LullabyLanguage): Lullaby[] {
  return LULLABIES.filter(l => l.language === lang);
}

export function getLullabyById(id: string): Lullaby | undefined {
  return LULLABIES.find(l => l.id === id);
}
