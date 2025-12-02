import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
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

  public async connect(
    onClose: () => void, 
    onError: (e: Error) => void,
    onTranscription: (text: string, isUser: boolean, isFinal: boolean) => void
  ) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    this.analyserNode = this.outputAudioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.5;
    this.analyserNode.connect(this.outputAudioContext.destination);

    try {
      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onError(new Error("Microphone permission denied or AudioContext failed to start"));
      return;
    }

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: this.handleOnOpen.bind(this),
        onmessage: (msg: LiveServerMessage) => this.handleOnMessage(msg, onTranscription),
        onclose: () => {
          console.log('Session closed');
          this.disconnect();
          onClose();
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error', e);
          onError(new Error("Connection error. The service might be temporarily unavailable."));
        },
      },
      config: {
        responseModalities: [Modality.AUDIO], 
        inputAudioTranscription: {},
        // outputAudioTranscription removed to disable model text output
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: {
          parts: [{
            text: `You are Clara, the AI receptionist at Sai Vidya Institute of Technology (SVIT), Bangalore.
Your persona is robotic but polite, efficient, and professional.

PROTOCOL:
1. **Introduction**: When the connection starts, briefly introduce yourself: "Hello, I am Clara, the AI receptionist for Sai Vidya Institute of Technology."
2. **Get Name**: Immediately after the introduction, ask the user: "May I know your name, please?"
3. **Get Purpose**: Wait for the user to provide their name. Once they do, acknowledge it and ask for the purpose of their visit (e.g., "Thank you [Name], how may I assist you today?").
4. **Conversation**: For all subsequent interactions, address the user by their name and provide the requested information from the Knowledge Base.
5. **Language**: Detect the user's language (English, Hindi, Telugu, Kannada, Tamil, Malayalam) and respond in that language.

KNOWLEDGE BASE:
- Established: 2008 by SRI SAI VIDYA VIKAS SHIKSHANA SAMITHI.
- Affiliation: VTU (Visvesvaraya Technological University).
- Approvals: AICTE approved, NAAC 'A' grade, NBA accredited.
- Departments: CSE, Mech, Civil, ECE, ISE.
- Trustees: Prof. M. R. Holla, Dr. A.M. Padma Reddy, Sri. Srinivas Raju, Prof. R C Shanmukha Swamy, Sri. Manohar M K, Dr. Y Jayasimha, Sri. Narayan Raju.
- Staff (CSE): Prof. Lakshmi Durga N, Prof. Anitha C S, Dr. G Dhivyasri, Prof. Nisha S K, Prof. Amarnath B Patil, Dr. Nagashree N, Prof. Anil Kumar K V, Prof. Jyoti Kumari, Prof. Vidyashree R, Dr. Bhavana A, Prof. Bhavya T N.
- Fees (2025-26): 2nd Year CET (2024 batch) 1,00,010 - 1,26,256 INR. Girls Hostel: 40k/yr + 5k deposit + 3.5k/mo mess. Transport: 30k (City), 20k (Yelahanka).
- Placements: 95% rate. Recruiters: TCS, Infosys, Wipro, Tech Mahindra, Amazon, IBM.

If information is not in this list, politely say you don't have that specific information.`
          }]
        }
      },
    };

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

    // Delay audio streaming slightly to ensure session is ready
    setTimeout(() => {
        if (!this.isConnected || !this.inputAudioContext || !this.stream) return;

        this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.isConnected) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          
          if (this.sessionPromise) {
            this.sessionPromise.then((session: any) => {
              session.sendRealtimeInput({ media: pcmBlob });
            }).catch((err: any) => {
                 // Ignore errors
            });
          }
        };

        this.sourceNode.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }, 500);
  }

  private async handleOnMessage(
    message: LiveServerMessage, 
    onTranscription: (text: string, isUser: boolean, isFinal: boolean) => void
  ) {
    if (!this.outputAudioContext || !this.analyserNode || !this.isConnected) return;

    // Handle Input Transcription (User) only
    const inputTranscription = message.serverContent?.inputTranscription?.text;
    if (inputTranscription) {
      onTranscription(inputTranscription, true, false);
    }

    // Handle Turn Complete (Finalize text)
    if (message.serverContent?.turnComplete) {
       onTranscription("", true, true); // Signal turn complete/final
    }

    const base64Audio = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
    
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