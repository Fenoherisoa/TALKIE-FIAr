import React from 'react';
import { X, Wifi, CheckCircle2 } from 'lucide-react';

interface HotspotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotspotGuideModal: React.FC<HotspotGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#19242d] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[#00BFA6]" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Guide d'utilisation TALKIE TECH
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3.5 overflow-y-auto pr-1 text-xs text-gray-300">
          <div className="p-3 rounded-xl bg-[#25313b]/60 border border-white/5 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00BFA6]" />
              Principe & Fonctionnement
            </div>
            <p className="text-gray-300 leading-relaxed">
              TALKIE TECH permet une communication audio Push-To-Talk (PTT) directe en temps réel sur réseau local ou hotspot Wi-Fi partagé, sans nécessiter d'accès Internet ni de serveur externe.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider text-[#00BFA6]">
              Étapes pour communiquer :
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#101820] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#00BFA6]/20 text-[#00BFA6] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-semibold text-white">Même réseau Wi-Fi ou Hotspot</p>
                <p className="text-[11px] text-gray-400">
                  Connectez tous les appareils au même hotspot Wi-Fi (point d'accès mobile d'un téléphone sans données mobiles, ou routeur local).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#101820] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#00BFA6]/20 text-[#00BFA6] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Autorisation du microphone</p>
                <p className="text-[11px] text-gray-400">
                  Acceptez la demande d'accès au micro lors de la connexion pour permettre l'échantillonnage PCM 16 kHz.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#101820] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#00BFA6]/20 text-[#00BFA6] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-semibold text-white">Canal virtuel identique</p>
                <p className="text-[11px] text-gray-400">
                  Choisissez un nom d'utilisateur distinct et renseignez le même canal (ex. <span className="font-mono text-[#00BFA6]">TECH-01</span>) sur tous les postes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#101820] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#00BFA6]/20 text-[#00BFA6] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div>
                <p className="font-semibold text-white">Push-To-Talk (PTT)</p>
                <p className="text-[11px] text-gray-400">
                  Maintenez le bouton <span className="text-white font-bold">MAINTENIR POUR PARLER</span> (ou la barre d'espace) pour émettre, puis relâchez pour écouter.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#00BFA6]/10 border border-[#00BFA6]/20 text-[11px] text-gray-300">
            <span className="font-bold text-[#00BFA6]">Astuce test rapide : </span>
            Ouvrez cette page dans deux onglets de votre navigateur avec deux noms d'utilisateurs différents pour tester immédiatement la transmission en direct !
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#00BFA6] hover:bg-[#00d8bc] text-[#101820] font-bold text-xs tracking-wider transition-colors cursor-pointer"
          >
            COMPRIS
          </button>
        </div>
      </div>
    </div>
  );
};
