import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { base64ToBytes, createPcmBlob, decodeAudioData } from '../utils/audioUtils';

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isConnected = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async connect(onClose: () => void, onError: (e: Error) => void) {
    // 1. Setup Audio Contexts
    // We try to request 16k, but we must use the context's actual sample rate for calculations if possible.
    // However, the Live API expects raw PCM which we label as 16k. 
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Setup Analyser for Lip Sync (Output Audio)
    this.analyserNode = this.outputAudioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.5;
    this.analyserNode.connect(this.outputAudioContext.destination);

    // 2. Get Microphone Stream & Resume Contexts
    try {
      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onError(new Error("Microphone permission denied or AudioContext failed to start"));
      return;
    }

    // 3. Connect to Gemini Live
    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: this.handleOnOpen.bind(this),
        onmessage: this.handleOnMessage.bind(this),
        onclose: () => {
          console.log('Session closed');
          this.disconnect();
          onClose();
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error', e);
          onError(new Error("Connection error. The service might be temporarily unavailable or the API Key is invalid."));
        },
      },
      config: {
        responseModalities: ['AUDIO'] as any, 
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: `You are Clara, the AI receptionist at Sai Vidya Institute of Technology. 
        Your persona is robotic but polite and efficient.
        
        INSTRUCTIONS:
        1. When the conversation starts, IMMEDIATELY introduce yourself: "Hello. I am Clara, the AI receptionist for Sai Vidya Institute of Technology."
        2. Then, IMMEDIATELY ask: "May I have your name, please?"
        3. Once the user gives their name, acknowledge it and ask how you can assist with college inquiries.
        4. Keep responses concise and maintain the robotic persona.`,
      },
    };

    // Initialize session promise
    try {
      this.sessionPromise = this.ai.live.connect(config);
      this.isConnected = true;
      await this.sessionPromise;
    } catch (e: any) {
      this.disconnect();
      console.error(e);
      throw new Error(e.message || "Failed to establish connection");
    }
  }

  private handleOnOpen() {
    console.log('Connection opened');
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    // Small delay to ensure session is fully established on server side before pushing audio
    setTimeout(() => {
        if (!this.isConnected || !this.inputAudioContext || !this.stream) return;

        // Setup Audio Recording
        this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.isConnected) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          
          if (this.sessionPromise) {
            this.sessionPromise.then((session: any) => {
              session.sendRealtimeInput({ media: pcmBlob });
            }).catch(err => {
                 // Ignore errors from sending audio if session is closing
            });
          }
        };

        this.sourceNode.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }, 500);
  }

  private async handleOnMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext || !this.analyserNode || !this.isConnected) return;

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      const audioBytes = base64ToBytes(base64Audio);
      try {
        const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext);

        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.analyserNode);
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
      } catch (e) {
          console.error("Error decoding audio", e);
      }
    }

    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  public getAudioLevel(): number {
    if (!this.analyserNode) return 0;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(1, average / 100); 
  }

  public disconnect() {
    this.isConnected = false;
    
    if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.analyserNode = null;
    this.sessionPromise = null;
    this.nextStartTime = 0;
  }
}