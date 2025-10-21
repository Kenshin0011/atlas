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
      // 新しく追加された結果のみを処理（連続発話に対応）
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        // 空文字列やホワイトスペースのみの発話は完全に無視
        if (!transcript || !transcript.trim()) {
          continue;
        }

        onTranscript(transcript, isFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' エラーは無視（ユーザーが話していないだけ）
      if (event.error === 'no-speech') {
        return;
      }

      // 'aborted' エラーは無視（ユーザーが明示的に停止した）
      if (event.error === 'aborted') {
        return;
      }

      const errorMessage = `音声認識エラー: ${event.error}`;
      setError(errorMessage);
      setIsListening(false);
      isListeningRef.current = false;
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      // ユーザーが明示的に停止した場合は再起動しない
      // continuous モードでも、エラーやブラウザの制限で停止する場合がある
      // その場合のみ自動再起動を試みる
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // 再起動に失敗した場合は停止状態にする
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        // 明示的に停止された場合は状態を確実に停止にする
        setIsListening(false);
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
      // フラグを先にfalseにしてから停止（onendでの自動再起動を防ぐ）
      isListeningRef.current = false;
      setIsListening(false);

      // abort() で即座に停止（stop() は現在の発話を処理してから停止する）
      try {
        recognitionRef.current.abort();
      } catch {
        // abort が失敗した場合は stop を試みる
        try {
          recognitionRef.current.stop();
        } catch {
          // 停止に失敗しても状態は既に false になっている
        }
      }
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
