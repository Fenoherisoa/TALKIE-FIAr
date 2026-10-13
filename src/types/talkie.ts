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
