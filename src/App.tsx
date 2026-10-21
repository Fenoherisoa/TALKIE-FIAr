import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TalkieMode, TransmissionLog, PeerDevice, AudioPacket } from './types/talkie';
import { audioEngine } from './utils/audioEngine';
import { broadcastNetwork } from './utils/broadcastNetwork';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { ConfigCard } from './components/ConfigCard';
import { PttButton } from './components/PttButton';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ActivityLog } from './components/ActivityLog';
import { PeersList } from './components/PeersList';
import { SettingsModal } from './components/SettingsModal';
import { HotspotGuideModal } from './components/HotspotGuideModal';
import { MicPermissionModal } from './components/MicPermissionModal';

export const App: React.FC = () => {
  // App State
  const [isActive, setIsActive] = useState(false);
  const [user, setUser] = useState('TECH-USER');
  const [channel, setChannel] = useState('TECH-01');
  const [mode, setMode] = useState<TalkieMode>('TRANSCEIVER');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPttLocked, setIsPttLocked] = useState(false);
  const [receivingFrom, setReceivingFrom] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [logs, setLogs] = useState<TransmissionLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Audio Settings
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [rogerBeep, setRogerBeep] = useState(true);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [micErrorReason, setMicErrorReason] = useState<string>('');

  // References for transmission durations
  const transmitStartTimeRef = useRef<number>(0);
  const receivingTimeoutRef = useRef<number | null>(null);
  const receivingStartTimeRef = useRef<number>(0);

  // Sanitization helper matching Kotlin original safeUser() and safeChannel()
  const safeUser = useCallback((name: string) => {
    return name.trim().replace(/\|/g, '_').slice(0, 24) || 'TECH-USER';
  }, []);

  const safeChannel = useCallback((ch: string) => {
    return ch.trim().toUpperCase().replace(/\|/g, '_').slice(0, 20) || 'TECH-01';
  }, []);

  // Update broadcast network config when parameters change
  useEffect(() => {
    broadcastNetwork.setConfig(isActive, safeUser(user), safeChannel(channel), mode);
  }, [isActive, user, channel, mode, safeUser, safeChannel]);

  // Audio Engine Callbacks setup
  useEffect(() => {
    // When microphone gives audio chunks
    audioEngine.onPcmChunk = (pcm: Float32Array) => {
      broadcastNetwork.sendAudioChunk(pcm, false);
    };

    // When mic volume changes
    audioEngine.onMicLevel = (lvl: number) => {
      if (isTransmitting) {
        setAudioLevel(lvl);
      }
    };

    // When output volume changes
    audioEngine.onOutputLevel = (lvl: number) => {
      if (receivingFrom) {
        setAudioLevel(lvl);
      }
    };

    // When packet is received from another peer/tab
    broadcastNetwork.onPacketReceived = (packet: AudioPacket) => {
      if (mode === 'TRANSMITTER') return; // Transmitter only doesn't listen

      audioEngine.playIncomingPcm(packet.pcmData, packet.sampleRate);

      if (!receivingFrom || receivingFrom !== packet.user) {
        setReceivingFrom(packet.user);
        receivingStartTimeRef.current = Date.now();
      }

      // Reset receiving timeout
      if (receivingTimeoutRef.current) {
        clearTimeout(receivingTimeoutRef.current);
      }

      receivingTimeoutRef.current = window.setTimeout(() => {
        const duration = Date.now() - receivingStartTimeRef.current;
        if (packet.user && duration > 200) {
          setLogs((prev) => [
            {
              id: Math.random().toString(36).substring(2, 9),
              sender: packet.user,
              channel: packet.channel,
              timestamp: new Date(),
              durationMs: duration,
              type: 'incoming',
            },
            ...prev.slice(0, 49),
          ]);
        }
        setReceivingFrom(null);
        setAudioLevel(0);
      }, 500);
    };

    // When peers list updates
    broadcastNetwork.onPeersUpdated = (updatedPeers: PeerDevice[]) => {
      setPeers(updatedPeers);
    };

    return () => {
      if (receivingTimeoutRef.current) {
        clearTimeout(receivingTimeoutRef.current);
      }
    };
  }, [mode, isTransmitting, receivingFrom]);

  // Handle Connect / Disconnect button
  const handleToggleConnect = async () => {
    if (isActive) {
      // Disconnect
      if (isTransmitting) {
        handleEndTalk();
      }
      setIsActive(false);
      setReceivingFrom(null);
      setAudioLevel(0);
      setStatusMessage('État : déconnecté');
    } else {
      // Receiver mode only listens, so microphone access is not required
      if (mode === 'RECEIVER') {
        try {
          await audioEngine.init();
          setIsActive(true);
          setStatusMessage('');
        } catch (err) {
          console.error('Audio init error:', err);
          setStatusMessage('Initialisation audio impossible.');
        }
        return;
      }

      // Connect: request microphone
      try {
        const res = await audioEngine.requestMic();
        if (!res.granted) {
          const reason = res.errorReason || 'Microphone non autorisé : vérifiez les permissions.';
          setMicErrorReason(reason);
          setIsMicModalOpen(true);
          setStatusMessage(reason);
          return;
        }
        setIsActive(true);
        setStatusMessage('');
      } catch (err) {
        console.error('Connection error:', err);
        setStatusMessage('Connexion impossible : vérifiez les autorisations.');
      }
    }
  };

  // Push-To-Talk Start
  const handleStartTalk = async () => {
    if (!isActive || isTransmitting || mode === 'RECEIVER') return;

    try {
      transmitStartTimeRef.current = Date.now();
      const started = await audioEngine.startRecording();
      if (!started) {
        setIsTransmitting(false);
        broadcastNetwork.broadcastPresence(false);
        return;
      }
      setIsTransmitting(true);
      broadcastNetwork.broadcastPresence(true);
    } catch (err) {
      console.error('Start talk error:', err);
      setIsTransmitting(false);
      broadcastNetwork.broadcastPresence(false);
    }
  };

  // Push-To-Talk End
  const handleEndTalk = () => {
    if (!isTransmitting) return;

    audioEngine.stopRecording();
    broadcastNetwork.broadcastPresence(false);
    broadcastNetwork.sendAudioChunk(new Float32Array(0), true);

    const duration = Date.now() - transmitStartTimeRef.current;
    if (duration > 300) {
      setLogs((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: safeUser(user),
          channel: safeChannel(channel),
          timestamp: new Date(),
          durationMs: duration,
          type: 'outgoing',
        },
        ...prev.slice(0, 49),
      ]);
    }

    setIsTransmitting(false);
    setAudioLevel(0);
  };

  // Simulate test radio transmission for evaluation
  const handleSimulateTest = async () => {
    if (!isActive || isTransmitting || receivingFrom) return;

    const testSender = 'CENTRALE-RFC';
    setReceivingFrom(testSender);
    receivingStartTimeRef.current = Date.now();

    await audioEngine.generateTestTransmission(
      testSender,
      safeChannel(channel),
      'Test radio talkie tech',
      () => {
        setAudioLevel(Math.random() * 0.6 + 0.3);
      }
    );

    const duration = Date.now() - receivingStartTimeRef.current;
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        sender: testSender,
        channel: safeChannel(channel),
        timestamp: new Date(),
        durationMs: duration,
        type: 'test',
      },
      ...prev.slice(0, 49),
    ]);

    setReceivingFrom(null);
    setAudioLevel(0);
  };

  // Volume change handlers
  const handleChangeVolume = (val: number) => {
    setVolume(val);
    audioEngine.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 1);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleToggleSoundEffects = () => {
    const nextVal = !soundEffects;
    setSoundEffects(nextVal);
    audioEngine.setSoundEffects(nextVal);
  };

  const handleToggleRogerBeep = () => {
    const nextVal = !rogerBeep;
    setRogerBeep(nextVal);
    audioEngine.setRogerBeep(nextVal);
  };

  return (
    <div className="min-h-screen bg-[#101820] text-white flex flex-col items-center justify-between pb-6 select-none font-sans">
      {/* Top Header */}
      <div className="w-full flex flex-col items-center">
        <Header
          isActive={isActive}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          activePeersCount={peers.length}
        />

        {/* Status display */}
        <StatusBar
          isActive={isActive}
          user={safeUser(user)}
          channel={safeChannel(channel)}
          receivingFrom={receivingFrom}
          isTransmitting={isTransmitting}
          statusMessage={statusMessage}
        />

        {/* Configuration inputs & Connect button */}
        <ConfigCard
          user={user}
          onChangeUser={setUser}
          channel={channel}
          onChangeChannel={setChannel}
          mode={mode}
          onChangeMode={setMode}
          isActive={isActive}
          onToggleConnect={handleToggleConnect}
        />

        {/* Active peers list if any */}
        <PeersList peers={peers} currentChannel={safeChannel(channel)} />

        {/* Audio Visualizer & Level Meter */}
        <AudioVisualizer
          isTransmitting={isTransmitting}
          isReceiving={!!receivingFrom}
          level={audioLevel}
        />

        {/* Push-To-Talk Button */}
        <PttButton
          isActive={isActive}
          mode={mode}
          isTransmitting={isTransmitting}
          isReceiving={!!receivingFrom}
          audioLevel={audioLevel}
          isPttLocked={isPttLocked}
          onTogglePttLock={(locked) => {
            setIsPttLocked(locked);
            if (!locked && isTransmitting) {
              handleEndTalk();
            }
          }}
          onStartTalk={handleStartTalk}
          onEndTalk={handleEndTalk}
        />

        {/* Transmission Activity Log */}
        <ActivityLog
          logs={logs}
          onClear={() => setLogs([])}
          onSimulateTest={handleSimulateTest}
          isActive={isActive}
        />
      </div>

      {/* Footer matching original app */}
      <footer className="w-full max-w-md px-4 mt-4 pt-2 border-t border-white/5 text-center select-none">
        <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          TALKIE TECH • RFC OFFICE
        </p>
        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
          Audio local en temps réel • Canal virtuel
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        soundEffects={soundEffects}
        onToggleSoundEffects={handleToggleSoundEffects}
        rogerBeep={rogerBeep}
        onToggleRogerBeep={handleToggleRogerBeep}
      />

      {/* Hotspot Guide Modal */}
      <HotspotGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Mic Permission Guidance Modal */}
      <MicPermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        errorReason={micErrorReason}
        onRetry={async () => {
          setIsMicModalOpen(false);
          await handleToggleConnect();
        }}
        onFallbackBeacon={async () => {
          setIsMicModalOpen(false);
          setMode('RECEIVER');
          await audioEngine.init();
          setIsActive(true);
          await handleSimulateTest();
        }}
      />
    </div>
  );
};
