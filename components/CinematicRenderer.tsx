'use client';

import { useState } from 'react';

// Pure-CSS cinematic night scene — used during lullaby playback.
// No character, no active animation loops — just a breathing moonlit world.
// Kept intentionally low-stimulation for sleep context.

const STARS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  top:     `${4 + (i * 13) % 55}%`,
  left:    `${3 + (i * 17) % 94}%`,
  size:    i % 4 === 0 ? 3 : 2,
  delay:   `${(i * 0.7) % 5}s`,
  dur:     `${2.5 + (i * 0.4) % 2}s`,
  opacity: 0.3 + (i % 3) * 0.15,
}));

const CLOUDS = [
  { id: 0, top: '18%', width: 160, height: 40, opacity: 0.06, dur: '45s', delay: '0s'  },
  { id: 1, top: '28%', width: 220, height: 50, opacity: 0.05, dur: '60s', delay: '15s' },
  { id: 2, top: '12%', width: 130, height: 35, opacity: 0.04, dur: '50s', delay: '8s'  },
];

// Mood-aware moon styling
const MOOD_CONFIG: Record<string, {
  bg: string;
  glow1: string;
  glow2: string;
  glowHot1: string;
  glowHot2: string;
  animSpeed: string;
}> = {
  calm: {
    bg:       'radial-gradient(circle at 38% 38%, #FFFEF8 0%, #FFFCE0 55%, #FFF5B0 100%)',
    glow1:    'rgba(255,252,210,0.12)',
    glow2:    'rgba(255,252,210,0.06)',
    glowHot1: 'rgba(255,252,210,0.18)',
    glowHot2: 'rgba(255,252,210,0.08)',
    animSpeed: '5s',
  },
  magical: {
    bg:       'radial-gradient(circle at 38% 38%, #FFF0FA 0%, #FFD6F0 55%, #FFB8E8 100%)',
    glow1:    'rgba(255,180,240,0.14)',
    glow2:    'rgba(255,180,240,0.07)',
    glowHot1: 'rgba(255,180,240,0.22)',
    glowHot2: 'rgba(255,180,240,0.10)',
    animSpeed: '4s',
  },
  exciting: {
    bg:       'radial-gradient(circle at 38% 38%, #FFFEF8 0%, #FFE8B0 55%, #FFD080 100%)',
    glow1:    'rgba(255,220,120,0.14)',
    glow2:    'rgba(255,220,120,0.07)',
    glowHot1: 'rgba(255,220,120,0.22)',
    glowHot2: 'rgba(255,220,120,0.10)',
    animSpeed: '3.5s',
  },
  tense: {
    bg:       'radial-gradient(circle at 38% 38%, #F0F4FF 0%, #C8D8FF 55%, #A0B8FF 100%)',
    glow1:    'rgba(160,184,255,0.14)',
    glow2:    'rgba(160,184,255,0.07)',
    glowHot1: 'rgba(160,184,255,0.20)',
    glowHot2: 'rgba(160,184,255,0.10)',
    animSpeed: '6s',
  },
};

interface CinematicRendererProps {
  mood?: string;
}

export default function CinematicRenderer({ mood }: CinematicRendererProps) {
  const [dim, setDim] = useState(false);
  const cfg = MOOD_CONFIG[mood ?? 'calm'] ?? MOOD_CONFIG.calm;
  // Moon is 120px; use negative margins to center precisely without transform (so scale anim is clean)
  const MOON_SIZE = 120;

  return (
    <div
      className="cinematic-root absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #06091A 0%, #0D0825 40%, #1A0F3C 75%, #2A1552 100%)' }}
      onClick={() => setDim(false)}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--star-op); transform: scale(1); }
          50%       { opacity: calc(var(--star-op) * 0.3); transform: scale(0.8); }
        }
        @keyframes moonBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes cloudDrift {
          0%   { transform: translateX(-20px); }
          50%  { transform: translateX(20px);  }
          100% { transform: translateX(-20px); }
        }
        @keyframes hillFloat {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-4px); }
        }
      `}</style>

      {/* Stars */}
      {STARS.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            '--star-op': s.opacity,
            opacity: s.opacity,
            animation: `twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Moon — centered in the sky (upper portion above controls) */}
      <div
        className="absolute rounded-full"
        style={{
          top: '38%',
          left: '50%',
          marginLeft: -(MOON_SIZE / 2),
          marginTop: -(MOON_SIZE / 2),
          width: MOON_SIZE,
          height: MOON_SIZE,
          background: cfg.bg,
          animation: `moonBreathe ${cfg.animSpeed} ease-in-out infinite`,
          transition: 'background 1.5s ease, box-shadow 1.5s ease',
          boxShadow: `0 0 40px 8px ${cfg.glow1}, 0 0 80px 20px ${cfg.glow2}, 0 0 120px 40px ${cfg.glowHot2}`,
        }}
      />

      {/* Soft clouds */}
      {CLOUDS.map(c => (
        <svg
          key={c.id}
          className="absolute"
          style={{
            top: c.top,
            left: `${-c.width / 2}px`,
            width: '100%',
            opacity: c.opacity,
            animation: `cloudDrift ${c.dur} ${c.delay} ease-in-out infinite`,
          }}
          viewBox={`0 0 430 ${c.height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="215" cy={c.height * 0.7} rx="200" ry={c.height * 0.5} fill="white" />
        </svg>
      ))}

      {/* Rolling hills silhouette */}
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 430 140"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'hillFloat 8s ease-in-out infinite' }}
      >
        <path
          d="M0 140 L0 80 Q50 45 100 65 Q150 85 200 55 Q260 22 320 58 Q370 82 430 60 L430 140 Z"
          fill="#120A30"
        />
        <path
          d="M0 140 L0 100 Q70 72 130 88 Q190 104 250 80 Q310 56 380 85 L430 90 L430 140 Z"
          fill="#0D0720"
        />
      </svg>

      {/* Dim overlay — activates after 30s of inactivity via CSS, dismissed on tap */}
      {dim && (
        <div
          className="absolute inset-0 bg-black transition-opacity duration-[3000ms]"
          style={{ opacity: 0.95 }}
        />
      )}
    </div>
  );
}
