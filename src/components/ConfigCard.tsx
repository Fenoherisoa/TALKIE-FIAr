import React from 'react';
import { User, Hash, Sliders, Power } from 'lucide-react';
import { TalkieMode, DEFAULT_CHANNELS } from '../types/talkie';

interface ConfigCardProps {
  user: string;
  onChangeUser: (val: string) => void;
  channel: string;
  onChangeChannel: (val: string) => void;
  mode: TalkieMode;
  onChangeMode: (mode: TalkieMode) => void;
  isActive: boolean;
  onToggleConnect: () => void;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
  user,
  onChangeUser,
  channel,
  onChangeChannel,
  mode,
  onChangeMode,
  isActive,
  onToggleConnect,
}) => {
  return (
    <div className="w-full max-w-md px-2 space-y-3 select-none">
      {/* User Name input */}
      <div className="relative">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 pl-1">
          Nom d'utilisateur
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-gray-400 pointer-events-none">
            <User className="w-4 h-4 text-[#00BFA6]" />
          </div>
          <input
            type="text"
            value={user}
            disabled={isActive}
            onChange={(e) => onChangeUser(e.target.value)}
            placeholder="Nom d'utilisateur (ex. FENO-01)"
            maxLength={24}
            className={`w-full h-[52px] pl-11 pr-4 rounded-xl text-white font-medium text-base bg-[#25313b] border transition-colors outline-none ${
              isActive
                ? 'opacity-80 border-transparent cursor-not-allowed text-gray-300'
                : 'border-white/10 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6]'
            }`}
          />
        </div>
      </div>

      {/* Channel Input & Quick Presets */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1 pl-1 pr-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Canal virtuel
          </label>
          <span className="text-[10px] text-gray-400 font-mono">
            {DEFAULT_CHANNELS.find((c) => c.id === channel)?.name || 'Canal personnalisé'}
          </span>
        </div>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-gray-400 pointer-events-none">
            <Hash className="w-4 h-4 text-[#00BFA6]" />
          </div>
          <input
            type="text"
            value={channel}
            disabled={isActive}
            onChange={(e) => onChangeChannel(e.target.value.toUpperCase())}
            placeholder="Canal (ex. TECH-01)"
            maxLength={20}
            className={`w-full h-[52px] pl-11 pr-4 rounded-xl text-white font-mono font-semibold text-base uppercase bg-[#25313b] border transition-colors outline-none ${
              isActive
                ? 'opacity-80 border-transparent cursor-not-allowed text-gray-300'
                : 'border-white/10 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6]'
            }`}
          />
        </div>

        {/* Quick channel preset chips */}
        {!isActive && (
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {DEFAULT_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => onChangeChannel(ch.id)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-semibold tracking-wider transition-all truncate border ${
                  channel === ch.id
                    ? 'bg-[#00BFA6]/20 text-[#00BFA6] border-[#00BFA6]/50 shadow-sm'
                    : 'bg-[#25313b]/60 text-gray-300 border-white/5 hover:bg-[#25313b] hover:text-white'
                }`}
                title={ch.name}
              >
                {ch.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="relative">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 pl-1">
          Mode de fonctionnement
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-gray-400 pointer-events-none">
            <Sliders className="w-4 h-4 text-[#00BFA6]" />
          </div>
          <select
            value={mode}
            disabled={isActive}
            onChange={(e) => onChangeMode(e.target.value as TalkieMode)}
            className={`w-full h-[52px] pl-11 pr-10 rounded-xl text-white font-medium text-sm bg-[#25313b] border transition-colors outline-none appearance-none cursor-pointer ${
              isActive
                ? 'opacity-80 border-transparent cursor-not-allowed text-gray-300'
                : 'border-white/10 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6]'
            }`}
          >
            <option value="TRANSCEIVER">ÉMETTEUR + RÉCEPTEUR</option>
            <option value="TRANSMITTER">ÉMETTEUR uniquement</option>
            <option value="RECEIVER">RÉCEPTEUR uniquement</option>
          </select>
          <div className="absolute right-4 pointer-events-none text-gray-400">
            ▼
          </div>
        </div>
      </div>

      {/* Main Connect / Disconnect Action Button */}
      <div className="pt-2">
        <button
          onClick={onToggleConnect}
          className={`w-full h-[56px] rounded-xl font-bold text-base tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
            isActive
              ? 'bg-[#34434f] hover:bg-[#3d4e5c] text-white border border-red-500/40 hover:border-red-500/70 shadow-red-950/20'
              : 'bg-[#00BFA6] hover:bg-[#00d8bc] text-[#101820] shadow-[#00BFA6]/20'
          }`}
        >
          <Power className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-[#101820]'}`} />
          <span>{isActive ? 'DÉCONNECTER' : 'SE CONNECTER AU WI-FI LOCAL'}</span>
        </button>
      </div>
    </div>
  );
};
