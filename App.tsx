import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveClient } from './services/liveClient';
import RoboFace from './components/RoboFace';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const liveClientRef = useRef<LiveClient | null>(null);
  const requestRef = useRef<number>();

  // Use API Key from environment
  const API_KEY = process.env.API_KEY || '';

  const animate = useCallback(() => {
    if (liveClientRef.current) {
      const level = liveClientRef.current.getAudioLevel();
      setAmplitude(level);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // Start animation loop
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, [animate]);

  const handleConnect = async () => {
    if (!API_KEY) {
      setError("API Key not found in environment variables.");
      return;
    }
    
    setError(null);
    const client = new LiveClient(API_KEY);
    liveClientRef.current = client;

    try {
      await client.connect(
        () => setIsConnected(false),
        (err) => {
          console.error(err);
          setError(err.message);
          setIsConnected(false);
        }
      );
      setIsConnected(true);
    } catch (e: any) {
      setError(e.message || "Failed to connect");
    }
  };

  const handleDisconnect = () => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsConnected(false);
    setAmplitude(0);
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center font-mono relative overflow-hidden">
      {/* Global CRT Scanlines */}
      <div className="scanlines"></div>

      {/* Main Content */}
      <div className="z-20 flex flex-col items-center gap-8">
        
        {/* Branding Removed */}

        <RoboFace amplitude={amplitude} isListening={isConnected} />

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="px-8 py-3 bg-green-900/30 border border-green-500 text-green-400 rounded hover:bg-green-500 hover:text-black transition-all duration-300 uppercase tracking-widest text-sm font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_#22c55e]"
            >
              INITIALIZE RECEPTIONIST
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-8 py-3 bg-red-900/30 border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-black transition-all duration-300 uppercase tracking-widest text-sm font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_#ef4444]"
            >
              TERMINATE SESSION
            </button>
          )}

          {error && (
            <div className="text-red-500 text-xs mt-4 max-w-xs text-center border border-red-900/50 p-2 bg-red-950/20">
              ERR: {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Status Log */}
      <div className="absolute bottom-4 left-4 z-20 text-green-900/60 text-[10px] leading-tight select-none pointer-events-none">
        <p>SYSTEM: CLARA_SVIT_V3.0</p>
        <p>KERNEL: GEMINI_LIVE_NATIVE</p>
        <p>AUDIO_MOD: ZEPHYR</p>
        <p>STATUS: {isConnected ? 'ONLINE' : 'OFFLINE'}</p>
      </div>
    </div>
  );
};

export default App;