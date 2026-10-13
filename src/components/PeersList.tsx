import React from 'react';
import { Users, Radio, Signal } from 'lucide-react';
import { PeerDevice } from '../types/talkie';

interface PeersListProps {
  peers: PeerDevice[];
  currentChannel: string;
}

export const PeersList: React.FC<PeersListProps> = ({ peers, currentChannel }) => {
  if (peers.length === 0) return null;

  return (
    <div className="w-full max-w-md px-2 my-1 select-none">
      <div className="bg-[#19242d] border border-white/10 rounded-xl p-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#00BFA6]" />
            <span>Postes actifs sur {currentChannel} ({peers.length})</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#00BFA6]">
            <Signal className="w-3 h-3" />
            <span>Réseau direct</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {peers.map((peer) => (
            <div
              key={peer.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                peer.isSpeaking
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                  : 'bg-[#25313b] text-gray-200 border-white/5'
              }`}
            >
              <Radio className={`w-3 h-3 ${peer.isSpeaking ? 'text-red-400' : 'text-[#00BFA6]'}`} />
              <span className="font-semibold">{peer.user}</span>
              {peer.isSpeaking && (
                <span className="text-[10px] bg-red-600 text-white px-1 rounded uppercase font-bold">
                  Parle
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
