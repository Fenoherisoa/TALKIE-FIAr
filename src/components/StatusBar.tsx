import React from 'react';
import { Wifi, WifiOff, Volume2, Mic } from 'lucide-react';

interface StatusBarProps {
  isActive: boolean;
  user: string;
  channel: string;
  receivingFrom: string | null;
  isTransmitting: boolean;
  statusMessage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isActive,
  user,
  channel,
  receivingFrom,
  isTransmitting,
  statusMessage,
}) => {
  // Determine state display
  let mainText = '';
  let subText = '';
  if (!isActive) {
    mainText = statusMessage || 'État : déconnecté';
    subText = 'Connectez tous les appareils au même réseau Wi-Fi (sans données mobiles).';
  } else if (receivingFrom) {
    mainText = `Mandray feo avy amin'i ${receivingFrom}`;
    subText = `Canal : ${channel} • Audio en direct`;
  } else if (isTransmitting) {
    mainText = `Émission en cours sur le canal ${channel}`;
    subText = `Nom : ${user} • Diffusion locale active`;
  } else {
    mainText = 'État : actif sur le réseau Wi-Fi local';
    subText = `Canal : ${channel} • Nom : ${user}\nTous les téléphones doivent être sur le même réseau.`;
  }

  return (
    <div className="w-full max-w-md px-2 my-2">
      <div className="bg-[#19242d] border border-white/10 rounded-xl p-3.5 shadow-lg relative overflow-hidden transition-all">
        {/* Subtle accent border at top */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-300 ${
            !isActive 
              ? 'bg-gray-600' 
              : receivingFrom 
                ? 'bg-[#00BFA6]' 
                : isTransmitting 
                  ? 'bg-[#d94b4b]' 
                  : 'bg-[#00BFA6]/60'
          }`}
        />

        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {!isActive ? (
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                <WifiOff className="w-4 h-4" />
              </div>
            ) : receivingFrom ? (
              <div className="w-8 h-8 rounded-lg bg-[#00BFA6]/20 flex items-center justify-center text-[#00BFA6] animate-bounce">
                <Volume2 className="w-4 h-4" />
              </div>
            ) : isTransmitting ? (
              <div className="w-8 h-8 rounded-lg bg-red-900/40 flex items-center justify-center text-red-400 animate-pulse">
                <Mic className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#00BFA6]/10 flex items-center justify-center text-[#00BFA6]">
                <Wifi className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white tracking-wide truncate">
              {mainText}
            </div>
            <div className="text-xs text-gray-300/90 font-mono mt-0.5 whitespace-pre-line leading-relaxed">
              {subText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
