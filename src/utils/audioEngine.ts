// Audio Engine for TALKIE TECH
// Handles PCM 16kHz recording, playback queue, radio sound effects, and volume analysis

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private outputGain: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private isRecording = false;
  private targetSampleRate = 16000;
  private masterVolume = 1.0;
  private soundEffectsEnabled = true;
  private rogerBeepEnabled = true;

  // Callbacks
  public onPcmChunk?: (pcm: Float32Array) => void;
  public onMicLevel?: (level: number) => void;
  public onOutputLevel?: (level: number) => void;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public async init(): Promise<boolean> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.outputGain && this.ctx) {
      this.outputGain = this.ctx.createGain();
      this.outputGain.gain.value = this.masterVolume;

      this.outputAnalyser = this.ctx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.5;

      this.outputGain.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.ctx.destination);
    }

    return true;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.outputGain && this.ctx) {
      this.outputGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setSoundEffects(enabled: boolean) {
    this.soundEffectsEnabled = enabled;
  }

  public setRogerBeep(enabled: boolean) {
    this.rogerBeepEnabled = enabled;
  }

  // Request microphone access
  public async requestMic(): Promise<{ granted: boolean; errorReason?: string }> {
    try {
      await this.init();
      if (!this.micStream) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return {
            granted: false,
            errorReason: "L'API Microphone n'est pas disponible sur ce navigateur ou ce contexte sécurisé.",
          };
        }
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
      return { granted: true };
    } catch (err: any) {
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      const reason = isDenied
        ? "Permission d'accès au micro refusée par le navigateur."
        : isNotFound
        ? "Aucun périphérique microphone détecté sur cet appareil."
        : `Accès micro indisponible (${err?.name || 'erreur inconnue'}).`;
      
      // Informative log without throwing uncaught red exception
      console.warn('Microphone access status:', reason);
      return { granted: false, errorReason: reason };
    }
  }

  // Start capturing audio from microphone
  public async startRecording(): Promise<boolean> {
    const res = await this.requestMic();
    if (!res.granted || !this.ctx || !this.micStream) return false;

    if (this.soundEffectsEnabled) {
      this.playPttStartBeep();
    }

    this.isRecording = true;

    if (!this.micSource) {
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.ctx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.4;
      this.micSource.connect(this.micAnalyser);
    }

    // Buffer size 2048 gives ~46ms at 44.1k/48k, perfectly chunked
    const bufferSize = 2048;
    this.micProcessor = this.ctx.createScriptProcessor(bufferSize, 1, 1);

    this.micProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate level
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const level = Math.min(1, rms * 4.5);
      if (this.onMicLevel) this.onMicLevel(level);

      // Downsample to 16kHz
      const downsampled = this.downsampleBuffer(inputData, this.ctx!.sampleRate, this.targetSampleRate);
      if (this.onPcmChunk) {
        this.onPcmChunk(downsampled);
      }
    };

    if (this.micSource) {
      this.micSource.connect(this.micProcessor);
      // Connect to a dummy gain node so the processor runs without echoing locally
      const dummyGain = this.ctx.createGain();
      dummyGain.gain.value = 0;
      this.micProcessor.connect(dummyGain);
      dummyGain.connect(this.ctx.destination);
    }

    return true;
  }

  // Stop capturing microphone audio
  public stopRecording() {
    this.isRecording = false;
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }
    if (this.onMicLevel) {
      this.onMicLevel(0);
    }

    if (this.soundEffectsEnabled && this.rogerBeepEnabled) {
      this.playRogerBeep();
    }
  }

  // Downsample audio buffer to 16000 Hz
  private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (outputRate >= inputRate) return buffer;
    const compression = inputRate / outputRate;
    const length = Math.floor(buffer.length / compression);
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index] = buffer[Math.floor(inputIndex)];
      inputIndex += compression;
      index++;
    }
    return result;
  }

  // Play incoming PCM chunk in real time
  public playIncomingPcm(pcmSamples: number[], sampleRate = 16000) {
    if (!this.ctx || !this.outputGain) {
      this.init();
      if (!this.ctx || !this.outputGain) return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const audioBuf = this.ctx.createBuffer(1, pcmSamples.length, sampleRate);
    const channelData = audioBuf.getChannelData(0);
    for (let i = 0; i < pcmSamples.length; i++) {
      channelData[i] = pcmSamples[i];
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuf;

    // Optional subtle radio bandpass filter (300Hz - 3400Hz) to replicate authentic walkie-talkie
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1700;
    bandpass.Q.value = 1.0;

    source.connect(bandpass);
    bandpass.connect(this.outputGain);

    const currentTime = this.ctx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.02; // Small buffer lead
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuf.duration;

    // Trigger visual level
    if (this.onOutputLevel) {
      let sum = 0;
      for (let i = 0; i < Math.min(pcmSamples.length, 256); i++) {
        sum += Math.abs(pcmSamples[i]);
      }
      this.onOutputLevel(Math.min(1, (sum / 256) * 3));
    }
  }

  // Walkie-talkie PTT Keying burst sound effect
  public playPttStartBeep() {
    if (!this.ctx || !this.outputGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.04);

      gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }

  // Classic Motorola / Aviation Roger Beep ("Over")
  public playRogerBeep() {
    if (!this.ctx || !this.outputGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1180, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1540, now + 0.06);

      gain.gain.setValueAtTime(0.14 * this.masterVolume, now);
      gain.gain.setValueAtTime(0.14 * this.masterVolume, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.06);

      osc2.start(now + 0.06);
      osc2.stop(now + 0.16);

      // Add a slight squelch hiss at the end
      this.playSquelchTail(now + 0.16);
    } catch {
      // Ignore
    }
  }

  // Radio squelch burst (static cut)
  public playSquelchTail(startTime?: number) {
    if (!this.ctx) return;
    try {
      const now = startTime ?? this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.05; // 50ms burst
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  // Generates a simulated test radio transmission (e.g. from Central RFC)
  public generateTestTransmission(_user: string, _channel: string, _message: string, onProgressChunk?: (samples: number[]) => void): Promise<void> {
    return new Promise((resolve) => {
      this.init();
      if (!this.ctx) {
        resolve();
        return;
      }

      this.playPttStartBeep();

      // Synthesize audio tones & voice pattern
      const sampleRate = 16000;
      const totalSeconds = 2.2;
      const totalSamples = Math.floor(sampleRate * totalSeconds);
      const chunkSize = 640; // 40ms @ 16kHz
      
      let sampleIndex = 0;
      const interval = setInterval(() => {
        if (sampleIndex >= totalSamples) {
          clearInterval(interval);
          this.playRogerBeep();
          resolve();
          return;
        }

        const chunk: number[] = [];
        for (let i = 0; i < chunkSize && sampleIndex < totalSamples; i++, sampleIndex++) {
          const t = sampleIndex / sampleRate;
          // Radio carrier + modulation pattern
          const tone1 = Math.sin(2 * Math.PI * 440 * t) * 0.2;
          const tone2 = Math.sin(2 * Math.PI * 880 * t * (1 + 0.1 * Math.sin(2 * Math.PI * 4 * t))) * 0.25;
          const noise = (Math.random() * 2 - 1) * 0.04;
          const voiceEnvelope = Math.sin(Math.PI * (sampleIndex / totalSamples));
          chunk.push((tone1 + tone2 + noise) * voiceEnvelope);
        }

        this.playIncomingPcm(chunk, sampleRate);
        if (onProgressChunk) onProgressChunk(chunk);
      }, 40);
    });
  }

  public cleanup() {
    this.stopRecording();
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
