export type TalkieMode = 
  | 'TRANSCEIVER'   // ÉMETTEUR + RÉCEPTEUR
  | 'TRANSMITTER'   // ÉMETTEUR uniquement
  | 'RECEIVER';     // RÉCEPTEUR uniquement

export interface TransmissionLog {
  id: string;
  sender: string;
  channel: string;
  timestamp: Date;
  durationMs: number;
  type: 'incoming' | 'outgoing' | 'test';
}

export interface AudioPacket {
  magic: string; // 'TT01'
  channel: string;
  user: string;
  timestamp: number;
  pcmData: number[]; // PCM samples (-1.0 to 1.0 or Int16)
  sampleRate: number;
  isEnd?: boolean;
}

export interface PeerDevice {
  id: string;
  user: string;
  channel: string;
  lastSeen: number;
  mode: TalkieMode;
  isSpeaking: boolean;
}

export interface ChannelInfo {
  id: string;
  name: string;
}

export const DEFAULT_CHANNELS: ChannelInfo[] = [
  { id: 'TECH-01', name: 'Canal 01 — Général' },
  { id: 'TECH-02', name: 'Canal 02 — Urgence / Sécurité' },
  { id: 'TECH-03', name: 'Canal 03 — Support Technique' },
  { id: 'TECH-04', name: 'Canal 04 — Logistique / Équipe' },
];
