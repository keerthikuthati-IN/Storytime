'use client';

interface ProgressBarProps {
  current: number; // 0-indexed
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`progress-dot transition-all duration-300 ${i === current ? 'active' : i < current ? 'bg-coral/40' : 'bg-gray-200'}`}
        />
      ))}
      <span className="ml-1 font-nunito text-xs text-gray-400 font-semibold">
        {current + 1}/{total}
      </span>
    </div>
  );
}
