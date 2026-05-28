export interface CategoryStyle {
  emoji: string;
  from: string;
  to: string;
}

const STYLES: Record<string, CategoryStyle> = {
  'Animals':              { emoji: '🐾', from: '#FFF7E0', to: '#FFE8A8' },
  'Adventure':            { emoji: '🗺️', from: '#E0F4FF', to: '#B8E0FF' },
  'Magic':                { emoji: '✨', from: '#F0E8FF', to: '#DBC8FF' },
  'Bedtime':              { emoji: '🌙', from: '#E8EEFF', to: '#C8D4FF' },
  'Friendship':           { emoji: '🤝', from: '#FFE8F0', to: '#FFCCE0' },
  'Nature':               { emoji: '🌿', from: '#E8F8E4', to: '#C4ECBC' },
  'Vehicles':             { emoji: '🚗', from: '#E0F4FF', to: '#A8D8FF' },
  'Superheroes':          { emoji: '🦸', from: '#FFE8D8', to: '#FFCCA8' },
  'Fairy Tales':          { emoji: '🏰', from: '#FFE8F4', to: '#F4C4E4' },
  'Space':                { emoji: '🚀', from: '#E0E4FF', to: '#B8C0F8' },
  'Chandamama Folk Tale': { emoji: '🌕', from: '#FFF8E0', to: '#FFE8A0' },
  'Panchatantra':         { emoji: '📖', from: '#FFF0E0', to: '#FFD8A0' },
  'Tenali Rama':          { emoji: '🪔', from: '#FFF4D8', to: '#FFE0A0' },
  'Krishna Stories':      { emoji: '🦚', from: '#E8FFF0', to: '#B8F0D8' },
  'Jataka Tales':         { emoji: '🐘', from: '#FFF0E8', to: '#FFD8C0' },
};

const DEFAULT: CategoryStyle = { emoji: '📚', from: '#FFF0EC', to: '#FFD4C4' };

export function getCategoryStyle(category: string): CategoryStyle {
  return STYLES[category] ?? DEFAULT;
}
