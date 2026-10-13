import React from 'react';

interface AudioVisualizerProps {
  isTransmitting: boolean;
  isReceiving: boolean;
  level: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isTransmitting,
  isReceiving,
  level,
}) => {
  if (!isTransmitting && !isReceiving) {
    return null;
  }

  // Generate 24 dynamic bars based on current audio level
  const bars = Array.from({ length: 24 });
  const activeColor = isTransmitting ? 'bg-red-400' : 'bg-[#00BFA6]';

  return (
    <div className="w-full max-w-md px-2 my-1">
      <div className="bg-[#19242d] border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-1 shadow-inner">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 pl-1">
          {isTransmitting ? 'TX NIVEAU' : 'RX NIVEAU'}
        </span>

        <div className="flex-1 flex items-center justify-center gap-1 h-7 px-3">
          {bars.map((_, idx) => {
            // Generate varied heights responsive to the audio level
            const distance = Math.abs(idx - 12) / 12; // 0 in center, 1 at edges
            const baseFactor = Math.max(0.1, 1 - distance * 0.7);
            const variation = Math.sin(idx * 0.8 + Date.now() / 150) * 0.3 + 0.7;
            const barHeight = Math.max(12, Math.min(100, level * 100 * baseFactor * variation));

            return (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${activeColor}`}
                style={{
                  height: `${barHeight}%`,
                  opacity: barHeight > 25 ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>

        <span className="text-[10px] font-mono text-gray-400 font-bold pr-1">
          {Math.round(level * 100)}%
        </span>
      </div>
    </div>
  );
};
