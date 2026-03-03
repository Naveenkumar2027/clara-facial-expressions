import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export type SpeechRecognitionState = 'idle' | 'listening' | 'processing';

export interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    onResult,
    onError,
    language = 'en-IN',
    continuous = false,
    interimResults = true,
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      onError?.('Speech recognition is not supported in this browser.');
      return;
    }
    if (state === 'listening') return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          final += text;
          onResult?.(text, true);
        } else {
          interim += text;
          onResult?.(interim, false);
        }
      }
      setTranscript((prev) => (final ? prev + final : prev + interim));
    };

    recognition.onend = () => {
      setState('idle');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        setState('idle');
        return;
      }
      onError?.(event.error);
      setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state, continuous, interimResults, language, onResult, onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current && state === 'listening') {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setState('idle');
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }
      setState('idle');
    };
  }, []);

  return { state, transcript, start, stop, isSupported: !!SpeechRecognitionAPI };
}
