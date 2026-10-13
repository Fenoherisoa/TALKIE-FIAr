import { AudioPacket, TalkieMode, PeerDevice } from '../types/talkie';

export class BroadcastNetwork {
  private channelName = 'talkie_tech_mesh_v1';
  private broadcastChannel: BroadcastChannel | null = null;
  private currentChannel = 'TECH-01';
  private currentUser = 'TECH-USER';
  private currentMode: TalkieMode = 'TRANSCEIVER';
  private active = false;
  private heartbeatInterval: number | null = null;
  private peers: Map<string, PeerDevice> = new Map();
  private peerId = Math.random().toString(36).substring(2, 9);

  // Callbacks
  public onPacketReceived?: (packet: AudioPacket) => void;
  public onPeersUpdated?: (peers: PeerDevice[]) => void;
  public onSpeakingStateChange?: (user: string, isSpeaking: boolean) => void;

  constructor() {
    this.setupBroadcastChannel();
  }

  private setupBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel not available in this environment:', err);
    }
  }

  public setConfig(active: boolean, user: string, channel: string, mode: TalkieMode) {
    this.active = active;
    this.currentUser = user;
    this.currentChannel = channel;
    this.currentMode = mode;

    if (active) {
      this.startHeartbeat();
      this.broadcastPresence(false);
    } else {
      this.stopHeartbeat();
      this.peers.clear();
      if (this.onPeersUpdated) this.onPeersUpdated([]);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.active) return;
      this.broadcastPresence(false);
      this.pruneStalePeers();
    }, 3000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private pruneStalePeers() {
    const now = Date.now();
    let changed = false;
    this.peers.forEach((peer, id) => {
      if (now - peer.lastSeen > 8000) {
        this.peers.delete(id);
        changed = true;
      }
    });
    if (changed && this.onPeersUpdated) {
      this.onPeersUpdated(Array.from(this.peers.values()));
    }
  }

  public broadcastPresence(isSpeaking: boolean) {
    if (!this.active || !this.broadcastChannel) return;
    const msg = {
      type: 'presence',
      peerId: this.peerId,
      user: this.currentUser,
      channel: this.currentChannel,
      mode: this.currentMode,
      isSpeaking,
      timestamp: Date.now(),
    };
    try {
      this.broadcastChannel.postMessage(msg);
    } catch {
      // Ignore
    }
  }

  // Sends raw PCM chunk matching original packet structure:
  // "TT01|{channel}|{user}|\n" followed by PCM samples
  public sendAudioChunk(samples: Float32Array | number[], isEnd = false) {
    if (!this.active || !this.broadcastChannel) return;
    if (this.currentMode === 'RECEIVER') return;

    // Convert Float32Array to regular array
    const sampleArray = Array.from(samples);

    const packet: AudioPacket = {
      magic: 'TT01',
      channel: this.currentChannel,
      user: this.currentUser,
      timestamp: Date.now(),
      pcmData: sampleArray,
      sampleRate: 16000,
      isEnd,
    };

    try {
      this.broadcastChannel.postMessage({
        type: 'audio',
        packet,
      });
    } catch (err) {
      console.error('Failed to broadcast audio packet:', err);
    }
  }

  private handleMessage(data: any) {
    if (!this.active || !data) return;

    if (data.type === 'presence') {
      const { peerId, user, channel, mode, isSpeaking, timestamp } = data;
      if (peerId === this.peerId) return; // Don't track self

      // Only track peers on the same virtual channel
      if (channel === this.currentChannel) {
        this.peers.set(peerId, {
          id: peerId,
          user,
          channel,
          lastSeen: timestamp || Date.now(),
          mode,
          isSpeaking: !!isSpeaking,
        });
        if (this.onPeersUpdated) {
          this.onPeersUpdated(Array.from(this.peers.values()));
        }
        if (this.onSpeakingStateChange) {
          this.onSpeakingStateChange(user, !!isSpeaking);
        }
      }
    } else if (data.type === 'audio') {
      const packet: AudioPacket = data.packet;
      if (!packet) return;

      // Filtering rule from original Kotlin MainActivity:
      // if (parts.size < 3 || parts[0] != "TT01" || parts[1] != safeChannel() || parts[2] == safeUser()) continue
      // Must match TT01, match channel, and NOT be our own transmission
      if (
        packet.magic === 'TT01' &&
        packet.channel === this.currentChannel &&
        packet.user !== this.currentUser &&
        this.currentMode !== 'TRANSMITTER' // Transmitter-only doesn't receive
      ) {
        if (this.onPacketReceived) {
          this.onPacketReceived(packet);
        }
      }
    }
  }

  public getConnectedPeers(): PeerDevice[] {
    return Array.from(this.peers.values());
  }

  public cleanup() {
    this.stopHeartbeat();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.peers.clear();
  }
}

export const broadcastNetwork = new BroadcastNetwork();
