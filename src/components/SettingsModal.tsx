import React from 'react';
import { X, Volume2, Mic, Bell, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
  onChangeVolume: (val: number) => void;
  soundEffects: boolean;
  onToggleSoundEffects: () => void;
  rogerBeep: boolean;
  onToggleRogerBeep: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  volume,
  onChangeVolume,
  soundEffects,
  onToggleSoundEffects,
  rogerBeep,
  onToggleRogerBeep,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#19242d] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#00BFA6]" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Paramètres Audio & Radio
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Volume reception slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-xs font-semibold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#00BFA6]" />
                Volume de réception
              </span>
              <span className="font-mono text-[#00BFA6]">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full accent-[#00BFA6] bg-[#25313b] h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sound FX toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#25313b]/60 border border-white/5">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#00BFA6]" />
              <div>
                <p className="text-xs font-semibold text-white">Bruits & Clés radio (Squelch)</p>
                <p className="text-[11px] text-gray-400">Chirp PTT et bruit d'ouverture radio</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={onToggleSoundEffects}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00BFA6]"></div>
            </label>
          </div>

          {/* Roger Beep toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#25313b]/60 border border-white/5">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-[#00BFA6]" />
              <div>
                <p className="text-xs font-semibold text-white">Roger Beep (Fin d'émission)</p>
                <p className="text-[11px] text-gray-400">Signal sonore classique "Terminé / Over"</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rogerBeep}
                onChange={onToggleRogerBeep}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00BFA6]"></div>
            </label>
          </div>

          {/* Protocol specs info */}
          <div className="p-3 rounded-xl bg-[#101820] border border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
              <Cpu className="w-3.5 h-3.5 text-[#00BFA6]" />
              <span>Protocole radio Talkie Tech</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400 pt-1">
              <div>Échantillonnage : <span className="text-white">16 000 Hz</span></div>
              <div>Format : <span className="text-white">PCM 16-bit Mono</span></div>
              <div>Magic Header : <span className="text-white">TT01|</span></div>
              <div>Port réseau : <span className="text-white">45454 UDP / Mesh</span></div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#00BFA6] hover:bg-[#00d8bc] text-[#101820] font-bold text-xs tracking-wider transition-colors cursor-pointer"
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  );
};
