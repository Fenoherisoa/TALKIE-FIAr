import React from 'react';
import { History, ArrowUpRight, ArrowDownLeft, Radio, Trash2 } from 'lucide-react';
import { TransmissionLog } from '../types/talkie';

interface ActivityLogProps {
  logs: TransmissionLog[];
  onClear: () => void;
  onSimulateTest: () => void;
  isActive: boolean;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  logs,
  onClear,
  onSimulateTest,
  isActive,
}) => {
  return (
    <div className="w-full max-w-md px-2 my-2 select-none">
      <div className="bg-[#19242d] border border-white/10 rounded-xl p-3 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-300">
            <History className="w-3.5 h-3.5 text-[#00BFA6]" />
            <span>Journal des transmissions</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateTest}
              disabled={!isActive}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                isActive
                  ? 'bg-[#00BFA6]/10 text-[#00BFA6] border-[#00BFA6]/30 hover:bg-[#00BFA6]/20'
                  : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
              }`}
              title="Tester la réception radio sans 2ème appareil"
            >
              <Radio className="w-3 h-3" />
              <span>Test radio</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={onClear}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                title="Effacer le journal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List of transmissions */}
        <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
          {logs.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs">
              Aucune transmission enregistrée. Appuyez sur <span className="text-[#00BFA6]">Test radio</span> ou utilisez deux onglets.
            </div>
          ) : (
            logs.map((log) => {
              const isOutgoing = log.type === 'outgoing';
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const durSec = (log.durationMs / 1000).toFixed(1);

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#25313b]/60 border border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isOutgoing ? 'bg-red-500/20 text-red-400' : 'bg-[#00BFA6]/20 text-[#00BFA6]'
                      }`}
                    >
                      {isOutgoing ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownLeft className="w-3 h-3" />
                      )}
                    </span>
                    <div className="truncate">
                      <span className="font-semibold text-white tracking-wide">{log.sender}</span>
                      <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                        [{log.channel}]
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-400 font-mono shrink-0 flex items-center gap-2">
                    <span>{durSec}s</span>
                    <span className="text-gray-400">{timeStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
