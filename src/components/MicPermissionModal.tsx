import React from 'react';
import { MicOff, AlertCircle, RefreshCw, Volume2, ShieldAlert, X } from 'lucide-react';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onFallbackBeacon?: () => void;
  errorReason?: string;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onFallbackBeacon,
  errorReason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#19242d] border border-red-500/30 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-red-400">
            <MicOff className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Accès au Microphone Requis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3.5 text-xs text-gray-300">
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">
                {errorReason || "L'accès au microphone est actuellement bloqué."}
              </p>
              <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                Le talkie-walkie a besoin du micro pour capturer votre voix lors de l'appui sur « Maintenir pour parler ».
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase text-[11px] tracking-wider text-[#00BFA6] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Comment débloquer le micro :
            </p>

            <div className="p-2.5 rounded-xl bg-[#101820] border border-white/5 space-y-1 text-[11px] text-gray-300">
              <p>• Cliquez sur l'icône de cadenas ou de réglages à gauche de l'URL du navigateur.</p>
              <p>• Basculez l'autorisation <strong>Microphone</strong> sur <strong>Autoriser</strong>.</p>
              <p>• Cliquez sur le bouton vert <strong>Réessayer</strong> ci-dessous.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#00BFA6]/10 border border-[#00BFA6]/20 text-[11px] text-gray-300 flex items-start gap-2">
            <Volume2 className="w-4 h-4 text-[#00BFA6] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#00BFA6]">Mode écoute toujours fonctionnel : </span>
              Vous pouvez continuer à recevoir les transmissions audio des autres postes et utiliser la balise de test même sans micro actif.
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
          <button
            onClick={() => {
              onRetry();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00BFA6] hover:bg-[#00d8bc] text-[#101820] font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RÉESSAYER L'AUTORISATION DU MICRO
          </button>

          {onFallbackBeacon && (
            <button
              onClick={() => {
                onClose();
                onFallbackBeacon();
              }}
              className="w-full py-2 px-4 rounded-xl bg-[#25313b] hover:bg-[#2d3a45] text-gray-200 font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/5"
            >
              ÉMETTRE AVEC LA BALISE DE TEST (SANS MICRO)
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-1.5 text-center text-xs text-gray-400 hover:text-white transition-colors"
          >
            Continuer en mode écoute seule
          </button>
        </div>
      </div>
    </div>
  );
};
