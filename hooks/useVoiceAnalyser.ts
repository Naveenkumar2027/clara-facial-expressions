import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Uses Web Audio API (AudioContext + AnalyserNode) to get real-time
 * amplitude (0–1) from the microphone for visual reactivity (e.g. orb pulse).
 */
export function useVoiceAnalyser(enabled: boolean) {
  const [amplitude, setAmplitude] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const start = useCallback(async () => {
    if (!enabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      // Use explicit ArrayBuffer so types satisfy getByteTimeDomainData (ArrayBuffer vs ArrayBufferLike)
      const dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
      dataArrayRef.current = dataArray;

      const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        // TS DOM lib uses Uint8Array<ArrayBuffer>; runtime is compatible
        analyserRef.current.getByteTimeDomainData(
          dataArrayRef.current as unknown as Uint8Array<ArrayBuffer>
        );
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const v = (dataArrayRef.current[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        setAmplitude(Math.min(1, rms * 4));
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error('useVoiceAnalyser: getUserMedia failed', err);
    }
  }, [enabled]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    setAmplitude(0);
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (_) {}
      sourceRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    dataArrayRef.current = null;
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    }
    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  return { amplitude, start, stop };
}
