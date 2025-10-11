import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from '@/types/speech';

type UseSpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
};

type UseSpeechRecognitionReturn = {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
};

export const useSpeechRecognition = ({
  lang = 'ja-JP',
  continuous = true,
  interimResults = true,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setError('このブラウザは音声認識に対応していません');
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;

      onTranscript(transcript, isFinal);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('音声認識エラー:', event.error);

      if (event.error === 'no-speech') {
        console.log('音声が検出されませんでした');
        return;
      }

      const errorMessage = `音声認識エラー: ${event.error}`;
      setError(errorMessage);
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.error('音声認識の再起動に失敗:', err);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [lang, continuous, interimResults, onTranscript, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('音声認識がサポートされていません');
      return;
    }

    try {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      }
    } catch (err) {
      console.error('音声認識の開始に失敗:', err);

      // Handle "already started" error
      if (err instanceof Error && err.message?.includes('already started')) {
        setIsListening(true);
        isListeningRef.current = true;
      } else {
        setError('音声認識の開始に失敗しました');
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
};
