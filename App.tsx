import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveClient } from './services/liveClient';
import RoboFace from './components/RoboFace';
import LyricsDisplay from './components/LyricsDisplay';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  
  // Transcription State - Only Input
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState<{ text: string; isUser: boolean }[]>([]);

  const liveClientRef = useRef<LiveClient | null>(null);
  const requestRef = useRef<number>(0);
  const currentInputRef = useRef<string>('');

  const API_KEY = process.env.API_KEY;

  const animate = useCallback(() => {
    if (liveClientRef.current) {
      const level = liveClientRef.current.getAudioLevel();
      setAmplitude(level);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, [animate]);

  const handleToggleConnect = async () => {
    if (isConnected) {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setIsConnected(false);
      setAmplitude(0);
      setCurrentInput('');
      currentInputRef.current = '';
      return;
    }

    if (!API_KEY) {
      setError("API Key missing.");
      return;
    }
    
    setError(null);
    setHistory([]);
    setCurrentInput('');
    currentInputRef.current = '';
    const client = new LiveClient(API_KEY);
    liveClientRef.current = client;

    try {
      await client.connect(
        // On Close
        () => setIsConnected(false),
        // On Error
        (err) => {
          console.error(err);
          setError(err.message);
          setIsConnected(false);
        },
        // On Transcription
        (text, isUser, isFinal) => {
           // We only care about user input now
           if (isUser) {
             if (isFinal) {
               // When final, save the current accumulated input to history
               const finalText = currentInputRef.current;
               if (finalText) {
                 setHistory((prev: { text: string; isUser: boolean }[]) => [...prev, { text: finalText, isUser: true }]);
               }
               setCurrentInput('');
               currentInputRef.current = '';
             } else {
               // Update current input with incremental transcription
               setCurrentInput(text);
               currentInputRef.current = text;
             }
           }
        }
      );
      setIsConnected(true);
    } catch (e: any) {
      setError(e.message || "Failed to connect");
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center font-sans relative overflow-hidden">
      
      {/* Scanlines Effect */}
      <div className="scanlines"></div>

      {/* Main Content: RoboFace */}
      <div className="z-20 flex-grow flex flex-col items-center justify-center w-full transform -translate-y-12">
        <RoboFace amplitude={amplitude} isListening={isConnected} />
      </div>

      {/* Footer / Controls Layer */}
      <div className="z-30 absolute bottom-12 flex flex-col items-center justify-end w-full space-y-6">
        
        {/* Initialize Button - Restored Style */}
        <button
            onClick={handleToggleConnect}
            className={`px-8 py-3 border border-green-500 text-green-500 font-mono text-sm tracking-[0.2em] uppercase hover:bg-green-500/10 transition-all duration-300 ${isConnected ? 'bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : ''}`}
          >
            {isConnected ? "Terminate Session" : "Initialize Receptionist"}
        </button>

        {/* Lyrics / Transcription Display (Input Only) */}
        <div className="h-24 w-full flex justify-center">
           <LyricsDisplay 
             currentInput={currentInput} 
             history={history} 
           />
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-0 text-red-500/80 text-xs tracking-wide bg-red-950/30 px-4 py-2 rounded border border-red-500/20">
            {error}
          </div>
        )}
      </div>

      {/* System Info Bottom Left */}
      <div className="absolute bottom-4 left-6 z-10 text-white/10 text-[9px] font-mono leading-tight pointer-events-none hidden md:block">
        <div>SYS: CLARA_SVIT_V5.0</div>
        <div>KER: GEMINI_LIVE_NATIVE</div>
        <div>AUD: ZEPHYR</div>
      </div>
    </div>
  );
};

export default App;