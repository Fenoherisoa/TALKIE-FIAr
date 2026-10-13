import React from 'react';
import { Radio, Settings, HelpCircle, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  isActive: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activePeersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isActive,
  onOpenSettings,
  onOpenGuide,
  isMuted,
  onToggleMute,
  activePeersCount,
}) => {
  return (
    <header className="w-full pt-4 pb-2 px-4 flex flex-col items-center relative select-none">
      {/* Top action icons */}
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider transition-colors ${
            isActive 
              ? 'bg-[#00BFA6]/20 text-[#00BFA6] border border-[#00BFA6]/40' 
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00BFA6] animate-pulse' : 'bg-gray-500'}`} />
            {isActive ? 'EN LIGNE' : 'HORS LIGNE'}
          </div>

          {isActive && (
            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1 bg-[#25313b] px-2 py-0.5 rounded-full border border-white/5">
              <Radio className="w-3 h-3 text-[#00BFA6]" />
              {activePeersCount > 0 ? `${activePeersCount} poste(s)` : '1 poste'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#25313b] transition-colors"
            aria-label="Contrôle du volume"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onOpenGuide}
            title="Guide Wi-Fi Hotspot"
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#25313b] transition-colors"
            aria-label="Guide Wi-Fi"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            title="Paramètres audio"
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#25313b] transition-colors"
            aria-label="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main App Title */}
      <div className="flex items-center gap-2 mb-0.5">
        <Radio className="w-7 h-7 text-[#00BFA6]" strokeWidth={2.5} />
        <h1 className="text-[29px] leading-tight font-extrabold tracking-wide text-[#00BFA6]">
          TALKIE TECH
        </h1>
      </div>

      {/* Subtitle from original app */}
      <p className="text-[11px] tracking-widest uppercase font-semibold text-gray-400 text-center">
        COMMUNICATION LOCALE • SANS INTERNET
      </p>
    </header>
  );
};
