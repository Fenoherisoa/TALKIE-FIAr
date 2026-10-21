import React, { useRef, useEffect } from 'react';
import { Mic, Radio, Volume2, Lock } from 'lucide-react';
import { TalkieMode } from '../types/talkie';

interface PttButtonProps {
  isActive: boolean;
  mode: TalkieMode;
  isTransmitting: boolean;
  isReceiving: boolean;
  audioLevel: number;
  isPttLocked: boolean;
  onTogglePttLock: (val: boolean) => void;
  onStartTalk: () => void;
  onEndTalk: () => void;
}

export const PttButton: React.FC<PttButtonProps> = ({
  isActive,
  mode,
  isTransmitting,
  isReceiving,
  audioLevel,
  isPttLocked,
  onTogglePttLock,
  onStartTalk,
  onEndTalk,
}) => {
  const isReceiverOnly = mode === 'RECEIVER';
  const isEnabled = isActive && !isReceiverOnly && !isReceiving;
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcut: Spacebar hold or toggle
  useEffect(() => {
    let spacePressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space' && !spacePressed && isEnabled) {
        e.preventDefault();
        spacePressed = true;
        if (isPttLocked) {
          if (isTransmitting) {
            onEndTalk();
          } else {
            onStartTalk();
          }
        } else {
          onStartTalk();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space' && spacePressed) {
        e.preventDefault();
        spacePressed = false;
        if (!isPttLocked && isTransmitting) {
          onEndTalk();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEnabled, isPttLocked, isTransmitting, onStartTalk, onEndTalk]);

  // Touch & Pointer events handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEnabled) return;
    e.preventDefault();
    if (isPttLocked) {
      if (isTransmitting) {
        onEndTalk();
      } else {
        onStartTalk();
      }
    } else {
      onStartTalk();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isEnabled || isPttLocked) return;
    e.preventDefault();
    onEndTalk();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isEnabled || isPttLocked) return;
    e.preventDefault();
    onEndTalk();
  };

  return (
    <div className="w-full max-w-md px-2 my-2 select-none">
      <div className="relative group">
        {/* Glow halo when transmitting */}
        {isTransmitting && (
          <div 
            className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 opacity-80 blur-md animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.15})`,
              transition: 'transform 0.05s ease-out',
            }}
          />
        )}

        {/* Glow halo when receiving */}
        {isReceiving && (
          <div className="absolute -inset-1 rounded-2xl bg-[#00BFA6]/40 blur-md animate-pulse" />
        )}

        <button
          ref={buttonRef}
          type="button"
          disabled={!isEnabled}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Bouton Push To Talk"
          className={`w-full min-h-[116px] rounded-2xl p-4 flex flex-col items-center justify-center relative transition-all duration-150 shadow-xl border select-none touch-none no-select ${
            !isActive
              ? 'bg-[#34434f]/50 border-white/5 text-gray-500 cursor-not-allowed'
              : isReceiverOnly
                ? 'bg-[#25313b] border-white/5 text-gray-500 cursor-not-allowed'
                : isTransmitting
                  ? 'bg-[#d94b4b] border-red-400 text-white shadow-red-900/50 scale-[0.98]'
                  : isReceiving
                    ? 'bg-[#25313b] border-[#00BFA6]/40 text-gray-400 cursor-not-allowed'
                    : 'bg-[#34434f] hover:bg-[#3e505e] border-white/10 hover:border-white/20 text-white cursor-pointer active:scale-[0.97]'
          }`}
        >
          {/* Main button content */}
          <div className="flex items-center gap-3 mb-1">
            {isTransmitting ? (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white animate-pulse">
                <Radio className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            ) : isReceiving ? (
              <div className="w-10 h-10 rounded-full bg-[#00BFA6]/20 flex items-center justify-center text-[#00BFA6] animate-bounce">
                <Volume2 className="w-6 h-6" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEnabled ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'}`}>
                <Mic className="w-6 h-6" />
              </div>
            )}

            <div className="text-left">
              <span className={`text-lg sm:text-xl font-bold tracking-wider uppercase block ${
                isTransmitting ? 'text-white' : isEnabled ? 'text-white' : 'text-gray-400'
              }`}>
                {isTransmitting
                  ? (isPttLocked ? 'ÉMISSION ACTIVE (VERROUILLÉE)' : 'MITENY… AVOTSY MBA HAMPITSO')
                  : isReceiving
                    ? 'CANAL OCCUPÉ (RÉCEPTION)'
                    : isReceiverOnly
                      ? 'MODE RÉCEPTEUR ACTIF'
                      : (isPttLocked ? 'CLIQUER POUR PARLER (VERROUILLÉ)' : 'MAINTENIR POUR PARLER')}
              </span>

              <span className="text-[11px] block text-gray-300 font-mono">
                {!isActive
                  ? 'Connectez-vous pour parler'
                  : isTransmitting
                    ? (isPttLocked ? 'Cliquer ou [Espace] pour couper le micro' : 'Diffusion audio en direct • Micro actif')
                    : isReceiving
                      ? 'Écoute de la transmission en cours'
                      : isReceiverOnly
                        ? 'Émission désactivée dans ce mode'
                        : (isPttLocked ? 'Cliquer pour enclencher le micro en continu' : '[Espace] ou maintenir avec le doigt/souris')}
              </span>
            </div>
          </div>

          {/* Audio level indicator bar at the bottom of button */}
          {isTransmitting && (
            <div className="w-full max-w-[280px] h-2 bg-black/30 rounded-full overflow-hidden mt-2 p-0.5">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: `${Math.max(8, audioLevel * 100)}%` }}
              />
            </div>
          )}
        </button>

        {/* Hands-free PTT Lock toggle matching original Android cbLockPtt */}
        <div className="flex items-center justify-center mt-2.5">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#19242d] border border-white/5 hover:border-white/10 text-xs text-gray-300 hover:text-white cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={isPttLocked}
              onChange={(e) => onTogglePttLock(e.target.checked)}
              className="w-4 h-4 rounded accent-[#00BFA6] cursor-pointer"
            />
            <Lock className={`w-3.5 h-3.5 ${isPttLocked ? 'text-[#00BFA6]' : 'text-gray-400'}`} />
            <span>Mode émission verrouillée (mains libres)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
